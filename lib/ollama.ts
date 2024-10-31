export async function getOllamaModels() {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }

    const data = await response.json();
    return data.models;
  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    return [];
  }
}
