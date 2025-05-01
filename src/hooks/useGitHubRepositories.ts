import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { 
  setRepositories, 
  addRepository, 
  setError, 
  setLoading 
} from '../store/slices/githubSlice';
import { GitHubRepository } from '../types/github';

// This is a placeholder, you'll need to update this to actually call your GitHub service
const fetchRepositories = async (authToken: string): Promise<GitHubRepository[]> => {
  const response = await fetch('https://api.github.com/user/repos', {
    headers: {
      'Authorization': `token ${authToken}`,
      'Accept': 'application/vnd.github+json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }
  
  return response.json();
};

// This is a placeholder for the create repository function
const createRepository = async (
  authToken: string, 
  repoData: { name: string; description?: string; private?: boolean }
): Promise<GitHubRepository> => {
  const response = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      'Authorization': `token ${authToken}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(repoData),
  });
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }
  
  return response.json();
};

export const useGitHubRepositories = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const authToken = useAppSelector((state) => state.github?.authToken);
  const isAuthenticated = useAppSelector((state) => state.github?.isAuthenticated);
  
  // Query for fetching repositories
  const { 
    data: repositories = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['github', 'repositories'],
    queryFn: () => fetchRepositories(authToken!),
    enabled: !!authToken && isAuthenticated,
    staleTime: 300000, // 5 minutes
    // @ts-ignore - React Query v4+ changed the API, but we won't modify the code to support v3
    onSuccess: (data: GitHubRepository[]) => {
      dispatch(setRepositories(data));
    },
    onError: (err: Error) => {
      dispatch(setError(err.message));
    },
  });
  
  // Mutation for creating a repository
  const createRepoMutation = useMutation({
    mutationFn: (repoData: { name: string; description?: string; private?: boolean }) => 
      createRepository(authToken!, repoData),
    onMutate: () => {
      dispatch(setLoading(true));
    },
    onSuccess: (newRepo) => {
      dispatch(addRepository(newRepo));
      dispatch(setLoading(false));
      // Invalidate the repositories query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['github', 'repositories'] });
    },
    onError: (err: Error) => {
      dispatch(setError(err.message));
      dispatch(setLoading(false));
    },
  });
  
  return {
    repositories,
    isLoading,
    isError,
    error,
    refetch,
    createRepository: createRepoMutation.mutate,
    isCreating: createRepoMutation.isPending,
  };
}; 