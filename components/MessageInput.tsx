"use client";

import React, { useState } from 'react';
import { useChat } from '@/components/ChatContext';
import TextareaAutosize from "react-textarea-autosize";
import { ChatMessage } from '@/types/chat';
import { Send } from 'react-feather';
import { ChatContextType, Chat } from '@/types/chat';
import { useRouter } from 'next/navigation';

const MessageInput: React.FC = () => {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const {
    updateCurrentChat,
    isLoading,
    setIsLoading,
    currentChat,
    setCurrentChat,
    dominationField,
    customPrompt,
    createNewChat,
    setStreamingMessage,
    handleSendMessage
  } = useChat();
  const router = useRouter();

  const handleSend = async () => {
    if (!message.trim() || isLoading) {
      console.error('Cannot send message: message is empty or still loading');
      return;
    }

    if (!dominationField) {
      console.error('Cannot send message: domination field is not set');
      return;
    }

    let chatToUse = currentChat;

    if (!chatToUse) {
      chatToUse = createNewChat();
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      content: message,
      dominationField,
    };

    updateCurrentChat(prevChat => {
      if (prevChat) {
        return {
          ...prevChat,
          messages: [...prevChat.messages, userMessage]
        };
      }
      return prevChat;
    });

    setMessage("");
    setStreamingMessage?.('');
    setIsLoading?.(true);

    try {
      const response = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage.content, 
          dominationField,
          customPrompt,
          chatId: chatToUse?.id ?? ''
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${await response.text()}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is null');
      
      let streamedResponse = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = new TextDecoder().decode(value);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const { token } = JSON.parse(line.slice(5));
              streamedResponse += token;
              console.log('Updated streamedResponse:', streamedResponse);
              setStreamingMessage(streamedResponse);
              console.log('Received token:', token);
            } catch (parseError) {
              console.error('Error parsing SSE message:', parseError);
            }
          }
        }
      }

      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant' as const,
        content: streamedResponse,
        dominationField,
      };

      updateCurrentChat(prevChat => {
        if (prevChat) {
          return {
            ...prevChat,
            messages: [...prevChat.messages, assistantMessage]
          };
        }
        return prevChat;
      });

    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred while processing your request.');
    } finally {
      setIsLoading?.(false);
      setStreamingMessage?.('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  return (
    <div className="relative bg-gray-800 rounded-lg p-2 mt-4">
      <TextareaAutosize
        value={message}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange(e)}
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