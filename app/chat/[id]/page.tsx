'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useChat } from '@/components/ChatContext';
import SharedLayout from '@/components/SharedLayout';
import ChatArea from '@/components/ChatArea';
import MessageInput from '@/components/MessageInput';
import { fetchChatHistory } from '@/actions/chatHistory';
import { Chat } from '@/types/chat';  // Add this import at the top of the file

const ChatPage = () => {
  const params = useParams();
  const id = params.id as string;
  const { loadChatHistory, setCurrentChat, chats } = useChat();
  const [isLoading, setIsLoading] = useState(true);
  const [streamingMessage, setStreamingMessage] = useState('');

  useEffect(() => {
    const loadChat = async () => {
      if (id) {
        setIsLoading(true);
        try {
          // Fetch the chat history directly
          const history = await fetchChatHistory(id);
          
          // Create or update the current chat with the fetched history
          const updatedChat: Chat = {
            id,
            messages: history,
            historyLoaded: true,
            name: '', // Provide a default value
            dominationField: '', // Provide a default value
            // Add other necessary properties from the Chat interface
          };
          
          setCurrentChat(updatedChat);
        } catch (error) {
          console.error("Error loading chat history:", error);
          // Handle error (e.g., show error message to user)
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadChat();
  }, [id, setCurrentChat, fetchChatHistory]);

  if (isLoading) {
    return <SharedLayout><div>Loading...</div></SharedLayout>;
  }

  return (
    <SharedLayout>
      <ChatArea />
      <MessageInput setStreamingMessage={setStreamingMessage} />
    </SharedLayout>
  );
};

export default ChatPage;

