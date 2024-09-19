"use client";

import React, { useRef, useEffect, useState } from 'react';
import { useChat } from '@/components/ChatContext';
import { Button } from "@/components/ui/button";
import { MarkdownUploader } from "@/components/MarkdownUploader";
import { fetchChatHistory } from '@/actions/chatHistory';

const ChatArea: React.FC = () => {
  const { currentChat, streamingMessage, isLoading, updateCurrentChat, isLoadingHistory, error } = useChat();
  const [showUploader, setShowUploader] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("Current chat:", currentChat);
    console.log("Current chat messages:", currentChat?.messages);
    console.log("Streaming message:", streamingMessage);
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentChat?.messages, streamingMessage]);

  useEffect(() => {
    if (currentChat && !currentChat.historyLoaded) {
      console.log("Fetching chat history for chat:", currentChat.id);
      fetchChatHistory(currentChat.id).then(history => {
        console.log("Fetched history:", history);
        updateCurrentChat(prevChat => {
          if (!prevChat) return null;
          const updatedChat = {
            ...prevChat,
            messages: history.map(msg => ({
              ...msg,
              role: msg.role as "user" | "assistant"
            })),
            historyLoaded: true
          };
          console.log("Updated chat after history fetch:", updatedChat);
          return updatedChat;
        });
      });
    }
  }, [currentChat, updateCurrentChat]);

  // Add this new useEffect to log messages whenever they change
  useEffect(() => {
    console.log("Messages changed:", currentChat?.messages);
  }, [currentChat?.messages]);

  return (
    <div className="flex flex-col h-full">
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
            {currentChat?.messages.map((msg) => {
              console.log("Rendering message:", msg);
              return (
                <div key={msg.id} className={`mb-2 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`p-2 rounded-lg ${
                      msg.role === "user" ? "bg-blue-600" : "bg-green-600"
                    } text-white max-w-[70%] break-words`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex justify-start items-center mb-2">
                <div className="loader mr-2"></div>
                <div className="text-white">Generating response...</div>
              </div>
            )}
            {streamingMessage && (
              <div className="mb-2 flex justify-start">
                <div className="p-2 rounded-lg bg-green-600 text-white max-w-[70%] break-words">
                  {streamingMessage}
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
          </>
        )}
      </div>
    </div>
  );
};

export default ChatArea;
