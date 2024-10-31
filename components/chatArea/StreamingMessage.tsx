import React from 'react';
import ReactMarkdown from 'react-markdown';
import { StreamingMessageProps } from './types';

export const StreamingMessage: React.FC<StreamingMessageProps> = ({ content }) => (
  <div className="flex justify-start mb-4">
    <div className="w-8 h-8 rounded-full bg-blue-500 dark:bg-blue-600 flex-shrink-0 mr-2">
      {/* Add AI avatar icon here */}
    </div>
    <div className="bg-gray-100 dark:bg-gray-600 rounded-lg p-3 max-w-[70%]">
      <ReactMarkdown
        className="text-gray-800 dark:text-white prose dark:prose-invert max-w-none"
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && (props as any).inline;
            return isInline ? (
              <code className="bg-gray-200 dark:bg-gray-800 rounded px-1" {...props}>
                {children}
              </code>
            ) : (
              <pre className="bg-gray-200 dark:bg-gray-800 p-2 rounded mt-2 overflow-x-auto">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  </div>
);
