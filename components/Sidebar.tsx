"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { useChat } from '@/components/ChatContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dominationFieldsData } from '../lib/data/domFields';
import CustomPromptArea from './CustomPromptArea';

const Sidebar: React.FC = () => {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const { chats, currentChat, setCurrentChat, createNewChat, deleteChat, dominationField, setDominationField } = useChat();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarVisible(false);
      } else {
        setSidebarVisible(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!dominationField) {
      setDominationField('Science');
    }
  }, [dominationField, setDominationField]);

  useEffect(() => {
    if (!dominationField && dominationFieldsData.length > 0) {
      setDominationField(dominationFieldsData[0].value);
    }
  }, [dominationField, setDominationField]);

  if (!sidebarVisible) return null;

  return (
    <div className="w-[300px] bg-gray-800 p-4 relative flex flex-col h-screen overflow-hidden">
      <button
        onClick={() => setSidebarVisible(false)}
        className="absolute top-4 right-4 text-white"
      >
        <X size={24} />
      </button>
      <div className="flex flex-col items-center mb-4 mt-12">
        <h2 className="text-white text-xl font-bold mb-2">Chats</h2>
        <Select 
          onValueChange={setDominationField} 
          value={dominationField} 
          defaultValue={dominationFieldsData[0]?.value}
          required
        >
          <SelectTrigger className="w-full mb-2">
            <SelectValue placeholder="Select field" />
          </SelectTrigger>
          <SelectContent>
            {dominationFieldsData.map((field) => (
              <SelectItem key={field.value} value={field.value}>
                {field.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          onClick={createNewChat}
          className="text-white bg-blue-500 p-2 rounded-full hover:bg-blue-600 w-full"
        >
          <Plus size={20} className="inline mr-2" /> New Chat
        </button>
      </div>
      
      <div className="flex-grow overflow-y-auto">
        {[...chats].reverse().map(chat => (
          <div
            key={chat.id}
            className="p-2 rounded cursor-pointer relative group flex items-center justify-between"
            onClick={() => setCurrentChat(chat)}
          >
            <span className="text-white">{chat.name}</span>
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
                  <AlertDialogAction onClick={() => deleteChat(chat.id)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>

      <CustomPromptArea />
    </div>
  );
};

export default Sidebar;
