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
    role: msg.user_role || msg.assistant_role,
    content: msg.user_content || msg.assistant_content,
    dominationField: msg.domination_field
  }));
}

export async function storeChatMessage(chatId: string, role: 'user' | 'assistant', content: string, dominationField: string) {
  if (!chatId) {
    console.error('Error in storeChatMessage: chatId is null or undefined');
    throw new Error('chatId is required');
  }
  try {
    console.log(`Storing message: chatId=${chatId}, role=${role}, content=${content}, dominationField=${dominationField}`);
    const { error } = await supabase
      .from('chat_history')
      .insert({ 
        chat_id: chatId, 
        [`${role}_content`]: content,
        [`${role}_role`]: role,
        domination_field: dominationField 
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error in storeChatMessage:', error);
    throw error;
  }
}

export async function handleSendMessage(
  message: string, 
  currentChat: Chat, 
  addMessageToCurrentChat: (message: ChatMessage) => void, 
  setIsLoading: (isLoading: boolean) => void, 
  setError: (error: string | null) => void, 
  setStreamingMessage: (updater: (prev: string) => string) => void, 
  dominationField: string
) {
  if (!dominationField) return;
  
  const userMessage: ChatMessage = {
    id: uuidv4(),
    role: 'user',
    content: message,
    dominationField,
  };

  addMessageToCurrentChat(userMessage);
  await storeChatMessage(currentChat.id, 'user', message, dominationField);

  setIsLoading(true);
  setError(null);

  try {
    const messages = [
      { role: "system", content: "You are a helpful assistant." },
      ...currentChat.messages.map((msg: ChatMessage) => ({ role: msg.role, content: msg.content })),
      { role: "user", content: message }
    ];

    let fullResponse = '';
    await answerQuestion(
      messages,
      async (token) => {
        fullResponse += token;
        setStreamingMessage((prev) => prev + token);
      },
      dominationField,
      currentChat.id,
      currentChat.customPrompt ?? undefined
    );

    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: fullResponse,
      dominationField,
    };
    addMessageToCurrentChat(assistantMessage);
    await storeChatMessage(currentChat.id, 'assistant', fullResponse, dominationField);
  } catch (error) {
    console.error('Error in handleSendMessage:', error);
    setError('An error occurred while processing your message.');
  } finally {
    setIsLoading(false);
    setStreamingMessage(() => '');
  }
}


