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

  const history = await fetchChatHistory(chatId);

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Implement word-by-word streaming
  answerQuestion(
    [...history, { role: 'user', content: message }],
    async (token) => {
      await writer.write(`data: ${JSON.stringify({ token })}\n\n`);
    },
    dominationField,
    chatId,
    customPrompt
  ).then(() => writer.close()).catch((error) => {
    console.error('Error in answerQuestion:', error);
    writer.abort(error);
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
