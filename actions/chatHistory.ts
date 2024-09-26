import { supabase } from './questionAnswering';
import { Chat, ChatMessage } from '@/types/chat';
import { v4 as uuidv4 } from 'uuid';
import { answerQuestion } from './questionAnswering';     

export async function fetchChatHistory(chatId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_history')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return data.map(msg => ({
    id: msg.id,
    role: msg.user_input ? 'user' : 'assistant',
    content: msg.user_input || msg.assistant_response
  }));
}

export async function storeChatMessage(chatId: string, userInput: string | null, assistantResponse: string | null, dominationField: string) {
  if (!chatId) {
    console.error('Error in storeChatMessage: chatId is null or undefined');
    throw new Error('chatId is required');
  }
  try {
    const { error } = await supabase
      .from('chat_history')
      .insert({ chat_id: chatId, user_input: userInput, assistant_response: assistantResponse, domination_field: dominationField });

    if (error) throw error;
  } catch (error) {
    console.error('Error in storeChatMessage:', error);
    throw error;
  }
}

export async function handleSendMessage(message: string, currentChat: Chat, addMessageToCurrentChat: (message: ChatMessage) => void, setIsLoading: (isLoading: boolean) => void, setError: (error: string | null) => void, setStreamingMessage: (updater: (prev: string) => string) => void, dominationField: string) {
  if (!dominationField) return;
  
  const userMessage: ChatMessage = {
    id: uuidv4(),
    role: 'user',
    content: message,
  };

  addMessageToCurrentChat(userMessage);
  setIsLoading(true);
  setError(null);

  try {
    await answerQuestion(
      message,
      (token) => setStreamingMessage((prev) => prev + token),
      currentChat.messages,
      dominationField,
      currentChat.id,
      currentChat.customPrompt ?? ''
    );
  } catch (error) {
    console.error('Error in handleSendMessage:', error);
    setError('An error occurred while processing your message.');
  } finally {
    setIsLoading(false);
    setStreamingMessage(() => '');
  }
}


