import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { storeChatMessage } from './chatHistory';
import { ChatMessage } from '@/types/chat';
import { getRelaxPrompt, getDocumentPrompt, getEmailPrompt } from '@/lib/prompts';

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

export async function answerQuestion(query: string, onToken: (token: string) => void, userId: string, chatHistory: ChatMessage[], dominationField: string, chatId: string, customPrompt: string) {
  if (!dominationField) throw new Error('Domination field is required');
  try {
    const sanitizedQuery = query.trim().replace(/[\r\n]+/g, ' ').substring(0, 500);

    let previousConvo = '';
    if (chatHistory && chatHistory.length > 0) {
      const recentHistory = chatHistory.slice(-5);
      previousConvo = recentHistory.map(msg => 
        `${msg.role.toUpperCase()}: ${msg.content}`
      ).join('\n');
    }

    let prompt;
    if (customPrompt) {
      prompt = `${customPrompt}\n\nPrevious conversation:\n${previousConvo}\n\nCurrent question: ${sanitizedQuery}`;
    } else if (dominationField === 'Relax') {
      prompt = getRelaxPrompt(previousConvo, sanitizedQuery);
    } else if (dominationField === 'Email') {
      prompt = getEmailPrompt(previousConvo, sanitizedQuery);
    } else {
      const embedding = await getEmbedding(sanitizedQuery);

      const { data: pageSections, error } = await supabase.rpc('hybrid_search', {
        query_text: sanitizedQuery,
        query_embedding: embedding,
        match_count: 50,
        full_text_weight: 1.0,
        semantic_weight: 1.0,
        in_domination_field: dominationField || 'Science',
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

      prompt = getDocumentPrompt(contextText, previousConvo, sanitizedQuery);
    }

    const completion = await openai.chat.completions.create({
      model: 'llama3.1:latest',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      max_tokens: 2048,
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

    // Update this part
    await storeChatMessage(userId, query, fullResponse, dominationField);
  } catch (error) {
    console.error('Error in answerQuestion:', error);
    await onToken('Sorry, I encountered an error while processing your question.');
  }
}
