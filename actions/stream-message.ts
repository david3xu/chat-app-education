// "use server"

// import { createOpenAI } from '@ai-sdk/openai';
// import { streamText } from "ai";
// import { createStreamableValue } from "ai/rsc";
// import { ChatMessage } from '@/types/chat';

// const openai = createOpenAI({
//   baseURL: process.env.OPENAI_URL,
//   apiKey: process.env.OPENAI_API_KEY,
//   compatibility: 'compatible',
// });

// export async function streamMessage(messages: ChatMessage[], setStreamingMessage: (message: string) => void) {
//   const stream = createStreamableValue("");

//   (async () => {
//     const { textStream } = await streamText({
//       model: openai("llama3:latest"),
//       messages: [{ role: "system", content: "You are a helpful assistant." }, ...messages]
//     });

//     for await (const delta of textStream) {
//       stream.update(delta);
//       setStreamingMessage(String(stream.value)); // Ensure stream.value is a string
//     }

//     stream.done();
//   })();
  
//   return { output: stream.value };
// }