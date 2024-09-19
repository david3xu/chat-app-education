"use server"

// import { ChatMessage } from "@app/chat/page";
// import { openai } from "@ai-sdk/openai";
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from "ai";
import { createStreamableValue } from "ai/rsc";

const openai = createOpenAI({
  // custom settings, e.g.
  baseURL: process.env.OPENAI_URL,
  apiKey: process.env.OPENAI_API_KEY,
  compatibility: 'compatible', // strict mode, enable when using the OpenAI API
});

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

// export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

export interface Chat {
  id: string;
  name: string;
  messages: ChatMessage[];
}

export async function streamMessage(messages: ChatMessage[]) {
  const stream = createStreamableValue("");

  (async () => {
    const { textStream } = await streamText({
      model: openai("llama3:latest"),
      messages: [{ role: "system", content: "You are a helpful assistant." }, ...messages]
    });

    for await (const delta of textStream) {
      stream.update(delta);
    }

    stream.done();
  })();
  
  return { output: stream.value };
}