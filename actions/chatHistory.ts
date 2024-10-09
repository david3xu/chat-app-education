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

export async function storeChatMessage(
  chatId: string, 
  role: 'user' | 'assistant', 
  content: string, 
  dominationField: string,
  imageFile?: File
) {
  if (!chatId) {
    console.error('Error in storeChatMessage: chatId is null or undefined');
    throw new Error('chatId is required');
  }
  try {
    console.log(`Storing message: chatId=${chatId}, role=${role}, content=${content}, dominationField=${dominationField}`);
    let imageUrl;
    if (imageFile) {
      imageUrl = await uploadImage(imageFile);
    }

    const { error } = await supabase
      .from('chat_history')
      .insert({ 
        chat_id: chatId, 
        [`${role}_content`]: content,
        [`${role}_role`]: role,
        domination_field: dominationField,
        image_url: imageUrl
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error in storeChatMessage:', error);
    throw error;
  }
}

async function uploadImage(file: File): Promise<string> {
  const { data, error } = await supabase.storage
    .from('chat-images')
    .upload(`${Date.now()}-${file.name}`, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('chat-images')
    .getPublicUrl(data.path);

  return publicUrl;
}

export async function handleSendMessage(
  message: string,
  imageFile: File | undefined,
  dominationField: string,
  customPrompt: string | undefined,
  chatId: string,
  currentMessages: ChatMessage[],
  historyLoaded: boolean
) {
  if (!dominationField) return;
  
  const userMessage: ChatMessage = {
    id: uuidv4(),
    role: 'user',
    content: message,
    dominationField,
    image: imageFile ? URL.createObjectURL(imageFile) : undefined,
  };

  await storeChatMessage(chatId, 'user', message, dominationField, imageFile);

  try {
    const messages = [
      { role: "system", content: "You are a helpful assistant." },
      ...currentMessages.map((msg: ChatMessage) => ({ role: msg.role, content: msg.content })),
      { role: "user", content: message }
    ];

    let fullResponse = '';
    await answerQuestion(
      messages,
      async (token) => {
        fullResponse += token;
        // Note: We're not using setStreamingMessage here as it's not available in this context
      },
      dominationField,
      chatId,
      customPrompt,
      imageFile
    );

    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: fullResponse,
      dominationField,
    };
    await storeChatMessage(chatId, 'assistant', fullResponse, dominationField);

    return { userMessage, assistantMessage };
  } catch (error) {
    console.error('Error in handleSendMessage:', error);
    throw error;
  }
}


