"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useChatState, ChatStateType } from '@/lib/chatState';
import { fetchChatHistory } from '@/actions/chatHistory';

const ChatContext = createContext<ChatStateType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isClient, setIsClient] = useState(false);
  const chatState = useChatState();

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <ChatContext.Provider value={{
      ...chatState,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    return {
      chats: [],
      currentChat: null,
      setCurrentChat: () => {},
      updateCurrentChat: () => {},
      loadChatHistory: async () => {},
      // Add other properties with default values
    };
  }
  return context;
};

