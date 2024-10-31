import { NextResponse } from 'next/server';
import { supabase } from '@/actions/questionAnswering';

export async function POST(request: Request) {
  try {
    const { model } = await request.json();
    
    // Store the model in Supabase
    const { error } = await supabase
      .from('chat_history')
      .update({ model: model })
      .eq('is_active', true);

    if (error) {
      console.error('Error updating model in database:', error);
      return NextResponse.json(
        { error: 'Failed to update model in database' }, 
        { status: 500 }
      );
    }

    // Store in local storage is already handled by the frontend
    return NextResponse.json({ 
      message: 'Model updated successfully', 
      model 
    });
  } catch (error) {
    console.error('Error in set-model route:', error);
    return NextResponse.json(
      { error: 'Failed to update model' }, 
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('chat_history')
      .select('model')
      .eq('is_active', true)
      .single();

    if (error) throw error;

    return NextResponse.json({ model: data?.model });
  } catch (error) {
    console.error('Error fetching model:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model' }, 
      { status: 500 }
    );
  }
}
