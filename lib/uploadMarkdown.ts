import { supabase } from './supabase';
import { createHash } from 'crypto';

async function getEmbedding(content: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/ollama`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: content }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate embedding');
  }

  const { embedding } = await response.json();
  return embedding;
}

export async function uploadMarkdownToSupabase(file: File, source: string, author: string) {
  try {
    const content = await file.text();
    console.log(`content: ${content}`);
    const hash = createHash('md5').update(content).digest('hex');

    // Generate embedding using the API route
    const embedding = await getEmbedding(content);

    const { data, error } = await supabase
      .from('documents')
      .insert({
        source,
        source_id: hash,
        content,
        document_id: file.name,
        author,
        url: file.name,
        embedding
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error uploading markdown:', error);
    throw error;
  }
}
