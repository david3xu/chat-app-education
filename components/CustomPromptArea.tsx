import React, { useState, useEffect } from 'react';
import { useChat } from '@/components/ChatContext';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const CustomPromptArea: React.FC = () => {
  const [customPrompt, setCustomPrompt] = useState('');
  const { setCustomPrompt: setGlobalCustomPrompt, savedCustomPrompt } = useChat();

  useEffect(() => {
    setCustomPrompt(savedCustomPrompt || '');
  }, [savedCustomPrompt]);

  const handleSavePrompt = () => {
    setGlobalCustomPrompt(customPrompt);
    localStorage.setItem('customPrompt', customPrompt);
  };

  return (
    <div className="mt-4">
      <h3 className="text-white text-lg font-semibold mb-2">Custom Prompt</h3>
      <Textarea
        value={customPrompt}
        onChange={(e) => setCustomPrompt(e.target.value)}
        placeholder="Enter your custom prompt here..."
        className="w-full mb-2"
        rows={4}
      />
      <Button onClick={handleSavePrompt} className="w-full">
        Save Custom Prompt
      </Button>
    </div>
  );
};

export default CustomPromptArea;
