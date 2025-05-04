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
import { FaBook, FaFileAlt } from 'react-icons/fa';
import { RootState } from '../../store';
import aiService from '../../services/ai-service';
import { IconWrapper } from '../../utils/IconWrapper';

type DocType = 'jsdoc' | 'readme' | 'api' | 'guide';

const DocumentationGenerator: React.FC = () => {
  const currentContent = useSelector((state: RootState) => (state.github as any).currentContent);
  const selectedRepository = useSelector((state: RootState) => (state.github as any).selectedRepository);
  const [docType, setDocType] = useState<DocType>('jsdoc');
  const [generatedDocs, setGeneratedDocs] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAiInitialized = useSelector((state: RootState) => (state.ai as any)?.initialized || false);

  const isFileSelected = currentContent && currentContent.type === 'file';
  
  const getFileExtension = (filePath: string): string => {
    return filePath.split('.').pop()?.toLowerCase() || '';
  };

  const getLanguage = (extension: string): string => {
    const extensionMap: Record<string, string> = {
      'js': 'JavaScript',
      'jsx': 'JavaScript (React)',
      'ts': 'TypeScript',
      'tsx': 'TypeScript (React)',
      'py': 'Python',
      'java': 'Java',
      'rb': 'Ruby',
      'go': 'Go',
      'php': 'PHP',
      'cs': 'C#',
      'rs': 'Rust',
    };
    
    return extensionMap[extension] || extension;
  };

  const generateDocumentation = async () => {
    if (!isFileSelected || !isAiInitialized) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const code = currentContent.content as string;
      const filePath = currentContent.path;
      const extension = getFileExtension(filePath);
      const language = getLanguage(extension);
      
      let prompt = '';
      
      switch (docType) {
        case 'jsdoc':
          prompt = `Add JSDoc/TSDoc comments to the following ${language} code. Return the complete file with proper documentation comments added:
          
\`\`\`${extension}
${code}
\`\`\`

Focus on documenting:
1. Functions and methods (parameters, return values, exceptions)
2. Classes and interfaces (purpose, examples)
3. Complex logic sections
4. Add @param, @returns, @throws, and @example tags where appropriate`;
          break;
        
        case 'readme':
          prompt = `Create a comprehensive README.md for this ${language} file. The file path is ${filePath}.
          
\`\`\`${extension}
${code}
\`\`\`

Include these sections:
1. Overview and purpose
2. Installation instructions (if applicable)
3. Usage examples
4. API documentation
5. Dependencies
6. Function/method descriptions
7. Troubleshooting tips
8. Contributing guidelines`;
          break;
        
        case 'api':
          prompt = `Generate API documentation for the following ${language} code. Focus on public interfaces, functions, and methods:
          
\`\`\`${extension}
${code}
\`\`\`

Include:
1. Function signatures
2. Parameter descriptions
3. Return value details
4. Usage examples
5. Error handling information`;
          break;
        
        case 'guide':
          prompt = `Create a user guide/tutorial explaining how to use the functionality in this ${language} file:
          
\`\`\`${extension}
${code}
\`\`\`

The guide should:
1. Explain the main purpose of this code
2. Provide step-by-step usage instructions
3. Include practical examples
4. Explain key concepts
5. Cover typical use cases and edge cases`;
          break;
          
        default:
          prompt = `Document the following ${language} code:
          
\`\`\`${extension}
${code}
\`\`\``;
      }
      
      const result = await aiService.generateText(prompt);
      setGeneratedDocs(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate documentation');
      setGeneratedDocs(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyDocs = () => {
    if (generatedDocs) {
      navigator.clipboard.writeText(generatedDocs);
    }
  };

  if (!isAiInitialized) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="md" mt={4}>
        <Flex align="center" mb={4}>
          <Box mr={2}><FaBook size={20} /></Box>
          <Heading size="md">Documentation Generator</Heading>
        </Flex>
        <Text mb={4}>AI service is not initialized. Please set up your AI API key in settings.</Text>
      </Box>
    );
  }

  return (
    <Box p={4} borderWidth="1px" borderRadius="md" mt={4}>
      <Flex align="center" mb={4}>
        <Box mr={2}><FaBook size={20} /></Box>
        <Heading size="md">Documentation Generator</Heading>
      </Flex>
      
      {!isFileSelected ? (
        <Text mb={4} color="orange.500">
          Please select a file to generate documentation.
        </Text>
      ) : (
        <>
          <Text mb={2}>Documentation Type:</Text>
          <Flex direction="row" mb={4} flexWrap="wrap">
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.5rem',
              marginRight: '0.5rem',
              marginBottom: '0.5rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              backgroundColor: docType === 'jsdoc' ? '#ebf8ff' : 'transparent'
            }}>
              <input 
                type="radio" 
                value="jsdoc" 
                checked={docType === 'jsdoc'} 
                onChange={() => setDocType('jsdoc')}
                style={{ marginRight: '0.5rem' }}
              />
              JSDoc/TSDoc
            </label>
            
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.5rem',
              marginRight: '0.5rem',
              marginBottom: '0.5rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              backgroundColor: docType === 'readme' ? '#ebf8ff' : 'transparent'
            }}>
              <input 
                type="radio" 
                value="readme" 
                checked={docType === 'readme'} 
                onChange={() => setDocType('readme')}
                style={{ marginRight: '0.5rem' }}
              />
              README
            </label>
            
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.5rem',
              marginRight: '0.5rem',
              marginBottom: '0.5rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              backgroundColor: docType === 'api' ? '#ebf8ff' : 'transparent'
            }}>
              <input 
                type="radio" 
                value="api" 
                checked={docType === 'api'} 
                onChange={() => setDocType('api')}
                style={{ marginRight: '0.5rem' }}
              />
              API Docs
            </label>
            
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.5rem',
              marginRight: '0.5rem',
              marginBottom: '0.5rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              backgroundColor: docType === 'guide' ? '#ebf8ff' : 'transparent'
            }}>
              <input 
                type="radio" 
                value="guide" 
                checked={docType === 'guide'} 
                onChange={() => setDocType('guide')}
                style={{ marginRight: '0.5rem' }}
              />
              User Guide
            </label>
          </Flex>
          
          <Button
            colorScheme="blue"
            onClick={generateDocumentation}
            disabled={isGenerating}
            mb={4}
            width="100%"
          >
            {isGenerating && <Box mr={2} display="inline-block"><Spinner size="sm" /></Box>}
            {isGenerating ? 'Generating...' : 'Generate Documentation'}
          </Button>
        </>
      )}
      
      {error && (
        <Box p={3} mb={4} bg="red.50" color="red.500" borderRadius="md">
          {error}
        </Box>
      )}
      
      {generatedDocs && (
        <Box mt={4}>
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontWeight="bold">Generated Documentation:</Text>
            <Button size="sm" onClick={handleCopyDocs}>Copy</Button>
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
            <pre style={{ whiteSpace: 'pre-wrap' }}>{generatedDocs}</pre>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default DocumentationGenerator; 