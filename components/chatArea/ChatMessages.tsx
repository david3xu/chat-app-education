import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';
import { ChatMessagesProps } from './types';
import { CopyButton } from './CopyButton';
import { StreamingMessage } from './StreamingMessage';
import { ChatMessage } from '@/lib/chat';

export const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, streamingMessage, isLoading, error }) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, streamingMessage]);

  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.role === 'user';
    const bubbleClass = isUser ? 'bg-gray-200 dark:bg-gray-700 ml-auto' : 'bg-gray-100 dark:bg-gray-600';
    const alignClass = isUser ? 'justify-end' : 'justify-start';

    return (
      <div key={msg.id} className={`flex ${alignClass} mb-4`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-blue-500 dark:bg-blue-600 flex-shrink-0 mr-2">
            {/* Add AI avatar icon here */}
          </div>
        )}
        <div className={`${bubbleClass} rounded-lg p-3 pr-10 max-w-[70%] relative`}>
          <div className="absolute top-2 right-2">
            <CopyButton content={msg.content} messageId={msg.id} />
          </div>
          <ReactMarkdown
            className="text-gray-800 dark:text-white prose dark:prose-invert max-w-none"
            components={{
              h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-2" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-xl font-bold mb-2" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-lg font-bold mb-2" {...props} />,
              p: ({node, ...props}) => <p className="mb-2" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2" {...props} />,
              li: ({node, ...props}) => <li className="mb-1" {...props} />,
              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic mb-2" {...props} />,
              code: ({node, inline, className, children, ...props}: any) => {
                const match = /language-(\w+)/.exec(className || '')
                return !inline && match ? (
                  <div className="relative">
                    <div className="absolute top-2 right-2">
                      <CopyButton content={String(children)} messageId={msg.id} />
                    </div>
                    <pre className="bg-gray-200 dark:bg-gray-800 p-2 pr-10 rounded mt-2 overflow-x-auto">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  </div>
                ) : (
                  <code className="bg-gray-200 dark:bg-gray-800 rounded px-1" {...props}>
                    {children}
                  </code>
                )
              }
            }}
          >
            {msg.content}
          </ReactMarkdown>
          {msg.image && (
            <Image
              src={msg.image}
              alt="User uploaded image"
              width={200}
              height={200}
              className="rounded-lg mt-2"
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map(renderMessage)}
      {isLoading && (
        <div className="flex justify-start items-center mb-4">
          <div className="loader mr-2"></div>
          <div className="text-white">Generating response...</div>
        </div>
      )}
      {streamingMessage && <StreamingMessage content={streamingMessage} />}
      {error && (
        <div className="mb-4 flex justify-center">
          <div className="p-4 rounded-lg bg-red-200 dark:bg-red-600 text-red-800 dark:text-white">
            Error: {error}
          </div>
        </div>
      )}
    </div>
  );
};
