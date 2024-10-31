import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { chatId, model } = await request.json();
    
    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('chat_history')
      .update({ model: model })
      .eq('chat_id', chatId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating chat model:', error);
    return NextResponse.json(
      { error: 'Failed to update chat model' }, 
      { status: 500 }
    );
  }
}
