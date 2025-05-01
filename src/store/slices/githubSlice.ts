import { createSlice, PayloadAction, createEntityAdapter, EntityAdapter, EntityState } from '@reduxjs/toolkit';
import { 
  GitHubUser, 
  GitHubRepository, 
  GitHubBranch, 
  GitHubContents,
  GitHubCommit
} from '../../types/github';
import { RootState } from '../index';

// Create entity adapters
const repositoriesAdapter = createEntityAdapter<GitHubRepository>();

// Define GitHub state structure
export interface GitHubState {
  isAuthenticated: boolean;
  authToken: string | null;
  user: GitHubUser | null;
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
const initialState = repositoriesAdapter.getInitialState<GitHubState>({
  isAuthenticated: false,
  authToken: null,
  user: null,
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
  issues: {},
});

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
    
    // Repositories
    setRepositories: repositoriesAdapter.setAll,
    addRepository: repositoriesAdapter.addOne,
    addRepositories: repositoriesAdapter.addMany,
    updateRepository: repositoriesAdapter.updateOne,
    removeRepository: repositoriesAdapter.removeOne,
    
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
      repositoriesAdapter.removeAll(state);
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
  addRepositories,
  updateRepository,
  removeRepository,
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

// Create typed selectors
// Note: For proper type safety, we need to add type assertions here
// This is necessary because the RootState type might be using a different format
export const githubSelectors = repositoriesAdapter.getSelectors<RootState>(
  (state) => {
    // Type assertion to ensure we can access github property
    return state.github as unknown as EntityState<GitHubRepository, number>;
  }
);

// Export selectors
export const {
  selectAll: selectAllRepositories,
  selectById: selectRepositoryById,
  selectIds: selectRepositoryIds,
} = githubSelectors;

// Additional selectors
export const selectSelectedRepository = (state: RootState) => {
  // Type assertion for state.github
  const github = state.github as unknown as GitHubState;
  return github.selectedRepository 
    ? selectRepositoryById(state, github.selectedRepository) 
    : null;
};

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