"use client";

import { useState } from 'react';
import SharedLayout from '@/components/SharedLayout';
import ChatArea from '@/components/ChatArea';
import MessageInput from '@/components/MessageInput';

export default function Home() {
  const [streamingMessage, setStreamingMessage] = useState('');

  return (
    <SharedLayout>
      <ChatArea />
      <MessageInput setStreamingMessage={setStreamingMessage} />
    </SharedLayout>
  );
}
