"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useChatState, ChatStateType } from '@/lib/chatState';

const ChatContext = createContext<ChatStateType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isClient, setIsClient] = useState(false);
  const chatState = useChatState();

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <ChatContext.Provider value={isClient ? chatState : undefined}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    // Instead of throwing an error, return a default state
    return {} as ChatStateType;
  }
  return context;
};

