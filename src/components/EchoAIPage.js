import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  submitMessage, 
  newChat, 
  regenerateMessage, 
  cancelGeneration, 
  clearHistory,
  checkConnection
} from '../services/echo-ai-service';
import './EchoAIChat.css';

const EchoAIPage = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const messagesEndRef = useRef(null);
  
  // Start a new chat session on component mount
  useEffect(() => {
    const initChat = async () => {
      try {
        setIsProcessing(true);
        const result = await newChat();
        
        if (result && result.fallback) {
          setIsFallbackMode(true);
          setMessages([
            {
              role: 'assistant',
              content: 'Hello! I\'m Echo AI, operating in offline mode due to connection issues. I can still chat, but with limited functionality.'
            }
          ]);
        } else {
          setMessages([
            {
              role: 'assistant',
              content: 'Hello! I\'m Echo AI, your personal AI assistant. How can I help you today?'
            }
          ]);
        }
      } catch (err) {
        setError('Failed to initialize chat. Please try again later.');
        console.error('Chat initialization error:', err);
        setIsFallbackMode(true);
        setMessages([
          {
            role: 'assistant',
            content: 'Hello! I\'m Echo AI, operating in offline mode due to connection issues. I can still chat, but with limited functionality.'
          }
        ]);
      } finally {
        setIsProcessing(false);
      }
    };
    
    initChat();
  }, []);
  
  // Periodically check connection if in fallback mode
  useEffect(() => {
    let interval;
    if (isFallbackMode && connectionAttempts < 5) {
      interval = setInterval(async () => {
        const connected = await checkConnection();
        if (connected) {
          setIsFallbackMode(false);
          setError('');
          clearInterval(interval);
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: 'Connection restored! I\'m now operating with full capabilities.'
            }
          ]);
        } else {
          setConnectionAttempts(prev => prev + 1);
        }
      }, 30000); // Check every 30 seconds, up to 5 times
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isFallbackMode, connectionAttempts]);
  
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
      
      if (response.includes("I'm having trouble connecting")) {
        setIsFallbackMode(true);
      }
      
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
      setIsFallbackMode(true);
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
      setIsProcessing(false);
    }
  };
  
  const handleClearChat = async () => {
    try {
      const result = await clearHistory();
      setMessages([
        {
          role: 'assistant',
          content: 'Chat history cleared. How can I help you today?'
        }
      ]);
      
      // If we were in fallback mode, try to reconnect after clearing
      if (isFallbackMode) {
        setIsFallbackMode(false);
        setConnectionAttempts(0);
      }
    } catch (err) {
      setError('Failed to clear chat history. Please try again.');
      console.error('Error clearing chat history:', err);
    }
  };
  
  const handleBackToChat = () => {
    navigate('/chat');
  };
  
  return (
    <div className="echo-ai-page">
      <div className="echo-ai-page-header">
        <div className="echo-ai-page-title">
          <div className="echo-ai-icon">🤖</div>
          <h2>Echo AI Assistant</h2>
          {isFallbackMode && (
            <div className="connection-status offline">
              <span className="status-dot"></span>
              Offline Mode
            </div>
          )}
        </div>
        <div className="echo-ai-page-actions">
          <button 
            className="back-to-chat-button" 
            onClick={handleBackToChat}
          >
            Back to Chat
          </button>
        </div>
      </div>
      
      <div className="echo-ai-page-content">
        {isFallbackMode && (
          <div className="fallback-mode-banner">
            Echo AI is currently in offline mode with limited functionality.
            {connectionAttempts < 5 ? " Attempting to reconnect..." : " Connection attempts exhausted."}
          </div>
        )}
        
        <div className="echo-ai-page-messages">
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
        
        <div className="echo-ai-control-panel">
          <button 
            className="echo-ai-clear-btn" 
            onClick={handleClearChat} 
            disabled={isProcessing}
          >
            🗑️ Clear Chat
          </button>
          
          {isFallbackMode && connectionAttempts >= 5 && (
            <button
              className="echo-ai-retry-btn"
              onClick={() => {
                setConnectionAttempts(0);
                setIsFallbackMode(false);
                handleClearChat();
              }}
            >
              🔄 Retry Connection
            </button>
          )}
        </div>
        
        <div className="echo-ai-input-container">
          <form onSubmit={handleSendMessage}>
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isFallbackMode ? "Type your message... (Note: I'm in offline mode)" : "Type your message here..."}
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
    </div>
  );
};

export default EchoAIPage; 