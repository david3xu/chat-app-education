export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

export interface Chat {
  id: string;
  name: string;
  messages: ChatMessage[];
  userId: string;
  historyLoaded?: boolean;
}
