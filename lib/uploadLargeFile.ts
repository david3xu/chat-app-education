import GPT3Tokenizer from 'gpt3-tokenizer';
import { supabase } from './supabase';
import { convertPdfToMarkdown } from './pdfToMarkdown';
import { fetchWithRetry } from '@/lib/utils/fetchWithRetry';

const tokenizer = new GPT3Tokenizer({ type: 'gpt3' });

const CHUNK_SIZE = 200; // Target size of each chunk in tokens
const MIN_CHUNK_SIZE_CHARS = 350; // Minimum size of each chunk in characters
const MIN_CHUNK_LENGTH_TO_EMBED = 5; // Minimum length of chunk to embed
const EMBEDDINGS_BATCH_SIZE = 128; // Number of embeddings to request at a time
const MAX_NUM_CHUNKS = 4000; // Maximum number of chunks to generate from a text
const INITIAL_TEXT_PARTITION_SIZE = 4000; // Maximum length for initial text partitioning

export function getTextChunks(text: string): string[] {
  // console.log('Starting getTextChunks'); // Add logging
  if (!text || text.trim().length === 0) {
    // console.log('No text provided or text is empty'); // Add logging
    return [];
  }

  const textParts = [];
  for (let i = 0; i < text.length; i += INITIAL_TEXT_PARTITION_SIZE) {
    textParts.push(text.slice(i, i + INITIAL_TEXT_PARTITION_SIZE));
  }

  const chunks: string[] = [];
  let numChunks = 0;

  let tokens; // Define tokens in the outer scope
  for (const part of textParts) {
    try {
      tokens = tokenizer.encode(part);
      // console.log(`Encoded part into ${tokens.bpe.length} tokens`); // Add logging
    } catch (error) {
      // console.error('Error encoding text part:', error); // Add logging
      continue;
    }

    while (tokens.bpe.length > 0 && numChunks < MAX_NUM_CHUNKS) {
      // console.log(`Processing chunk ${numChunks + 1}`); // Add logging
      const chunk = tokens.bpe.slice(0, CHUNK_SIZE);
      let chunkText = tokenizer.decode(chunk);

      if (!chunkText || chunkText.trim().length === 0) {
        // console.log('Chunk text is empty, skipping'); // Add logging
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
      // console.log(`Chunk text to append: ${chunkTextToAppend.substring(0, 50)}...`); // Add logging

      if (chunkTextToAppend.length > MIN_CHUNK_LENGTH_TO_EMBED) {
        chunks.push(chunkTextToAppend);
        // console.log(`Added chunk ${numChunks + 1}`); // Add logging
      }

      tokens.bpe = tokens.bpe.slice(tokenizer.encode(chunkText).bpe.length);
      numChunks++;
    }
  }

  if (tokens && tokens.bpe.length > 0) {
    const remainingText = tokenizer.decode(tokens.bpe).replace(/\n/g, ' ').trim();
    if (remainingText.length > MIN_CHUNK_LENGTH_TO_EMBED) {
      chunks.push(remainingText);
      // console.log('Added remaining text as a chunk'); // Add logging
    }
  }

  // console.log(`Generated ${chunks.length} chunks in total`); // Add logging
  return chunks;
}

export async function getEmbeddings(contents: string[]): Promise<number[][]> {
  try {
    // console.log('Contents to embed:', contents);

    if (contents.length === 0) {
      throw new Error('No content provided for embedding');
    }

    const embeddings: number[][] = [];
    const batchSize = 10; // Process 10 chunks at a time

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

export async function uploadLargeFile(file: File) {
  try {
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    
    // Rest of your file processing logic here
    // Instead of fs.readFile, use the buffer directly
    
    return {
      success: true,
      data: uint8Array
    };
  } catch (error) {
    console.error('Error in uploadLargeFile:', error);
    throw error;
  }
}
