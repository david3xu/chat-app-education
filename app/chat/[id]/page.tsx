'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useChat } from '@/components/ChatContext';
import SharedLayout from '@/components/SharedLayout';
import { ChatArea } from '@/components/chatArea/ChatArea';
import MessageInput from '@/components/MessageInput';
import { Chat } from '@/lib/chat';

const ChatPage = () => {
  const params = useParams();
  const id = params.id as string;
  const { setCurrentChat, loadChatHistory, chats } = useChat();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadChat = async () => {
      if (id) {
        setIsLoading(true);
        try {
          const existingChat = chats.find(chat => chat.id === id);
          if (existingChat && !existingChat.historyLoaded) {
            await loadChatHistory(id);
          } else if (!existingChat) {
            // This is a new chat, no need to load history
            const newChat: Chat = {
              id,
              messages: [],
              historyLoaded: true,
              name: 'New Chat',
              dominationField: 'Normal Chat',
            };
            setCurrentChat(newChat);
          }
        } catch (error) {
          console.error("Error loading chat:", error);
          // If there's an error, create a new chat
          const newChat: Chat = {
            id,
            messages: [],
            historyLoaded: true,
            name: 'New Chat',
            dominationField: 'Normal Chat',
          };
          setCurrentChat(newChat);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadChat();
  }, [id, setCurrentChat, loadChatHistory, chats]);

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
