import React, { useState, useRef } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  Select,
  Textarea,
  useColorModeValue,
  Heading,
  Collapse,
  HStack,
  VStack,
  Spinner,
  IconButton,
  Badge,
  Code
} from '@chakra-ui/react';
import { FaCode, FaPlay, FaChevronDown, FaChevronUp, FaTrash, FaSave } from 'react-icons/fa';
import { IconWrapper } from '../utils/IconWrapper';

// Mock code execution - in a real implementation, this would call an API
const executeCode = (code, language) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simple mock responses based on language and code
      if (language === 'javascript') {
        if (code.includes('console.log')) {
          resolve({ success: true, output: `> ${code.match(/console\.log\(['"](.*)['"]\)/)?.[1] || 'Hello, World!'}` });
        } else if (code.includes('function')) {
          resolve({ success: true, output: '> Function defined successfully' });
        } else {
          resolve({ success: true, output: '> Executed successfully' });
        }
      } else if (language === 'python') {
        if (code.includes('print')) {
          resolve({ success: true, output: `> ${code.match(/print\(['"](.*)['"]\)/)?.[1] || 'Hello, World!'}` });
        } else if (code.includes('def')) {
          resolve({ success: true, output: '> Function defined successfully' });
        } else {
          resolve({ success: true, output: '> Executed successfully' });
        }
      } else {
        resolve({ success: true, output: '> Code executed successfully' });
      }
    }, 1500);
  });
};

const CodeExecutionPanel = ({ onShareCode }) => {
  const [code, setCode] = useState('// Write your code here\nconsole.log("Hello, World!");');
  const [language, setLanguage] = useState('javascript');
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [execHistory, setExecHistory] = useState([]);
  const textareaRef = useRef(null);
  
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const headerBgColor = useColorModeValue('blue.50', 'gray.700');
  const borderColor = useColorModeValue('blue.200', 'gray.600');
  const codeBgColor = useColorModeValue('white', 'gray.700');
  const outputBgColor = useColorModeValue('gray.100', 'gray.900');
  
  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };
  
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    
    // Update code template based on language
    if (newLang === 'javascript') {
      setCode('// Write your code here\nconsole.log("Hello, World!");');
    } else if (newLang === 'python') {
      setCode('# Write your code here\nprint("Hello, World!")');
    } else if (newLang === 'java') {
      setCode('// Write your code here\nSystem.out.println("Hello, World!");');
    }
  };
  
  const handleExecute = async () => {
    if (!code.trim()) return;
    
    setIsExecuting(true);
    setOutput('');
    
    try {
      const result = await executeCode(code, language);
      
      setOutput(result.output);
      
      // Add to history
      const historyItem = {
        id: Date.now(),
        code: code,
        language: language,
        output: result.output,
        timestamp: new Date().toISOString()
      };
      
      setExecHistory(prev => [historyItem, ...prev].slice(0, 5));
    } catch (error) {
      setOutput(`Error: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };
  
  const handleShare = () => {
    if (onShareCode && code.trim()) {
      onShareCode({
        code,
        language,
        output
      });
    }
  };
  
  const clearOutput = () => {
    setOutput('');
  };
  
  const loadHistoryItem = (historyItem) => {
    setCode(historyItem.code);
    setLanguage(historyItem.language);
    setOutput(historyItem.output);
    
    // Focus the textarea
    textareaRef.current?.focus();
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
          <IconWrapper icon={FaCode} size={14} mr={2} />
          <Heading size="xs">Code Execution</Heading>
        </HStack>
        <IconWrapper
          icon={isOpen ? FaChevronUp : FaChevronDown}
          size={12}
        />
      </Flex>
      
      <Collapse in={isOpen} animateOpacity>
        <Box p={3}>
          <HStack mb={2}>
            <Select
              size="xs"
              value={language}
              onChange={handleLanguageChange}
              bg={codeBgColor}
              w="150px"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
            </Select>
            <Button
              size="xs"
              leftIcon={<IconWrapper icon={FaPlay} size={10} />}
              colorScheme="green"
              onClick={handleExecute}
              isLoading={isExecuting}
              loadingText="Running"
            >
              Run
            </Button>
            <IconButton
              size="xs"
              icon={<IconWrapper icon={FaSave} size={10} />}
              colorScheme="blue"
              onClick={handleShare}
              aria-label="Share code"
              title="Share in chat"
            />
          </HStack>
          
          <Textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Write your code here..."
            size="sm"
            height="120px"
            fontFamily="monospace"
            bg={codeBgColor}
            mb={2}
          />
          
          {output && (
            <Box>
              <Flex justify="space-between" align="center" mb={1}>
                <Text fontSize="xs" fontWeight="bold">Output:</Text>
                <IconButton
                  size="xs"
                  icon={<IconWrapper icon={FaTrash} size={10} />}
                  variant="ghost"
                  onClick={clearOutput}
                  aria-label="Clear output"
                />
              </Flex>
              <Box
                bg={outputBgColor}
                p={2}
                borderRadius="md"
                fontFamily="monospace"
                fontSize="xs"
                whiteSpace="pre-wrap"
                maxHeight="100px"
                overflowY="auto"
              >
                {isExecuting ? (
                  <Flex justify="center" p={2}>
                    <Spinner size="sm" />
                  </Flex>
                ) : (
                  <Code children={output} variant="subtle" />
                )}
              </Box>
            </Box>
          )}
          
          {execHistory.length > 0 && (
            <Box mt={3}>
              <Text fontSize="xs" fontWeight="bold" mb={1}>Recent Executions:</Text>
              <VStack spacing={1} align="stretch">
                {execHistory.map((item) => (
                  <HStack
                    key={item.id}
                    bg={codeBgColor}
                    p={1}
                    borderRadius="sm"
                    fontSize="xs"
                    cursor="pointer"
                    onClick={() => loadHistoryItem(item)}
                    _hover={{ bg: useColorModeValue('gray.100', 'gray.700') }}
                  >
                    <Badge colorScheme={item.language === 'javascript' ? 'yellow' : item.language === 'python' ? 'blue' : 'red'}>
                      {item.language}
                    </Badge>
                    <Text noOfLines={1} flex="1">
                      {item.code.substring(0, 30)}...
                    </Text>
                    <Text fontSize="10px" color="gray.500">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default CodeExecutionPanel; 