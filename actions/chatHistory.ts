import { encodeImage, supabase } from './questionAnswering';
import { ChatMessage, MessageData } from '@/lib/chat';
import { v4 as uuidv4 } from 'uuid';
import { answerQuestion } from './questionAnswering';     
import { encodeImageToBase64 } from '@/lib/utils/file';

export async function fetchChatHistory(chatId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_history')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return data.map((item: MessageData) => ({
    id: item.chat_id ?? uuidv4(), // Use uuidv4() instead of randomUUID()
    role: item.user_role ? 'user' : 'assistant',
    content: item.user_content || item.assistant_content || '',
    dominationField: item.domination_field,
    image: item.image_url,
  }));
}

export async function storeChatMessage(
  chatId: string, 
  role: 'user' | 'assistant', 
  content: string, 
  dominationField: string,
  imageFile?: File,
  chat_topic?: string
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

    const messageData: MessageData = { 
      chat_id: chatId, 
      domination_field: dominationField,
      image_url: imageUrl,
    };

    if (role === 'user') {
      messageData.user_content = content;
      messageData.user_role = role;
    } else {
      messageData.assistant_content = content;
      messageData.assistant_role = role;
      messageData.chat_topic = chat_topic; // Only set chat_topic for assistant messages
    }

    console.log('Storing message data:', messageData);

    const { error } = await supabase
      .from('chat_history')
      .insert(messageData);

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
  historyLoaded: boolean,
  model: string
) {
  if (!dominationField) return;
  
  let imageBase64: string | undefined;
  if (imageFile) {
    imageBase64 = await encodeImageToBase64(imageFile);
  }

  const userMessage: ChatMessage = {
    id: uuidv4(),
    role: 'user',
    content: message,
    dominationField,
    image: imageBase64,
  };

  await storeChatMessage(chatId, 'user', message, dominationField, imageFile);

  try {
    const messages = [
      { role: "system", content: "You are a helpful assistant." },
      ...currentMessages.map((msg: ChatMessage) => ({ role: msg.role, content: msg.content })),
      { role: "user", content: message }
    ];

    let fullResponse = '';
    let chat_topic = '';
    await answerQuestion(
      messages,
      async (token) => {
        fullResponse += token;
        if (!chat_topic && fullResponse.trim().endsWith('.')) {
          chat_topic = fullResponse.trim();
        }
        // Note: We're not using setStreamingMessage here as it's not available in this context
      },
      dominationField,
      chatId,
      customPrompt,
      imageBase64,
      model
    );

    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: fullResponse,
      dominationField,
      chat_topic,
    };
    await storeChatMessage(chatId, 'assistant', fullResponse, dominationField, undefined, chat_topic);

    return { userMessage, assistantMessage };
  } catch (error) {
    console.error('Error in handleSendMessage:', error);
    throw error;
  }
}
