import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { storeChatMessage } from './chatHistory';
import { getRelaxPrompt, getDocumentPrompt, getEmailPrompt } from '@/lib/prompts';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions.mjs';

const OLLAMA_SERVER_URL = process.env.NEXT_PUBLIC_OLLAMA_SERVER_URL || 'http://localhost:11434'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

const openai = new OpenAI({
  baseURL: `${OLLAMA_SERVER_URL}/v1`,
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
})

// Add this line to specify the model
const MODEL_NAME = "deepseek-coder-v2:latest"

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

function structureResponse(content: string): string {
  // Split the content into paragraphs
  const paragraphs = content.split('\n\n');

  // Structure the response
  let structuredResponse = '';

  // Add a brief introduction
  structuredResponse += `## ${paragraphs[0]}\n\n`;

  // Add main points
  structuredResponse += "### Key Points:\n\n";
  for (let i = 1; i < paragraphs.length - 1; i++) {
    structuredResponse += `- ${paragraphs[i]}\n`;
  }

  // Add a conclusion or summary
  structuredResponse += `\n### Summary:\n\n${paragraphs[paragraphs.length - 1]}\n`;

  return structuredResponse;
}

export async function answerQuestion(
  messages: { role: string; content: string | { type: string; text?: string; image_url?: { url: string } }[] }[], 
  onToken: (token: string) => void, 
  dominationField: string, 
  chatId: string, 
  customPrompt?: string,
  imageFile?: File
) {
  if (!dominationField) throw new Error('Domination field is required');
  try {
    let lastMessage = messages[messages.length - 1].content;
    const sanitizedQuery = typeof lastMessage === 'string' 
      ? lastMessage.trim().replace(/[\r\n]+/g, ' ').substring(0, 500)
      : lastMessage.find(item => item.type === 'text')?.text || '';

    let previousConvo = messages.slice(0, -1).map(msg => 
      `${msg.role.toUpperCase()}: ${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}`
    ).join('\n');

    let prompt;
    // add a default base prompt
    const defaultBasePrompt = `Basic requirements:
1. Focus on answering the question.
2. Depending on the chat question, consider including chat history as input content.
3. Answer questions with good structure and logic.

`;

    const basePrompt = defaultBasePrompt + (customPrompt ? `${customPrompt}\n\n` : '');

    if (dominationField === 'Relax') {
      prompt = basePrompt + getRelaxPrompt(previousConvo, sanitizedQuery);
    } else if (dominationField === 'Email') {
      prompt = getEmailPrompt(previousConvo, sanitizedQuery, customPrompt);
    } else {
      const embedding = await getEmbedding(sanitizedQuery);

      const { data: pageSections, error } = await supabase.rpc('hybrid_search', {
        query_text: sanitizedQuery,
        query_embedding: embedding,
        match_count: 50,
        full_text_weight: 1.0,
        semantic_weight: 1.0,
        in_domination_field: dominationField
      });

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

      prompt = basePrompt + getDocumentPrompt(contextText, previousConvo, sanitizedQuery);
    }

    // // Add the previous conversation and current question to the prompt
    // prompt += `\n\nPrevious conversation:\n${previousConvo}\n\nCurrent question: ${sanitizedQuery}`;

    // Validate messages before sending to OpenAI API
    const validMessages = messages.filter(msg => msg.content && (typeof msg.content === 'string' ? msg.content.trim() !== '' : true));

    let apiMessages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      ...validMessages.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user', content: prompt }
    ];

    if (imageFile) {
      const base64Image = await handleImageUpload(imageFile);
      apiMessages.push({
        role: 'user',
        content: [
          { type: 'text', text: sanitizedQuery },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`
            }
          }
        ]
      });
    }

    const completion = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: apiMessages as ChatCompletionMessageParam[],
      stream: true,
      max_tokens: 2048,
      temperature: 0.0,
    });

    let fullResponse = '';
    for await (const chunk of completion) {
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) {
        onToken(token);
        fullResponse += token;
      }
      
      if (chunk.choices[0]?.finish_reason) {
        break;
      }
    }

    console.log(`previous convo: ${previousConvo}`);
    console.log(`sanitized query: ${sanitizedQuery}`);
    console.log(`prompt: ${prompt}`);

    // Structure the full response before saving
    const structuredResponse = structureResponse(fullResponse);

    // Save the structured response
    await storeChatMessage(chatId, 'assistant', structuredResponse, dominationField);

    // return structuredResponse;
  } catch (error) {
    console.error('Error in answerQuestion:', error);
    if (error instanceof Error && error.message.includes('Connection error')) {
      throw new Error('Unable to connect to the AI server. Please check your connection and try again.');
    } else {
      throw new Error('An error occurred while processing your question. Please try again later.');
    }
  }
}

async function handleImageUpload(file: File): Promise<string> {
  const reader = new FileReader()
  return new Promise((resolve, reject) => {
    reader.onloadend = () => {
      const base64String = reader.result as string
      resolve(base64String.split(',')[1]) // Remove the data URL prefix
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}