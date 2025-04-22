import axios from 'axios';

// GitHub API endpoints
const BASE_URL = 'https://api.github.com';

/**
 * GitHub API Service
 * Handles fetching repository data and file content from GitHub
 */

// Parse GitHub URL to extract owner and repo name
const parseGitHubUrl = (url) => {
  try {
    // Handle both URLs and owner/repo format
    if (url.includes('github.com')) {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      
      if (pathSegments.length >= 2) {
        return {
          owner: pathSegments[0],
          repo: pathSegments[1]
        };
      }
    } else if (url.includes('/')) {
      // Handle format like "username/repo"
      const parts = url.split('/');
      if (parts.length === 2) {
        return {
          owner: parts[0],
          repo: parts[1]
        };
      }
    }
    
    throw new Error('Invalid GitHub repository URL format');
  } catch (error) {
    throw new Error('Failed to parse GitHub URL: ' + error.message);
  }
};

// Fetch repository data from GitHub API
const getRepositoryInfo = async (owner, repo) => {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Repository not found. Please check the URL and try again.');
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      name: data.name,
      fullName: data.full_name,
      description: data.description || 'No description provided',
      stars: data.stargazers_count,
      forks: data.forks_count,
      defaultBranch: data.default_branch,
      owner: {
        login: data.owner.login,
        avatarUrl: data.owner.avatar_url
      }
    };
  } catch (error) {
    throw new Error(`Failed to fetch repository info: ${error.message}`);
  }
};

// Fetch file tree for a repository
const getRepositoryContents = async (owner, repo, path = '', branch = '') => {
  try {
    const queryParams = branch ? `?ref=${branch}` : '';
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}${queryParams}`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Path '${path}' not found in repository.`);
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to fetch repository contents: ${error.message}`);
  }
};

// Fetch file content by download URL
const getFileContent = async (downloadUrl) => {
  try {
    const response = await fetch(downloadUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status}`);
    }
    
    // Get the content as text
    return await response.text();
  } catch (error) {
    throw new Error(`Failed to fetch file content: ${error.message}`);
  }
};

// Main function to load a repository
const loadRepository = async (repoUrl) => {
  try {
    const { owner, repo } = parseGitHubUrl(repoUrl);
    
    if (!owner || !repo) {
      throw new Error('Invalid repository URL format. Expected format: https://github.com/owner/repo');
    }
    
    // Fetch repository information
    const repository = await getRepositoryInfo(owner, repo);
    
    // Fetch the root contents of the repository
    const fileTree = await getRepositoryContents(owner, repo, '', repository.defaultBranch);
    
    return {
      repository,
      fileTree
    };
  } catch (error) {
    throw error;
  }
};

const githubService = {
  parseGitHubUrl,
  getRepositoryInfo,
  getRepositoryContents,
  getFileContent,
  loadRepository
};

export default githubService; 