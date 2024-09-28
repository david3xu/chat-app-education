import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { answerQuestion } from '@/actions/questionAnswering'
import { fetchChatHistory } from '@/actions/chatHistory'
import { v4 as uuidv4 } from 'uuid'
import { ChatMessage } from '@/types/chat'

export default function QuestionAnswering() {
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [dominationField, setDominationField] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')

  useEffect(() => {
    const loadChatHistory = async () => {
      const history = await fetchChatHistory('default-chat-id');
      setChatHistory(history);
    };
    loadChatHistory();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dominationField) return;
    console.log("Domination field:", dominationField);
    setLoading(true);
    let fullResponse = '';
    await answerQuestion(
      chatHistory.map(msg => ({ role: msg.role, content: msg.content })),
      (token) => {
        fullResponse += token;
        setAnswer(fullResponse);
      },
      dominationField,
      'default-chat-id',
      customPrompt
    );
    setLoading(false);
    setChatHistory(prev => [
      ...prev, 
      { id: uuidv4(), role: 'user', content: query, dominationField },
      { id: uuidv4(), role: 'assistant', content: fullResponse, dominationField }
    ]);
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Ask'}
        </button>
      </form>
      {answer && (
        <div>
          <h3>Answer:</h3>
          <ReactMarkdown>{answer}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}
