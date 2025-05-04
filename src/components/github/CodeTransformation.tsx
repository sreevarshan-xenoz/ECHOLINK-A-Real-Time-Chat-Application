import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  Flex,
  Text,
  Heading,
  Spinner,
  Textarea
} from '@chakra-ui/react';
import { FaExchangeAlt, FaCode } from 'react-icons/fa';
import { RootState } from '../../store';
import aiService from '../../services/ai-service';
import { IconWrapper } from '../../utils/IconWrapper';

type LanguageOption = {
  value: string;
  label: string;
  extension: string;
};

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: 'javascript', label: 'JavaScript', extension: 'js' },
  { value: 'typescript', label: 'TypeScript', extension: 'ts' },
  { value: 'python', label: 'Python', extension: 'py' },
  { value: 'java', label: 'Java', extension: 'java' },
  { value: 'csharp', label: 'C#', extension: 'cs' },
  { value: 'go', label: 'Go', extension: 'go' },
  { value: 'rust', label: 'Rust', extension: 'rs' },
  { value: 'ruby', label: 'Ruby', extension: 'rb' },
  { value: 'php', label: 'PHP', extension: 'php' },
  { value: 'swift', label: 'Swift', extension: 'swift' },
  { value: 'kotlin', label: 'Kotlin', extension: 'kt' },
];

const CodeTransformation: React.FC = () => {
  const currentContent = useSelector((state: RootState) => (state.github as any).currentContent);
  const [targetLanguage, setTargetLanguage] = useState<string>('typescript');
  const [transformedCode, setTransformedCode] = useState<string | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customCode, setCustomCode] = useState<string>('');
  const isAiInitialized = useSelector((state: RootState) => (state.ai as any)?.initialized || false);
  const [useCustomCode, setUseCustomCode] = useState(false);

  const getFileLanguage = (filePath: string): string => {
    const extension = filePath.split('.').pop()?.toLowerCase() || '';
    const language = LANGUAGE_OPTIONS.find(lang => lang.extension === extension);
    return language?.value || 'javascript';
  };

  const transformCode = async () => {
    const sourceCode = useCustomCode 
      ? customCode 
      : (currentContent?.type === 'file' ? currentContent.content as string : '');
    
    if (!sourceCode || !isAiInitialized) return;
    
    const sourceLanguage = useCustomCode 
      ? 'Unknown' 
      : getFileLanguage(currentContent?.path || '');
    
    setIsTransforming(true);
    setError(null);
    
    try {
      const prompt = `Convert the following code from ${sourceLanguage} to ${targetLanguage}:
      
\`\`\`${sourceLanguage}
${sourceCode}
\`\`\`

Please provide only the converted code without explanations. Format the code properly.`;

      const result = await aiService.generateText(prompt);
      
      // Extract code blocks from the result
      const codeBlockRegex = /```(?:\w+)?\s*([\s\S]*?)```/g;
      const matches = [...result.matchAll(codeBlockRegex)];
      
      if (matches.length > 0) {
        // Get the first code block
        setTransformedCode(matches[0][1]);
      } else {
        // If no code blocks found, use the whole response
        setTransformedCode(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transform code');
      setTransformedCode(null);
    } finally {
      setIsTransforming(false);
    }
  };

  const handleCopyCode = () => {
    if (transformedCode) {
      navigator.clipboard.writeText(transformedCode);
    }
  };

  const handleSourceChange = () => {
    setUseCustomCode(!useCustomCode);
    setTransformedCode(null);
  };

  const isFileSelected = currentContent && currentContent.type === 'file';

  if (!isAiInitialized) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="md" mt={4}>
        <Flex align="center" mb={4}>
          <Box mr={2}>
            <IconWrapper icon={FaExchangeAlt} size={20} />
          </Box>
          <Heading size="md">Code Transformer</Heading>
        </Flex>
        <Text mb={4}>AI service is not initialized. Please set up your AI API key in settings.</Text>
      </Box>
    );
  }

  return (
    <Box p={4} borderWidth="1px" borderRadius="md" mt={4}>
      <Flex align="center" mb={4}>
        <Box mr={2}>
          <IconWrapper icon={FaExchangeAlt} size={20} />
        </Box>
        <Heading size="md">Code Transformer</Heading>
      </Flex>
      
      <Button 
        mb={4} 
        onClick={handleSourceChange} 
        size="sm"
        variant="outline"
      >
        {useCustomCode ? "Use File Content" : "Enter Custom Code"}
      </Button>
      
      {useCustomCode && (
        <Textarea
          value={customCode}
          onChange={(e) => setCustomCode(e.target.value)}
          placeholder="Paste code to transform..."
          mb={4}
          rows={5}
          fontFamily="monospace"
        />
      )}
      
      {!useCustomCode && !isFileSelected && (
        <Text mb={4} color="orange.500">
          Please select a file to transform its code.
        </Text>
      )}
      
      <Box mb={4}>
        <Text mb={2}>Target Language:</Text>
        <select 
          value={targetLanguage}
          onChange={(e) => setTargetLanguage(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #e2e8f0'
          }}
        >
          {LANGUAGE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Box>
      
      <Button
        colorScheme="blue"
        onClick={transformCode}
        disabled={isTransforming || (!useCustomCode && !isFileSelected) || (useCustomCode && !customCode)}
        mb={4}
        width="100%"
      >
        {isTransforming && <Box mr={2} display="inline-block"><Spinner size="sm" /></Box>}
        {isTransforming ? 'Transforming...' : 'Transform Code'}
      </Button>
      
      {error && (
        <Box p={3} mb={4} bg="red.50" color="red.500" borderRadius="md">
          {error}
        </Box>
      )}
      
      {transformedCode && (
        <Box mt={4}>
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontWeight="bold">Transformed Code ({LANGUAGE_OPTIONS.find(l => l.value === targetLanguage)?.label}):</Text>
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
            <pre>{transformedCode}</pre>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default CodeTransformation; 