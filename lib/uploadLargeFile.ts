import GPT3Tokenizer from 'gpt3-tokenizer';
import { supabase } from './supabase';
import { convertPdfToMarkdown } from './pdfToMarkdown';
import { fetchWithRetry } from '@/lib/utils/fetchWithRetry';

const tokenizer = new GPT3Tokenizer({ type: 'gpt3' });

const CHUNK_SIZE = 200;
const MIN_CHUNK_SIZE_CHARS = 350;
const MIN_CHUNK_LENGTH_TO_EMBED = 5;
const EMBEDDINGS_BATCH_SIZE = 128;
const MAX_NUM_CHUNKS = 4000;
const INITIAL_TEXT_PARTITION_SIZE = 4000;

export function getTextChunks(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const textParts = [];
  for (let i = 0; i < text.length; i += INITIAL_TEXT_PARTITION_SIZE) {
    textParts.push(text.slice(i, i + INITIAL_TEXT_PARTITION_SIZE));
  }

  const chunks: string[] = [];
  let numChunks = 0;

  let tokens;
  for (const part of textParts) {
    try {
      tokens = tokenizer.encode(part);
    } catch (error) {
      continue;
    }

    while (tokens.bpe.length > 0 && numChunks < MAX_NUM_CHUNKS) {
      const chunk = tokens.bpe.slice(0, CHUNK_SIZE);
      let chunkText = tokenizer.decode(chunk);

      if (!chunkText || chunkText.trim().length === 0) {
        tokens.bpe = tokens.bpe.slice(chunk.length);
        continue;
      }

      const lastPunctuation = Math.max(
        chunkText.lastIndexOf('.'),
        chunkText.lastIndexOf('?'),
        chunkText.lastIndexOf('!'),
        chunkText.lastIndexOf('\n')
      );

      if (lastPunctuation !== -1 && lastPunctuation > MIN_CHUNK_SIZE_CHARS) {
        chunkText = chunkText.slice(0, lastPunctuation + 1);
      }

      const chunkTextToAppend = chunkText.replace(/\n/g, ' ').trim();

      if (chunkTextToAppend.length > MIN_CHUNK_LENGTH_TO_EMBED) {
        chunks.push(chunkTextToAppend);
      }

      tokens.bpe = tokens.bpe.slice(tokenizer.encode(chunkText).bpe.length);
      numChunks++;
    }
  }

  if (tokens && tokens.bpe.length > 0) {
    const remainingText = tokenizer.decode(tokens.bpe).replace(/\n/g, ' ').trim();
    if (remainingText.length > MIN_CHUNK_LENGTH_TO_EMBED) {
      chunks.push(remainingText);
    }
  }

  return chunks;
}

export async function getEmbeddings(contents: string[]): Promise<number[][]> {
  try {
    if (contents.length === 0) {
      throw new Error('No content provided for embedding');
    }

    const embeddings: number[][] = [];
    const batchSize = 10;

    for (let i = 0; i < contents.length; i += batchSize) {
      const batch = contents.slice(i, i + batchSize);
      const batchEmbeddings = await Promise.all(batch.map(async (content) => {
        const response = await fetchWithRetry(`${process.env.NEXT_PUBLIC_BASE_URL}/api/ollama`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: content }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Embedding API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const { embedding } = await response.json();
        return embedding;
      }));

      embeddings.push(...batchEmbeddings);
    }

    if (embeddings.length === 0) {
      throw new Error('No embeddings were generated');
    }

    return embeddings;
  } catch (error) {
    console.error('Error in getEmbeddings:', error);
    throw error;
  }
}

export async function uploadLargeFileToSupabase(file: File, source: string, author: string, fileName: string, hash: string, dominationField: string, abortSignal: AbortSignal) {
  let fileContent: string;

  if (file.type === 'application/pdf') {
    fileContent = await convertPdfToMarkdown(file);
  } else {
    fileContent = await file.text();
  }

  const chunks = getTextChunks(fileContent);

  try {
    for (let i = 0; i < chunks.length; i += EMBEDDINGS_BATCH_SIZE) {
      if (abortSignal.aborted) {
        throw new Error('Upload cancelled');
      }

      const batchChunks = chunks.slice(i, i + EMBEDDINGS_BATCH_SIZE);
      const embeddings = await getEmbeddings(batchChunks);

      for (let j = 0; j < batchChunks.length; j++) {
        if (!embeddings[j]) {
          console.error(`No embedding for chunk ${j}`);
          continue;
        }

        const { error } = await supabase
          .from('documents')
          .insert({
            source,
            source_id: `${hash}-${i + j}`,
            content: batchChunks[j],
            document_id: `${fileName}-part${i + j + 1}`,
            author,
            url: fileName,
            embedding: embeddings[j],
            domination_field: dominationField,
          });

        if (error) {
          console.error(`Error inserting chunk ${j}:`, error);
          throw error;
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error in uploadLargeFileToSupabase:', error);
    throw error;
  }
}
