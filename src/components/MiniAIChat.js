import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Flex, 
  Text, 
  Input, 
  VStack, 
  HStack,
  IconButton,
  useColorModeValue,
  Heading,
  Card,
  CardBody,
  Spinner,
  Collapse,
  Button,
  Avatar,
  Badge
} from '@chakra-ui/react';
import { FaRobot, FaArrowCircleUp, FaChevronDown, FaChevronUp, FaTrash } from 'react-icons/fa';
import { IconWrapper } from '../utils/IconWrapper';

// This would connect to an actual AI service in a real implementation
const mockAIResponse = (message) => {
  const responses = {
    "hello": "Hello! I'm Echo AI. How can I help you today?",
    "hi": "Hi there! What can I assist you with?",
    "how are you": "I'm functioning perfectly! How can I help you with your coding or chat needs?",
    "what can you do": "I can help with code suggestions, answer questions, provide coding tips, and assist with algorithm challenges. Just ask!",
    "thanks": "You're welcome! Feel free to ask if you need anything else.",
    "leetcode": "LeetCode is a great platform for practicing coding problems. Need help with a specific challenge?",
    "hackerrank": "HackerRank offers coding challenges and certifications. I can help you prepare for them!",
    "algorithm": "Algorithms are step-by-step procedures for solving problems. Which one are you interested in learning about?",
    "data structure": "Data structures are ways to organize and store data. Common ones include arrays, linked lists, trees, and graphs. Need specifics?",
    "javascript": "JavaScript is a versatile programming language primarily used for web development. What do you want to know about it?",
    "python": "Python is known for its readability and versatility. It's great for beginners and experts alike. How can I help with Python?",
    "bug": "Debugging can be challenging! Try adding console logs or breakpoints to identify where things go wrong. Want to share your code?",
    "": "Feel free to ask me anything about coding or chat features!"
  };

  // Look for matching keywords
  const lowercaseMessage = message.toLowerCase();
  for (const [key, response] of Object.entries(responses)) {
    if (key && lowercaseMessage.includes(key)) {
      return response;
    }
  }
  
  // Default response
  return "I'm here to help with coding and chat questions. What would you like to know?";
};

const MiniAIChat = () => {
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      text: "Hello! I'm Echo AI. How can I help with your coding today?", 
      sender: 'ai', 
      timestamp: new Date().toISOString() 
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const messagesEndRef = useRef(null);
  
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const headerBgColor = useColorModeValue('blue.50', 'gray.700');
  const borderColor = useColorModeValue('blue.200', 'gray.600');
  const inputBgColor = useColorModeValue('white', 'gray.700');
  const userMessageBgColor = useColorModeValue('blue.100', 'blue.600');
  const aiMessageBgColor = useColorModeValue('gray.100', 'gray.700');
  const userMessageTextColor = useColorModeValue('black', 'white');
  
  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    // Add user message
    const userMessage = {
      id: Date.now(),
      text: newMessage,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        text: mockAIResponse(userMessage.text),
        sender: 'ai',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000);
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };
  
  const clearChat = () => {
    setMessages([
      { 
        id: Date.now(), 
        text: "Chat cleared. How can I help with your coding today?", 
        sender: 'ai', 
        timestamp: new Date().toISOString() 
      }
    ]);
  };
  
  return (
    <Box 
      bg={bgColor} 
      borderRadius="md" 
      borderWidth="1px" 
      borderColor={borderColor} 
      mb={4}
      overflow="hidden"
    >
      <Flex 
        align="center" 
        p={2} 
        bg={headerBgColor}
        borderBottomWidth={isOpen ? "1px" : "0"} 
        borderColor={borderColor}
        justifyContent="space-between"
        cursor="pointer"
        onClick={toggleOpen}
      >
        <HStack>
          <Avatar 
            size="xs" 
            bg="purple.500" 
            icon={<IconWrapper icon={FaRobot} color="white" size={10} />} 
          />
          <Heading size="xs">AI Assistant</Heading>
          <Badge colorScheme="purple" fontSize="10px" variant="solid">BETA</Badge>
        </HStack>
        <HStack>
          <IconButton
            aria-label="Clear chat"
            icon={<IconWrapper icon={FaTrash} size={12} />}
            size="xs"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              clearChat();
            }}
          />
          <IconWrapper 
            icon={isOpen ? FaChevronUp : FaChevronDown} 
            size={12} 
          />
        </HStack>
      </Flex>
      
      <Collapse in={isOpen} animateOpacity>
        <Box 
          height="200px" 
          overflowY="auto"
          p={2}
        >
          <VStack spacing={2} align="stretch">
            {messages.map(message => (
              <Flex
                key={message.id}
                justify={message.sender === 'user' ? 'flex-end' : 'flex-start'}
              >
                <Box
                  maxW="80%"
                  bg={message.sender === 'user' ? userMessageBgColor : aiMessageBgColor}
                  color={message.sender === 'user' ? userMessageTextColor : undefined}
                  p={2}
                  borderRadius={message.sender === 'user' 
                    ? '8px 8px 0 8px' 
                    : '8px 8px 8px 0'}
                  fontSize="sm"
                >
                  <Text>{message.text}</Text>
                </Box>
              </Flex>
            ))}
            {isLoading && (
              <Flex justify="flex-start">
                <Box
                  bg={aiMessageBgColor}
                  p={2}
                  borderRadius="8px 8px 8px 0"
                >
                  <Spinner size="sm" />
                </Box>
              </Flex>
            )}
            <div ref={messagesEndRef} />
          </VStack>
        </Box>
        
        <Flex 
          p={2} 
          borderTopWidth="1px" 
          borderColor={borderColor}
        >
          <Input
            placeholder="Ask AI assistant..."
            size="sm"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            bg={inputBgColor}
            mr={1}
          />
          <IconButton
            icon={<IconWrapper icon={FaArrowCircleUp} />}
            colorScheme="purple"
            size="sm"
            isDisabled={!newMessage.trim() || isLoading}
            onClick={handleSendMessage}
            isLoading={isLoading}
          />
        </Flex>
      </Collapse>
    </Box>
  );
};

export default MiniAIChat; 