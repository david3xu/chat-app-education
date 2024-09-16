"use client";

import React, { useRef, useEffect, useState } from 'react';
import { useChat } from '@/components/ChatContext';
import { Button } from "@/components/ui/button";
import { MarkdownUploader } from "@/components/MarkdownUploader";

const ChatArea: React.FC = () => {
  const { currentChat, streamingMessage, isLoading } = useChat();
  const [showUploader, setShowUploader] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentChat?.messages, streamingMessage]);

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
        {currentChat?.messages.map((msg) => (
          <div key={msg.id} className={`mb-2 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`p-2 rounded-lg ${
                msg.role === "user" ? "bg-blue-600" : "bg-green-600"
              } text-white max-w-[70%] break-words`}
            >
              {msg.content}
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
              {streamingMessage}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatArea;
