"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useChatState, ChatStateType } from '@/lib/chatState';

const ChatContext = createContext<ChatStateType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isClient, setIsClient] = useState(false);
  const [dominationField, setDominationField] = useState<string>('');
  const chatState = useChatState();

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <ChatContext.Provider value={{
      ...chatState,
      dominationField,
      setDominationField,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatStateType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    // Return a default object that matches ChatStateType
    return {
      chats: [],
      setChats: () => {},
      currentChat: null,
      setCurrentChat: () => {},
      createNewChat: () => {
        const newChat = { 
          id: Date.now().toString(), 
          name: `New Chat ${Date.now()}`, 
          dominationField: '', 
          messages: [], 
          historyLoaded: true 
        };
        return newChat;
      },
      deleteChat: () => {},
      addMessageToCurrentChat: () => {},
      streamingMessage: '',
      setStreamingMessage: () => {},
      updateCurrentChat: () => {},
      isLoading: false,
      setIsLoading: () => {},
      isLoadingHistory: false,
      error: null,
      setError: () => {},
      handleSendMessage: async () => {},
      dominationField: '',
      setDominationField: () => {},
      savedCustomPrompt: '',
      setSavedCustomPrompt: () => {},
      customPrompt: '',
      setCustomPrompt: () => {},
      loadChatHistory: async () => {},
      model: '',
      setModel: () => {},
    };
  }
  return context;
};

