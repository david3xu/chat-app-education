"use client";

import React, { useState } from 'react';
import { Send } from 'lucide-react';
import TextareaAutosize from "react-textarea-autosize";
import { useChat } from '@/components/ChatContext';

const MessageInput: React.FC = () => {
  const [message, setMessage] = useState("");
  const { addMessageToCurrentChat, setStreamingMessage, updateCurrentChat } = useChat();

  const handleSend = async () => {
    if (!message.trim()) return;

    addMessageToCurrentChat({
      id: Date.now(),
      role: "user",
      content: message,
    });

    const userMessage = message;
    setMessage("");
    setStreamingMessage('');

    try {
      let fullResponse = '';
      const response = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is null');
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = new TextDecoder().decode(value);
        const lines = text.split('\n\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const { token } = JSON.parse(line.slice(6));
            fullResponse += token;
            setStreamingMessage(fullResponse);
          }
        }
      }

      // After streaming is complete, update the chat messages
      updateCurrentChat(prevChat => {
        if (!prevChat) return null;
        return {
          ...prevChat,
          messages: [
            ...prevChat.messages,
            { role: 'assistant', content: fullResponse, id: Date.now() }
          ]
        };
      });
      setStreamingMessage('');

    } catch (error) {
      console.error('Error:', error);
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
        disabled={!message.trim()}
      >
        <Send size={20} />
      </button>
    </div>
  );
};

export default MessageInput;
