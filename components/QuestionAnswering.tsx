import React, { useState, useEffect } from 'react'
import { answerQuestion } from '../actions/questionAnswering'
import { fetchChatHistory } from '../actions/chatHistory'
import { v4 as uuidv4 } from 'uuid'
import { ChatMessage } from '../lib/chat'
import { encodeImageToBase64 } from '@/lib/utils/file'

export default function QuestionAnswering() {
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [dominationField, setDominationField] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [imageFile, setImageFile] = useState<File | string | null>(null)

  useEffect(() => {
    const loadChatHistory = async () => {
      const history = await fetchChatHistory('default-chat-id');
      setChatHistory(history);
    };
    loadChatHistory();
  }, []);

  useEffect(() => {
    return () => {
      if (imageFile) URL.revokeObjectURL(imageFile as string);
    };
  }, [imageFile]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const base64Image = await encodeImageToBase64(file);
      setImageFile(base64Image);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dominationField) return;
    setLoading(true);
    setAnswer(''); // Clear previous answer
    let fullResponse = '';
    try {
      await answerQuestion(
        chatHistory.map(msg => ({ role: msg.role, content: msg.content })),
        (token) => {
          fullResponse += token;
          setAnswer(fullResponse);
        },
        dominationField,
        'default-chat-id',
        customPrompt,
        imageFile ? imageFile as string : undefined
      );
      setChatHistory(prev => [
        ...prev, 
        { id: uuidv4(), role: 'user', content: query, dominationField },
        { id: uuidv4(), role: 'assistant', content: fullResponse, dominationField }
      ]);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      if (error instanceof Error) {
        setAnswer(`Error: ${error.message}`);
      } else {
        setAnswer('An error occurred while processing your question. Please try again.');
      }
    } finally {
      setLoading(false);
      setImageFile(null); // Clear the image file after sending
      setQuery(''); // Clear the input field after sending
    }
  }

  const handleFileChange = async (file: File | null) => {
    if (file) {
      const base64Image = await encodeImageToBase64(file);
      setImageFile(base64Image);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question..."
        />
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
        />
        <select
          value={dominationField}
          onChange={(e) => setDominationField(e.target.value)}
        >
          <option value="">Select a field</option>
          <option value="Normal Chat">Normal Chat</option>
          <option value="Email">Email</option>
          {/* Add other options as needed */}
        </select>
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Custom prompt (optional)"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Submit'}
        </button>
      </form>
      {answer && <div>{answer}</div>}
      <div>
        {chatHistory.map((message) => (
          <div key={message.id}>
            <strong>{message.role}:</strong> {message.content}
          </div>
        ))}
      </div>
    </div>
  )
}
