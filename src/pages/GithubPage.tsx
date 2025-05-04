import React from 'react';
import { Box, Container, Grid, GridItem, Flex } from '@chakra-ui/react';
import RepositoryList from '../components/github/RepositoryList';
import FileBrowser from '../components/github/FileBrowser';
import GithubAuth from '../components/github/GithubAuth';
import RepoSearch from '../components/github/RepoSearch';
import CodeAnalysis from '../components/github/CodeAnalysis';
import GitHubCodeGenerator from '../components/github/GitHubCodeGenerator';
import DocumentationGenerator from '../components/github/DocumentationGenerator';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

const GithubPage: React.FC = () => {
  const isAuthenticated = useSelector((state: RootState) => state.github.isAuthenticated);
  const selectedRepository = useSelector((state: RootState) => state.github.selectedRepository);
  
  return (
    <Container maxW="container.xl" pt={5} pb={10}>
      <Box mb={6}>
        <Box p={4} borderWidth="1px" borderRadius="md" mb={4} bg="gray.50">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>GitHub Integration</h2>
          <p style={{ color: 'gray' }}>
            Browse and manage your GitHub repositories, pull requests, and issues directly from EchoLink.
          </p>
        </Box>
      </Box>
      
      <GithubAuth />
      
      {isAuthenticated && (
        <>
          <RepoSearch />
          
          <Grid templateColumns={{ base: "1fr", md: "300px 1fr" }} gap={6}>
            <GridItem>
              <Box borderWidth="1px" borderRadius="md" overflow="hidden">
                <RepositoryList />
              </Box>
            </GridItem>
            
            <GridItem>
              <Box borderWidth="1px" borderRadius="md" p={4} overflow="auto">
                {selectedRepository ? (
                  <FileBrowser />
                ) : (
                  <Flex justify="center" align="center" h="200px">
                    <p>Select a repository to browse files</p>
                  </Flex>
                )}
              </Box>
              
              {selectedRepository && (
                <Box>
                  <CodeAnalysis />
                  <GitHubCodeGenerator />
                  <DocumentationGenerator />
                </Box>
              )}
            </GridItem>
          </Grid>
        </>
      )}
    </Container>
  );
};

export default GithubPage; 