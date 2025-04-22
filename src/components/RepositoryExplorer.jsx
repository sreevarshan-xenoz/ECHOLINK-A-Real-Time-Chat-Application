import React, { useState, useEffect } from 'react';
import { Box, Flex, Input, Button, Text, VStack, HStack, Icon, Spinner, useToast, InputGroup, InputLeftElement } from '@chakra-ui/react';
import { FaGithub, FaFolder, FaFolderOpen, FaFile, FaSearch } from 'react-icons/fa';
import githubService from '../services/github';
import fileSystemService from '../services/fileSystem';

/**
 * File tree node component
 */
const FileTreeNode = ({ node, level = 0, onNodeSelect, selectedNode }) => {
  const [isExpanded, setIsExpanded] = useState(node.isExpanded || false);
  const isSelected = selectedNode && selectedNode.path === node.path;
  const isDirectory = node.type === 'dir';
  
  const handleToggle = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };
  
  const handleSelect = () => {
    onNodeSelect(node);
  };

  // Get icon based on file type
  const getIcon = () => {
    if (isDirectory) {
      return isExpanded ? FaFolderOpen : FaFolder;
    }
    
    // For files, use a specific icon or default file icon
    return FaFile;
  };
  
  return (
    <Box>
      <HStack 
        spacing={2} 
        py={1} 
        px={2} 
        cursor="pointer"
        onClick={handleSelect}
        bg={isSelected ? 'blue.50' : 'transparent'}
        _hover={{ bg: isSelected ? 'blue.100' : 'gray.50' }}
        borderRadius="md"
      >
        <Box pl={level * 4}>
          <Icon 
            as={getIcon()} 
            color={isDirectory ? "yellow.500" : "gray.500"} 
            onClick={isDirectory ? handleToggle : undefined}
          />
        </Box>
        <Text fontSize="sm">{node.name}</Text>
      </HStack>
      
      {isDirectory && isExpanded && node.children && (
        <Box>
          {node.children.map((childNode) => (
            <FileTreeNode 
              key={childNode.path} 
              node={childNode} 
              level={level + 1}
              onNodeSelect={onNodeSelect}
              selectedNode={selectedNode}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

/**
 * Component to display repository file content
 */
const FileViewer = ({ file }) => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();
  
  useEffect(() => {
    const loadFileContent = async () => {
      if (!file || file.type === 'dir') return;
      
      setLoading(true);
      setError(null);
      
      try {
        const fileContent = await githubService.getFileContent(file.download_url);
        setContent(fileContent);
      } catch (err) {
        setError('Failed to load file content');
        toast({
          title: 'Error loading file',
          description: err.message || 'Failed to load file content',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadFileContent();
  }, [file, toast]);
  
  if (!file) {
    return (
      <Box p={4} borderWidth={1} borderRadius="md" height="100%">
        <Text>Select a file to view its content</Text>
      </Box>
    );
  }
  
  if (file.type === 'dir') {
    return (
      <Box p={4} borderWidth={1} borderRadius="md" height="100%">
        <Text>Selected: Directory '{file.name}'</Text>
        <Text mt={2} fontSize="sm" color="gray.600">
          {file.children ? `Contains ${file.children.length} items` : 'Empty directory'}
        </Text>
      </Box>
    );
  }
  
  if (loading) {
    return (
      <Box p={4} borderWidth={1} borderRadius="md" height="100%" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box p={4} borderWidth={1} borderRadius="md" height="100%">
        <Text color="red.500">{error}</Text>
      </Box>
    );
  }
  
  return (
    <Box p={4} borderWidth={1} borderRadius="md" height="100%" overflow="auto">
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {content}
      </pre>
    </Box>
  );
};

/**
 * Main Repository Explorer component
 */
const RepositoryExplorer = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [repository, setRepository] = useState(null);
  const [fileTree, setFileTree] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const toast = useToast();
  
  const handleInputChange = (e) => {
    setRepoUrl(e.target.value);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!repoUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a GitHub repository URL',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setLoading(true);
    setError(null);
    setRepository(null);
    setFileTree([]);
    setSelectedNode(null);
    setSearchTerm('');
    setSearchResults([]);
    
    try {
      const repoData = await githubService.loadRepository(repoUrl);
      setRepository(repoData.repository);
      
      // Process the file tree
      const processedTree = fileSystemService.processFileTree(repoData.fileTree);
      setFileTree(processedTree);
      
      toast({
        title: 'Repository loaded',
        description: `Successfully loaded ${repoData.repository.name}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      setError(err.message || 'Failed to load repository');
      toast({
        title: 'Error loading repository',
        description: err.message || 'Failed to load repository',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleNodeSelect = (node) => {
    setSelectedNode(node);
  };
  
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.trim()) {
      setIsSearching(true);
      const results = fileSystemService.searchFiles(fileTree, value);
      setSearchResults(results);
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };
  
  return (
    <Box p={4}>
      <form onSubmit={handleSubmit}>
        <Flex mb={4}>
          <Input
            placeholder="Enter GitHub repository URL (e.g., https://github.com/username/repo)"
            value={repoUrl}
            onChange={handleInputChange}
            mr={2}
            disabled={loading}
          />
          <Button
            leftIcon={<FaGithub />}
            colorScheme="blue"
            type="submit"
            isLoading={loading}
            loadingText="Loading"
          >
            Load
          </Button>
        </Flex>
      </form>
      
      {error && (
        <Box mb={4} p={3} bg="red.50" color="red.600" borderRadius="md">
          {error}
        </Box>
      )}
      
      {repository && (
        <Box mb={4} p={3} bg="blue.50" borderRadius="md">
          <Text fontWeight="bold">{repository.name}</Text>
          <Text fontSize="sm">{repository.description}</Text>
          <Text fontSize="xs" mt={1}>
            ⭐ {repository.stars} · 🍴 {repository.forks}
          </Text>
        </Box>
      )}
      
      {fileTree.length > 0 && (
        <Flex direction={{ base: "column", md: "row" }} gap={4}>
          <Box 
            width={{ base: "100%", md: "300px" }} 
            borderWidth={1} 
            borderRadius="md" 
            height={{ base: "300px", md: "600px" }}
            overflowY="auto"
            p={2}
          >
            {/* Search Box */}
            <InputGroup size="sm" mb={2}>
              <InputLeftElement pointerEvents="none">
                <Icon as={FaSearch} color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Search files..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </InputGroup>
            
            <VStack align="stretch" spacing={0}>
              {isSearching ? (
                searchResults.length > 0 ? (
                  searchResults.map((node) => (
                    <HStack 
                      key={node.path}
                      spacing={2} 
                      py={1} 
                      px={2} 
                      cursor="pointer"
                      onClick={() => handleNodeSelect(node)}
                      bg={selectedNode && selectedNode.path === node.path ? 'blue.50' : 'transparent'}
                      _hover={{ bg: 'gray.50' }}
                      borderRadius="md"
                    >
                      <Icon 
                        as={node.type === 'dir' ? FaFolder : FaFile} 
                        color={node.type === 'dir' ? "yellow.500" : "gray.500"} 
                      />
                      <Text fontSize="sm">{node.name}</Text>
                      <Text fontSize="xs" color="gray.500">{node.path}</Text>
                    </HStack>
                  ))
                ) : (
                  <Text p={2} fontSize="sm" color="gray.500">No results found</Text>
                )
              ) : (
                fileTree.map((node) => (
                  <FileTreeNode 
                    key={node.path} 
                    node={node} 
                    onNodeSelect={handleNodeSelect}
                    selectedNode={selectedNode}
                  />
                ))
              )}
            </VStack>
          </Box>
          
          <Box 
            flex={1} 
            height={{ base: "400px", md: "600px" }}
          >
            <FileViewer file={selectedNode} />
          </Box>
        </Flex>
      )}
      
      {loading && (
        <Flex 
          justify="center" 
          align="center" 
          height="200px" 
          direction="column"
        >
          <Spinner size="xl" mb={4} />
          <Text>Loading repository data...</Text>
        </Flex>
      )}
    </Box>
  );
};

export default RepositoryExplorer; 