import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  Flex,
  Text,
  Textarea,
  Heading,
  Spinner
} from '@chakra-ui/react';
import { FaRobot, FaCode, FaMagic } from 'react-icons/fa';
import { RootState } from '../../store';
import aiService from '../../services/ai-service';
import { IconWrapper } from '../../utils/IconWrapper';

const GitHubCodeGenerator: React.FC = () => {
  const currentContent = useSelector((state: RootState) => (state.github as any).currentContent);
  const selectedRepository = useSelector((state: RootState) => (state.github as any).selectedRepository);
  const [prompt, setPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAiInitialized = useSelector((state: RootState) => (state.ai as any)?.initialized || false);

  const createContextPrompt = (userPrompt: string) => {
    if (!currentContent) {
      // Basic prompt without context
      return `Generate code for: ${userPrompt}`;
    }
    
    // Add file context if available
    if (currentContent.type === 'file') {
      const code = currentContent.content as string;
      const filePath = currentContent.path;
      const fileExtension = filePath.split('.').pop()?.toLowerCase() || '';
      
      return `I am working with a file named "${filePath}".

Current file content:
\`\`\`
${code.substring(0, 1000)}${code.length > 1000 ? '...[truncated]' : ''}
\`\`\`

Based on this context, please ${userPrompt}

Please provide only the requested code without explanations.`;
    }
    
    // Otherwise, just use the basic prompt
    return `Generate code for: ${userPrompt}`;
  };

  const generateCode = async () => {
    if (!prompt.trim() || !isAiInitialized) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const contextualPrompt = createContextPrompt(prompt);
      const result = await aiService.generateText(contextualPrompt);
      
      // Extract code blocks from the result
      const codeBlockRegex = /```(?:\w+)?\s*([\s\S]*?)```/g;
      const matches = [...result.matchAll(codeBlockRegex)];
      
      if (matches.length > 0) {
        // Get the first code block
        setGeneratedCode(matches[0][1]);
      } else {
        // If no code blocks found, use the whole response
        setGeneratedCode(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate code');
      setGeneratedCode(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
    }
  };

  if (!isAiInitialized) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="md" mt={4}>
        <Flex align="center" mb={4}>
          <Box mr={2}>
            <IconWrapper icon={FaMagic} size={20} />
          </Box>
          <Heading size="md">AI Code Generator</Heading>
        </Flex>
        <Text mb={4}>AI service is not initialized. Please set up your AI API key in settings.</Text>
      </Box>
    );
  }

  return (
    <Box p={4} borderWidth="1px" borderRadius="md" mt={4}>
      <Flex align="center" mb={4}>
        <Box mr={2}>
          <IconWrapper icon={FaMagic} size={20} />
        </Box>
        <Heading size="md">AI Code Generator</Heading>
      </Flex>
      
      <Text mb={2}>Describe what code you want to generate:</Text>
      
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="E.g., 'Create a React component that displays a list of items with pagination'"
        mb={4}
        rows={3}
      />
      
      <Button
        colorScheme="blue"
        onClick={generateCode}
        disabled={isGenerating || !prompt.trim()}
        mb={4}
        width="100%"
      >
        {isGenerating && <Box mr={2} display="inline-block"><Spinner size="sm" /></Box>}
        {isGenerating ? 'Generating...' : 'Generate Code'}
      </Button>
      
      {error && (
        <Box p={3} mb={4} bg="red.50" color="red.500" borderRadius="md">
          {error}
        </Box>
      )}
      
      {generatedCode && (
        <Box mt={4}>
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontWeight="bold">Generated Code:</Text>
            <Button size="sm" onClick={handleCopyCode}>Copy</Button>
          </Flex>
          <Box 
            borderWidth="1px" 
            borderRadius="md" 
            p={4} 
            bg="gray.50" 
            fontFamily="monospace"
            overflowX="auto"
            maxHeight="400px"
            overflowY="auto"
          >
            <pre>{generatedCode}</pre>
          </Box>
        </Box>
      )}
      
      {currentContent?.type === 'file' && (
        <Text fontSize="sm" color="gray.500" mt={4}>
          Tip: The AI is using your current file as context to generate more relevant code.
        </Text>
      )}
    </Box>
  );
};

export default GitHubCodeGenerator; 