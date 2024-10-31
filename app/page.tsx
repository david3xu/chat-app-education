"use client";

import SharedLayout from '@/components/SharedLayout';
import { ChatArea } from '@/components/chatArea/ChatArea';
import MessageInput from '@/components/MessageInput';

export default function Home() {
  return (
    <SharedLayout>
      <ChatArea />
      <MessageInput />
    </SharedLayout>
  );
}
