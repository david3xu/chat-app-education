import { NextRequest, NextResponse } from 'next/server';
import { answerQuestion } from '@/actions/questionAnswering';
import { fetchChatHistory } from '@/actions/chatHistory';
import { getFullModelName } from '@/lib/modelUtils';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { message, chatId, dominationField, customPrompt, imageFile, model } = await req.json();
    
    console.log('API route - Received request with:', {
      model,
      fullModelName: getFullModelName(model),
      chatId,
      dominationField
    });
    
    const fieldToUse = dominationField || 'Normal Chat';

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendToken = async (token: string) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
        };

        const history = await fetchChatHistory(chatId);
        
        await answerQuestion(
          [...history, { role: 'user', content: message }],
          sendToken,
          fieldToUse,
          chatId,
          customPrompt,
          imageFile,
          model
        );

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in route handler:', error);
    let errorMessage = 'An error occurred while processing your request.';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('tsquery stack too small')) {
        errorMessage = 'The search query is too complex. Please try a simpler query.';
        statusCode = 400;
      } else if (error.message.includes('Connection error')) {
        errorMessage = 'Unable to connect to the AI server. Please check your connection and try again.';
        statusCode = 503;
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
