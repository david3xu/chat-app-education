"use client";

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { ChatMessage, Chat } from "@/types/chat";
import { fetchChatHistory, storeChatMessage } from '@/actions/chatHistory';
import { answerQuestion } from '@/actions/questionAnswering';
import { v4 as uuidv4 } from 'uuid';

interface ChatContextType {
  chats: Chat[];
  currentChat: Chat | null;
  setCurrentChat: (chat: Chat | null) => void;
  createNewChat: () => void;
  deleteChat: (chatId: string) => void;
  addMessageToCurrentChat: (message: ChatMessage) => void;
  streamingMessage: string;
  setStreamingMessage: React.Dispatch<React.SetStateAction<string>>;
  updateCurrentChat: (updater: (prevChat: Chat | null) => Chat | null) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  isLoadingHistory: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  userId: string;
  handleSendMessage: (message: string) => Promise<void>;
  dominationField: string;
  setDominationField: (field: string) => void;
  // dominationFields: string[]; // Add this line
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dominationField, setDominationField] = useState<string>('Science');

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
            messages: history,
            dominationField: currentChat.dominationField,
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
    if (!dominationField) return;
    const newChat: Chat = {
      id: uuidv4(),
      name: `New Chat ${chats.length + 1}`,
      messages: [],
      userId: userId,
      historyLoaded: false,
      dominationField: dominationField || 'Science'
    };
    setChats(prevChats => [...prevChats, newChat]);
    setCurrentChat(newChat);
  }, [chats.length, userId, dominationField]); // Add userId and dominationField to the dependency array

  const deleteChat = (chatId: string) => {
    setChats(chats.filter(chat => chat.id !== chatId));
    if (currentChat?.id === chatId) {
      setCurrentChat(null);
    }
  };

  const addMessageToCurrentChat = useCallback((message: ChatMessage) => {
    setCurrentChat(prevChat => {
      if (!prevChat) {
        console.error("No current chat to add message to");
        return null;
      }
      const updatedMessages = [...prevChat.messages, message];
      return {
        ...prevChat,
        messages: updatedMessages
      };
    });
  
    setChats(prevChats => {
      return prevChats.map(chat => 
        chat.id === currentChat?.id 
          ? { ...chat, messages: [...chat.messages, message] }
          : chat
      );
    });
  }, [currentChat]);

  const handleSendMessage = async (message: string) => {
    if (!currentChat || !dominationField) return;
    if (!currentChat) {
      console.error("No current chat available");
      return;
    }

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: message,
    };

    addMessageToCurrentChat(userMessage);
    setIsLoading(true);
    setError(null);

    try {
      let fullResponse = '';
      await answerQuestion(
        message,
        (token) => {
          setStreamingMessage((prev) => prev + token);
          fullResponse += token;
        },
        userId,
        currentChat.messages,
        dominationField
      );
      
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: fullResponse
      };
      
      addMessageToCurrentChat(assistantMessage);
      // console.log("After adding assistant message:", currentChat);
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      setError('An error occurred while processing your message.');
    } finally {
      setIsLoading(false);
      setStreamingMessage('');
    }
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
      userId,
      handleSendMessage,
      dominationField,
      setDominationField,
      // dominationFields // Add this line
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

