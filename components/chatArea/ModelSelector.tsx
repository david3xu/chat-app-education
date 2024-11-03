import React, { useEffect, useState, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChat } from '@/components/ChatContext';
import { DEFAULT_MODEL, formatModelName, getFullModelName } from '@/lib/modelUtils';

interface ModelOption {
  value: string;
  label: string;
  details?: {
    parameter_size?: string;
    family?: string;
    quantization_level?: string;
  };
}

export function ModelSelector() {
  const { model, setModel, currentChat } = useChat();
  const [mounted, setMounted] = useState(false);
  const [localModels, setLocalModels] = useState<ModelOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshModels = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/ollama/tags', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      
      if (!data.models || data.models.length === 0) {
        console.warn('No models found');
        setLocalModels([{ value: DEFAULT_MODEL, label: 'Default Model' }]);
        return;
      }

      setLocalModels(data.models);

    } catch (err) {
      console.error('Error fetching models:', err);
      setError('Failed to connect to Ollama server. Please ensure it is running.');
      setLocalModels([{ value: DEFAULT_MODEL, label: 'Default Model' }]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleModelChange = async (value: string) => {
    console.log('Changing model to:', value);
    const fullModelName = getFullModelName(value);
    
    setModel(value);
    localStorage.setItem('selectedModel', value);
    
    if (currentChat?.id) {
      try {
        await Promise.all([
          fetch('/api/ollama/set-model', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: fullModelName })
          }),
          fetch('/api/chat/update-model', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              chatId: currentChat.id,
              model: fullModelName 
            })
          })
        ]);
      } catch (error) {
        console.error('Failed to update model:', error);
      }
    }
  };

  if (!mounted) return <div className="w-[200px]" />;

  return (
    <div className="flex items-center gap-2">
      <Select 
        onValueChange={handleModelChange}
        value={model || DEFAULT_MODEL}
        defaultValue={DEFAULT_MODEL}
      >
        <SelectTrigger 
          className="w-[250px] bg-transparent text-white border-gray-700"
          disabled={isLoading}
        >
          <SelectValue>
            {isLoading ? 'Loading models...' : formatModelName(model || DEFAULT_MODEL)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {localModels.map((model) => (
            <SelectItem 
              key={model.value} 
              value={model.value}
              className="flex justify-between items-center"
            >
              <span>{model.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button 
        onClick={refreshModels}
        className="p-2 rounded-full hover:bg-gray-700 transition-colors"
        title="Refresh models"
        disabled={isLoading}
      >
        <svg 
          className={`w-4 h-4 text-white ${isLoading ? 'animate-spin' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
          />
        </svg>
      </button>
      {error && (
        <span className="text-red-500 text-sm">{error}</span>
      )}
    </div>
  );
}
