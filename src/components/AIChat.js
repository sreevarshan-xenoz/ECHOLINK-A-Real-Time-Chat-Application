import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Flex,
  Input,
  Button,
  Text,
  VStack,
  HStack,
  Icon,
  Divider,
  Avatar,
  Spinner,
  Badge,
  Tooltip,
  IconButton,
  useColorMode,
  useColorModeValue
} from '@chakra-ui/react';
import { 
  FiSend, 
  FiRefreshCw, 
  FiMoreVertical, 
  FiCopy, 
  FiX, 
  FiRotateCcw, 
  FiEdit,
  FiTrash2,
  FiMessageSquare
} from 'react-icons/fi';
import { FaRobot } from 'react-icons/fa';
import { motion } from 'framer-motion';
import aiService from '../services/ai-service';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import './Chat.css';

const AIChatMessage = ({ message, onRegenerate, onEdit, onDelete }) => {
  const { colorMode } = useColorMode();
  const bgColor = message.sender === 'USER' 
    ? colorMode === 'dark' ? '#2a4365' : '#ebf8ff'
    : colorMode === 'dark' ? '#2d3748' : '#f8f9fa';
  const textColor = colorMode === 'dark' ? 'white' : '#1a202c';
  const borderColor = message.sender === 'USER'
    ? colorMode === 'dark' ? '#3182ce' : '#bee3f8'
    : colorMode === 'dark' ? '#4a5568' : '#e2e8f0';
  
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };
  
  return (
    <Box
      w="100%"
      p={4}
      mb={2}
      borderRadius="md"
      bg={bgColor}
      borderWidth="1px"
      borderColor={borderColor}
      position="relative"
    >
      <HStack spacing={3} mb={2} align="flex-start">
        <Avatar 
          icon={message.sender === 'USER' ? <FiMessageSquare /> : <FaRobot />}
          bg={message.sender === 'USER' ? 'blue.500' : 'teal.500'}
          color="white"
          size="sm"
        />
        <Box flex="1">
          <Flex justifyContent="space-between" alignItems="center" mb={1}>
            <Text fontWeight="bold" fontSize="sm">
              {message.sender === 'USER' ? 'You' : 'AURA'}
            </Text>
            <Box>
              <IconButton
                icon={<FiMoreVertical />}
                variant="ghost"
                size="sm"
                aria-label="Options"
                onClick={() => {
                  // Show a simple dropdown menu with options
                  const dropdown = document.createElement('div');
                  dropdown.className = 'aichat-dropdown';
                  dropdown.innerHTML = `
                    <div class="aichat-dropdown-item" id="copy">Copy message</div>
                    ${message.sender === 'USER' ? 
                      `<div class="aichat-dropdown-item" id="edit">Edit message</div>` : 
                      `<div class="aichat-dropdown-item" id="regenerate">Regenerate response</div>`
                    }
                    <div class="aichat-dropdown-item" id="delete">Delete message</div>
                  `;
                  
                  // Position and append the dropdown
                  dropdown.style.position = 'absolute';
                  dropdown.style.right = '0';
                  dropdown.style.top = '30px';
                  dropdown.style.zIndex = '10';
                  dropdown.style.background = 'white';
                  dropdown.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)';
                  dropdown.style.borderRadius = '4px';
                  dropdown.style.padding = '8px 0';
                  
                  // Add event listeners
                  document.body.appendChild(dropdown);
                  document.getElementById('copy')?.addEventListener('click', () => {
                    handleCopy();
                    document.body.removeChild(dropdown);
                  });
                  document.getElementById('delete')?.addEventListener('click', () => {
                    onDelete(message);
                    document.body.removeChild(dropdown);
                  });
                  if (message.sender === 'USER') {
                    document.getElementById('edit')?.addEventListener('click', () => {
                      onEdit(message);
                      document.body.removeChild(dropdown);
                    });
                  } else {
                    document.getElementById('regenerate')?.addEventListener('click', () => {
                      onRegenerate(message);
                      document.body.removeChild(dropdown);
                    });
                  }
                  
                  // Close when clicking outside
                  setTimeout(() => {
                    const closeDropdown = (e) => {
                      if (!dropdown.contains(e.target)) {
                        document.body.removeChild(dropdown);
                        document.removeEventListener('click', closeDropdown);
                      }
                    };
                    document.addEventListener('click', closeDropdown);
                  }, 100);
                }}
              />
            </Box>
          </Flex>
          
          <Box color={textColor} className="markdown-content">
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      language={match[1]}
                      style={atomOneDark}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          </Box>
          
          <Text fontSize="xs" color="gray.500" mt={2}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </Text>
        </Box>
      </HStack>
    </Box>
  );
};

