import { createAsyncThunk } from '@reduxjs/toolkit';
import githubService from '../../services/github';
import { 
  setAuthToken, 
  setUser, 
  setLoading, 
  setError,
  setRepositories,
  setSelectedRepository,
  setSelectedBranch,
  setSelectedPath,
  setCurrentContent,
  setCommits,
  setBranches,
  setCollaborators,
  setPullRequests,
  setIssues,
  GitHubState,
  selectRepositoryById
} from '../slices/githubSlice';
import { AppDispatch, RootState } from '../index';
import { GitHubContents, GitHubRepository } from '../../types/github';
import { EntityState } from '@reduxjs/toolkit';

// Helper function to get the token from state
const getToken = (state: RootState): string => {
  const github = state.github as unknown as GitHubState;
  const token = github.authToken;
  if (!token) {
    throw new Error('Authentication token not found');
  }
  return token;
};

// Helper to get typed github state
const getGithubState = (state: RootState): GitHubState => {
  return state.github as unknown as GitHubState;
};

// Initialize GitHub session
export const initializeGitHub = createAsyncThunk<
  void,
  string,
  { dispatch: AppDispatch; state: RootState }
>('github/initialize', async (token, { dispatch }) => {
  dispatch(setLoading(true));
  try {
    dispatch(setAuthToken(token));
    
    // Get user information
    const user = await githubService.getAuthenticatedUser(token);
    dispatch(setUser(user));
    
    // Get repositories
    const repositories = await githubService.getUserRepositories(token);
    dispatch(setRepositories(repositories));
    
    dispatch(setError(null));
  } catch (error) {
    dispatch(setError(error instanceof Error ? error.message : 'Failed to initialize GitHub session'));
    dispatch(setAuthToken(null));
  } finally {
    dispatch(setLoading(false));
  }
});

// Fetch repository branches
export const fetchRepositoryBranches = createAsyncThunk<
  void,
  number,
  { state: RootState; dispatch: AppDispatch }
>('github/fetchBranches', async (repositoryId, { getState, dispatch }) => {
  const state = getState();
  const token = getToken(state);
  const github = getGithubState(state);
  
  // Get repository using selector
  const repository = selectRepositoryById(state, repositoryId);
  
  if (!repository) {
    throw new Error('Repository not found');
  }
  
  dispatch(setLoading(true));
  try {
    const branches = await githubService.getRepositoryBranches(token, repository.full_name);
    dispatch(setBranches({ repositoryId, branches }));
    
    // If no branch is selected and branches exist, select the default branch
    if (!github.selectedBranch && branches.length > 0) {
      const defaultBranch = branches.find(b => b.name === repository.default_branch) || branches[0];
      dispatch(setSelectedBranch(defaultBranch.name));
    }
    
    dispatch(setError(null));
  } catch (error) {
    dispatch(setError(error instanceof Error ? error.message : 'Failed to fetch branches'));
  } finally {
    dispatch(setLoading(false));
  }
});

// Fetch repository contents
export const fetchRepositoryContents = createAsyncThunk<
  void,
  { path: string },
  { state: RootState; dispatch: AppDispatch }
>('github/fetchContents', async ({ path }, { getState, dispatch }) => {
  const state = getState();
  const token = getToken(state);
  const github = getGithubState(state);
  const repoId = github.selectedRepository;
  const branch = github.selectedBranch;
  
  if (!repoId) {
    throw new Error('No repository selected');
  }
  
  // Get repository using selector
  const repository = selectRepositoryById(state, repoId);
  if (!repository) {
    throw new Error('Repository not found');
  }
  
  dispatch(setLoading(true));
  try {
    const contents = await githubService.getRepositoryContents(
      token, 
      repository.full_name, 
      path, 
      branch || undefined
    );
    
    if (Array.isArray(contents)) {
      // Directory contents
      dispatch(setCurrentContent({
        path,
        type: 'directory',
        content: contents,
      }));
    } else {
      // File content
      if (contents.type !== 'file' || !contents.content) {
        throw new Error('Not a file or content is empty');
      }
      
      const decodedContent = atob(contents.content.replace(/\n/g, ''));
      dispatch(setCurrentContent({
        path,
        type: 'file',
        content: decodedContent,
      }));
    }
    
    dispatch(setSelectedPath(path));
    dispatch(setError(null));
  } catch (error) {
    dispatch(setError(error instanceof Error ? error.message : 'Failed to fetch repository contents'));
  } finally {
    dispatch(setLoading(false));
  }
});

