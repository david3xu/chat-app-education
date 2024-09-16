"use client";

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { ChatMessage, Chat } from "@/actions/stream-message";

interface ChatContextType {
  chats: Chat[];
  currentChat: Chat | null;
  setCurrentChat: (chat: Chat | null) => void;
  createNewChat: () => void;
  deleteChat: (chatId: string) => void;
  addMessageToCurrentChat: (message: ChatMessage) => void;
  streamingMessage: string;
  setStreamingMessage: (message: string) => void;
  updateCurrentChat: (updater: (prevChat: Chat | null) => Chat | null) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedChats = localStorage.getItem('chats');
    if (savedChats) {
      const parsedChats = JSON.parse(savedChats);
      setChats(parsedChats);
      if (parsedChats.length > 0) {
        setCurrentChat(parsedChats[parsedChats.length - 1]);
      } else {
        createNewChat();
      }
    } else {
      createNewChat();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chats', JSON.stringify(chats));
  }, [chats]);

  const createNewChat = useCallback(() => {
    const newChat: Chat = {
      id: Date.now().toString(),
      name: `New Chat ${chats.length + 1}`,
      messages: []
    };
    setChats(prevChats => [...prevChats, newChat]);
    setCurrentChat(newChat);
  }, [chats.length]);

  const deleteChat = (chatId: string) => {
    setChats(chats.filter(chat => chat.id !== chatId));
    if (currentChat?.id === chatId) {
      setCurrentChat(null);
    }
  };

  const addMessageToCurrentChat = (message: ChatMessage) => {
    if (currentChat) {
      const updatedChat = {
        ...currentChat,
        messages: [...currentChat.messages, message]
      };
      setCurrentChat(updatedChat);
      setChats(chats.map(chat => chat.id === currentChat.id ? updatedChat : chat));
    }
  };

  const updateCurrentChat = (updater: (prevChat: Chat | null) => Chat | null) => {
    setCurrentChat(updater);
  };

  return (
    <ChatContext.Provider value={{
      chats,
      currentChat,
      setCurrentChat,
      createNewChat,
      deleteChat,
      addMessageToCurrentChat,
      streamingMessage,
      setStreamingMessage,
      updateCurrentChat,
      isLoading,
      setIsLoading
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
