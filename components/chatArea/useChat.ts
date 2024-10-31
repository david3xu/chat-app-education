import { useCallback, useState, useEffect } from 'react';
import { useChat as useGlobalChat } from '@/components/ChatContext';
import { fetchChatHistory, storeChatMessage } from '@/actions/chatHistory';
import { answerQuestion } from '@/actions/questionAnswering';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage } from '@/lib/chat';

export const useChat = () => {
  const {
    currentChat,
    streamingMessage,
    setStreamingMessage,
    isLoading,
    setIsLoading,
    updateCurrentChat,
    error,
    setError,
    dominationField,
    savedCustomPrompt,
    model,
  } = useGlobalChat();

  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const loadChatHistory = useCallback(() => {
    if (currentChat && !currentChat.historyLoaded && retryCount < MAX_RETRIES) {
      setIsLoadingHistory(true);
      fetchChatHistory(currentChat.id)
        .then(history => {
          updateCurrentChat(prevChat => 
            prevChat ? { ...prevChat, messages: history, historyLoaded: true } : null
          );
          setRetryCount(0);
        })
        .catch(error => {
          console.error("Error fetching chat history:", error);
          setError("Failed to load chat history. Retrying...");
          setRetryCount(prev => prev + 1);
        })
        .finally(() => {
          setIsLoadingHistory(false);
        });
    }
  }, [currentChat, updateCurrentChat, setError, retryCount]);

  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  const addMessageToCurrentChat = useCallback((message: ChatMessage) => {
    updateCurrentChat(prevChat => {
      if (!prevChat) return null;
      const updatedChat = { ...prevChat, messages: [...prevChat.messages, message] };
      return updatedChat;
    });
  }, [updateCurrentChat]);

  const handleSendMessage = useCallback(async (message: string, imageFile?: string) => {
    if (!currentChat) return;
    const fieldToUse = dominationField || 'Normal Chat';
    
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: message,
      dominationField: fieldToUse,
      image: imageFile,
    };

    addMessageToCurrentChat(userMessage);
    setIsLoading(true);
    setError(null);
    setStreamingMessage('');

    try {
      await storeChatMessage(currentChat.id, 'user', message, fieldToUse, imageFile ? new File([imageFile], 'image.png', { type: 'image/png' }) : undefined);

      await answerQuestion(
        [...currentChat.messages, userMessage],
        (token) => {
          setStreamingMessage(prev => prev + token);
        },
        dominationField,
        currentChat.id,
        savedCustomPrompt,
        imageFile,
        model
      );

      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: streamingMessage,
        dominationField,
      };
      addMessageToCurrentChat(assistantMessage);

      await storeChatMessage(currentChat.id, 'assistant', streamingMessage, dominationField);
    } catch (error) {
      setError('An error occurred while processing your message.');
    } finally {
      setIsLoading(false);
    }
  }, [currentChat, dominationField, savedCustomPrompt, model, addMessageToCurrentChat, setStreamingMessage, setIsLoading, setError]);

  return {
    currentChat,
    streamingMessage,
    isLoading,
    isLoadingHistory,
    error,
    handleSendMessage,
  };
};
