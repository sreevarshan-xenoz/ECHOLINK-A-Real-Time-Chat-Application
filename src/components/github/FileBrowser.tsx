import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Flex, 
  Text, 
  Button, 
  Spinner
} from '@chakra-ui/react';
import { FaFile, FaFolder, FaChevronRight, FaSyncAlt } from 'react-icons/fa';
import { RootState, AppDispatch } from '../../store';
import { fetchRepositoryContents } from '../../store/thunks/githubThunks';
import { setSelectedPath } from '../../store/slices/githubSlice';
import { IconWrapper } from '../../utils/IconWrapper';
import './FileBrowser.css';

// Helper function to format file size
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const FileBrowser: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const isLoading = useSelector((state: RootState) => state.github.isLoading);
  const selectedRepoId = useSelector((state: RootState) => state.github.selectedRepository);
  const selectedPath = useSelector((state: RootState) => state.github.selectedPath);
  const currentContent = useSelector((state: RootState) => state.github.currentContent);
  
  useEffect(() => {
    if (selectedRepoId) {
      dispatch(fetchRepositoryContents({ path: selectedPath || '' }));
    }
  }, [selectedRepoId, selectedPath, dispatch]);
  
  const handlePathClick = (newPath: string) => {
    dispatch(setSelectedPath(newPath));
  };
  
  const handleItemClick = (item: any) => {
    dispatch(fetchRepositoryContents({ path: item.path }));
  };
  
  if (!selectedRepoId) {
    return (
      <Box p={4} textAlign="center">
        <Text>Please select a repository first</Text>
      </Box>
    );
  }
  
  if (isLoading) {
    return (
      <Flex justify="center" align="center" p={8}>
        <Spinner />
      </Flex>
    );
  }
  
  if (!currentContent) {
    return (
      <Box p={4} textAlign="center">
        <Text>No content available</Text>
      </Box>
    );
  }
  
  // Custom breadcrumb rendering
  const renderBreadcrumb = (path: string) => {
    const segments = path ? path.split('/') : [];
    return (
      <Flex align="center" mb={4} overflow="auto" className="custom-breadcrumb">
        <Box 
          as="span" 
          onClick={() => handlePathClick('')}
          cursor="pointer"
          color="blue.500"
          _hover={{ textDecoration: 'underline' }}
          mr={2}
        >
          Root
        </Box>
        
        {segments.map((segment, index) => {
          const pathToSegment = segments.slice(0, index + 1).join('/');
          return (
            <React.Fragment key={index}>
              <Box mx={1} color="gray.500">
                <IconWrapper icon={FaChevronRight} />
              </Box>
              <Box 
                as="span" 
                onClick={() => handlePathClick(pathToSegment)}
                cursor="pointer"
                color="blue.500"
                _hover={{ textDecoration: 'underline' }}
                mr={2}
              >
                {segment}
              </Box>
            </React.Fragment>
          );
        })}
      </Flex>
    );
  };
  
  // Show file content if current content is a file
  if (currentContent.type === 'file') {
    return (
      <Box>
        {renderBreadcrumb(currentContent.path)}
        
        <Box p={4} borderWidth="1px" borderRadius="md" fontFamily="monospace" overflow="auto">
          <pre style={{ whiteSpace: 'pre-wrap', maxHeight: '70vh', overflow: 'auto' }}>
            {typeof currentContent.content === 'string' ? currentContent.content : 'Cannot display content'}
          </pre>
        </Box>
      </Box>
    );
  }
  
  // Show directory listing
  return (
    <Box p={4} borderWidth="1px" borderRadius="md">
      {renderBreadcrumb(selectedPath || '')}
      
      <Flex justifyContent="space-between" mb={4}>
        <Button 
          onClick={() => dispatch(fetchRepositoryContents({ path: selectedPath || '' }))} 
          size="sm"
        >
          <Flex align="center">
            <Box mr={2}>
              <IconWrapper icon={FaSyncAlt} />
            </Box>
            <Text>Refresh</Text>
          </Flex>
        </Button>
      </Flex>

      {isLoading ? (
        <Flex justify="center" p={4}>
          <Spinner />
        </Flex>
      ) : currentContent.content && Array.isArray(currentContent.content) && currentContent.content.length === 0 ? (
        <Text>This directory is empty</Text>
      ) : (
        <div className="file-browser-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Size</th>
              </tr>
            </thead>
            <tbody>
              {currentContent.content && Array.isArray(currentContent.content) && currentContent.content.length > 0 ? (
                currentContent.content.map((item: any) => (
                  <tr 
                    key={item.path}
                    onClick={() => handleItemClick(item)}
                    className={item.type === 'file' ? 'file-item' : 'folder-item'}
                  >
                    <td>
                      <Flex align="center">
                        <Box 
                          mr={2} 
                          color={item.type === 'file' ? 'blue.500' : 'yellow.500'}
                        >
                          {item.type === 'file' ? 
                            <IconWrapper icon={FaFile} /> : 
                            <IconWrapper icon={FaFolder} />
                          }
                        </Box>
                        <Text>{item.name}</Text>
                      </Flex>
                    </td>
                    <td>
                      {item.type === 'file' ? formatFileSize(item.size || 0) : ''}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2}>
                    <Text textAlign="center">Empty directory</Text>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Box>
  );
};

export default FileBrowser; 