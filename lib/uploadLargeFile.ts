import GPT3Tokenizer from 'gpt3-tokenizer';
import { supabase } from './supabase';
import fs from 'fs';
import path from 'path';

const tokenizer = new GPT3Tokenizer({ type: 'gpt3' });

const CHUNK_SIZE = 200; // Target size of each chunk in tokens
const MIN_CHUNK_SIZE_CHARS = 350; // Minimum size of each chunk in characters
const MIN_CHUNK_LENGTH_TO_EMBED = 5; // Minimum length of chunk to embed
const EMBEDDINGS_BATCH_SIZE = 128; // Number of embeddings to request at a time
const MAX_NUM_CHUNKS = 4000; // Maximum number of chunks to generate from a text
const INITIAL_TEXT_PARTITION_SIZE = 4000; // Maximum length for initial text partitioning

const TEMPLATE_FOLDER = path.join(process.cwd(), 'docs');

console.log('TEMPLATE_FOLDER', TEMPLATE_FOLDER);  

function saveChunksToTemplateFolder(chunks: string[], fileName: string) {
  if (!fs.existsSync(TEMPLATE_FOLDER)) {
    fs.mkdirSync(TEMPLATE_FOLDER);
  }
  console.log('TEMPLATE_FOLDER', TEMPLATE_FOLDER);  

  chunks.forEach((chunk, index) => {
    const chunkFileName = `${fileName}-part${index + 1}.md`;
    const chunkFilePath = path.join(TEMPLATE_FOLDER, chunkFileName);
    fs.writeFileSync(chunkFilePath, chunk);
    console.log(`Saved chunk to ${chunkFilePath}`); // Add logging
  });
}

function deleteTemplateFolder() {
  if (fs.existsSync(TEMPLATE_FOLDER)) {
    fs.rmSync(TEMPLATE_FOLDER, { recursive: true, force: true });
    console.log(`Deleted template folder ${TEMPLATE_FOLDER}`); // Add logging
  }
}

export function getTextChunks(text: string): string[] {
  console.log('Starting getTextChunks'); // Add logging
  if (!text || text.trim().length === 0) {
    console.log('No text provided or text is empty'); // Add logging
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
      console.log(`Encoded part into ${tokens.bpe.length} tokens`); // Add logging
    } catch (error) {
      console.error('Error encoding text part:', error); // Add logging
      continue;
    }

    while (tokens.bpe.length > 0 && numChunks < MAX_NUM_CHUNKS) {
      console.log(`Processing chunk ${numChunks + 1}`); // Add logging
      const chunk = tokens.bpe.slice(0, CHUNK_SIZE);
      let chunkText = tokenizer.decode(chunk);

      if (!chunkText || chunkText.trim().length === 0) {
        console.log('Chunk text is empty, skipping'); // Add logging
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
      console.log(`Chunk text to append: ${chunkTextToAppend.substring(0, 50)}...`); // Add logging

      if (chunkTextToAppend.length > MIN_CHUNK_LENGTH_TO_EMBED) {
        chunks.push(chunkTextToAppend);
        console.log(`Added chunk ${numChunks + 1}`); // Add logging
      }

      tokens.bpe = tokens.bpe.slice(tokenizer.encode(chunkText).bpe.length);
      numChunks++;
    }
  }

  if (tokens && tokens.bpe.length > 0) {
    const remainingText = tokenizer.decode(tokens.bpe).replace(/\n/g, ' ').trim();
    if (remainingText.length > MIN_CHUNK_LENGTH_TO_EMBED) {
      chunks.push(remainingText);
      console.log('Added remaining text as a chunk'); // Add logging
    }
  }

  console.log(`Generated ${chunks.length} chunks in total`); // Add logging
  return chunks;
}

async function fetchWithRetry(url: string, options: RequestInit, retries: number = 5, initialTimeout: number = 5000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempt ${i + 1}: Fetching ${url}`);
      const controller = new AbortController();
      const timeout = initialTimeout * Math.pow(2, i); // Exponential backoff
      const id = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === retries - 1) throw error;
      console.warn(`Fetch attempt ${i + 1} failed. Retrying in ${initialTimeout * Math.pow(2, i) / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
    }
  }
  throw new Error('All fetch attempts failed');
}

export async function getEmbeddings(contents: string[]): Promise<number[][]> {
  try {
    console.log('Contents to embed:', contents);

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

export async function uploadLargeFileToSupabase(fileContent: string, source: string, author: string, fileName: string, hash: string, dominationField: string, abortSignal: AbortSignal) {
  console.log('Starting to process file content'); // Add logging
  const chunks = getTextChunks(fileContent);
  console.log(`Generated ${chunks.length} chunks`); // Add logging
  saveChunksToTemplateFolder(chunks, fileName);

  for (let i = 0; i < chunks.length; i += EMBEDDINGS_BATCH_SIZE) {
    if (abortSignal.aborted) {
      throw new Error('Upload cancelled');
    }

    const batchChunks = chunks.slice(i, i + EMBEDDINGS_BATCH_SIZE);
    console.log(`Processing batch ${i / EMBEDDINGS_BATCH_SIZE + 1}`); // Add logging

    const embeddings = await getEmbeddings(batchChunks);
    console.log(`Generated embeddings for batch ${i / EMBEDDINGS_BATCH_SIZE + 1}`); // Add logging

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
          domination_field: dominationField, // Ensure this matches the column name in Supabase
        });

      if (error) {
        console.error(`Error inserting chunk ${j}:`, error); // Add logging
        throw error;
      }
    }
  }

  // Delete the template folder after successful upload
  deleteTemplateFolder();
  console.log('Upload process completed successfully'); // Add logging
}
