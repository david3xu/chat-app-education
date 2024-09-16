import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { codeBlock, oneLine } from 'common-tags'

const OLLAMA_SERVER_URL = 'http://localhost:11434'

// const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
//   db: {
//     schema: 'public',
//   },
//   global: {
//     headers: { 
//       'x-my-custom-header': 'my-app-name',
//       requestTimeout: '30000' // Convert the value to a string
//     },
//   },
//   auth: {
//     persistSession: false,
//   },
//   realtime: {
//     params: {
//       eventsPerSecond: 10,
//     },
//   },
// });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public',
    },
  }
)

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
    const sanitizedQuery = query.trim().replace(/[\r\n]+/g, ' ').substring(0, 500); // Truncate to 500 characters
    console.log(`sanitized query: ${sanitizedQuery}`);

    const embedding = await getEmbedding(sanitizedQuery);

    // console.log('Embedding:', embedding);

    // console.log('Hybrid search params:', {
    //   query_text: sanitizedQuery,
    //   query_embedding: embedding,
    //   match_count: 30,
    //   full_text_weight: 1.0,
    //   semantic_weight: 1.0,
    //   rrf_k: 50,
    //   in_domination_field: '%%', // Adjust as needed
    //   in_min_similarity: 0.0, // Lower this value
    //   // in_max_tokens: 5000 // Removed this line
    // });

    const { data: pageSections, error } = await supabase.rpc('hybrid_search', {
      query_text: sanitizedQuery,
      query_embedding: embedding,
      match_count: 50,
      full_text_weight: 1.0,
      semantic_weight: 1.0,
      // rrf_k: 50,
      // in_domination_field: '%%', // Adjust as needed
      // in_min_similarity: 0.0, // Lower this value
      // in_max_tokens: 5000 // Removed this line
    });

    console.log('Hybrid search result:', pageSections);

    if (error) {
      console.error('Error in hybrid_search:', error);
      throw error;
    }

    if (!Array.isArray(pageSections) || pageSections.length === 0) {
      onToken("No relevant information found.");
      return;
    }

    let contextText = '';
    for (const section of pageSections) {
      contextText += `${section.content.trim()}\n---\n`;
    }

    const prompt = codeBlock`
      ${oneLine`
        You're an AI assistant who answers questions about documents and related code snippets.
        Provide detailed answers when possible, using the context provided.
        If you can't find a complete answer, provide partial information or related concepts.
        If no relevant information is available, say: "I don't have enough information to answer that question fully."
      `}

      Documents:
      ${contextText}

      Question: """
      ${query}
      """

      Answer as markdown (including related code snippets if available):
    `;

    console.log(`prompt prepared`);

    const completion = await openai.chat.completions.create({
      model: 'llama3.1:latest',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      max_tokens: 2048, // Limit the response length
      temperature: 0.0,
    });

    let fullResponse = '';
    for await (const chunk of completion) {
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) {
        fullResponse += token;
        await onToken(token);
        
        // Check if the response has reached a reasonable length
        if (fullResponse.length > 8000) {
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
