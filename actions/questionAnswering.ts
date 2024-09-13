import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { codeBlock, oneLine } from 'common-tags'

const OLLAMA_SERVER_URL = 'http://localhost:11434'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  db: {
    schema: 'public',
  },
  global: {
    headers: { 
      'x-my-custom-header': 'my-app-name',
      requestTimeout: '30000' // Convert the value to a string
    },
  },
  auth: {
    persistSession: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

const openai = new OpenAI({
  baseURL: `${OLLAMA_SERVER_URL}/v1`,
  apiKey: 'ollama'
})

async function getEmbedding(query: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/ollama`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate embedding');
  }

  const { embedding } = await response.json();
  return embedding;
}

export async function answerQuestion(query: string, onToken: (token: string) => void) {
  try {
    const sanitizedQuery = query.trim().replace(/[\r\n]+/g, ' ')

    const embedding = await getEmbedding(sanitizedQuery);

    console.log(`embedding generated: ${embedding}`);

    const { data: pageSections, error } = await supabase.rpc('hybrid_search', {
      in_query: sanitizedQuery,
      in_embedding: embedding,
      in_match_count: 10,
    })

    console.log(`page sessions: ${pageSections}`);

    if (error) throw error;

    if (!Array.isArray(pageSections) || pageSections.length === 0) {
      onToken("No relevant information found.");
      return;
    }

    let contextText = ''
    for (const section of pageSections) {
      contextText += `${section.content.trim()}\n---\n`
    }

    const prompt = codeBlock`
      ${oneLine`
        You're an AI assistant who answers questions about documents and related code snippets.
        You're a chat bot, so keep your replies succinct and conversational.
        You're only allowed to use the documents below to answer the question.
        If the question isn't related to these documents or the information isn't available, say:
        "Sorry, I couldn't find any information from the documents."
        Do not go off topic.
      `}

      Documents:
      ${contextText}

      Question: """
      ${query}
      """

      Answer as markdown (including related code snippets if available):
    `

    console.log(`prompt prepared`);

    const completion = await openai.chat.completions.create({
      model: 'llava-llama3:latest',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      max_tokens: 500, // Limit the response length
    });

    let fullResponse = '';
    for await (const chunk of completion) {
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) {
        fullResponse += token;
        await onToken(token);
        
        // Check if the response has reached a reasonable length
        if (fullResponse.length > 1000) {
          break;
        }
      }
      
      // Check if the generation is complete
      if (chunk.choices[0]?.finish_reason) {
        break;
      }
    }
  } catch (error) {
    console.error('Error in answerQuestion:', error);
    await onToken('Sorry, I encountered an error while processing your question.');
  }
}
