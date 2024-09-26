'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useChat } from '@/components/ChatContext';
import SharedLayout from '@/components/SharedLayout';
import ChatArea from '@/components/ChatArea';
import MessageInput from '@/components/MessageInput';

const ChatPage = () => {
  const params = useParams();
  const id = params.id as string;
  const { loadChatHistory, setCurrentChat, chats } = useChat();

  useEffect(() => {
    if (id) {
      const chat = chats.find(c => c.id === id);
      if (chat) {
        setCurrentChat(chat);
        if (!chat.historyLoaded) {
          loadChatHistory(id);
        }
      } else {
        // Handle case where chat doesn't exist
        // You might want to redirect to the home page or show an error message
      }
    }
  }, [id, chats, setCurrentChat, loadChatHistory]);

  return (
    <SharedLayout>
      <ChatArea />
      <MessageInput />
    </SharedLayout>
  );
};

export default ChatPage;

