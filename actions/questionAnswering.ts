import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { storeChatMessage } from './chatHistory';
import { getRelaxPrompt, getDocumentPrompt, getEmailPrompt } from '@/lib/prompts';
import { ChatCompletionContentPart, ChatCompletionContentPartText, ChatCompletionMessageParam } from 'openai/resources/chat/completions.mjs';
import { encode } from 'node:querystring';

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
// const MODEL_NAME = "deepseek-coder-v2:latest"
// const MODEL_NAME = "llava-llama3"
const MODEL_NAME = "llama3.1"

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
  dominationField: string = 'Relax',
  chatId: string, 
  customPrompt?: string,
  imageFile?: string // Already a base64 string
) {
  if (!dominationField) dominationField = 'Relax'; // Ensure default is 'Relax'
  try {
    // console.log('answerQuestion called with image:', !!imageFile); // Debug log

    let lastMessage = messages[messages.length - 1].content;
    const sanitizedQuery = typeof lastMessage === 'string' 
      ? lastMessage.trim().replace(/[\r\n]+/g, ' ').substring(0, 500)
      : lastMessage.find(item => item.type === 'text')?.text || '';

    // console.log('Sanitized query:', sanitizedQuery); // Debug log

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
        // console.error('Error in hybrid_search:', error);
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

    // console.log('Generated prompt:', prompt); // Debug log

    // Validate messages before sending to OpenAI API
    const validMessages = messages.filter(msg => msg.content && (typeof msg.content === 'string' ? msg.content.trim() !== '' : true));
    let apiMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      ...validMessages.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: typeof msg.content === 'string' ? msg.content : msg.content.toString(),
      })),
      { 
        role: 'user', 
        content: [{ type: 'text', text: prompt }] as ChatCompletionContentPart[]
      }
    ];

    // console.log(`imageFile: ${imageFile}`);

    if (imageFile) {
      // console.log('Image data received, type:', typeof imageFile, 'length:', imageFile.byteLength);
      
      const imageContent = {
        type: 'image_url',
        image_url: { url: imageFile } // Use the base64 string directly
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
      
      // console.log('Last message after adding image:', JSON.stringify(apiMessages[apiMessages.length - 1]));
    }

    // console.log('Prepared API messages:', JSON.stringify(apiMessages)); // Debug log  

    // console.log('Using model:', MODEL_NAME);
    const completion = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: apiMessages,
      stream: true,
      max_tokens: 4096,
      temperature: 0.0,
    });

    // console.log('Completion created, starting stream'); // Debug log

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

    // Structure the full response before saving
    const structuredResponse = structureResponse(fullResponse);

    // Save the structured response
    await storeChatMessage(chatId, 'assistant', structuredResponse, dominationField);

    return structuredResponse; // Return the response
  } catch (error) {
    // console.error('Error in answerQuestion:', error);
    if (error instanceof Error && error.message.includes('Connection error')) {
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
