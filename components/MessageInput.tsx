"use client";

import { Button } from '@/components/ui/button'; // Add this import at the top of your file
import React, { useState, useRef } from 'react';
import { useChat } from '@/components/ChatContext';
import TextareaAutosize from "react-textarea-autosize";
import { ChatMessage } from '@/types/chat';
import { Send } from 'react-feather';
import { Plus } from 'react-feather';
import Image from 'next/image'; // Add this import

const MessageInput: React.FC = () => {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const {
    updateCurrentChat,
    isLoading,
    setIsLoading,
    currentChat,
    dominationField,
    customPrompt,
    createNewChat,
    setStreamingMessage,
  } = useChat();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if ((!message.trim() && !selectedImage) || isLoading || !dominationField) {
      return;
    }

    let chatToUse = currentChat || createNewChat();

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      dominationField,
      image: selectedImage ? URL.createObjectURL(selectedImage) : undefined,
    };

    updateCurrentChat(prevChat => ({
      ...prevChat!,
      messages: [...prevChat!.messages, userMessage]
    }));

    setMessage("");
    setSelectedImage(null);
    setStreamingMessage('');
    setIsLoading(true);

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
        throw new Error(`Server responded with ${response.status}`);
      }

      const reader = response.body!.getReader();
      let streamedResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = new TextDecoder().decode(value);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const { token } = JSON.parse(line.slice(6)); // Changed from 5 to 6
              streamedResponse += token;
              setStreamingMessage(streamedResponse);
            } catch (parseError) {
              console.error('Error parsing JSON:', parseError);
            }
          }
        }
      }

      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: streamedResponse,
        dominationField,
      };

      updateCurrentChat(prevChat => ({
        ...prevChat!,
        messages: [...prevChat!.messages, assistantMessage]
      }));

    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred while processing your request.');
    } finally {
      setIsLoading(false);
      setStreamingMessage('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  return (
    <div className="relative bg-gray-800 rounded-lg p-2 mt-4">
      <div className="flex flex-col">
        {selectedImage && (
          <div className="mb-2">
            <Image
              src={URL.createObjectURL(selectedImage)}
              alt="Selected image"
              width={100}
              height={100}
              className="rounded-lg object-cover"
              style={{ width: 'auto', height: 'auto', maxWidth: '100px', maxHeight: '100px' }}
            />
          </div>
        )}
        <div className="flex items-center">
          <Button
            onClick={handleImageUpload}
            className="mr-2 p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors duration-200"
          >
            <Plus size={20} />
          </Button>
          <TextareaAutosize
            value={message}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Send a message..."
            className="w-full bg-gray-700 text-white rounded-lg py-3 px-4 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            minRows={1}
            maxRows={5}
          />
          <Button
            onClick={() => handleSend()}
            className="absolute right-4 bottom-3 text-white p-2 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!message.trim() || isLoading}
          >
            <Send size={20} />
          </Button>
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </div>
  );
};

export default MessageInput;