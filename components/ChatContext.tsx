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
    <ChatContext.Provider value={chatState}>
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
      createNewChat: () => ({ id: '', name: '', dominationField: '', messages: [], historyLoaded: false }),
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

