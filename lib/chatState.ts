import { useState, useCallback, useEffect } from 'react';
import { Chat, ChatMessage } from '@/types/chat';
import { fetchChatHistory, storeChatMessage } from '@/actions/chatHistory';
import { answerQuestion } from '@/actions/questionAnswering';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation'; // Change this to use the new App Router

// Update the ChatStateType to include all properties and methods
export type ChatStateType = {
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  currentChat: Chat | null;
  setCurrentChat: React.Dispatch<React.SetStateAction<Chat | null>>;
  createNewChat: () => Chat;
  deleteChat: (chatId: string) => void;
  addMessageToCurrentChat: (message: ChatMessage) => void;
  streamingMessage: string;
  setStreamingMessage: React.Dispatch<React.SetStateAction<string>>;
  updateCurrentChat: (updater: (prevChat: Chat | null) => Chat | null) => void;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isLoadingHistory: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  handleSendMessage: (message: string) => Promise<void>;
  dominationField: string;
  setDominationField: React.Dispatch<React.SetStateAction<string>>;
  savedCustomPrompt: string;
  setSavedCustomPrompt: React.Dispatch<React.SetStateAction<string>>;
  customPrompt: string;
  setCustomPrompt: (newPrompt: string) => void;
  loadChatHistory: (chatId: string) => Promise<void>;
  model: string;
  setModel: React.Dispatch<React.SetStateAction<string>>;
};

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
  const [model, setModel] = useState<string>('llama3.1'); // Add this line

  const router = useRouter();

  const createNewChat = useCallback(() => {
    const newChat: Chat = {
      id: uuidv4(),
      name: `New Chat ${chats.length + 1}`,
      dominationField: dominationField,
      messages: [],
      historyLoaded: false,
    };
    setChats(prevChats => [...prevChats, newChat]);
    setCurrentChat(newChat);
    router?.push(`/chat/${newChat.id}`);
    return newChat;
  }, [chats, router, dominationField]);

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
      dominationField,
    };

    addMessageToCurrentChat(userMessage);
    await storeChatMessage(currentChat.id, 'user', message, dominationField);

    setIsLoading(true);
    setError(null);
    setStreamingMessage('');

    try {
      const messages = [
        { role: "system", content: "You are a helpful assistant." },
        ...currentChat.messages.map(msg => ({ role: msg.role, content: msg.content })),
        { role: "user", content: message }
      ];

      let fullResponse = '';
      await answerQuestion(
        messages,
        (token: string) => {
          fullResponse += token;
          setStreamingMessage(prev => prev + token);
        },
        dominationField,
        currentChat.id,
        savedCustomPrompt
      );

      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: fullResponse,
        dominationField,
      };
      addMessageToCurrentChat(assistantMessage);
      await storeChatMessage(currentChat.id, 'assistant', fullResponse, dominationField);
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
    setChats, // Add this line
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
    model, // Add this line
    setModel, // Add this line
  };
};
