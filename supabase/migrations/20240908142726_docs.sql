CREATE EXTENSION IF NOT EXISTS vector;

-- Drop the existing chat_history table if it exists
DROP TABLE IF EXISTS chat_history;

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Add other necessary columns for the users table
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert a default user if the table is empty
INSERT INTO users (id)
SELECT '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (SELECT 1 FROM users);

-- Then create the chat_history table
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) DEFAULT '00000000-0000-0000-0000-000000000000',
    created_at TIMESTAMPTZ DEFAULT now(),
    domination_field TEXT NOT NULL,
    chat_id UUID NOT NULL,
    user_content TEXT,
    assistant_content TEXT,
    user_role TEXT,
    assistant_role TEXT
);

-- Add indexes
CREATE INDEX IF NOT EXISTS ix_chat_history_chat_id ON chat_history(chat_id);
CREATE INDEX IF NOT EXISTS ix_chat_history_user_id ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS ix_chat_history_created_at ON chat_history(created_at);
CREATE INDEX IF NOT EXISTS ix_chat_history_user_content ON chat_history(user_content);
CREATE INDEX IF NOT EXISTS ix_chat_history_assistant_content ON chat_history(assistant_content);
CREATE INDEX IF NOT EXISTS ix_chat_history_user_role ON chat_history(user_role);
CREATE INDEX IF NOT EXISTS ix_chat_history_assistant_role ON chat_history(assistant_role);

-- Create the documents table
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    source TEXT,
    source_id TEXT,
    content TEXT,
    document_id TEXT,
    author TEXT,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    embedding VECTOR(1024), -- 1024 is the default dimension, change depending on dimensionality of your chosen embeddings model
    domination_field TEXT, -- New field added
    fts tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS ix_documents_domination_field ON documents USING gin (fts);
CREATE INDEX IF NOT EXISTS ix_documents_embedding ON documents USING ivfflat(embedding) WITH (lists=100);

-- Drop both versions of the function
DROP FUNCTION IF EXISTS hybrid_search(text, vector(1024), int, float, float, int);
DROP FUNCTION IF EXISTS hybrid_search(text, vector(1024), int, float, float, int, text, float);

-- Create the new hybrid_search function
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text TEXT,
  query_embedding VECTOR(1024),
  match_count INT,
  full_text_weight FLOAT DEFAULT 1,
  semantic_weight FLOAT DEFAULT 1,
  rrf_k INT DEFAULT 50,
  in_domination_field TEXT DEFAULT 'Science'
)
RETURNS SETOF documents
LANGUAGE sql
AS $$
WITH full_text AS (
  SELECT 
    id, 
    ROW_NUMBER() OVER(ORDER BY ts_rank_cd(fts, websearch_to_tsquery(query_text)) DESC) AS rank_ix 
  FROM 
    documents
  WHERE 
    fts @@ websearch_to_tsquery(query_text)
    AND (in_domination_field = 'Science' OR domination_field = in_domination_field)
  ORDER BY rank_ix
  LIMIT LEAST(match_count, 30) * 2
),
semantic AS (
  SELECT 
    id,
    ROW_NUMBER() OVER(ORDER BY embedding <#> query_embedding) AS rank_ix
  FROM
    documents
  WHERE
    (in_domination_field = 'Science' OR domination_field = in_domination_field)
  ORDER BY rank_ix
  LIMIT LEAST(match_count, 30) * 2
)
SELECT
  documents.*
FROM
  full_text
  FULL OUTER JOIN semantic
    ON full_text.id = semantic.id 
  JOIN documents
    ON COALESCE(full_text.id, semantic.id) = documents.id
ORDER BY
  COALESCE(1.0 / (rrf_k + full_text.rank_ix), 0.0) * full_text_weight +
  COALESCE(1.0 / (rrf_k + semantic.rank_ix), 0.0) * semantic_weight DESC
LIMIT
  LEAST(match_count, 30);
$$;

-- Check if the policy exists before creating it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'documents'
        AND policyname = 'select_policy'
    ) THEN
        CREATE POLICY select_policy ON documents FOR SELECT USING (
            (SELECT COUNT(*) FROM documents WHERE id = documents.id) > 0
        );
    END IF;
END $$;

-- Similarly, check for the insert policy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'documents'
        AND policyname = 'insert_policy'
    ) THEN
        CREATE POLICY insert_policy ON documents FOR INSERT WITH CHECK (true);
    END IF;
END $$;