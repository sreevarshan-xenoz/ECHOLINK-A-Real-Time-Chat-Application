import React from 'react';
import { useSelector } from 'react-redux';
import { Box, Heading, Divider, Tabs, TabList, Tab, TabPanels, TabPanel } from '@chakra-ui/react';
import RepositoryList from './RepositoryList';
import { RootState } from '../../store';

const GithubExplorer: React.FC = () => {
  const isAuthenticated = useSelector((state: RootState) => (state.github as any).isAuthenticated);
  
  return (
    <Box borderWidth="1px" borderRadius="md" overflow="hidden">
      <Box p={4} bg="gray.50">
        <Heading size="md">GitHub Explorer</Heading>
      </Box>
      <Divider />
      
      {isAuthenticated ? (
        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>Repositories</Tab>
            <Tab>Pull Requests</Tab>
            <Tab>Issues</Tab>
          </TabList>
          <TabPanels>
            <TabPanel p={0}>
              <RepositoryList />
            </TabPanel>
            <TabPanel>
              <Box p={4}>Pull requests will be displayed here</Box>
            </TabPanel>
            <TabPanel>
              <Box p={4}>Issues will be displayed here</Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
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