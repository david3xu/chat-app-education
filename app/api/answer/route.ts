import { NextRequest, NextResponse } from 'next/server';
import { answerQuestion } from '@/actions/questionAnswering';
import { fetchChatHistory } from '@/actions/chatHistory';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { message, chatId, dominationField, customPrompt, imageFile } = await req.json();
  
  const fieldToUse = dominationField || 'Relax'; // Use 'Relax' as default if dominationField is not set or empty

  try {
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
          imageFile // Pass the imageFile (base64 string) to answerQuestion
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
    return NextResponse.json({ error: 'An error occurred while processing your request.' }, { status: 500 });
  }
}