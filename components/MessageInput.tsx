"use client";

import React, { useState } from 'react';
import { Send } from 'lucide-react';
import TextareaAutosize from "react-textarea-autosize";
import { useChat } from '@/components/ChatContext';
import { ChatMessage } from '@/types/chat';

const MessageInput: React.FC = () => {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { addMessageToCurrentChat, setStreamingMessage, updateCurrentChat, isLoading, setIsLoading, currentChat, userId, dominationField } = useChat();

  const handleSend = async () => {
    if (!message.trim() || !currentChat || isLoading || !dominationField) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      content: message,
    };

    addMessageToCurrentChat(userMessage);
    setMessage("");
    setStreamingMessage('');
    setIsLoading(true);

    try {
      let fullResponse = '';
      const response = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage.content, 
          userId,
          dominationField // Add this line
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${await response.text()}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is null');
      
      let partialData = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = new TextDecoder().decode(value);
        partialData += text;
        
        let startIndex = 0;
        while (true) {
          const endIndex = partialData.indexOf('\n', startIndex);
          if (endIndex === -1) break;
          
          const line = partialData.slice(startIndex, endIndex).trim();
          if (line.startsWith('data: ')) {
            try {
              const { token } = JSON.parse(line.slice(6));
              fullResponse += token;
              setStreamingMessage(fullResponse);
            } catch (parseError) {
              // Ignore parse errors for incomplete JSON
            }
          }
          startIndex = endIndex + 1;
        }
        partialData = partialData.slice(startIndex);
      }

      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant' as const,
        content: fullResponse
      };
      addMessageToCurrentChat(assistantMessage);

    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred while processing your request.');
    } finally {
      setStreamingMessage('');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative bg-gray-800 rounded-lg p-2 mt-4">
      <TextareaAutosize
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="Type your message..."
        className="w-full bg-gray-700 text-white rounded-lg py-3 px-4 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        minRows={1}
        maxRows={5}
      />
      <button
        onClick={handleSend}
        className="absolute right-4 bottom-3 text-white p-2 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!message.trim() || isLoading} // Disable button when loading
      >
        <Send size={20} />
      </button>
    </div>
  );
};

export default MessageInput;
