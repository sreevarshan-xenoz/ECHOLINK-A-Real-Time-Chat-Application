import React, { useState, useEffect, useRef } from 'react';
import { 
  submitMessage, 
  newChat, 
  regenerateMessage, 
  cancelGeneration, 
  clearHistory 
} from '../services/echo-ai-service';
import './EchoAIChat.css';

const EchoAIChat = ({ onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  
  // Start a new chat session on component mount
  useEffect(() => {
    const initChat = async () => {
      try {
        await newChat();
        setMessages([
          {
            role: 'assistant',
            content: 'Hello! I\'m Echo AI, your personal AI assistant. How can I help you today?'
          }
        ]);
      } catch (err) {
        setError('Failed to initialize chat. Please try again later.');
        console.error('Chat initialization error:', err);
      }
    };
    
    initChat();
  }, []);
  
  // Auto-scroll to the bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isProcessing) return;
    
    const userMessage = {
      role: 'user',
      content: inputMessage
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);
    setError('');
    
    try {
      const response = await submitMessage(inputMessage);
      
      setMessages(prev => [
        ...prev, 
        {
          role: 'assistant',
          content: response
        }
      ]);
    } catch (err) {
      setError('Failed to get a response. Please try again.');
      console.error('Message submission error:', err);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };
  
  const handleRegenerateResponse = async () => {
    if (isProcessing) return;
    
    // Find the last assistant message and mark it for regeneration
    const messagesTemp = [...messages];
    let lastAssistantIndex = -1;
    
    for (let i = messagesTemp.length - 1; i >= 0; i--) {
      if (messagesTemp[i].role === 'assistant') {
        lastAssistantIndex = i;
        break;
      }
    }
    
    if (lastAssistantIndex === -1) return;
    
    // Update the message to show it's being regenerated
    messagesTemp[lastAssistantIndex] = {
      ...messagesTemp[lastAssistantIndex],
      content: 'Regenerating response...',
      isRegenerating: true
    };
    
    setMessages(messagesTemp);
    setIsProcessing(true);
    
    try {
      const response = await regenerateMessage();
      
      setMessages(prev => {
        const updated = [...prev];
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].isRegenerating) {
            updated[i] = {
              role: 'assistant',
              content: response
            };
            break;
          }
        }
        return updated;
      });
    } catch (err) {
      setError('Failed to regenerate response. Please try again.');
      console.error('Response regeneration error:', err);
      
      // Restore the original message
      setMessages(prev => {
        const updated = [...prev];
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].isRegenerating) {
            updated[i] = {
              role: 'assistant',
              content: 'Failed to regenerate response.'
            };
            break;
          }
        }
        return updated;
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleCancelGeneration = async () => {
    try {
      await cancelGeneration();
      setIsProcessing(false);
    } catch (err) {
      console.error('Error canceling generation:', err);
    }
  };
  
  const handleClearChat = async () => {
    try {
      await clearHistory();
      setMessages([
        {
          role: 'assistant',
          content: 'Chat history cleared. How can I help you today?'
        }
      ]);
    } catch (err) {
      setError('Failed to clear chat history. Please try again.');
      console.error('Error clearing chat history:', err);
    }
  };
  
  return (
    <div className="echo-ai-chat">
      <div className="echo-ai-header">
        <div className="echo-ai-title">
          <div className="echo-ai-icon">🤖</div>
          <h2>Echo AI Assistant</h2>
        </div>
        <div className="echo-ai-controls">
          <button className="echo-ai-clear-btn" onClick={handleClearChat} disabled={isProcessing}>
            🗑️
          </button>
          <button className="echo-ai-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>
      
      <div className="echo-ai-messages">
        {messages.map((message, index) => (
          <div 
            key={index}
            className={`echo-ai-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-avatar">
              {message.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className="message-content">
              {message.content}
            </div>
          </div>
        ))}
        
        {isProcessing && messages[messages.length - 1]?.role === 'user' && (
          <div className="echo-ai-message assistant-message">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        {error && <div className="echo-ai-error">{error}</div>}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="echo-ai-input-container">
        <form onSubmit={handleSendMessage}>
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message here..."
            disabled={isProcessing}
          />
          <div className="echo-ai-buttons">
            {isProcessing ? (
              <button 
                type="button" 
                className="echo-ai-cancel-btn"
                onClick={handleCancelGeneration}
              >
                Cancel
              </button>
            ) : (
              <>
                <button 
                  type="button" 
                  className="echo-ai-regenerate-btn"
                  onClick={handleRegenerateResponse}
                  disabled={messages.length < 2}
                >
                  🔄 Regenerate
                </button>
                <button 
                  type="submit" 
                  className="echo-ai-send-btn"
                  disabled={!inputMessage.trim()}
                >
                  Send ➤
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default EchoAIChat; 