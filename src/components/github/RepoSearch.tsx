import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Box, 
  Input, 
  Button, 
  Flex, 
  Spinner, 
  Text
} from '@chakra-ui/react';
import { FaSearch, FaGithub } from 'react-icons/fa';
import { AppDispatch, RootState } from '../../store';
import { GitHubRepository } from '../../types/github';
import { setRepositories, setSelectedRepository } from '../../store/slices/githubSlice';
import { fetchRepositoryBranches } from '../../store/thunks/githubThunks';

const RepoSearch: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const authToken = useSelector((state: RootState) => (state.github as any).authToken);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GitHubRepository[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim() || !authToken) return;
    
    setIsSearching(true);
    setError(null);
    
    try {
      const response = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${authToken}`,
        }
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      const data = await response.json();
      setSearchResults(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during search');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleSelectRepository = (repo: GitHubRepository) => {
    // Save to store
    dispatch(setRepositories([repo]));
    dispatch(setSelectedRepository(repo.id));
    dispatch(fetchRepositoryBranches(repo.id));
    
    // Clear search results
    setSearchResults([]);
    setQuery('');
  };
  
  return (
    <Box mb={6}>
      <form onSubmit={handleSearch}>
        <Flex mb={4}>
          <Input
            placeholder="Search for GitHub repositories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={!authToken || isSearching}
          />
          <Button 
            ml={2} 
            type="submit" 
            colorScheme="blue" 
            disabled={!authToken || !query.trim() || isSearching}
          >
            {isSearching ? <Spinner size="sm" /> : 'Search'}
          </Button>
        </Flex>
      </form>
      
      {error && (
        <Box p={3} mb={4} bg="red.50" color="red.500" borderRadius="md">
          {error}
        </Box>
      )}
      
      {searchResults.length > 0 && (
        <Box maxHeight="400px" overflowY="auto" p={2} borderWidth="1px" borderRadius="md">
          <Text fontWeight="bold" mb={2}>
            Search Results ({searchResults.length})
          </Text>
          
          {searchResults.map(repo => (
            <Box 
              key={repo.id}
              p={3}
              mb={2}
              borderWidth="1px"
              borderRadius="md"
              cursor="pointer"
              _hover={{ bg: 'gray.50' }}
              onClick={() => handleSelectRepository(repo)}
            >
              <Flex align="center">
                <Box mr={3}><FaGithub /></Box>
                <Box>
                  <Text fontWeight="bold">{repo.full_name}</Text>
                  <Text fontSize="sm" color="gray.600">
                    {repo.description && repo.description.length > 100 
                      ? repo.description.substring(0, 100) + '...' 
                      : repo.description || 'No description'}
                  </Text>
                  <Flex mt={1} fontSize="xs" color="gray.500">
                    <Text mr={3}>{repo.stargazers_count} stars</Text>
                    <Text mr={3}>{repo.forks_count} forks</Text>
                    {repo.language && <Text>{repo.language}</Text>}
                  </Flex>
                </Box>
              </Flex>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default RepoSearch; 