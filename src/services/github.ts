import { 
  GitHubUser, 
  GitHubRepository, 
  GitHubBranch, 
  GitHubContents,
  GitHubCommit
} from '../types/github';

// GitHub API base URL
const BASE_URL = 'https://api.github.com';

// Default headers for GitHub API requests
const getDefaultHeaders = (token: string) => ({
  Accept: 'application/vnd.github.v3+json',
  Authorization: `token ${token}`,
  'Content-Type': 'application/json',
});

// Error handling for fetch requests
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || `Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }
  return response.json();
};

/**
 * GitHub API Service
 * Provides methods to interact with the GitHub API
 */
export const githubService = {
  /**
   * Get the authenticated user's information
   */
  getAuthenticatedUser: async (token: string): Promise<GitHubUser> => {
    const response = await fetch(`${BASE_URL}/user`, {
      headers: getDefaultHeaders(token),
    });
    return handleResponse(response);
  },

  /**
   * Get repositories for the authenticated user
   */
  getUserRepositories: async (token: string): Promise<GitHubRepository[]> => {
    const response = await fetch(`${BASE_URL}/user/repos?sort=updated&per_page=100`, {
      headers: getDefaultHeaders(token),
    });
    return handleResponse(response);
  },

  /**
   * Get branches for a specific repository
   */
  getRepositoryBranches: async (token: string, repoFullName: string): Promise<GitHubBranch[]> => {
    const response = await fetch(`${BASE_URL}/repos/${repoFullName}/branches`, {
      headers: getDefaultHeaders(token),
    });
    return handleResponse(response);
  },

  /**
   * Get contents of a repository at a specific path
   */
  getRepositoryContents: async (
    token: string, 
    repoFullName: string, 
    path: string = '', 
    ref?: string
  ): Promise<GitHubContents | GitHubContents[]> => {
    let url = `${BASE_URL}/repos/${repoFullName}/contents/${path}`;
    if (ref) {
      url += `?ref=${ref}`;
    }
    const response = await fetch(url, {
      headers: getDefaultHeaders(token),
    });
    return handleResponse(response);
  },

  /**
   * Get file content with proper decoding
   */
  getFileContent: async (
    token: string,
    repoFullName: string,
    path: string,
    ref?: string
  ): Promise<string> => {
    const content = await githubService.getRepositoryContents(token, repoFullName, path, ref) as GitHubContents;
    if (content.type !== 'file' || !content.content) {
      throw new Error('Not a file or content is empty');
    }
    return atob(content.content.replace(/\n/g, ''));
  },

  /**
   * Get commits for a repository
   */
  getRepositoryCommits: async (
    token: string,
    repoFullName: string,
    branch?: string
  ): Promise<GitHubCommit[]> => {
    let url = `${BASE_URL}/repos/${repoFullName}/commits?per_page=30`;
    if (branch) {
      url += `&sha=${branch}`;
    }
    const response = await fetch(url, {
      headers: getDefaultHeaders(token),
    });
    return handleResponse(response);
  },

  /**
   * Create a new file in a repository
   */
  createFile: async (
    token: string,
    repoFullName: string,
    path: string,
    content: string,
    message: string,
    branch?: string
  ): Promise<{ commit: GitHubCommit; content: GitHubContents }> => {
    const url = `${BASE_URL}/repos/${repoFullName}/contents/${path}`;
    const body = {
      message,
      content: btoa(content),
      branch,
    };

    const response = await fetch(url, {
      method: 'PUT',
      headers: getDefaultHeaders(token),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  /**
   * Update an existing file in a repository
   */
  updateFile: async (
    token: string,
    repoFullName: string,
    path: string,
    content: string,
    message: string,
    sha: string,
    branch?: string
  ): Promise<{ commit: GitHubCommit; content: GitHubContents }> => {
    const url = `${BASE_URL}/repos/${repoFullName}/contents/${path}`;
    const body = {
      message,
      content: btoa(content),
      sha,
      branch,
    };

    const response = await fetch(url, {
      method: 'PUT',
      headers: getDefaultHeaders(token),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  /**
   * Delete a file from a repository
   */
  deleteFile: async (
    token: string,
    repoFullName: string,
    path: string,
    message: string,
    sha: string,
    branch?: string
  ): Promise<{ commit: GitHubCommit }> => {
    const url = `${BASE_URL}/repos/${repoFullName}/contents/${path}`;
    const body = {
      message,
      sha,
      branch,
    };

    const response = await fetch(url, {
      method: 'DELETE',
      headers: getDefaultHeaders(token),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  /**
   * Get repository collaborators
   */
  getRepositoryCollaborators: async (
    token: string,
    repoFullName: string
  ): Promise<any[]> => {
    const url = `${BASE_URL}/repos/${repoFullName}/collaborators`;
    const response = await fetch(url, {
      headers: getDefaultHeaders(token),
    });
    return handleResponse(response);
  },

  /**
   * Get repository pull requests
   */
  getRepositoryPullRequests: async (
    token: string,
    repoFullName: string,
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<any[]> => {
    const url = `${BASE_URL}/repos/${repoFullName}/pulls?state=${state}`;
    const response = await fetch(url, {
      headers: getDefaultHeaders(token),
    });
    return handleResponse(response);
  },

  /**
   * Get repository issues
   */
  getRepositoryIssues: async (
    token: string,
    repoFullName: string,
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<any[]> => {
    const url = `${BASE_URL}/repos/${repoFullName}/issues?state=${state}`;
    const response = await fetch(url, {
      headers: getDefaultHeaders(token),
    });
    return handleResponse(response);
  }
};

export default githubService; 