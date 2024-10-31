import React, { useState } from 'react';
import { ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';
import { CopyButtonProps } from './types';

export const CopyButton: React.FC<CopyButtonProps> = ({ content, messageId }) => {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const copyToClipboard = (text: string, messageId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  return (
    <button 
      onClick={() => copyToClipboard(content, messageId)}
      className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
      title="Copy message"
    >
      {copiedMessageId === messageId ? (
        <CheckIcon className="h-4 w-4 text-green-400" />
      ) : (
        <ClipboardIcon className="h-4 w-4" />
      )}
    </button>
  );
};
