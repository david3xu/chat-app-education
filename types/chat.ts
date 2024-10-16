export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  dominationField: string;
  image?: string; // Base64 encoded image
  code?: string;
}

export interface Chat {
  id: string;
  name: string;
  messages: ChatMessage[];
  historyLoaded: boolean; // Change this line
  dominationField: string;
  customPrompt?: string;
  codeBlocks?: string[];
}

export interface ChatContextType {
  currentChat: Chat | null;
  streamingMessage: string;
  isLoading: boolean;
  setCurrentChat: React.Dispatch<React.SetStateAction<Chat | null>>;
  isLoadingHistory: boolean;
  setIsLoadingHistory: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setStreamingMessage: React.Dispatch<React.SetStateAction<string>>;
  createNewChat: () => Chat;
  dominationField: string;
  setDominationField: (value: string) => void;
  savedCustomPrompt: string;
  setSavedCustomPrompt: (prompt: string) => void;
  addMessageToCurrentChat: (message: ChatMessage) => void;
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  deleteChat: (id: string) => void;
  loadChatHistory: (chatId: string) => void;
  model: string;
  setModel: React.Dispatch<React.SetStateAction<string>>;
  updateCurrentChat: (updater: (prevChat: Chat | null) => Chat | null) => void;
  customPrompt: string;
  setCustomPrompt: React.Dispatch<React.SetStateAction<string>>;
  handleSendMessage: (message: string) => void;
  chatId: string;
}

interface UpdatedChat {
  id: string;
  messages: ChatMessage[];
  historyLoaded: boolean;
  name?: string;
  dominationField: string;
  customPrompt?: string;
}

export interface Message {
  // ... message properties
}

export interface MessageData {
  chat_id: string;
  domination_field: string;
  image_url?: string;
  user_content?: string;
  user_role?: string;
  assistant_content?: string;
  assistant_role?: string;
}