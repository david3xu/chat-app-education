import { NextResponse } from 'next/server';
import { Ollama } from 'ollama'

const OLLAMA_SERVER_URL = 'http://localhost:11434'

const ollama = new Ollama({
  host: OLLAMA_SERVER_URL
})

export async function POST(req: Request) {
  const { query } = await req.json();

  try {
    const embeddingResponse = await ollama.embeddings({
      model: "mxbai-embed-large:latest",
      prompt: query,
    })

    return NextResponse.json({ embedding: embeddingResponse.embedding });
  } catch (error) {
    console.error('Error generating embedding:', error);
    return NextResponse.json({ error: 'Failed to generate embedding' }, { status: 500 });
  }
}
