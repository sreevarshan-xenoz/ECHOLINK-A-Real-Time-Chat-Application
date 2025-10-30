import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  GitHubUser, 
  GitHubRepository, 
  GitHubBranch, 
  GitHubContents,
  GitHubCommit
} from '../../types/github';
import { RootState } from '../index';

// Create entity adapters
// const repositoriesAdapter = createEntityAdapter<GitHubRepository>(); // Removed - not used

// Define GitHub state structure
export interface GitHubState {
  isAuthenticated: boolean;
  authToken: string | null;
  user: GitHubUser | null;
  repositories: GitHubRepository[];
  isLoading: boolean;
  error: string | null;
  selectedRepository: number | null;
  selectedBranch: string | null;
  selectedPath: string;
  currentContent: {
    path: string;
    type: 'file' | 'directory';
    content: GitHubContents[] | string;
  } | null;
  commits: Record<string, GitHubCommit[]>;
  branches: Record<string, GitHubBranch[]>;
  collaborators: Record<string, any[]>;
  pullRequests: Record<string, any[]>;
  issues: Record<string, any[]>;
}

// Initial state
const initialState: GitHubState = {
  isAuthenticated: false,
  authToken: null,
  user: null,
  repositories: [],
  isLoading: false,
  error: null,
  selectedRepository: null,
  selectedBranch: null,
  selectedPath: '',
  currentContent: null,
  commits: {},
  branches: {},
  collaborators: {},
  pullRequests: {},
  issues: {}
};

// Create the GitHub slice
export const githubSlice = createSlice({
  name: 'github',
  initialState,
  reducers: {
    // Authentication
    setAuthToken: (state, action: PayloadAction<string | null>) => {
      state.authToken = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    
    setUser: (state, action: PayloadAction<GitHubUser | null>) => {
      state.user = action.payload;
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // Repositories - simplified without entity adapter
    setRepositories: (state, action: PayloadAction<GitHubRepository[]>) => {
      state.repositories = action.payload;
    },
    addRepository: (state, action: PayloadAction<GitHubRepository>) => {
      state.repositories.push(action.payload);
    },
    
    // Selection
    setSelectedRepository: (state, action: PayloadAction<number | null>) => {
      state.selectedRepository = action.payload;
      // Reset related data when changing repositories
      state.selectedBranch = null;
      state.selectedPath = '';
      state.currentContent = null;
    },
    
    setSelectedBranch: (state, action: PayloadAction<string | null>) => {
      state.selectedBranch = action.payload;
      // Reset path when changing branches
      state.selectedPath = '';
      state.currentContent = null;
    },
    
    setSelectedPath: (state, action: PayloadAction<string>) => {
      state.selectedPath = action.payload;
    },
    
    // Content
    setCurrentContent: (state, action: PayloadAction<{
      path: string;
      type: 'file' | 'directory';
      content: GitHubContents[] | string;
    } | null>) => {
      state.currentContent = action.payload;
    },
    
    // Repository data
    setCommits: (state, action: PayloadAction<{
      repositoryId: number;
      commits: GitHubCommit[];
    }>) => {
      const { repositoryId, commits } = action.payload;
      state.commits[repositoryId.toString()] = commits;
    },
    
    setBranches: (state, action: PayloadAction<{
      repositoryId: number;
      branches: GitHubBranch[];
    }>) => {
      const { repositoryId, branches } = action.payload;
      state.branches[repositoryId.toString()] = branches;
    },
    
    setCollaborators: (state, action: PayloadAction<{
      repositoryId: number;
      collaborators: any[];
    }>) => {
      const { repositoryId, collaborators } = action.payload;
      state.collaborators[repositoryId.toString()] = collaborators;
    },
    
    setPullRequests: (state, action: PayloadAction<{
      repositoryId: number;
      pullRequests: any[];
    }>) => {
      const { repositoryId, pullRequests } = action.payload;
      state.pullRequests[repositoryId.toString()] = pullRequests;
    },
    
    setIssues: (state, action: PayloadAction<{
      repositoryId: number;
      issues: any[];
    }>) => {
      const { repositoryId, issues } = action.payload;
      state.issues[repositoryId.toString()] = issues;
    },
    
    // Reset state when logging out
    resetGitHubState: (state) => {
      state.isAuthenticated = false;
      state.authToken = null;
      state.user = null;
      state.selectedRepository = null;
      state.selectedBranch = null;
      state.selectedPath = '';
      state.currentContent = null;
      state.repositories = [];
      state.commits = {};
      state.branches = {};
      state.collaborators = {};
      state.pullRequests = {};
      state.issues = {};
    },
  },
});

// Export actions
export const {
  setAuthToken,
  setUser,
  setLoading,
  setError,
  setRepositories,
  addRepository,
  setSelectedRepository,
  setSelectedBranch,
  setSelectedPath,
  setCurrentContent,
  setCommits,
  setBranches,
  setCollaborators,
  setPullRequests,
  setIssues,
  resetGitHubState,
} = githubSlice.actions;

// Create typed selectors - simplified without entity adapter
export const selectRepositories = (state: RootState) => state.github.repositories;
export const selectSelectedRepository = (state: RootState) => state.github.selectedRepository;
export const selectIsLoading = (state: RootState) => state.github.isLoading;
export const selectError = (state: RootState) => state.github.error;

// Additional selectors
export const selectRepositoryById = (state: RootState, id: number) => 
  state.github.repositories.find(repo => repo.id === id);

export const selectRepositoryBranches = (state: RootState) => {
  // Type assertion for state.github
  const github = state.github as unknown as GitHubState;
  const repoId = github.selectedRepository;
  return repoId ? github.branches[repoId.toString()] || [] : [];
};

export const selectRepositoryCommits = (state: RootState) => {
  // Type assertion for state.github
  const github = state.github as unknown as GitHubState;
  const repoId = github.selectedRepository;
  return repoId ? github.commits[repoId.toString()] || [] : [];
};

export default githubSlice.reducer; 