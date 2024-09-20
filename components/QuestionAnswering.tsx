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
  const [userId] = useState(() => localStorage.getItem('userId') || uuidv4())
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [dominationField, setDominationField] = useState('')

  useEffect(() => {
    const loadChatHistory = async () => {
      const history = await fetchChatHistory(userId);
      setChatHistory(history);
    };
    loadChatHistory();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dominationField) return;
    console.log("Domination field:", dominationField);
    setLoading(true)
    let fullResponse = ''
    await answerQuestion(
      query,
      (token) => {
        fullResponse += token
        setAnswer(fullResponse)
      },
      userId,
      chatHistory,
      dominationField
    )
    setLoading(false)
    setChatHistory(prev => [...prev, 
      { id: uuidv4(), role: 'user', content: query },
      { id: uuidv4(), role: 'assistant', content: fullResponse }
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