// Fetch repository commits
export const fetchRepositoryCommits = createAsyncThunk<
  void,
  void,
  { state: RootState; dispatch: AppDispatch }
>('github/fetchCommits', async (_, { getState, dispatch }) => {
  const state = getState();
  const token = getToken(state);
  const github = getGithubState(state);
  const repoId = github.selectedRepository;
  const branch = github.selectedBranch;
  
  if (!repoId) {
    throw new Error('No repository selected');
  }
  
  // Get repository using selector
  const repository = selectRepositoryById(state, repoId);
  if (!repository) {
    throw new Error('Repository not found');
  }
  
  dispatch(setLoading(true));
  try {
    const commits = await githubService.getRepositoryCommits(
      token, 
      repository.full_name, 
      branch || undefined
    );
    
    dispatch(setCommits({ repositoryId: repoId, commits }));
    dispatch(setError(null));
  } catch (error) {
    dispatch(setError(error instanceof Error ? error.message : 'Failed to fetch commits'));
  } finally {
    dispatch(setLoading(false));
  }
});

// Fetch repository collaborators
export const fetchRepositoryCollaborators = createAsyncThunk<
  void,
  void,
  { state: RootState; dispatch: AppDispatch }
>('github/fetchCollaborators', async (_, { getState, dispatch }) => {
  const state = getState();
  const token = getToken(state);
  const github = getGithubState(state);
  const repoId = github.selectedRepository;
  
  if (!repoId) {
    throw new Error('No repository selected');
  }
  
  // Get repository using selector
  const repository = selectRepositoryById(state, repoId);
  if (!repository) {
    throw new Error('Repository not found');
  }
  
  dispatch(setLoading(true));
  try {
    const collaborators = await githubService.getRepositoryCollaborators(token, repository.full_name);
    dispatch(setCollaborators({ repositoryId: repoId, collaborators }));
    dispatch(setError(null));
  } catch (error) {
    dispatch(setError(error instanceof Error ? error.message : 'Failed to fetch collaborators'));
  } finally {
    dispatch(setLoading(false));
  }
});

// Fetch repository pull requests
export const fetchRepositoryPullRequests = createAsyncThunk<
  void,
  { state: 'open' | 'closed' | 'all' },
  { state: RootState; dispatch: AppDispatch }
>('github/fetchPullRequests', async ({ state: prState }, { getState, dispatch }) => {
  const state = getState();
  const token = getToken(state);
  const github = getGithubState(state);
  const repoId = github.selectedRepository;
  
  if (!repoId) {
    throw new Error('No repository selected');
  }
  
  // Get repository using selector
  const repository = selectRepositoryById(state, repoId);
  if (!repository) {
    throw new Error('Repository not found');
  }
  
  dispatch(setLoading(true));
  try {
    const pullRequests = await githubService.getRepositoryPullRequests(token, repository.full_name, prState);
    dispatch(setPullRequests({ repositoryId: repoId, pullRequests }));
    dispatch(setError(null));
  } catch (error) {
    dispatch(setError(error instanceof Error ? error.message : 'Failed to fetch pull requests'));
  } finally {
    dispatch(setLoading(false));
  }
});

// Fetch repository issues
export const fetchRepositoryIssues = createAsyncThunk<
  void,
  { state: 'open' | 'closed' | 'all' },
  { state: RootState; dispatch: AppDispatch }
