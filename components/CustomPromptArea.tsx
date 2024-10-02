import React, { useState, useEffect } from 'react';
import { useChat } from '@/components/ChatContext';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const CustomPromptArea: React.FC = () => {
  const [localPrompt, setLocalPrompt] = useState('');
  const { customPrompt, setCustomPrompt } = useChat() as { customPrompt: string, setCustomPrompt: (prompt: string) => void };
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const savedPrompt = localStorage.getItem('customPrompt');
    if (savedPrompt) {
      setLocalPrompt(savedPrompt);
      setCustomPrompt(savedPrompt);
    }
  }, [setCustomPrompt]);

  const handleSavePrompt = () => {
    setCustomPrompt(localPrompt);
    localStorage.setItem('customPrompt', localPrompt);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000); // Hide message after 3 seconds
  };

  return (
    <div className="mt-4">
      <h3 className="text-white text-lg font-semibold mb-2">Custom Prompt</h3>
      <Textarea
        value={localPrompt}
        onChange={(e) => setLocalPrompt(e.target.value)}
        placeholder="Enter your custom prompt here..."
        className="w-full mb-2"
        rows={4}
      />
      <Button onClick={handleSavePrompt} className="w-full">
        Save Custom Prompt
      </Button>
      {saveSuccess && <p className="text-green-500 mt-2">Custom prompt saved successfully!</p>}
    </div>
  );
};

export default CustomPromptArea;
