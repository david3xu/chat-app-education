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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';

const ChatArea: React.FC = () => {
  const router = useRouter();
  const { chatId } = useParams();
  const {
    currentChat,
    streamingMessage,
    setStreamingMessage,
    isLoading,
    setIsLoading,
    updateCurrentChat,
    error,
    setError,
    createNewChat,
    dominationField,
    savedCustomPrompt,
    loadChatHistory: loadChatHistoryFunc
  } = useChat();
  const [showUploader, setShowUploader] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  // const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastQuestionRef = useRef<HTMLDivElement>(null);

  // const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // const [streamedResponse, setStreamedResponse] = useState('');

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
    if (lastQuestionRef.current) {
      lastQuestionRef.current.scrollIntoView({ behavior: "smooth" });
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
    if (currentChat && currentChat.id !== chatId) {
      router.push(`/chat/${currentChat.id}`);
    }
  }, [currentChat, chatId, router]);

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
    setStreamingMessage('');

    try {
      await answerQuestion(
        [userMessage],
        (token) => {
          setStreamingMessage(prev => prev + token);
        },
        dominationField,
        currentChat.id,
        savedCustomPrompt
      );

      // After streaming is complete, add the full message to the chat
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: streamingMessage,
        dominationField,
      };
      addMessageToCurrentChat(assistantMessage);
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      setError('An error occurred while processing your message.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderAssistantMessage = (msg: ChatMessage) => {
    const sections = msg.content.split('\n\n');
    const codeBlocks = msg.content.match(/```[\s\S]*?```/g) || [];

    return (
      <div className="mb-4 flex justify-start">
        <div className="p-4 rounded-lg bg-green-600 text-white max-w-[80%] w-full">
          <div className="font-bold mb-2">Assistant</div>
          <Tabs defaultValue="plain" className="w-full">
            <TabsList>
              <TabsTrigger value="plain">Plain Text</TabsTrigger>
              <TabsTrigger value="markdown">Markdown</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
            </TabsList>
            <TabsContent value="plain">
              <pre className="whitespace-pre-wrap">{msg.content}</pre>
            </TabsContent>
            <TabsContent value="markdown">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sections.map((section, index) => (
                  <div key={index} className="bg-green-700 p-4 rounded-lg">
                    <ReactMarkdown className="prose prose-invert max-w-none break-words">
                      {section}
                    </ReactMarkdown>
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="code">
              {codeBlocks.length > 0 ? (
                codeBlocks.map((block, index) => (
                  <pre key={index} className="bg-gray-800 p-2 rounded mb-2 whitespace-pre-wrap overflow-x-auto">
                    <code>{block}</code>
                  </pre>
                ))
              ) : (
                <p>No code blocks found in this message.</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  };

  const renderUserMessage = (msg: ChatMessage, isLastQuestion: boolean) => (
    <div 
      key={msg.id} 
      className="mb-4 flex justify-end"
      ref={isLastQuestion ? lastQuestionRef : null}
    >
      <div className="p-4 rounded-lg bg-blue-600 text-white max-w-[80%] break-words">
        <div className="font-bold mb-2">You</div>
        <ReactMarkdown className="prose prose-invert max-w-none">
          {msg.content}
        </ReactMarkdown>
      </div>
    </div>
  );

  const renderMessage = (msg: ChatMessage, index: number, messages: ChatMessage[]) => {
    const isLastQuestion = msg.role === "user" && 
      (index === messages.length - 1 || messages[index + 1].role === "assistant");
    return msg.role === "user" 
      ? renderUserMessage(msg, isLastQuestion) 
      : renderAssistantMessage(msg);
  };

  const renderStreamingMessage = () => (
    <div className="mb-4 flex justify-start">
      <div className="p-4 rounded-lg bg-green-600 text-white max-w-[80%] break-words">
        <div className="font-bold mb-2">Assistant</div>
        <ReactMarkdown className="prose prose-invert max-w-none">
          {streamingMessage}
        </ReactMarkdown>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 bg-gray-900 sticky top-0 z-20">
        <h1 className="text-white text-4xl font-bold">Chat Area</h1>
        <h1 className="text-white text-4xl font-bold cursor-pointer" onClick={() => setShowUploader(!showUploader)}>
          {showUploader ? 'Hide Uploader' : 'Show Uploader'}
        </h1>
      </div>
      
      {showUploader && (
        <div className="sticky top-[72px] z-10 mb-4 bg-gray-800 rounded-lg p-4">
          <MarkdownUploader />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex-grow mb-4 bg-gray-800 rounded-lg p-4">
          {isLoadingHistory ? (
            <div className="text-white">Loading chat history...</div>
          ) : (
            <>
              {currentChat?.messages?.map((message, index, messages) => (
                <div key={message.id || index}>
                  {renderMessage(message, index, messages)}
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start items-center mb-4">
                  <div className="loader mr-2"></div>
                  <div className="text-white">Generating response...</div>
                </div>
              )}
              {streamingMessage && renderStreamingMessage()}
              {error && (
                <div className="mb-4 flex justify-center">
                  <div className="p-4 rounded-lg bg-red-600 text-white">
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
    </div>
  );
};

export default ChatArea;