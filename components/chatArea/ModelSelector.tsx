import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChat } from '@/components/ChatContext';
import { getOllamaModels } from '@/lib/ollama';
import { DEFAULT_MODEL, formatModelName, getFullModelName } from '@/lib/modelUtils';

const OLLAMA_API_URL = process.env.NEXT_PUBLIC_OLLAMA_API_URL || 'http://localhost:11434';

export function ModelSelector() {
  const { model, setModel, currentChat } = useChat();
  const [mounted, setMounted] = useState(false);
  const [localModels, setLocalModels] = useState<Array<{ value: string; label: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchOllamaModels = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/ollama/tags', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch models');
        }

        const data = await response.json();
        const ollamaModels = data.models;

        if (!ollamaModels || ollamaModels.length === 0) {
          console.warn('No models found, using default model');
          setLocalModels([{ value: DEFAULT_MODEL, label: 'Default Model' }]);
          return;
        }

        const formattedOllamaModels = ollamaModels.map((m: { name: string }) => ({
          value: m.name.replace(':latest', ''),
          label: m.name.replace(':latest', ''),
        }));
        setLocalModels(formattedOllamaModels);
        setRetryCount(0);
      } catch (err) {
        console.error('Error fetching models:', err);
        setError('Failed to connect to Ollama server. Please ensure it is running.');
        setLocalModels([{ value: DEFAULT_MODEL, label: 'Default Model' }]);
        
        if (retryCount < maxRetries) {
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            fetchOllamaModels();
          }, Math.min(1000 * Math.pow(2, retryCount), 10000));
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (mounted) {
      fetchOllamaModels();
    }
  }, [retryCount, mounted, maxRetries]);

  if (!mounted) {
    return <div className="w-[200px]" />;
  }

  const handleModelChange = async (value: string) => {
    console.log('ModelSelector - Selected model:', value);
    const fullModelName = getFullModelName(value);
    console.log('ModelSelector - Full model name:', fullModelName);
    
    // Update local state and storage
    setModel(value);
    localStorage.setItem('selectedModel', value);
    
    // Notify backend about model change (optional)
    try {
      await fetch('/api/ollama/set-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: fullModelName })
      });
    } catch (error) {
      console.error('Failed to update model on backend:', error);
    }
    
    // Store the model selection in the chat history
    try {
      await fetch('/api/chat/update-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chatId: currentChat?.id,
          model: fullModelName 
        })
      });
    } catch (error) {
      console.error('Failed to update chat model:', error);
    }
  };

  return (
    <Select 
      onValueChange={handleModelChange}
      value={model} 
      defaultValue={DEFAULT_MODEL}
    >
      <SelectTrigger className="w-[200px] bg-transparent text-white border-gray-700">
        <SelectValue>
          {formatModelName(model || DEFAULT_MODEL)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {localModels.map((model) => (
          <SelectItem key={model.value} value={model.value}>
            {model.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
