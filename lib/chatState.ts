import { useState, useCallback, useEffect } from 'react';
import { Chat, ChatMessage } from '@/types/chat';
import { fetchChatHistory, storeChatMessage } from '@/actions/chatHistory';
import { answerQuestion } from '@/actions/questionAnswering';
import { v4 as uuidv4 } from 'uuid';

export const useChatState = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dominationField, setDominationField] = useState<string>('Science');
  const [savedCustomPrompt, setSavedCustomPrompt] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  const createNewChat = useCallback(() => {
    const newChat: Chat = {
      id: uuidv4(),
      name: `New Chat ${chats.length + 1}`,
      dominationField: '0',
      messages: [],
      historyLoaded: false,
    };
    setChats(prevChats => [...prevChats, newChat]);
    setCurrentChat(newChat);
  }, [chats]);

  const deleteChat = useCallback((chatId: string) => {
    setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
    if (currentChat && currentChat.id === chatId) {
      setCurrentChat(null);
    }
  }, [currentChat]);

  const addMessageToCurrentChat = useCallback((message: ChatMessage) => {
    setCurrentChat(prevChat => {
      if (!prevChat) return null;
      const updatedMessages = [...prevChat.messages, message];
      return { ...prevChat, messages: updatedMessages };
    });
  }, []);

  const updateCurrentChat = useCallback((updater: (prevChat: Chat | null) => Chat | null) => {
    setCurrentChat(prevChat => {
      const updatedChat = updater(prevChat);
      if (updatedChat) {
        setChats(prevChats => 
          prevChats.map(chat => 
            chat.id === updatedChat.id ? updatedChat : chat
          )
        );
      }
      return updatedChat;
    });
  }, []);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!currentChat || !dominationField) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: message,
    };

    addMessageToCurrentChat(userMessage);
    setIsLoading(true);
    setError(null);

    try {
      await answerQuestion(
        message,
        (token) => setStreamingMessage(prev => prev + token),
        currentChat.messages,
        dominationField,
        currentChat.id,
        savedCustomPrompt
      );
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      setError('An error occurred while processing your message.');
    } finally {
      setIsLoading(false);
      setStreamingMessage('');
    }
  }, [currentChat, dominationField, savedCustomPrompt, addMessageToCurrentChat]);

  const loadChatHistory = useCallback(async (chatId: string) => {
    setIsLoadingHistory(true);
    try {
      const history = await fetchChatHistory(chatId);
      updateCurrentChat(prevChat => {
        if (prevChat && prevChat.id === chatId) {
          return { ...prevChat, messages: history, historyLoaded: true };
        }
        return prevChat;
      });
    } catch (error) {
      console.error('Error loading chat history:', error);
      setError('Failed to load chat history.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [updateCurrentChat]);

  const handleSetCustomPrompt = useCallback((newPrompt: string) => {
    setCustomPrompt(newPrompt);
    setSavedCustomPrompt(newPrompt);
  }, []);

  return {
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
    handleSendMessage,
    dominationField,
    setDominationField,
    savedCustomPrompt,
    setSavedCustomPrompt,
    customPrompt,
    setCustomPrompt: handleSetCustomPrompt,
    loadChatHistory,
  };
};
