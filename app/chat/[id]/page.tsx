'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChat } from '@/components/ChatContext';
import SharedLayout from '@/components/SharedLayout';
import ChatArea from '@/components/ChatArea';
import MessageInput from '@/components/MessageInput';
import { fetchChatHistory } from '@/actions/chatHistory';
import { Chat } from '@/types/chat';

const ChatPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { setCurrentChat, currentChat, loadChatHistory } = useChat();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadChat = async () => {
      if (id) {
        setIsLoading(true);
        try {
          await loadChatHistory(id);
        } catch (error) {
          console.error("Error loading chat history:", error);
          // If there's an error, create a new chat
          const newChat: Chat = {
            id,
            messages: [],
            historyLoaded: true,
            name: 'New Chat',
            dominationField: 'Relax',
          };
          setCurrentChat(newChat);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadChat();
  }, [id, setCurrentChat, loadChatHistory]);

  if (isLoading) {
    return <SharedLayout><div>Loading...</div></SharedLayout>;
  }

  return (
    <SharedLayout>
      <ChatArea />
      <MessageInput />
    </SharedLayout>
  );
};

export default ChatPage;

