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
import { FaRobot, FaCode, FaCheck, FaBug, FaLightbulb } from 'react-icons/fa';
import { RootState } from '../../store';
import aiService from '../../services/ai-service';
import { IconWrapper } from '../../utils/IconWrapper';

type AnalysisType = 'analyze' | 'review' | 'suggest' | 'explain';

interface AnalysisOptions {
  code: string;
  type: AnalysisType;
  language?: string;
}

const CODE_ANALYSIS_PROMPTS = {
  analyze: (code: string, language: string) => 
    `Analyze this ${language} code and identify any issues, bugs, or potential improvements:\n\n\`\`\`${language}\n${code}\n\`\`\``,
  
  review: (code: string, language: string) => 
    `Review this ${language} code for best practices, performance, and security issues:\n\n\`\`\`${language}\n${code}\n\`\`\``,
  
  suggest: (code: string, language: string) => 
    `Suggest improvements for this ${language} code with examples:\n\n\`\`\`${language}\n${code}\n\`\`\``,
  
  explain: (code: string, language: string) => 
    `Explain what this ${language} code does in clear terms:\n\n\`\`\`${language}\n${code}\n\`\`\``
};

const CodeAnalysis: React.FC = () => {
  const currentContent = useSelector((state: RootState) => (state.github as any).currentContent);
  const [analysisType, setAnalysisType] = useState<AnalysisType>('analyze');
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAiInitialized = useSelector((state: RootState) => (state.ai as any)?.initialized || false);

  const getFileLanguage = (filePath: string): string => {
    const extension = filePath.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      'js': 'JavaScript',
      'jsx': 'JavaScript',
      'ts': 'TypeScript',
      'tsx': 'TypeScript',
      'py': 'Python',
      'java': 'Java',
      'rb': 'Ruby',
      'go': 'Go',
      'php': 'PHP',
      'cs': 'C#',
      'c': 'C',
      'cpp': 'C++',
      'html': 'HTML',
      'css': 'CSS',
      'json': 'JSON',
      'md': 'Markdown',
      'sql': 'SQL',
      'sh': 'Bash',
      'yaml': 'YAML',
      'yml': 'YAML',
      'xml': 'XML',
      'swift': 'Swift',
      'kt': 'Kotlin',
      'rs': 'Rust',
      'dart': 'Dart'
    };
    
    return languageMap[extension] || 'code';
  };

  const analyzeCode = async () => {
    if (!currentContent || currentContent.type !== 'file' || !isAiInitialized) return;
    
    const code = currentContent.content as string;
    if (!code) return;
    
    const language = getFileLanguage(currentContent.path);
    const prompt = CODE_ANALYSIS_PROMPTS[analysisType](code, language);
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await aiService.generateText(prompt);
      setAnalysisResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze code');
      setAnalysisResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const getButtonColor = (type: AnalysisType): string => {
    return type === analysisType ? 'blue' : 'gray';
  };
  
  const getActionIcon = (type: AnalysisType) => {
    const iconMap = {
      analyze: FaBug,
      review: FaCheck,
      suggest: FaLightbulb,
      explain: FaCode
    };
    
    return iconMap[type];
  };

  if (!currentContent || currentContent.type !== 'file') {
    return (
      <Box p={4} borderWidth="1px" borderRadius="md" mt={4}>
        <Flex align="center" mb={4}>
          <Box mr={2}>
            <IconWrapper icon={FaRobot} size={20} />
          </Box>
          <Heading size="md">AI Code Assistant</Heading>
        </Flex>
        <Text>Select a file to analyze with AI</Text>
      </Box>
    );
  }

  if (!isAiInitialized) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="md" mt={4}>
        <Flex align="center" mb={4}>
          <Box mr={2}>
            <IconWrapper icon={FaRobot} size={20} />
          </Box>
          <Heading size="md">AI Code Assistant</Heading>
        </Flex>
        <Text mb={4}>AI service is not initialized. Please set up your AI API key in settings.</Text>
      </Box>
    );
  }

  return (
    <Box p={4} borderWidth="1px" borderRadius="md" mt={4}>
      <Flex align="center" mb={4}>
        <Box mr={2}>
          <IconWrapper icon={FaRobot} size={20} />
        </Box>
        <Heading size="md">AI Code Assistant</Heading>
      </Flex>
      
      <Text mb={2}>What would you like to do with this code?</Text>
      
      <Flex mb={6} wrap="wrap" gap={2}>
        {(['analyze', 'review', 'suggest', 'explain'] as AnalysisType[]).map(type => {
          const IconComponent = getActionIcon(type);
          return (
            <Button
              key={type}
              colorScheme={getButtonColor(type)}
              variant={type === analysisType ? 'solid' : 'outline'}
              onClick={() => setAnalysisType(type)}
              mb={2}
              size="sm"
            >
              <Box mr={1} display="inline-block">
                <IconWrapper icon={IconComponent} />
              </Box>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          );
        })}
      </Flex>
      
      <Button
        colorScheme="blue"
        onClick={analyzeCode}
        disabled={isAnalyzing}
        mb={4}
        width="100%"
      >
        {isAnalyzing && <Box mr={2} display="inline-block"><Spinner size="sm" /></Box>}
        {isAnalyzing ? 'Analyzing...' : `${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} Code`}
      </Button>
      
      {error && (
        <Box p={3} mb={4} bg="red.50" color="red.500" borderRadius="md">
          {error}
        </Box>
      )}
      
      {analysisResult && (
        <Box borderWidth="1px" borderRadius="md" p={4} bg="gray.50" overflowY="auto" maxHeight="400px">
          <Text whiteSpace="pre-wrap">{analysisResult}</Text>
        </Box>
      )}
    </Box>
  );
};

export default CodeAnalysis; 