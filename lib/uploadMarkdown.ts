import { createHash } from 'crypto';
import GPT3Tokenizer from 'gpt3-tokenizer';
import { supabase } from './supabase';

const tokenizer = new GPT3Tokenizer({ type: 'gpt3' });

const CHUNK_SIZE = 200; // Target size of each chunk in tokens
const MIN_CHUNK_SIZE_CHARS = 350; // Minimum size of each chunk in characters
const MIN_CHUNK_LENGTH_TO_EMBED = 5; // Minimum length of chunk to embed
const EMBEDDINGS_BATCH_SIZE = 128; // Number of embeddings to request at a time
const MAX_NUM_CHUNKS = 4000; // Maximum number of chunks to generate from a text
const MAX_FILE_SIZE = 100 * 1024; // 100KB

function getTextChunks(text: string): string[] {
  if (!text || text.trim().length === 0) return [];

  const tokens = tokenizer.encode(text);
  const chunks: string[] = [];
  let numChunks = 0;

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

  if (tokens.bpe.length > 0) {
    const remainingText = tokenizer.decode(tokens.bpe).replace(/\n/g, ' ').trim();
    if (remainingText.length > MIN_CHUNK_LENGTH_TO_EMBED) {
      chunks.push(remainingText);
    }
  }

  return chunks;
}

async function uploadChunksToSupabase(chunks: string[], source: string, author: string, fileName: string, hash: string, abortSignal: AbortSignal) {
  for (let i = 0; i < chunks.length; i += EMBEDDINGS_BATCH_SIZE) {
    if (abortSignal.aborted) {
      throw new Error('Upload cancelled');
    }

    const batchChunks = chunks.slice(i, i + EMBEDDINGS_BATCH_SIZE);
    console.log('Batch chunks:', batchChunks); // Add this line for debugging

    const embeddings = await getEmbeddings(batchChunks);
    console.log('Embeddings:', embeddings); // Add this line for debugging

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
          embedding: embeddings[j]
        });

      if (error) throw error;
    }
  }
}

export async function uploadMarkdownToSupabase(file: File, source: string, author: string, abortSignal: AbortSignal) {
  try {
    const fileContent = await file.text();
    const hash = createHash('md5').update(fileContent).digest('hex');

    if (file.size > MAX_FILE_SIZE) {
      const chunks = getTextChunks(fileContent);
      await uploadChunksToSupabase(chunks, source, author, file.name, hash, abortSignal);
    } else {
      const chunks = [fileContent];
      await uploadChunksToSupabase(chunks, source, author, file.name, hash, abortSignal);
    }

    return { 
      success: true, 
      message: 'File uploaded successfully', 
      reminder: 'Remember to check the uploaded content in Supabase!'
    };
  } catch (error) {
    console.error('Detailed error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}

async function getEmbeddings(contents: string[]): Promise<number[][]> {
  try {
    console.log('Contents to embed:', contents);

    if (contents.length === 0) {
      throw new Error('No content provided for embedding');
    }

    const embeddings = await Promise.all(contents.map(async (content) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/ollama`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: content }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate embedding for content: ${content.substring(0, 50)}...`);
      }

      const { embedding } = await response.json();
      return embedding;
    }));

    if (embeddings.length === 0) {
      throw new Error('No embeddings were generated');
    }

    return embeddings;
  } catch (error) {
    console.error('Error in getEmbeddings:', error);
    throw error;
  }
}

export async function uploadFolderToSupabase(files: File[], source: string, author: string, abortSignal: AbortSignal) {
  try {
    let totalUploaded = 0;
    const errors = [];

    for (const file of files) {
      if (abortSignal.aborted) {
        throw new Error('Upload cancelled');
      }

      if (file.name.endsWith('.md')) {
        const result = await uploadMarkdownToSupabase(file, source, author, abortSignal);
        if (result.success) {
          totalUploaded++;
        } else {
          errors.push(`Failed to upload ${file.name}: ${result.error}`);
        }
      }
    }

    if (errors.length > 0) {
      console.error('Errors during folder upload:', errors);
    }

    return { 
      success: true, 
      message: `Uploaded ${totalUploaded} files successfully. ${errors.length} files failed.`, 
      reminder: 'Remember to check the uploaded content in Supabase!'
    };
  } catch (error) {
    console.error('Detailed error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}

