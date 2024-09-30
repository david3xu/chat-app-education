import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { storeChatMessage } from './chatHistory';
import { ChatMessage } from '@/types/chat';
import { getRelaxPrompt, getDocumentPrompt, getEmailPrompt } from '@/lib/prompts';
import { OpenAIStream } from 'ai';

const OLLAMA_SERVER_URL = 'http://localhost:11434'

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
  messages: { role: string; content: string }[], 
  onToken: (token: string) => void, 
  dominationField: string, 
  chatId: string, 
  customPrompt?: string
) {
  if (!dominationField) throw new Error('Domination field is required');
  try {
    const sanitizedQuery = messages[messages.length - 1].content.trim().replace(/[\r\n]+/g, ' ').substring(0, 500);

    let previousConvo = messages.slice(0, -1).map(msg => 
      `${msg.role.toUpperCase()}: ${msg.content}`
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
      prompt = basePrompt + getEmailPrompt(previousConvo, sanitizedQuery);
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
    const validMessages = messages.filter(msg => msg.content && msg.content.trim() !== '');

    const completion = await openai.chat.completions.create({
      // model: 'llama3.1:latest',
      // model: 'dolphin-llama3:8b',
      model: 'dolphin-llama3:70b',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        ...validMessages.map(msg => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content
        })),
        { role: 'user', content: prompt }
      ],
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
    await onToken('Sorry, I encountered an error while processing your question.');
  }
}