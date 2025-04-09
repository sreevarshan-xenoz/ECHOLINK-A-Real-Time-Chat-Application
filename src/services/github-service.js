// GitHub API integration service
import { supabase } from './supabase-service';

class GitHubService {
    constructor() {
        this.clientId = process.env.REACT_APP_GITHUB_CLIENT_ID || '';
        this.redirectUri = `${window.location.origin}/dashboard`;
        this.scope = 'repo user';
        this.accessToken = null;
        this.userData = null;
        this.isConfigured = !!this.clientId;
    }

    /**
     * Initialize the GitHub service with an existing token if available
     */
    async initialize() {
        try {
            // Check if GitHub integration is properly configured
            if (!this.isConfigured) {
                console.error('GitHub integration is not configured. Please set REACT_APP_GITHUB_CLIENT_ID in your .env file.');
                return false;
            }
            
            // Check if we have a stored token in localStorage or Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('github_access_token')
                    .eq('id', user.id)
                    .single();
                
                if (profile?.github_access_token) {
                    this.accessToken = profile.github_access_token;
                    await this.fetchUserData();
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Error initializing GitHub service:', error);
            return false;
        }
    }

    /**
     * Get the OAuth authorization URL
     */
    getAuthUrl() {
        if (!this.isConfigured) {
            console.error('GitHub integration is not configured. Please set REACT_APP_GITHUB_CLIENT_ID in your .env file.');
            return '#';
        }
        
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            scope: this.scope,
            state: this.generateRandomState(),
        });

        return `https://github.com/login/oauth/authorize?${params.toString()}`;
    }

    /**
     * Generate a random state string for OAuth security
     */
    generateRandomState() {
        const state = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('github_oauth_state', state);
        return state;
    }

    /**
     * Handle the OAuth callback
     */
    async handleCallback(code, state) {
        try {
            // Verify state to prevent CSRF attacks
            const savedState = localStorage.getItem('github_oauth_state');
            if (state !== savedState) {
                throw new Error('Invalid state parameter');
            }

            // Exchange code for access token using a backend proxy
            // In a real app, you would use a server endpoint to exchange the code
            // For demo purposes, we'll simulate this
            const response = await fetch('/api/github/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code }),
            });

            if (!response.ok) {
                throw new Error('Failed to exchange code for token');
            }

            const data = await response.json();
            this.accessToken = data.access_token;

            // Save token to user profile
            await this.saveTokenToProfile();

            // Fetch user data
            await this.fetchUserData();

            return true;
        } catch (error) {
            console.error('GitHub OAuth error:', error);
            return false;
        } finally {
            localStorage.removeItem('github_oauth_state');
        }
    }

    /**
     * Save the GitHub access token to the user's profile
     */
    async saveTokenToProfile() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && this.accessToken) {
                await supabase
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        github_access_token: this.accessToken,
                        updated_at: new Date()
                    });
            }
        } catch (error) {
            console.error('Error saving GitHub token:', error);
        }
    }

    /**
     * Fetch the user's GitHub data
     */
    async fetchUserData() {
        if (!this.accessToken) return null;

        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    Authorization: `token ${this.accessToken}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch GitHub user data');
            }

            this.userData = await response.json();
            return this.userData;
        } catch (error) {
            console.error('Error fetching GitHub user data:', error);
            return null;
        }
    }

    /**
     * Get user repositories
     */
    async getRepositories() {
        if (!this.accessToken) return [];

        try {
            const response = await fetch('https://api.github.com/user/repos?sort=updated', {
                headers: {
                    Authorization: `token ${this.accessToken}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch repositories');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching repositories:', error);
            return [];
        }
    }

    /**
     * Get repository content
     */
    async getRepositoryContent(owner, repo, path = '') {
        if (!this.accessToken) return null;

        try {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                headers: {
                    Authorization: `token ${this.accessToken}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch repository content');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching repository content:', error);
            return null;
        }
    }

    /**
     * Get file content
     */
    async getFileContent(url) {
        if (!this.accessToken) return null;

        try {
            const response = await fetch(url, {
                headers: {
                    Authorization: `token ${this.accessToken}`,
                    Accept: 'application/vnd.github.v3.raw',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch file content');
            }

            return await response.text();
        } catch (error) {
            console.error('Error fetching file content:', error);
            return null;
        }
    }

    /**
     * Update file content
     */
    async updateFile(owner, repo, path, content, message, sha) {
        if (!this.accessToken) return false;

        try {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                method: 'PUT',
                headers: {
                    Authorization: `token ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    content: btoa(content),
                    sha,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update file');
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating file:', error);
            return false;
        }
    }

    /**
     * Disconnect GitHub account
     */
    async disconnect() {
        try {
            this.accessToken = null;
            this.userData = null;

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        github_access_token: null,
                        updated_at: new Date()
                    });
            }

            return true;
        } catch (error) {
            console.error('Error disconnecting GitHub account:', error);
            return false;
        }
    }

    /**
     * Check if user is connected to GitHub
     */
    isConnected() {
        return !!this.accessToken && !!this.userData;
    }

    /**
     * Get user data
     */
    getUserData() {
        return this.userData;
    }

    /**
     * Get pull requests for a repository
     */
    async getPullRequests(owner, repo) {
        if (!this.accessToken) return [];

        try {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=all`, {
                headers: {
                    Authorization: `token ${this.accessToken}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch pull requests');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching pull requests:', error);
            return [];
        }
    }

    /**
     * Get commits for a repository
     */
    async getCommits(owner, repo) {
        if (!this.accessToken) return [];

        try {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits`, {
                headers: {
                    Authorization: `token ${this.accessToken}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch commits');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching commits:', error);
            return [];
        }
    }
}

export const githubService = new GitHubService();