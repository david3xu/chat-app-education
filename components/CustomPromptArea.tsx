import React, { useState, useEffect } from 'react';
import { useChat } from '@/components/ChatContext';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const CustomPromptArea: React.FC = () => {
  const [localPrompt, setLocalPrompt] = useState('');
  const { customPrompt, setCustomPrompt } = useChat();

  useEffect(() => {
    setLocalPrompt(customPrompt);
  }, [customPrompt]);

  const handleSavePrompt = () => {
    setCustomPrompt(localPrompt);
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
    </div>
  );
};

export default CustomPromptArea;
