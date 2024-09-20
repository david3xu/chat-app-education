import { supabase } from './questionAnswering';
import { Chat, ChatMessage } from '@/types/chat';
import { v4 as uuidv4 } from 'uuid';
import { answerQuestion } from './questionAnswering';     

export async function fetchChatHistory(userId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return data.map(msg => ({
    id: msg.id,
    role: msg.user_input ? 'user' : 'assistant',
    content: msg.user_input || msg.assistant_response
  }));
}

export async function storeChatMessage(userId: string, userInput: string | null, assistantResponse: string | null, dominationField: string) {
  try {
    // First, check if the user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      // If user doesn't exist, create a new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({ id: userId })
        .single();

      if (createError) throw new Error('Failed to create user');
    }

    // Proceed with inserting the chat message
    const { error } = await supabase
      .from('chat_history')
      .insert({ user_id: userId, user_input: userInput, assistant_response: assistantResponse, domination_field: dominationField });

    if (error) throw error;
  } catch (error) {
    console.error('Error in storeChatMessage:', error);
    throw error;
  }
}

export async function handleSendMessage(message: string, currentChat: Chat, userId: string, addMessageToCurrentChat: (message: ChatMessage) => void, setIsLoading: (isLoading: boolean) => void, setError: (error: string | null) => void, setStreamingMessage: (updater: (prev: string) => string) => void, dominationField: string) {
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
      userId,
      currentChat.messages,
      dominationField
    );
  } catch (error) {
    console.error('Error in handleSendMessage:', error);
    setError('An error occurred while processing your message.');
  } finally {
    setIsLoading(false);
    setStreamingMessage(() => '');
  }
}


