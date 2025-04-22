import React, { useState, useEffect } from 'react';
import { githubService } from '../services/github-service';
import { Link, useNavigate } from 'react-router-dom';
import GitHubFeatureCards from './GitHubFeatureCards';
import './GitHubHome.css';

const GitHubHome = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [repositories, setRepositories] = useState([]);
    const [filteredRepos, setFilteredRepos] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all'); // all, sources, forks, private, public
    const [sortBy, setSortBy] = useState('updated'); // updated, name, stars
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });
    const [stats, setStats] = useState({ totalRepos: 0, totalStars: 0, totalForks: 0 });
    
    const navigate = useNavigate();

    useEffect(() => {
        initializeGitHub();
    }, []);

    // Filter repositories based on search and filters
    useEffect(() => {
        if (repositories.length === 0) {
            setFilteredRepos([]);
            return;
        }

        let results = [...repositories];
        
        // Apply search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            results = results.filter(repo => 
                repo.name.toLowerCase().includes(query) ||
                (repo.description && repo.description.toLowerCase().includes(query))
            );
        }
        
        // Apply filters
        if (filter === 'sources') {
            results = results.filter(repo => !repo.fork);
        } else if (filter === 'forks') {
            results = results.filter(repo => repo.fork);
        } else if (filter === 'private') {
            results = results.filter(repo => repo.private);
        } else if (filter === 'public') {
            results = results.filter(repo => !repo.private);
        }
        
        // Apply sorting
        results.sort((a, b) => {
            if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
            } else if (sortBy === 'stars') {
                return b.stargazers_count - a.stargazers_count;
            } else { // updated
                return new Date(b.updated_at) - new Date(a.updated_at);
            }
        });
        
        setFilteredRepos(results);
    }, [repositories, searchQuery, filter, sortBy]);

    const initializeGitHub = async () => {
        try {
            setLoading(true);
            
            // Check if GitHub is configured
            if (!githubService.isConfigured) {
                showNotification('GitHub integration is not configured. Please set up your GitHub credentials in the .env file.', 'error');
                setLoading(false);
                return;
            }
            
            const initialized = await githubService.initialize();
            setIsConnected(initialized);
            
            if (initialized) {
                const userData = githubService.getUserData();
                setUserData(userData);
                await loadRepositories();
            }
        } catch (error) {
            console.error('Error initializing GitHub:', error);
            showNotification('Failed to initialize GitHub integration', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadRepositories = async () => {
        try {
            setLoading(true);
            const repos = await githubService.getRepositories();
            setRepositories(repos);
            
            // Calculate stats
            const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
            const totalForks = repos.reduce((sum, repo) => sum + repo.forks_count, 0);
            
            setStats({
                totalRepos: repos.length,
                totalStars,
                totalForks
            });
        } catch (error) {
            console.error('Error loading repositories:', error);
            showNotification('Failed to load repositories', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRepositoryClick = (repo) => {
        navigate(`/github/repository/${repo.owner.login}/${repo.name}`);
    };

    const connectGitHub = () => {
        try {
            const authUrl = githubService.getAuthUrl();
            console.log('Redirecting to GitHub auth URL:', authUrl);
            window.location.href = authUrl;
        } catch (error) {
            console.error('Error initiating GitHub connection:', error);
            showNotification('Failed to connect to GitHub: ' + error.message, 'error');
        }
    };

    const disconnectGitHub = async () => {
        try {
            await githubService.disconnect();
            setIsConnected(false);
            setUserData(null);
            setRepositories([]);
            setFilteredRepos([]);
            showNotification('GitHub account disconnected successfully', 'success');
        } catch (error) {
            showNotification('Failed to disconnect GitHub account', 'error');
        }
    };
    
    const showNotification = (message, type) => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    };

    const debugGitHubConnection = async () => {
        try {
            setLoading(true);
            showNotification('Running GitHub connection diagnostics...', 'info');
            
            // Check if we have a GitHub code in the URL
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            
            console.log('GitHub Integration Debug:');
            console.log('- URL has code param:', !!code);
            console.log('- URL has state param:', !!state);
            console.log('- GitHub service configured:', githubService.isConfigured);
            console.log('- Client ID available:', !!process.env.REACT_APP_GITHUB_CLIENT_ID);
            console.log('- Redirect URI:', githubService.redirectUri);
            
            // Try to initialize without relying on URL params
            const initialized = await githubService.initialize();
            console.log('- Service initialized:', initialized);
            
            showNotification('Diagnostic data logged to console', 'info');
        } catch (error) {
            console.error('Debug error:', error);
            showNotification('Error during diagnostics: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !isConnected) {
        return (
            <div className="github-home-loading">
                <div className="loading-spinner"></div>
                <p>Loading GitHub integration...</p>
            </div>
        );
    }

    return (
        <div className="github-home-container">
            <div className="github-home-header">
                <h1>GitHub Integration</h1>
                <p>Connect your GitHub account to collaborate on code</p>
                
                {isConnected && userData && (
                    <div className="github-user-summary">
                        <img src={userData.avatar_url} alt="GitHub Avatar" className="github-avatar" />
                        <div>
                            <h3>{userData.name || userData.login}</h3>
                            <p>@{userData.login}</p>
                            
                            <div className="github-stats">
                                <div className="stat-item">
                                    <span className="stat-value">{stats.totalRepos}</span>
                                    <span className="stat-label">Repositories</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-value">{stats.totalStars}</span>
                                    <span className="stat-label">Total Stars</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-value">{stats.totalForks}</span>
                                    <span className="stat-label">Total Forks</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {!isConnected ? (
                <div className="github-connect-section">
                    <div className="github-connect-card">
                        <div className="github-logo">
                            <svg height="68" viewBox="0 0 16 16" width="68">
                                <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                            </svg>
                        </div>
                        <h3>Connect to GitHub</h3>
                        <p>Link your GitHub account to access your repositories and collaborate on code directly from ECHOLINK.</p>
                        <button className="github-connect-button" onClick={connectGitHub}>
                            Connect GitHub Account
                        </button>
                        <button className="github-debug-button" onClick={debugGitHubConnection}>
                            Diagnose Connection Issues
                        </button>
                    </div>
                    
                    <GitHubFeatureCards />
                </div>
            ) : (
                <div className="github-connected-content">
                    <div className="github-toolbar">
                        <div className="search-and-filter">
                            <div className="search-container">
                                <input
                                    type="text"
                                    placeholder="Find a repository..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="repo-search-input"
                                />
                            </div>
                            
                            <div className="filter-container">
                                <select 
                                    value={filter} 
                                    onChange={(e) => setFilter(e.target.value)}
                                    className="repo-filter-select"
                                >
                                    <option value="all">All</option>
                                    <option value="sources">Sources</option>
                                    <option value="forks">Forks</option>
                                    <option value="private">Private</option>
                                    <option value="public">Public</option>
                                </select>
                                
                                <select 
                                    value={sortBy} 
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="repo-sort-select"
                                >
                                    <option value="updated">Recently Updated</option>
                                    <option value="name">Name</option>
                                    <option value="stars">Stars</option>
                                </select>
                            </div>
                        </div>
                        
                        <button className="github-disconnect-button" onClick={disconnectGitHub}>
                            Disconnect from GitHub
                        </button>
                    </div>
                    
                    <div className="repositories-container">
                        {filteredRepos.length > 0 ? (
                            filteredRepos.map(repo => (
                                <div 
                                    key={repo.id} 
                                    className="repository-card"
                                    onClick={() => handleRepositoryClick(repo)}
                                >
                                    <div className="repo-card-header">
                                        <div className="repo-icon">{repo.fork ? '🍴' : '📁'}</div>
                                        <h3 className="repo-name">{repo.name}</h3>
                                        {repo.private && <span className="repo-private-badge">Private</span>}
                                    </div>
                                    
                                    <p className="repo-description">
                                        {repo.description || 'No description provided'}
                                    </p>
                                    
                                    <div className="repo-card-footer">
                                        {repo.language && (
                                            <div className="repo-language">
                                                <span className={`language-color ${repo.language.toLowerCase()}`}></span>
                                                {repo.language}
                                            </div>
                                        )}
                                        
                                        <div className="repo-stats">
                                            <span className="repo-stat">
                                                <span className="repo-stat-icon">⭐</span>
                                                {repo.stargazers_count}
                                            </span>
                                            <span className="repo-stat">
                                                <span className="repo-stat-icon">🍴</span>
                                                {repo.forks_count}
                                            </span>
                                            <span className="repo-stat">
                                                <span className="repo-stat-icon">📅</span>
                                                {new Date(repo.updated_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : repositories.length > 0 ? (
                            <div className="no-results-message">
                                <h3>No matching repositories found</h3>
                                <p>Try adjusting your search or filters</p>
                            </div>
                        ) : (
                            <div className="no-repos-message">
                                <h3>No repositories found</h3>
                                <p>You don't have any GitHub repositories yet or we couldn't access them</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {notification.show && (
                <div className={`github-notification ${notification.type}`}>
                    {notification.message}
                </div>
            )}
        </div>
    );
};

export default GitHubHome;