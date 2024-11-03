import { NextResponse } from 'next/server';

const OLLAMA_SERVER_URL = process.env.NEXT_PUBLIC_OLLAMA_SERVER_URL || 'http://localhost:11434';

export async function GET() {
  try {
    const response = await fetch(`${OLLAMA_SERVER_URL}/api/tags`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }

    const data = await response.json();
    
    if (!data.models || !Array.isArray(data.models)) {
      console.error('Invalid response format from Ollama server');
      return NextResponse.json({ models: [] });
    }

    // Format the models to match the expected structure
    const formattedModels = data.models
      .filter((model: any) => model && model.name)
      .map((model: any) => ({
        value: model.name.split(':')[0], // Remove version tag
        label: `${model.name.split(':')[0]} (${model.details?.parameter_size || 'Unknown size'})`,
        details: model.details
      }));

    return NextResponse.json({ models: formattedModels });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models', models: [] }, 
      { status: 500 }
    );
  }
} 