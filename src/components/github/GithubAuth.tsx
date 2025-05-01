import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Box, 
  Button, 
  Input, 
  FormControl, 
  FormLabel, 
  FormHelperText, 
  Heading, 
  Text, 
  Flex,
  Icon,
  Alert,
  AlertIcon,
  Link,
  Avatar,
  AvatarBadge
} from '@chakra-ui/react';
import { FaGithub, FaKey, FaSignOutAlt, FaUser } from 'react-icons/fa';
import { initializeGitHub } from '../../store/thunks/githubThunks';
import { resetGitHubState } from '../../store/slices/githubSlice';
import { AppDispatch, RootState } from '../../store';

const GithubAuth: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [token, setToken] = useState('');
  const isAuthenticated = useSelector((state: RootState) => (state.github as any).isAuthenticated);
  const user = useSelector((state: RootState) => (state.github as any).user);
  const isLoading = useSelector((state: RootState) => (state.github as any).isLoading);
  const error = useSelector((state: RootState) => (state.github as any).error);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      dispatch(initializeGitHub(token.trim()));
    }
  };

  const handleLogout = () => {
    dispatch(resetGitHubState());
    setToken('');
  };

  if (isAuthenticated && user) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="md" mb={4}>
        <Flex align="center" mb={4}>
          <Avatar 
            src={user.avatar_url} 
            size="md" 
            mr={4}
          >
            <AvatarBadge bg="green.500" boxSize="1em" />
          </Avatar>
          <Box>
            <Heading size="md">{user.name || user.login}</Heading>
            <Text fontSize="sm" color="gray.500">@{user.login}</Text>
          </Box>
          <Button 
            ml="auto" 
            size="sm" 
            colorScheme="red" 
            leftIcon={<Icon as={FaSignOutAlt} />}
            onClick={handleLogout}
          >
            Disconnect
          </Button>
        </Flex>
        <Flex wrap="wrap" fontSize="sm" color="gray.600">
          <Flex align="center" mr={4} mb={2}>
            <Icon as={FaUser} mr={1} />
            <Text>{user.public_repos} repositories</Text>
          </Flex>
          <Flex align="center" mr={4} mb={2}>
            <Text>{user.followers} followers</Text>
          </Flex>
          <Flex align="center" mb={2}>
            <Text>{user.following} following</Text>
          </Flex>
        </Flex>
        <Text mt={2} fontSize="xs" color="gray.500">
          Connected to GitHub API with read/write access
        </Text>
      </Box>
    );
  }

  return (
    <Box p={4} borderWidth="1px" borderRadius="md" mb={4}>
      <Heading size="md" mb={4}>
        <Flex align="center">
          <Icon as={FaGithub} mr={2} />
          Connect to GitHub
        </Flex>
      </Heading>
      
      {error && (
        <Alert status="error" mb={4} fontSize="sm" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}
      
      <Text mb={4} fontSize="sm">
        To access your GitHub repositories, you need to provide a personal access token with repo scope.
      </Text>
      
      <form onSubmit={handleConnect}>
        <FormControl mb={4}>
          <FormLabel fontSize="sm">GitHub Personal Access Token</FormLabel>
          <Flex>
            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_..."
              size="md"
              pr="4.5rem"
              mr={2}
            />
            <Button
              colorScheme="blue"
              isLoading={isLoading}
              loadingText="Connecting"
              type="submit"
              leftIcon={<Icon as={FaKey} />}
              isDisabled={!token.trim()}
            >
              Connect
            </Button>
          </Flex>
          <FormHelperText fontSize="xs">
            <Link 
              href="https://github.com/settings/tokens/new" 
              isExternal 
              color="blue.500"
            >
              Create a token
            </Link> with 'repo' scope for full repository access.
          </FormHelperText>
        </FormControl>
      </form>
    </Box>
  );
};

export default GithubAuth; 