import React, { useState, useEffect } from 'react';
import { githubService } from '../services/github-service';
import { Link } from 'react-router-dom';
import './GitHubIntegration.css';

const GitHubHome = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [repositories, setRepositories] = useState([]);
    const [filteredRepos, setFilteredRepos] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        language: '',
        stars: '',
        updatedDate: ''
    });
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });
    const [languages, setLanguages] = useState([]);

    useEffect(() => {
        initializeGitHub();
    }, []);

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

    const connectGitHub = () => {
        const authUrl = githubService.getAuthUrl();
        window.location.href = authUrl;
    };

    const loadRepositories = async () => {
        try {
            setLoading(true);
            const repos = await githubService.getRepositories();
            setRepositories(repos);
            setFilteredRepos(repos);
            
            // Extract unique languages from repositories
            const uniqueLanguages = new Set();
            repos.forEach(repo => {
                if (repo.language) uniqueLanguages.add(repo.language);
            });
            setLanguages(Array.from(uniqueLanguages));
        } catch (error) {
            console.error('Error loading repositories:', error);
            showNotification('Failed to load repositories', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        applyFilters(term, filters);
    };

    const handleFilterChange = (filterName, value) => {
        const newFilters = { ...filters, [filterName]: value };
        setFilters(newFilters);
        applyFilters(searchTerm, newFilters);
    };

    const applyFilters = (term, currentFilters) => {
        let filtered = repositories;

        // Apply search term filter
        if (term) {
            const searchLower = term.toLowerCase();
            filtered = filtered.filter(repo => 
                repo.name.toLowerCase().includes(searchLower) || 
                (repo.description && repo.description.toLowerCase().includes(searchLower))
            );
        }

        // Apply language filter
        if (currentFilters.language) {
            filtered = filtered.filter(repo => 
                repo.language === currentFilters.language
            );
        }

        // Apply stars filter
        if (currentFilters.stars) {
            switch(currentFilters.stars) {
                case 'asc':
                    filtered = [...filtered].sort((a, b) => a.stargazers_count - b.stargazers_count);
                    break;
                case 'desc':
                    filtered = [...filtered].sort((a, b) => b.stargazers_count - a.stargazers_count);
                    break;
                default:
                    break;
            }
        }

        // Apply updated date filter
        if (currentFilters.updatedDate) {
            switch(currentFilters.updatedDate) {
                case 'newest':
                    filtered = [...filtered].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
                    break;
                case 'oldest':
                    filtered = [...filtered].sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
                    break;
                default:
                    break;
            }
        }

        setFilteredRepos(filtered);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    };

    const showNotification = (message, type) => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    };

    const startPeerChat = (repoName) => {
        // Generate a peer ID based on the repository name
        const peerId = `${userData.login}-${repoName}`;
        // Navigate to chat with the peer ID
        window.location.href = `/chat?peer=${peerId}`;
    };

    if (loading) {
        return (
            <div className="github-home-loading">
                <div className="loading-spinner"></div>
                <p>Loading GitHub data...</p>
            </div>
        );
    }

    return (
        <div className="github-home-container">
            <div className="github-home-header">
                <h1>GitHub Projects</h1>
                {userData && (
                    <div className="user-info">
                        <img src={userData.avatar_url} alt="Profile" className="user-avatar" />
                        <span>{userData.login}</span>
                    </div>
                )}
            </div>

            {!isConnected ? (
                <div className="github-connect-section">
                    <h2>Connect with GitHub</h2>
                    <p>Connect your GitHub account to browse repositories, search projects, and collaborate with peers.</p>
                    <button className="github-connect-button" onClick={connectGitHub}>
                        <i className="fab fa-github"></i> Connect GitHub Account
                    </button>
                </div>
            ) : (
                <div className="github-content">
                    <div className="search-filter-section">
                        <div className="search-bar">
                            <input 
                                type="text" 
                                placeholder="Search repositories..." 
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                        </div>
                        <div className="filters">
                            <div className="filter-group">
                                <label>Language:</label>
                                <select 
                                    value={filters.language}
                                    onChange={(e) => handleFilterChange('language', e.target.value)}
                                >
                                    <option value="">All Languages</option>
                                    {languages.map(lang => (
                                        <option key={lang} value={lang}>{lang}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="filter-group">
                                <label>Stars:</label>
                                <select 
                                    value={filters.stars}
                                    onChange={(e) => handleFilterChange('stars', e.target.value)}
                                >
                                    <option value="">Default</option>
                                    <option value="desc">Most Stars</option>
                                    <option value="asc">Least Stars</option>
                                </select>
                            </div>
                            <div className="filter-group">
                                <label>Updated:</label>
                                <select 
                                    value={filters.updatedDate}
                                    onChange={(e) => handleFilterChange('updatedDate', e.target.value)}
                                >
                                    <option value="">Default</option>
                                    <option value="newest">Recently Updated</option>
                                    <option value="oldest">Least Recently Updated</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="repositories-grid">
                        {filteredRepos.length > 0 ? (
                            filteredRepos.map(repo => (
                                <div key={repo.id} className="repository-card">
                                    <div className="repo-header">
                                        <h3>{repo.name}</h3>
                                        {repo.private && <span className="private-badge">Private</span>}
                                    </div>
                                    <p className="repo-description">{repo.description || 'No description available'}</p>
                                    <div className="repo-stats">
                                        {repo.language && (
                                            <span className="repo-language">
                                                <span className="language-dot" style={{ backgroundColor: getLanguageColor(repo.language) }}></span>
                                                {repo.language}
                                            </span>
                                        )}
                                        <span className="repo-stars">
                                            <i className="fas fa-star"></i> {repo.stargazers_count}
                                        </span>
                                        <span className="repo-forks">
                                            <i className="fas fa-code-branch"></i> {repo.forks_count}
                                        </span>
                                    </div>
                                    <div className="repo-updated">Updated on {formatDate(repo.updated_at)}</div>
                                    <div className="repo-actions">
                                        <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="repo-link-button">
                                            View on GitHub
                                        </a>
                                        <button 
                                            className="peer-chat-button"
                                            onClick={() => startPeerChat(repo.name)}
                                        >
                                            Chat with Peer
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-repos-message">
                                <p>No repositories found matching your criteria.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {notification.show && (
                <div className={`notification ${notification.type}`}>
                    {notification.message}
                </div>
            )}
        </div>
    );
};

// Helper function to get language color
const getLanguageColor = (language) => {
    const colors = {
        JavaScript: '#f1e05a',
        TypeScript: '#2b7489',
        Python: '#3572A5',
        Java: '#b07219',
        HTML: '#e34c26',
        CSS: '#563d7c',
        Ruby: '#701516',
        Go: '#00ADD8',
        PHP: '#4F5D95',
        C: '#555555',
        'C++': '#f34b7d',
        'C#': '#178600',
        Swift: '#ffac45',
        Kotlin: '#F18E33',
        Rust: '#dea584'
    };
    return colors[language] || '#858585';
};

export default GitHubHome;