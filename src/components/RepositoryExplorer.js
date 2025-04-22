import React, { useState, useEffect } from 'react';
import { Box, Button, Input, Text, VStack, HStack, Icon, Spinner, useToast } from '@chakra-ui/react';
import { FaGithub, FaFolder, FaFolderOpen, FaFile } from 'react-icons/fa';
import githubService from '../services/github';
import fileSystemService from '../services/fileSystem';

const FileTreeNode = ({ node, level = 0, onNodeClick }) => {
  const handleClick = () => {
    onNodeClick(node);
  };

  const iconProps = {
    mr: 2,
    boxSize: 4
  };

  return (
    <>
      <HStack 
        py={1} 
        px={2} 
        pl={level * 4 + 2} 
        cursor="pointer" 
        _hover={{ bg: 'gray.100' }}
        onClick={handleClick}
        role="group"
        w="100%"
      >
        {node.type === 'dir' ? (
          <Icon as={node.expanded ? FaFolderOpen : FaFolder} color="yellow.500" {...iconProps} />
        ) : (
          <Icon as={FaFile} color="blue.500" {...iconProps} />
        )}
        <Text fontSize="sm" fontFamily="monospace" isTruncated>{node.name}</Text>
      </HStack>
      
      {node.expanded && node.children && node.children.map(childNode => (
        <FileTreeNode 
          key={childNode.path} 
          node={childNode} 
          level={level + 1}
          onNodeClick={onNodeClick} 
        />
      ))}
    </>
  );
};

const RepositoryExplorer = ({ onFileSelect }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [repoData, setRepoData] = useState(null);
  const [fileTree, setFileTree] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  const loadRepository = async () => {
    if (!repoUrl) {
      setError('Please enter a GitHub repository URL');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const data = await githubService.loadRepository(repoUrl);
      setRepoData(data);
      
      // Process the file tree to add UI metadata
      const processedTree = fileSystemService.processFileTree(data.fileTree);
      
      // Set initial expanded state for root directories
      const treeWithExpandedRoots = processedTree.map(node => {
        if (node.type === 'dir') {
          return { ...node, expanded: true };
        }
        return node;
      });
      
      setFileTree(treeWithExpandedRoots);
    } catch (err) {
      setError(err.message || 'Failed to load repository');
      toast({
        title: 'Error',
        description: err.message || 'Failed to load repository',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = (node) => {
    if (node.type === 'dir') {
      // Toggle directory expansion
      const updatedTree = fileSystemService.toggleDirectoryExpanded(fileTree, node.path);
      setFileTree(updatedTree);
    } else if (node.type === 'file') {
      // Handle file selection
      if (onFileSelect) {
        onFileSelect({
          path: node.path,
          name: node.name,
          url: node.download_url,
          repo: repoData.name,
          owner: repoData.owner,
          editable: node.editable,
          syntaxLanguage: fileSystemService.getSyntaxHighlightLanguage(node.name)
        });
      }
    }
  };

  return (
    <Box borderWidth="1px" borderRadius="md" p={4} width="100%">
      <VStack spacing={4} align="stretch">
        <Text fontSize="lg" fontWeight="bold">Repository Explorer</Text>
        
        <HStack>
          <Input
            placeholder="Enter GitHub repository URL"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') loadRepository();
            }}
          />
          <Button 
            leftIcon={<FaGithub />} 
            onClick={loadRepository}
            isLoading={loading}
            colorScheme="blue"
          >
            Load
          </Button>
        </HStack>
        
        {error && <Text color="red.500">{error}</Text>}
        
        {repoData && (
          <Box overflowY="auto" maxHeight="calc(100vh - 200px)" borderWidth="1px" borderRadius="md">
            <Box p={2} bg="gray.50" borderBottom="1px" borderColor="gray.200">
              <Text fontWeight="bold">{repoData.name}</Text>
              <Text fontSize="sm" color="gray.600">{repoData.description}</Text>
            </Box>
            <Box>
              {fileTree.length > 0 ? (
                fileTree.map(node => (
                  <FileTreeNode 
                    key={node.path} 
                    node={node} 
                    onNodeClick={handleNodeClick} 
                  />
                ))
              ) : (
                <Text p={4}>No files found</Text>
              )}
            </Box>
          </Box>
        )}
        
        {loading && (
          <Box textAlign="center" py={4}>
            <Spinner size="md" color="blue.500" />
            <Text mt={2}>Loading repository...</Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default RepositoryExplorer; 