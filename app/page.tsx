"use client";

import { ChatProvider } from '@/components/ChatContext';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import MessageInput from '@/components/MessageInput';

export default function Home() {
  return (
    <ChatProvider>
      <div className="bg-gray-900 min-h-screen flex relative">
        <Sidebar />
        <div className="flex-1 p-4 flex flex-col items-center">
          <div className="w-full max-w-[800px] flex flex-col h-[calc(100vh-100px)]">
            <ChatArea />
            <MessageInput />
          </div>
        </div>
      </div>
    </ChatProvider>
  );
}
