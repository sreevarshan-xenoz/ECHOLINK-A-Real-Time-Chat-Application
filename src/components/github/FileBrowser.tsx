import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Box, 
  Table,
  Tbody,
  Tr,
  Td,
  Icon,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Spinner,
  Flex,
  Text 
} from '@chakra-ui/react';
import { FaFolder, FaFile, FaChevronRight } from 'react-icons/fa';
import { fetchRepositoryContents } from '../../store/thunks/githubThunks';
import { setSelectedPath } from '../../store/slices/githubSlice';
import { AppDispatch, RootState } from '../../store';

const FileBrowser: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const isLoading = useSelector((state: RootState) => (state.github as any).isLoading);
  const selectedRepoId = useSelector((state: RootState) => (state.github as any).selectedRepository);
  const selectedPath = useSelector((state: RootState) => (state.github as any).selectedPath);
  const currentContent = useSelector((state: RootState) => (state.github as any).currentContent);
  
  useEffect(() => {
    if (selectedRepoId) {
      dispatch(fetchRepositoryContents({ path: selectedPath || '' }));
    }
  }, [selectedRepoId, selectedPath, dispatch]);
  
  const handlePathClick = (newPath: string) => {
    dispatch(setSelectedPath(newPath));
  };
  
  const handleFileClick = (file: any) => {
    dispatch(fetchRepositoryContents({ path: file.path }));
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
  
  // Show file content if current content is a file
  if (currentContent.type === 'file') {
    return (
      <Box>
        <Breadcrumb separator={<Icon as={FaChevronRight} />} mb={4}>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => handlePathClick('')}>
              Root
            </BreadcrumbLink>
          </BreadcrumbItem>
          {currentContent.path.split('/').map((segment, index, array) => {
            // Create the path up to this segment
            const pathToSegment = array.slice(0, index + 1).join('/');
            return (
              <BreadcrumbItem key={index} isCurrentPage={index === array.length - 1}>
                <BreadcrumbLink onClick={() => handlePathClick(pathToSegment)}>
                  {segment}
                </BreadcrumbLink>
              </BreadcrumbItem>
            );
          })}
        </Breadcrumb>
        
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
    <Box>
      <Breadcrumb separator={<Icon as={FaChevronRight} />} mb={4}>
        <BreadcrumbItem>
          <BreadcrumbLink onClick={() => handlePathClick('')}>
            Root
          </BreadcrumbLink>
        </BreadcrumbItem>
        {selectedPath && selectedPath.split('/').map((segment, index, array) => {
          // Create the path up to this segment
          const pathToSegment = array.slice(0, index + 1).join('/');
          return (
            <BreadcrumbItem key={index} isCurrentPage={index === array.length - 1}>
              <BreadcrumbLink onClick={() => handlePathClick(pathToSegment)}>
                {segment}
              </BreadcrumbLink>
            </BreadcrumbItem>
          );
        })}
      </Breadcrumb>
      
      <Table variant="simple">
        <Tbody>
          {Array.isArray(currentContent.content) && currentContent.content.length > 0 ? (
            currentContent.content.map((item: any) => (
              <Tr 
                key={item.path}
                _hover={{ bg: 'gray.100' }}
                cursor="pointer"
                onClick={() => handleFileClick(item)}
              >
                <Td width="40px">
                  <Icon as={item.type === 'dir' ? FaFolder : FaFile} color={item.type === 'dir' ? 'yellow.500' : 'blue.500'} />
                </Td>
                <Td>{item.name}</Td>
                <Td isNumeric>{item.size}</Td>
              </Tr>
            ))
          ) : (
            <Tr>
              <Td colSpan={3} textAlign="center">Empty directory</Td>
            </Tr>
          )}
        </Tbody>
      </Table>
    </Box>
  );
};

export default FileBrowser; 