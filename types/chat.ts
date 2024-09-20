export interface ChatMessage {
  id: string; // Change this from 'number' to 'string'
  role: 'user' | 'assistant';
  content: string;
}

export interface Chat {
  id: string;
  name: string;
  messages: ChatMessage[];
  userId: string;
  historyLoaded?: boolean;
  dominationField: string; // Add this line
}
