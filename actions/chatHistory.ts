import { supabase } from './questionAnswering';

export async function fetchChatHistory(userId: string) {
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

export async function storeChatMessage(userId: string, userInput: string | null, assistantResponse: string | null) {
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
      .insert({ user_id: userId, user_input: userInput, assistant_response: assistantResponse });

    if (error) throw error;
  } catch (error) {
    console.error('Error in storeChatMessage:', error);
    throw error;
  }
}


