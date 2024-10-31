import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { storeChatMessage } from './chatHistory';
import { 
  getNormalChatPrompt, 
  getDocumentPrompt, 
  getEmailPrompt, 
  getDocWithoutCodePrompt,
  getSimpleDocumentPrompt
} from '@/lib/prompts';
import { ChatCompletionContentPartText, ChatCompletionMessageParam } from 'openai/resources/chat/completions.mjs';
import { DEFAULT_MODEL, getFullModelName } from '@/lib/modelUtils';

const ollamaServerUrl = process.env.NEXT_PUBLIC_OLLAMA_SERVER_URL || '' 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

const openai = new OpenAI({
  baseURL: `${ollamaServerUrl}/v1`,
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
})

// Add this line to specify the model
// const MODEL_NAME = "deepseek-coder-v2:latest"
// const MODEL_NAME = "llava-llama3"
// const MODEL_NAME = "llama3.1"
// const MODEL_NAME = "cira-dpo-gguf:latest"


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

const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1 second

async function retryWithBackoff(fn: () => Promise<any>, retries = 0) {
  try {
    return await fn();
  } catch (error) {
    if (retries >= MAX_RETRIES) {
      throw error;
    }
    await new Promise(resolve => setTimeout(resolve, INITIAL_BACKOFF * Math.pow(2, retries)));
    return retryWithBackoff(fn, retries + 1);
  }
}

export async function answerQuestion(
  messages: any[],
  onToken: (token: string) => void,
  dominationField: string = 'Normal Chat',
  chatId: string,
  customPrompt?: string,
  imageFile?: string,
  model?: string
) {
  console.log('Starting answerQuestion with model:', model);
  const fullModelName = getFullModelName(model || DEFAULT_MODEL);
  console.log('Using full model name:', fullModelName);

  console.log('answerQuestion - Default model:', DEFAULT_MODEL);

  if (!dominationField) dominationField = 'Normal Chat'; // Ensure default is 'Normal Chat'
  try {
    let lastMessage = messages[messages.length - 1].content;
    const sanitizedQuery = typeof lastMessage === 'string' 
      ? lastMessage.trim().replace(/[\r\n]+/g, ' ').substring(0, 500)
      : lastMessage.find((item: any) => item.type === 'text')?.text || '';

    let previousConvo = messages.slice(0, -1).map(msg => 
      `${msg.role.toUpperCase()}: ${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}`
    ).join('\n');

    let prompt;
    const defaultBasePrompt = `Basic requirements:
1. Focus on answering the question.
2. Depending on the chat question, consider including chat history as input content.
3. Answer questions with good structure and logic.

`;

    const basePrompt = defaultBasePrompt + (customPrompt ? `${customPrompt}\n\n` : '');
    if (dominationField === 'Normal Chat') {
      prompt = basePrompt + getNormalChatPrompt(previousConvo, sanitizedQuery);
    } else if (dominationField === 'Email') {
      prompt = getEmailPrompt(previousConvo, sanitizedQuery, customPrompt);
    } else {
      let contextText = '';
      try {
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
          if (error.message === 'tsquery stack too small') {
            throw new Error('The search query is too complex. Falling back to default prompt.');
          }
          throw error;
        }

        if (Array.isArray(pageSections) && pageSections.length > 0) {
          for (const section of pageSections) {
            contextText += `${section.content.trim()}\n---\n`;
          }
        }
      } catch (searchError) {
        console.warn('Search failed, falling back to default prompt:', searchError);
        // Fall back to a default prompt if the search fails
        contextText = 'Unable to retrieve specific context. Answering based on general knowledge.';
      }

      // prompt = basePrompt + getDocumentPrompt(contextText, previousConvo, sanitizedQuery);
      // prompt = basePrompt + getDocWithoutCodePrompt(contextText, previousConvo, sanitizedQuery);
      prompt = basePrompt + getSimpleDocumentPrompt(contextText, previousConvo, sanitizedQuery);
    }

    const validMessages = messages.filter(msg => msg.content && (typeof msg.content === 'string' ? msg.content.trim() !== '' : true));
    let systemMessage = '';
    if (dominationField === 'Rubin Observation') {
      systemMessage = 'You are a helpful assistant specializing in Rubin Observatory and astronomical observations.';
    } else if (dominationField === 'Normal Chat') {
      systemMessage = 'You are a friendly and helpful general-purpose assistant.';
    } else if (dominationField === 'Email') {
      systemMessage = 'You are a helpful assistant specializing in email composition and communication.';
    } else {
      systemMessage = 'You are a helpful assistant specializing in marking programming language design assignments.';
    }

    let apiMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: prompt },
      ...validMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }) as ChatCompletionMessageParam)
    ];

    if (imageFile) {
      const imageContent = {
        type: 'image_url',
        image_url: { url: imageFile }
      };
      
      if (apiMessages.length > 0) {
        const lastMessage = apiMessages[apiMessages.length - 1];
        if (Array.isArray(lastMessage.content)) {
          lastMessage.content.push(imageContent as unknown as ChatCompletionContentPartText);
        } else {
          lastMessage.content = [
            { type: 'text', text: lastMessage.content as string },
            imageContent as unknown as ChatCompletionContentPartText 
          ];
        }
      }
    }

    

    const completion = await retryWithBackoff(() => {
      console.log('Making API call with model:', fullModelName);
      return openai.chat.completions.create({
        model: fullModelName,
        messages: apiMessages,
        stream: true,
        max_tokens: 2048,
        temperature: 0.0,
      })
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

    const structuredResponse = structureResponse(fullResponse);
    await storeChatMessage(chatId, 'assistant', structuredResponse, dominationField);

    return structuredResponse;
  } catch (error) {
    console.error('Error in answerQuestion:', error);
    if (error instanceof OpenAI.APIError) {
      throw new Error(`OpenAI API error: ${error.message}`);
    } else if (error instanceof Error && error.message.includes('Connection error')) {
      throw new Error('Unable to connect to the AI server. Please check your connection and try again.');
    } else {
      throw new Error('An error occurred while processing your question. Please try again later.');
    }
  }
}

// Remove this function as it's no longer needed here
// async function imageToBase64(file: File): Promise<string> { ... }

export async function encodeImage(file: File): Promise<ArrayBuffer> {
  return await file.arrayBuffer();
}
