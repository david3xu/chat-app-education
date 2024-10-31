import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { MarkdownUploader } from "@/components/MarkdownUploader";
import { ChatMessages } from './ChatMessages';
import { useChat } from './useChat';
import { ChatAreaProps } from './types';
import { ModelSelector, DEFAULT_MODEL } from '@/components/chatArea/ModelSelector';

export const ChatArea: React.FC<ChatAreaProps> = () => {
  const router = useRouter();
  const { chatId } = useParams();
  const { currentChat, streamingMessage, isLoading, isLoadingHistory, error } = useChat();
  const [showUploader, setShowUploader] = useState(false);

  // Redirect if current chat id doesn't match the URL
  React.useEffect(() => {
    if (currentChat && currentChat.id !== chatId) {
      router.push(`/chat/${currentChat.id}`);
    }
  }, [currentChat, chatId, router]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 bg-gray-900 sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <ModelSelector />
        </div>
        <h1 className="text-white text-4xl font-bold cursor-pointer" onClick={() => setShowUploader(!showUploader)}>
          {showUploader ? 'Hide Uploader' : 'Show Uploader'}
        </h1>
      </div>
      
      {showUploader && (
        <div className="sticky top-[72px] z-10 mb-4 bg-gray-800 rounded-lg p-4">
          <MarkdownUploader />
        </div>
      )}

      {isLoadingHistory ? (
        <div className="text-white p-4">Loading chat history...</div>
      ) : (
        <ChatMessages 
          messages={currentChat?.messages || []}
          streamingMessage={streamingMessage}
          isLoading={isLoading}
          error={error}
        />
      )}
    </div>
  );
};
