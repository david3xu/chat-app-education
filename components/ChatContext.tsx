"use client";

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { ChatMessage, Chat } from "@/types/chat";
import { fetchChatHistory, storeChatMessage } from '@/actions/chatHistory';
import { v4 as uuidv4 } from 'uuid';

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
  isLoadingHistory: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  userId: string;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    // This effect runs only on the client side
    const storedUserId = localStorage.getItem('userId');
    const newUserId = storedUserId || uuidv4();
    setUserId(newUserId);
    localStorage.setItem('userId', newUserId);
  }, []);

  useEffect(() => {
    localStorage.setItem('userId', userId);
  }, [userId]);

  const updateCurrentChat = (updater: (prevChat: Chat | null) => Chat | null) => {
    setCurrentChat(updater);
  };

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

  useEffect(() => {
    const loadChatHistory = async () => {
      if (currentChat && !currentChat.historyLoaded) {
        setIsLoadingHistory(true);
        try {
          const history = await fetchChatHistory(currentChat.id);
          setCurrentChat(prevChat => ({
            ...prevChat!,
            messages: history.map(msg => ({
              ...msg,
              role: msg.role as "user" | "assistant"
            })),
            historyLoaded: true
          }));
        } catch (error) {
          console.error('Error fetching chat history:', error);
        } finally {
          setIsLoadingHistory(false);
        }
      }
    };

    loadChatHistory();
  }, [currentChat]);

  const createNewChat = useCallback(() => {
    const newChat: Chat = {
      id: uuidv4(),
      name: `New Chat ${chats.length + 1}`,
      messages: [],
      userId: userId,
      historyLoaded: false
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
    setCurrentChat(prevChat => {
      if (!prevChat) {
        console.error("No current chat to add message to");
        return null;
      }
      console.log("Before adding message:", prevChat.messages);
      const updatedMessages = [...prevChat.messages, message];
      console.log("After adding message:", updatedMessages);
      return {
        ...prevChat,
        messages: updatedMessages
      };
    });
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
      setIsLoading,
      isLoadingHistory,
      error,
      setError,
      userId
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

