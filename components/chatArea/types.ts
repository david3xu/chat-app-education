import { ChatMessage } from '@/lib/chat';

export interface ChatAreaProps {
  // Add any props if needed
}

export interface ChatMessagesProps {
  messages: ChatMessage[];
  streamingMessage: string;
  isLoading: boolean;
  error: string | null;
}

export interface StreamingMessageProps {
  content: string;
}

export interface CopyButtonProps {
  content: string;
  messageId: string;
}

export interface useChatProps {
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  updateMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;
  clearMessages: () => void;
}

export interface Chat {
  id: string;
  name: string;
  messages: ChatMessage[];
  historyLoaded: boolean;
  dominationField: string;
  model?: string;
}
