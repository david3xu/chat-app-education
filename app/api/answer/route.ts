import { NextRequest } from 'next/server';
import { answerQuestion } from '@/actions/questionAnswering';
import { storeChatMessage } from '@/actions/chatHistory';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { message, userId } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendToken = async (token: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
        } catch (error) {
          console.error('Error sending token:', error);
          // If the controller is closed, we can't do anything more
        }
      };

      try {
        let assistantMessage = '';
        await answerQuestion(message, async (token) => {
          assistantMessage += token;
          await sendToken(token);
        }, userId);
        // Remove this line as it's now handled in answerQuestion
        // await storeChatMessage(userId, assistantMessage, 'assistant');
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
