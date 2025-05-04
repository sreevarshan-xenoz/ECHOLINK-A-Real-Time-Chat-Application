import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Box, 
  Button, 
  Input,
  Heading, 
  Text, 
  Flex,
  Image
} from '@chakra-ui/react';
import { FaGithub, FaKey, FaSignOutAlt, FaUser, FaExclamationTriangle } from 'react-icons/fa';
import { initializeGitHub } from '../../store/thunks/githubThunks';
import { resetGitHubState } from '../../store/slices/githubSlice';
import { AppDispatch, RootState } from '../../store';
import { IconWrapper } from '../../utils/IconWrapper';

const GithubAuth: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [token, setToken] = useState('');
  const isAuthenticated = useSelector((state: RootState) => state.github.isAuthenticated);
  const user = useSelector((state: RootState) => state.github.user);
  const isLoading = useSelector((state: RootState) => state.github.isLoading);
  const error = useSelector((state: RootState) => state.github.error);

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
          <Box 
            mr={4} 
            borderRadius="full" 
            width="48px" 
            height="48px"
            overflow="hidden"
            position="relative"
          >
            <Image 
              src={user.avatar_url} 
              width="100%" 
              height="100%"
              objectFit="cover"
              alt={user.login || "User avatar"}
            />
            <Box 
              position="absolute" 
              bottom="0" 
              right="0"
              width="12px" 
              height="12px" 
              borderRadius="full" 
              bg="green.500"
              border="2px solid white"
            />
          </Box>
          <Box>
            <Heading size="md">{user.name || user.login}</Heading>
            <Text fontSize="sm" color="gray.500">@{user.login}</Text>
          </Box>
          <Button 
            ml="auto" 
            size="sm" 
            colorScheme="red" 
            onClick={handleLogout}
          >
            <Flex align="center">
              <Box mr={2}>
                <IconWrapper icon={FaSignOutAlt} />
              </Box>
              <Text>Disconnect</Text>
            </Flex>
          </Button>
        </Flex>
        <Flex wrap="wrap" fontSize="sm" color="gray.600">
          <Flex align="center" mr={4} mb={2}>
            <Box mr={1}>
              <IconWrapper icon={FaUser} />
            </Box>
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
          <Box mr={2}>
            <IconWrapper icon={FaGithub} />
          </Box>
          <Text>Connect to GitHub</Text>
        </Flex>
      </Heading>
      
      {error && (
        <Box p={3} bg="red.50" color="red.600" borderRadius="md" mb={4} fontSize="sm">
          <Flex align="center">
            <Box mr={2}>
              <IconWrapper icon={FaExclamationTriangle} />
            </Box>
            <Text>{error}</Text>
          </Flex>
        </Box>
      )}
      
      <Text mb={4} fontSize="sm">
        To access your GitHub repositories, you need to provide a personal access token with repo scope.
      </Text>
      
      <form onSubmit={handleConnect}>
        <Box mb={4}>
          <Box as="label" fontSize="sm" display="block" mb={1}>
            GitHub Personal Access Token
          </Box>
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
              type="submit"
              disabled={!token.trim() || isLoading}
            >
              <Flex align="center">
                <Box mr={2}>
                  <IconWrapper icon={FaKey} />
                </Box>
                <Text>{isLoading ? "Connecting..." : "Connect"}</Text>
              </Flex>
            </Button>
          </Flex>
          <Text fontSize="xs" mt={1} color="gray.500">
            <Box
              as="span"
              onClick={() => window.open('https://github.com/settings/tokens/new', '_blank')}
              color="blue.500"
              textDecoration="none"
              cursor="pointer"
              _hover={{ textDecoration: "underline" }}
              display="inline"
            >
              Create a token
            </Box> with 'repo' scope for full repository access.
          </Text>
        </Box>
      </form>
    </Box>
  );
};

export default GithubAuth; 