'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useChat } from '@/components/ChatContext';
import ChatArea from '@/components/ChatArea';
import MessageInput from '@/components/MessageInput';

const ChatPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { loadChatHistory, setCurrentChat, chats } = useChat();

  useEffect(() => {
    if (id && typeof id === 'string') {
      const chat = chats.find(c => c.id === id);
      if (chat) {
        setCurrentChat(chat);
        if (!chat.historyLoaded) {
          loadChatHistory(id);
        }
      } else {
        // Handle case where chat doesn't exist
        router.push('/');
      }
    }
  }, [id, chats, setCurrentChat, loadChatHistory, router]);

  return (
    <div>
      <ChatArea />
      <MessageInput />
    </div>
  );
};

export default ChatPage;
