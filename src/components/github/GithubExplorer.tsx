import React from 'react';
import { useSelector } from 'react-redux';
import { Box, Heading, Divider } from '@chakra-ui/react';
import RepositoryList from './RepositoryList';
import { RootState } from '../../store';

const GithubExplorer: React.FC = () => {
  const isAuthenticated = useSelector((state: RootState) => state.github.isAuthenticated);
  
  return (
    <Box borderWidth="1px" borderRadius="md" overflow="hidden">
      <Box p={4} bg="gray.50">
        <Heading size="md">GitHub Explorer</Heading>
      </Box>
      <Divider />
      
      {isAuthenticated ? (
        <Box>
          <Box p={0}>
            <RepositoryList />
          </Box>
        </Box>
      ) : (
        <Box p={6} textAlign="center">
          <Heading size="sm" mb={2}>Connect to GitHub</Heading>
          <Box fontSize="sm">
            Connect your GitHub account to access repositories, pull requests, and issues.
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default GithubExplorer; 