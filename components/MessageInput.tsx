"use client";

import { Button } from '@/components/ui/button';
import React, { useState, useRef } from 'react';
import { useChat } from '@/components/ChatContext';
import TextareaAutosize from "react-textarea-autosize";
import { ChatMessage } from '@/types/chat';
import { Send, Plus } from 'react-feather';
import Image from 'next/image';
import { encodeImageToBase64 } from '@/lib/fileUtils'; // Make sure this utility function exists
import { useRouter } from 'next/navigation';

const MessageInput: React.FC = () => {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if ((!message.trim() && !selectedImage) || isLoading) {
      return;
    }

    const fieldToUse = dominationField || 'Relax';
    let chatToUse = currentChat;

    if (!chatToUse) {
      chatToUse = createNewChat();
    }

    const imageBase64 = selectedImage;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      dominationField: fieldToUse,
      image: imageBase64 || undefined,
    };

    updateCurrentChat(prevChat => ({
      ...prevChat!,
      messages: [...prevChat!.messages, userMessage]
    }));

    setMessage("");
    setSelectedImage(null);
    setPreviewUrl(null);
    setStreamingMessage('');
    setIsLoading(true);

    const MAX_RETRIES = 3;
    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        const response = await fetch('/api/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: message, 
            dominationField: fieldToUse,
            customPrompt,
            chatId: chatToUse.id,
            imageFile: imageBase64
          }),
        });

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}: ${await response.text()}`);
        }

        const reader = response.body!.getReader();
        let streamedResponse = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          
          const text = new TextDecoder().decode(value);
          const lines = text.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6).trim();
                if (jsonStr) {
                  const { token } = JSON.parse(jsonStr);
                  streamedResponse += token;
                  setStreamingMessage(streamedResponse);
                }
              } catch (parseError) {
                console.error('Error parsing JSON:', parseError);
                console.error('Problematic line:', line);
              }
            }
          }
        }

        if (streamedResponse) {
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
          break; // Success, exit the retry loop
        } else {
          throw new Error('No valid response received from the server');
        }

      } catch (error) {
        console.error('Error in handleSend:', error);
        retries++;
        if (retries === MAX_RETRIES) {
          setError('An error occurred while sending your message. Please try again.');
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
        }
      }
    }

    setIsLoading(false);
    setStreamingMessage('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Generate a new chat address when typing
    if (!currentChat) {
      const newChatId = createNewChat().id;
      router.push(`/chat/${newChatId}`);
    }
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64Image = await encodeImageToBase64(file);
      setSelectedImage(base64Image);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  return (
    <div className="relative bg-gray-800 rounded-lg p-2 mt-4">
      <div className="flex flex-col">
        {previewUrl && (
          <div className="mb-2">
            <Image
              src={previewUrl}
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