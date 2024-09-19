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
    user_input TEXT,
    assistant_response TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add any necessary indexes
CREATE INDEX IF NOT EXISTS ix_chat_history_user_id ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS ix_chat_history_created_at ON chat_history(created_at);

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
  rrf_k INT DEFAULT 50
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
  ORDER BY rank_ix
  LIMIT LEAST(match_count, 30) * 2
),
semantic AS (
  SELECT 
    id,
    ROW_NUMBER() OVER(ORDER BY embedding <#> query_embedding) AS rank_ix
  FROM
    documents
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

CREATE POLICY select_policy ON documents FOR SELECT USING (
  (SELECT COUNT(*) FROM documents WHERE id = documents.id) > 0
);

-- Add a policy to allow inserts
CREATE POLICY insert_policy ON documents FOR INSERT WITH CHECK (true);

-- -- Create indexes if they don't exist
-- CREATE INDEX IF NOT EXISTS ix_documents_document_id ON documents USING btree (document_id);
-- CREATE INDEX IF NOT EXISTS ix_documents_source ON documents USING btree (source);
-- CREATE INDEX IF NOT EXISTS ix_documents_source_id ON documents USING btree (source_id);
-- CREATE INDEX IF NOT EXISTS ix_documents_author ON documents USING btree (author);
-- CREATE INDEX IF NOT EXISTS ix_documents_created_at ON documents USING brin (created_at);
-- CREATE INDEX IF NOT EXISTS ix_documents_content_fts ON documents USING gin (to_tsvector('english', content));
-- CREATE INDEX IF NOT EXISTS ix_documents_embedding ON documents USING ivfflat(embedding) WITH (lists=100);

-- -- Drop the existing hybrid_search function if it exists
-- DROP FUNCTION IF EXISTS hybrid_search(text, vector(1024), int, float, float, int, text);

-- -- Create the new hybrid_search function
-- CREATE OR REPLACE FUNCTION hybrid_search(
--   query_text TEXT,
--   query_embedding VECTOR(1024),
--   match_count INT,
--   full_text_weight FLOAT DEFAULT 1,
--   semantic_weight FLOAT DEFAULT 1,
--   rrf_k INT DEFAULT 50,
--   in_domination_field TEXT DEFAULT '%%',
--   -- in_min_similarity FLOAT DEFAULT 0.001, -- Lower this value
--   in_max_tokens INT DEFAULT 5000
-- )
-- RETURNS SETOF documents
-- LANGUAGE sql
-- AS $$
-- WITH full_text AS (
--   SELECT 
--     id, 
--     ROW_NUMBER() OVER(ORDER BY ts_rank_cd(to_tsvector('english', content), websearch_to_tsquery(query_text)) DESC) AS rank_ix 
--   FROM 
--     documents
--   WHERE 
--     to_tsvector('english', content) @@ websearch_to_tsquery(query_text)
--     AND (domination_field LIKE in_domination_field OR domination_field IS NULL)
--   ORDER BY rank_ix
--   LIMIT LEAST(match_count, 30) * 2
-- ),
-- semantic AS (
--   SELECT 
--     id,
--     ROW_NUMBER() OVER(ORDER BY embedding <#> query_embedding) AS rank_ix
--   FROM 
--     documents
--   WHERE 
--     (domination_field LIKE in_domination_field OR domination_field IS NULL)
--     AND (embedding <#> query_embedding) > in_min_similarity
--   ORDER BY rank_ix
--   LIMIT LEAST(match_count, 30) * 2
-- )
-- SELECT
--   documents.*
-- FROM
--   full_text
--   FULL OUTER JOIN semantic
--     ON full_text.id = semantic.id 
--   JOIN documents
--     ON COALESCE(full_text.id, semantic.id) = documents.id
-- WHERE
--   LENGTH(documents.content) <= in_max_tokens
-- ORDER BY
--   COALESCE(1.0 / (rrf_k + full_text.rank_ix), 0.0) * full_text_weight + 
--   COALESCE(1.0 / (rrf_k + semantic.rank_ix), 0.0) * semantic_weight DESC
-- LIMIT
--   LEAST(match_count, 30);
-- $$;