import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Box, 
  Heading, 
  ListItem, 
  Text, 
  Flex, 
  Badge, 
  Button, 
  Spinner
} from '@chakra-ui/react';
import { FaCode, FaStar, FaCodeBranch, FaExclamationCircle } from 'react-icons/fa';
import { selectRepositories, setSelectedRepository } from '../../store/slices/githubSlice';
import { AppDispatch, RootState } from '../../store';
import { fetchRepositoryBranches } from '../../store/thunks/githubThunks';
import { formatDistanceToNow } from 'date-fns';
import { IconWrapper } from '../../utils/IconWrapper';

const RepositoryList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const repositories = useSelector(selectRepositories);
  const selectedRepositoryId = useSelector((state: RootState) => state.github.selectedRepository);
  const isLoading = useSelector((state: RootState) => state.github.isLoading);
  
  // Use light theme colors as Chakra might not have useColorMode in this version
  const bg = 'white';
  const borderColor = 'gray.200';
  const hoverBg = 'gray.50';
  const selectedBg = 'blue.50';
  
  const handleSelectRepository = (repoId: number) => {
    dispatch(setSelectedRepository(repoId));
    dispatch(fetchRepositoryBranches(repoId));
  };
  
  if (isLoading && repositories.length === 0) {
    return (
      <Flex justify="center" align="center" h="200px">
        <Spinner size="xl" color="blue.500" />
      </Flex>
    );
  }
  
  if (repositories.length === 0) {
    return (
      <Box p={4} textAlign="center">
        <Heading size="md" mb={2}>No Repositories Found</Heading>
        <Text color="gray.500">Connect your GitHub account to see your repositories</Text>
      </Box>
    );
  }
  
  return (
    <Box>
      <Heading size="md" mb={4} px={4}>Your Repositories ({repositories.length})</Heading>
      <Box as="ul" m={0} p={0}>
        {repositories.map((repo) => (
          <ListItem 
            key={repo.id}
            p={3}
            borderBottom="1px"
            borderColor={borderColor}
            bg={repo.id === selectedRepositoryId ? selectedBg : bg}
            _hover={{ bg: repo.id !== selectedRepositoryId ? hoverBg : selectedBg }}
            cursor="pointer"
            onClick={() => handleSelectRepository(repo.id)}
            listStyleType="none"
          >
            <Flex direction="column">
              <Flex align="center" mb={1}>
                <Box mr={2} color="blue.500">
                  <IconWrapper icon={FaCode} />
                </Box>
                <Heading size="sm" fontWeight="600">{repo.name}</Heading>
                {repo.private && (
                  <Badge ml={2} colorScheme="purple" fontSize="xs">
                    Private
                  </Badge>
                )}
              </Flex>
              
              {repo.description && (
                <Text fontSize="sm" color="gray.500" mb={2}>
                  {repo.description.length > 100 
                    ? `${repo.description.substring(0, 100)}...`
                    : repo.description}
                </Text>
              )}
              
              <Flex fontSize="xs" color="gray.500">
                {repo.language && (
                  <Flex align="center" mr={3}>
                    <Box w={2} h={2} borderRadius="full" bg="green.400" mr={1}></Box>
                    <Text>{repo.language}</Text>
                  </Flex>
                )}
                
                <Flex align="center" mr={3}>
                  <Box mr={1}>
                    <IconWrapper icon={FaStar} />
                  </Box>
                  <Text>{repo.stargazers_count}</Text>
                </Flex>
                
                <Flex align="center" mr={3}>
                  <Box mr={1}>
                    <IconWrapper icon={FaCodeBranch} />
                  </Box>
                  <Text>{repo.forks_count}</Text>
                </Flex>
                
                {repo.open_issues_count > 0 && (
                  <Flex align="center">
                    <Box mr={1}>
                      <IconWrapper icon={FaExclamationCircle} />
                    </Box>
                    <Text>{repo.open_issues_count}</Text>
                  </Flex>
                )}
                
                <Text ml="auto">
                  Updated {formatDistanceToNow(new Date(repo.updated_at))} ago
                </Text>
              </Flex>
            </Flex>
          </ListItem>
        ))}
      </Box>
    </Box>
  );
};

export default RepositoryList; 