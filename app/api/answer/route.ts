import { NextRequest } from 'next/server';
import { answerQuestion } from '@/actions/questionAnswering';
import { fetchChatHistory } from '@/actions/chatHistory';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { message, chatId, dominationField, customPrompt } = await req.json();
  if (!dominationField) {
    return new Response(JSON.stringify({ error: 'Domination field is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendToken = async (token: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
        } catch (error) {
          console.error('Error sending token:', error);
        }
      };

      try {
        let assistantMessage = '';
        const history = await fetchChatHistory(chatId);
        await answerQuestion(
          [...history, { role: 'user', content: message }],
          async (token) => {
            assistantMessage += token;
            await sendToken(token);
          },
          dominationField,
          chatId,
          customPrompt
        );
      } catch (error) {
        console.error('Error in route handler:', error);
        await sendToken('An error occurred while processing your request.');
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
