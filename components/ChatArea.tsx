"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useChat } from '@/components/ChatContext';
import { Button } from "@/components/ui/button";
import { MarkdownUploader } from "@/components/MarkdownUploader";
import { fetchChatHistory } from '@/actions/chatHistory';
import { answerQuestion } from '@/actions/questionAnswering';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, Chat } from '@/types/chat';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactMarkdown from 'react-markdown';
import { ChatContextType } from '@/types/chat';

const ChatArea: React.FC = () => {
  const {
    currentChat, 
    streamingMessage, 
    isLoading, 
    updateCurrentChat, 
    error,
    setIsLoading,
    setError,
    setStreamingMessage,
    createNewChat,
    dominationField,
    savedCustomPrompt = '', // Provide a default value
  } = useChat() as unknown as ChatContextType; // Use ChatContextType instead of any
  const [showUploader, setShowUploader] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentChat, currentChat?.messages, streamingMessage]);

  useEffect(() => {
    if (currentChat && !currentChat.historyLoaded) {
      setIsLoadingHistory(true);
      fetchChatHistory(currentChat.id)
        .then(history => {
          updateCurrentChat(prevChat => {
            if (prevChat) {
              return { ...prevChat, messages: history, historyLoaded: true };
            }
            return prevChat;
          });
        })
        .catch(error => {
          console.error("Error fetching chat history:", error);
          setError("Failed to load chat history. Please try again.");
        })
        .finally(() => {
          setIsLoadingHistory(false);
        });
    }
  }, [currentChat, updateCurrentChat, setError]);

  useEffect(() => {
    console.log("Current chat messages:", currentChat?.messages);
  }, [currentChat?.messages]);

  useEffect(() => {
    console.log('Streaming message updated:', streamingMessage);
  }, [streamingMessage]);

  const addMessageToCurrentChat = (message: ChatMessage) => {
    updateCurrentChat(prevChat => {
      if (!prevChat) return null;
      return { ...prevChat, messages: [...prevChat.messages, message] };
    });
  };

  const handleSendMessage = async (message: string) => {
    if (!dominationField || !currentChat) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: message,
      dominationField,
    };

    addMessageToCurrentChat(userMessage);
    setIsLoading(true);
    setError(null);

    try {
      await answerQuestion(
        currentChat.messages.map(msg => ({ role: msg.role, content: msg.content })),
        (token) => {
          setStreamingMessage(prev => prev + token);
          // Force a small delay to make the streaming more visible
          return new Promise(resolve => setTimeout(resolve, 10));
        },
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
  };

  const handleStreamingMessage = useCallback((token: string) => {
    setStreamingMessage(prev => prev + token);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex justify-between items-center mb-4">
        {!showUploader && <h1 className="text-white text-4xl font-bold">Chat Area</h1>}
        <h1 className="text-white text-4xl font-bold" onClick={() => setShowUploader(!showUploader)}>
          {showUploader ? 'Hide Uploader' : 'Show Uploader'}
        </h1>
      </div>
      
      {showUploader && (
        <div className="mb-4 bg-gray-800 rounded-lg p-4">
          <MarkdownUploader />
        </div>
      )}

      {showUploader && <h1 className="text-white text-4xl font-bold mb-4">Chat Area</h1>}

      <div className="flex-grow overflow-y-auto mb-4 bg-gray-800 rounded-lg p-4">
        {isLoadingHistory ? (
          <div className="text-white">Loading chat history...</div>
        ) : (
          <>
            {currentChat?.messages?.map((msg: ChatMessage) => (
              <div key={msg.id} className={`mb-2 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`p-2 rounded-lg ${
                    msg.role === "user" ? "bg-blue-600" : "bg-green-600"
                  } text-white max-w-[70%] break-words`}
                >
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start items-center mb-2">
                <div className="loader mr-2"></div>
                <div className="text-white">Generating response...</div>
              </div>
            )}
            {streamingMessage && (
              <div className="mb-2 flex justify-start">
                <div className="p-2 rounded-lg bg-green-600 text-white max-w-[70%] break-words">
                  <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                </div>
              </div>
            )}
            {error && (
              <div className="mb-2 flex justify-center">
                <div className="p-2 rounded-lg bg-red-600 text-white">
                  Error: {error}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
            {error && (
              <Button onClick={loadChatHistory} disabled={isLoadingHistory || retryCount >= MAX_RETRIES}>
                Retry Loading History
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChatArea;