import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import gsap from 'gsap';

/**
 * Safe markdown-like renderer: converts **bold** and \n to React elements
 * without using dangerouslySetInnerHTML (prevents XSS attacks).
 */
function renderSafeMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    // Split each line by bold markers **...**
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const lineElements = parts.map((part, partIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`${lineIdx}-${partIdx}`}>{part.slice(2, -2)}</strong>;
      }
      return <span key={`${lineIdx}-${partIdx}`}>{part}</span>;
    });

    elements.push(<span key={`line-${lineIdx}`}>{lineElements}</span>);
    if (lineIdx < lines.length - 1) {
      elements.push(<br key={`br-${lineIdx}`} />);
    }
  });

  return elements;
}

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      parts: [{ text: 'Hello! I am your EdgeFleet AI Financial Assistant. Ask me anything about your expenses, budgets, or savings targets!' }],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { request } = useApi();
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && chatWindowRef.current) {
      gsap.fromTo(
        chatWindowRef.current,
        { scale: 0.8, opacity: 0, y: 40 },
        { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.5)' }
      );
    }
  }, [isOpen]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      parts: [{ text: textToSend }],
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.map(msg => ({
        role: msg.role,
        parts: msg.parts,
      }));

      const res = await request('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
        }),
      });

      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          parts: [{ text: res.reply }],
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          parts: [{ text: 'Sorry, I encountered an error processing that query. Please try again.' }],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend(input);
    }
  };

  const suggestions = [
    'How much did I spend on food this month?',
    'What was my highest expense category?',
    'Summarize my spending trends',
    'Give me budget optimization tips',
  ];

  return (
    <div className="chatbot-wrapper">
      {!isOpen && (
        <button className="chat-trigger-btn glow-purple" onClick={() => setIsOpen(true)} aria-label="Open chat">
          <MessageSquare size={20} />
        </button>
      )}

      {isOpen && (
        <div ref={chatWindowRef} className="chat-window-panel glass-panel">
          <div className="chat-header">
            <div className="bot-info">
              <div className="bot-icon">
                <Bot size={16} />
              </div>
              <div>
                <h4>FleetAI Assistant</h4>
                <span className="status">Online</span>
              </div>
            </div>
            <button className="chat-close" onClick={() => setIsOpen(false)} aria-label="Close chat">
              <X size={16} />
            </button>
          </div>

          <div className="chat-messages-container">
            {messages.map((msg, index) => (
              <div key={index} className={`chat-bubble-row ${msg.role === 'user' ? 'user' : 'bot'}`}>
                {msg.role !== 'user' && <div className="bubble-avatar">AI</div>}
                <div className="chat-bubble">
                  <p>{renderSafeMarkdown(msg.parts[0].text)}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-bubble-row bot">
                <div className="bubble-avatar">AI</div>
                <div className="chat-bubble loading-bubble">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages[messages.length - 1]?.role === 'model' && !loading && (
            <div className="chat-suggestions">
              {suggestions.map((s, idx) => (
                <button key={idx} className="suggestion-chip" onClick={() => handleSend(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="chat-input-row">
            <input
              type="text"
              className="input-control"
              placeholder="Ask a financial question..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={loading}
            />
            <button className="btn btn-primary btn-send" onClick={() => handleSend(input)} disabled={loading || !input.trim()}>
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