const AIChat = () => {
  const { colorMode } = useColorMode();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState(null);
  const [editMessage, setEditMessage] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Use proper Chakra UI color hooks
  const bgColor = useColorModeValue('white', '#1a202c');
  const borderColor = useColorModeValue('#e2e8f0', '#4a5568');
  
  useEffect(() => {
    checkAIInitialization();
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const checkAIInitialization = async () => {
    try {
      setIsInitialized(aiService.isInitialized);
      if (!aiService.isInitialized) {
        // Try to initialize with AURA as default if token is available
        if (process.env.REACT_APP_HUGGINGFACE_TOKEN) {
          try {
            setIsInitializing(true);
            await aiService.initialize('huggingface');
            setIsInitialized(true);
            setIsInitializing(false);
            
            // Add welcome message
            const welcomeMsg = {
              type: 'CHAT',
              content: "Hello! I'm AURA, your AI assistant in EchoLink. How can I help you today?",
              sender: 'AI_ASSISTANT',
              timestamp: new Date().toISOString(),
              id: Math.random().toString(36).substr(2, 9)
            };
            setMessages([welcomeMsg]);
          } catch (err) {
            console.error('Failed to initialize with default token:', err);
            setIsInitializing(false);
          }
        }
      } else {
        // Load existing chat history
        if (aiService.aiChatHistory.length > 0) {
          setMessages(aiService.aiChatHistory);
        } else {
          // Add welcome message
          const welcomeMsg = {
            type: 'CHAT',
            content: "Hello! I'm AURA, your AI assistant in EchoLink. How can I help you today?",
            sender: 'AI_ASSISTANT',
            timestamp: new Date().toISOString(),
            id: Math.random().toString(36).substr(2, 9)
          };
          setMessages([welcomeMsg]);
        }
      }
    } catch (err) {
      console.error('Error checking AI initialization:', err);
      setIsInitializing(false);
    }
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    if (!isInitialized) {
      setError('AI assistant is not initialized. Please configure your AI settings.');
      return;
    }
    
    const userMessage = {
      type: 'CHAT',
      content: inputValue.trim(),
      sender: 'USER',
      timestamp: new Date().toISOString(),
      id: Math.random().toString(36).substr(2, 9)
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);
    
    try {
      const aiResponse = await aiService.chatWithAI(userMessage.content);
      setMessages(prev => [...prev, aiResponse]);
    } catch (err) {
      console.error('Error sending message to AI:', err);
      setError(err.message || 'Failed to get a response from the AI assistant.');
      
      // Add error message
      const errorMsg = {
        type: 'CHAT',
        content: `Error: ${err.message || 'Failed to get a response'}`,
        sender: 'AI_ASSISTANT',
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9),
        error: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleRegenerate = async (message) => {
    // Find the last user message before this AI message
    const messageIndex = messages.findIndex(m => m.id === message.id);
    if (messageIndex < 1) return;
    
    // Find the last user message before this
    let userMessageIndex = messageIndex - 1;
    while (userMessageIndex >= 0 && messages[userMessageIndex].sender !== 'USER') {
      userMessageIndex--;
    }
    
    if (userMessageIndex < 0) return;
    
    const userMessage = messages[userMessageIndex];
    
    // Remove all messages after the user message
    setMessages(messages.slice(0, userMessageIndex + 1));
    setIsLoading(true);
    
    try {
      const aiResponse = await aiService.chatWithAI(userMessage.content);
      setMessages(prev => [...prev, aiResponse]);
    } catch (err) {
      console.error('Error regenerating AI response:', err);
      setError(err.message || 'Failed to regenerate response');
      
      const errorMsg = {
        type: 'CHAT',
        content: `Error: ${err.message || 'Failed to regenerate response'}`,
        sender: 'AI_ASSISTANT',
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9),
        error: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEditMessage = (message) => {
    setEditMessage(message);
    setInputValue(message.content);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  const handleCancelEdit = () => {
    setEditMessage(null);
    setInputValue('');
  };
  
  const handleSubmitEdit = async () => {
    if (!inputValue.trim() || !editMessage) return;
    
    // Find the message index
    const messageIndex = messages.findIndex(m => m.id === editMessage.id);
    if (messageIndex < 0) return;
    
    // Update the message
    const updatedMessages = [...messages];
    updatedMessages[messageIndex] = {
      ...editMessage,
      content: inputValue.trim(),
      edited: true,
      timestamp: new Date().toISOString()
    };
    
    // Update chat history
    setMessages(updatedMessages);
    setEditMessage(null);
    setInputValue('');
    
    // If this was a user message followed by AI response, regenerate the AI response
    if (messageIndex < messages.length - 1 && messages[messageIndex + 1].sender === 'AI_ASSISTANT') {
      // Remove all messages after the edited message
      setMessages(updatedMessages.slice(0, messageIndex + 1));
      setIsLoading(true);
      
      try {
        const aiResponse = await aiService.chatWithAI(inputValue.trim());
        setMessages(prev => [...prev, aiResponse]);
      } catch (err) {
        console.error('Error regenerating AI response after edit:', err);
        setError(err.message || 'Failed to regenerate response');
        
        const errorMsg = {
          type: 'CHAT',
          content: `Error: ${err.message || 'Failed to regenerate response'}`,
          sender: 'AI_ASSISTANT',
          timestamp: new Date().toISOString(),
          id: Math.random().toString(36).substr(2, 9),
          error: true
        };
        setMessages(prev => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const handleDeleteMessage = (message) => {
    const messageIndex = messages.findIndex(m => m.id === message.id);
    if (messageIndex < 0) return;
    
    const updatedMessages = [...messages];
    updatedMessages.splice(messageIndex, 1);
    setMessages(updatedMessages);
    
    // Update the AI service chat history as well
    aiService.aiChatHistory = updatedMessages;
  };
  
  const handleClearChat = () => {
    // Add a confirmation message as the first message
    const confirmationMsg = {
      type: 'CHAT',
      content: "Chat history has been cleared. How can I help you today?",
      sender: 'AI_ASSISTANT',
      timestamp: new Date().toISOString(),
      id: Math.random().toString(36).substr(2, 9)
    };
    
    setMessages([confirmationMsg]);
    aiService.clearAIChatHistory();
    aiService.aiChatHistory = [confirmationMsg];
  };
  
  return (
    <Flex 
      direction="column" 
      h="100vh"
      maxH="100vh"
      bg={bgColor}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="md"
      overflow="hidden"
    >
      {/* Header */}
      <Flex 
        p={4} 
        borderBottomWidth="1px" 
        borderColor={borderColor}
        justify="space-between"
        align="center"
      >
        <HStack>
          <Avatar 
            icon={<FaRobot />}
            bg="teal.500"
            color="white"
            size="sm"
          />
          <Box>
            <Text fontWeight="bold">AURA</Text>
            <Text fontSize="xs" color="gray.500">EchoLink AI Assistant</Text>
          </Box>
        </HStack>
        
        <HStack>
          <Tooltip label="Clear chat history">
            <IconButton
              icon={<FiTrash2 />}
              variant="ghost"
              size="sm"
              onClick={handleClearChat}
              aria-label="Clear chat"
            />
          </Tooltip>
        </HStack>
      </Flex>
      
      {/* Chat area */}
      <VStack
        flex="1"
        p={4}
        spacing={4}
        align="stretch"
        overflowY="auto"
        className="custom-scrollbar"
      >
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AIChatMessage
              message={msg}
              onRegenerate={handleRegenerate}
              onEdit={handleEditMessage}
              onDelete={handleDeleteMessage}
            />
          </motion.div>
        ))}
        
        {isLoading && (
          <Box textAlign="center" py={4}>
            <Spinner size="md" color="blue.500" />
            <Text mt={2} fontSize="sm" color="gray.500">
              AURA is thinking...
            </Text>
          </Box>
        )}
        
        {error && (
          <Box p={4} bg="red.50" color="red.500" borderRadius="md" mb={4}>
            <Text fontWeight="bold">Error</Text>
            <Text>{error}</Text>
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </VStack>
      
      {/* Input area */}
      <Box p={4} borderTopWidth="1px" borderColor={borderColor}>
        {!isInitialized ? (
          <Box p={4} bg="yellow.50" color="yellow.700" borderRadius="md" mb={4}>
            <Text fontWeight="bold">AI assistant is being initialized</Text>
            {isInitializing && (
              <HStack mt={2}>
                <Spinner size="sm" color="yellow.500" />
                <Text>Connecting to AI services...</Text>
              </HStack>
            )}
            <Text mt={2}>AURA is connecting to its AI services. You can start typing your message and click Send once it's ready.</Text>
            <Text mt={2} fontSize="sm">If initialization continues to fail, try refreshing the page or come back later.</Text>
          </Box>
        ) : (
          <Flex>
            <Input
              placeholder={editMessage ? "Edit your message..." : "Type a message..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              mr={2}
              ref={inputRef}
              disabled={isLoading}
            />
            
            {editMessage ? (
              <>
                <Button
                  leftIcon={<FiX />}
                  colorScheme="gray"
                  mr={2}
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
                <Button
                  leftIcon={<FiEdit />}
                  colorScheme="blue"
                  onClick={handleSubmitEdit}
                  isLoading={isLoading}
                >
                  Update
                </Button>
              </>
            ) : (
              <Button
                leftIcon={<FiSend />}
                colorScheme="blue"
                onClick={handleSendMessage}
                isLoading={isLoading}
                loadingText="Sending"
              >
                Send
              </Button>
            )}
          </Flex>
        )}
      </Box>
    </Flex>
  );
};

export default AIChat; 