>('github/fetchIssues', async ({ state: issueState }, { getState, dispatch }) => {
  const state = getState();
  const token = getToken(state);
  const github = getGithubState(state);
  const repoId = github.selectedRepository;
  
  if (!repoId) {
    throw new Error('No repository selected');
  }
  
  // Get repository using selector  
  const repository = selectRepositoryById(state, repoId);
  if (!repository) {
    throw new Error('Repository not found');
  }
  
  dispatch(setLoading(true));
  try {
    const issues = await githubService.getRepositoryIssues(token, repository.full_name, issueState);
    dispatch(setIssues({ repositoryId: repoId, issues }));
    dispatch(setError(null));
  } catch (error) {
    dispatch(setError(error instanceof Error ? error.message : 'Failed to fetch issues'));
  } finally {
    dispatch(setLoading(false));
  }
});

// Create a new file
export const createFile = createAsyncThunk<
  void,
  { path: string; content: string; message: string },
  { state: RootState; dispatch: AppDispatch }
>('github/createFile', async ({ path, content, message }, { getState, dispatch }) => {
  const state = getState();
  const token = getToken(state);
  const github = getGithubState(state);
  const repoId = github.selectedRepository;
  const branch = github.selectedBranch;
  
  if (!repoId) {
    throw new Error('No repository selected');
  }
  
  // Get repository using selector
  const repository = selectRepositoryById(state, repoId);
  if (!repository) {
    throw new Error('Repository not found');
  }
  
  dispatch(setLoading(true));
  try {
    await githubService.createFile(
      token,
      repository.full_name,
      path,
      content,
      message,
      branch || undefined
    );
    
    // Refresh the current directory after file creation
    const dirPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
    dispatch(fetchRepositoryContents({ path: dirPath }));
    dispatch(setError(null));
  } catch (error) {
    dispatch(setError(error instanceof Error ? error.message : 'Failed to create file'));
  } finally {
    dispatch(setLoading(false));
  }
});

// Update an existing file
export const updateFile = createAsyncThunk<
  void,
  { path: string; content: string; message: string; sha: string },
  { state: RootState; dispatch: AppDispatch }
>('github/updateFile', async ({ path, content, message, sha }, { getState, dispatch }) => {
  const state = getState();
  const token = getToken(state);
  const github = getGithubState(state);
  const repoId = github.selectedRepository;
  const branch = github.selectedBranch;
  
  if (!repoId) {
    throw new Error('No repository selected');
  }
  
  // Get repository using selector
  const repository = selectRepositoryById(state, repoId);
  if (!repository) {
    throw new Error('Repository not found');
  }
  
  dispatch(setLoading(true));
  try {
    await githubService.updateFile(
      token,
      repository.full_name,
      path,
      content,
      message,
      sha,
      branch || undefined
    );
    
    // Update current content if we're viewing the same file
    if (github.selectedPath === path && github.currentContent?.type === 'file') {
      dispatch(setCurrentContent({
        path,
        type: 'file',
        content,
      }));
    }
    
    dispatch(setError(null));
  } catch (error) {
    dispatch(setError(error instanceof Error ? error.message : 'Failed to update file'));
  } finally {
    dispatch(setLoading(false));
  }
});

// Delete a file
export const deleteFile = createAsyncThunk<
  void,
  { path: string; message: string; sha: string },
  { state: RootState; dispatch: AppDispatch }
>('github/deleteFile', async ({ path, message, sha }, { getState, dispatch }) => {
  const state = getState();
  const token = getToken(state);
  const github = getGithubState(state);
  const repoId = github.selectedRepository;
  const branch = github.selectedBranch;
  
  if (!repoId) {
    throw new Error('No repository selected');
  }
  
  // Get repository using selector
  const repository = selectRepositoryById(state, repoId);
  if (!repository) {
    throw new Error('Repository not found');
  }
  
  dispatch(setLoading(true));
  try {
    await githubService.deleteFile(
      token,
      repository.full_name,
      path,
      message,
      sha,
      branch || undefined
    );
    
    // Refresh the current directory after file deletion
    const dirPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
    dispatch(fetchRepositoryContents({ path: dirPath }));
    
    // Clear current content if we're viewing the deleted file
    if (github.selectedPath === path) {
      dispatch(setCurrentContent(null));
    }
    
    dispatch(setError(null));
  } catch (error) {
    dispatch(setError(error instanceof Error ? error.message : 'Failed to delete file'));
  } finally {
    dispatch(setLoading(false));
  }
}); 