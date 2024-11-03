"use client";

import React, { useState, useEffect } from 'react';
import { useChat } from '@/components/ChatContext';
import { Plus, Trash2, X, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dominationFieldsData } from '../lib/data/domFields';
import CustomPromptArea from './CustomPromptArea';
import { ChatContextType } from '@/lib/chat';
import { Button } from './ui/button';

const Sidebar: React.FC = () => {
  const {
    chats,
    currentChat,
    setCurrentChat,
    createNewChat,
    deleteChat,
    dominationField,
    setDominationField,
    loadChatHistory,
    customPrompt,
    setCustomPrompt
  } = useChat();

  const [sidebarVisible, setSidebarVisible] = useState(() => {
    // Only access window during client-side execution
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    // Default to true for server-side rendering
    return true;
  });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleResize = () => {
      setSidebarVisible(window.innerWidth >= 768);
    };
    // Initial check
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!mounted) {
    return null;
  }

  const handleCreateNewChat = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (createNewChat) {
      const newChat = createNewChat();
      if (newChat && setCurrentChat) {
        setCurrentChat(newChat);
      }
    }
  };

  const isCreateNewChatEnabled = true;

  // Render the menu button when sidebar is hidden
  if (!sidebarVisible) {
    return (
      <Button
        onClick={() => setSidebarVisible(true)}
        className="fixed top-4 left-4 p-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 z-50 transition-colors"
        size="icon"
      >
        <ChevronRight className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="w-[300px] bg-gray-800 p-4 relative flex flex-col h-screen overflow-hidden">
      <Button
        onClick={() => setSidebarVisible(false)}
        className="absolute top-4 right-4 text-white hover:bg-gray-700 transition-colors"
        size="icon"
        variant="ghost"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>
      
      <div className="flex flex-col items-center mb-4 mt-12">
        <h2 className="text-white text-xl font-bold mb-2">Chats</h2>
        
        <Select 
          onValueChange={(value) => setDominationField && setDominationField(value)} 
          value={dominationField || 'Normal Chat'} 
          defaultValue="Normal Chat"
        >
          <SelectTrigger className="w-full mb-2">
            <SelectValue placeholder="Select Domination Field" />
          </SelectTrigger>
          <SelectContent>
            {dominationFieldsData.map((field) => (
              <SelectItem key={field.value} value={field.value}>
                {field.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {isCreateNewChatEnabled && (
          <button
            onClick={handleCreateNewChat}
            className="text-white bg-blue-500 p-2 rounded-full hover:bg-blue-600 w-full"
          >
            <Plus size={20} className="inline mr-2" /> New Chat
          </button>
        )}
      </div>
      
      <div className="flex-grow overflow-y-auto">
        {chats.length > 0 ? (
          [...chats].reverse().map(chat => (
            <div
              key={chat.id}
              className={`p-2 rounded cursor-pointer relative group flex items-center justify-between ${
                currentChat?.id === chat.id ? 'bg-blue-600' : ''
              }`}
              onClick={() => {
                setCurrentChat && setCurrentChat(chat);
                loadChatHistory && loadChatHistory(chat.id);
              }}
            >
              <span className="text-white">{chat.name || `Chat ${chat.id.slice(0, 8)}`}</span>
              <span className="text-gray-400 text-xs">{chat.id.slice(0, 8)}</span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button 
                    className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 size={16} />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Chat</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this chat? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteChat && deleteChat(chat.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))
        ) : (
          <div className="text-white text-center">No chats available</div>
        )}
      </div>

      <CustomPromptArea />
    </div>
  );
};

export default Sidebar;
