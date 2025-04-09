import React, { useState, useEffect } from 'react';
import { githubService } from '../services/github-service';
import './GitHubIntegration.css';

const GitHubFeatureCards = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [repositories, setRepositories] = useState([]);
    const [pullRequests, setPullRequests] = useState([]);
    const [commits, setCommits] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        initializeGitHub();
    }, []);

    const initializeGitHub = async () => {
        try {
            setLoading(true);
            const initialized = await githubService.initialize();
            setIsConnected(initialized);
            
            if (initialized) {
                await Promise.all([
                    loadRepositories(),
                    loadPullRequests(),
                    loadCommits()
                ]);
            }
        } catch (error) {
            console.error('Error initializing GitHub:', error);
            setError('Failed to initialize GitHub integration');
        } finally {
            setLoading(false);
        }
    };

    const loadRepositories = async () => {
        try {
            const repos = await githubService.getRepositories();
            setRepositories(repos.slice(0, 3)); // Get the 3 most recent repositories
        } catch (error) {
            console.error('Error loading repositories:', error);
            setError('Failed to load repositories');
        }
    };

    const loadPullRequests = async () => {
        try {
            // If we have repositories, get pull requests from the first one
            const repos = await githubService.getRepositories();
            if (repos && repos.length > 0) {
                const repo = repos[0];
                const prs = await githubService.getPullRequests(repo.owner.login, repo.name);
                setPullRequests(prs.slice(0, 3)); // Get the 3 most recent PRs
            }
        } catch (error) {
            console.error('Error loading pull requests:', error);
            setError('Failed to load pull requests');
        }
    };

    const loadCommits = async () => {
        try {
            // If we have repositories, get commits from the first one
            const repos = await githubService.getRepositories();
            if (repos && repos.length > 0) {
                const repo = repos[0];
                const repoCommits = await githubService.getCommits(repo.owner.login, repo.name);
                setCommits(repoCommits.slice(0, 3)); // Get the 3 most recent commits
            }
        } catch (error) {
            console.error('Error loading commits:', error);
            setError('Failed to load commits');
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        
        if (diffMinutes < 60) {
            return `${diffMinutes} minutes ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hours ago`;
        } else {
            return `${diffDays} days ago`;
        }
    };

    // Repository Browser Card
    const renderRepositoryCard = () => (
        <div className="github-feature-card">
            <div className="github-feature-icon">📁</div>
            <h3>Repository Browser</h3>
            <p>Browse and manage your GitHub repositories directly from EchoLink</p>
            {loading ? (
                <div className="loading-indicator">Loading repositories...</div>
            ) : !isConnected ? (
                <div className="connect-message">Connect your GitHub account to view repositories</div>
            ) : error ? (
                <div className="error-message">{error}</div>
            ) : repositories.length > 0 ? (
                <div className="repo-browser">
                    <div className="repo-header">
                        <span>Recent Repositories</span>
                    </div>
                    <div className="repo-list">
                        {repositories.map(repo => (
                            <div key={repo.id} className="repo-item">
                                <span>{repo.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="empty-state">No repositories found</div>
            )}
        </div>
    );

    // Pull Requests Card
    const renderPullRequestsCard = () => (
        <div className="github-feature-card">
            <div className="github-feature-icon">🔄</div>
            <h3>Pull Requests</h3>
            <p>Review and manage pull requests from your team</p>
            {loading ? (
                <div className="loading-indicator">Loading pull requests...</div>
            ) : !isConnected ? (
                <div className="connect-message">Connect your GitHub account to view pull requests</div>
            ) : error ? (
                <div className="error-message">{error}</div>
            ) : pullRequests.length > 0 ? (
                <div className="pr-list">
                    {pullRequests.map(pr => (
                        <div key={pr.id} className="pr-item">
                            <div className="pr-header">
                                <span className="pr-title">{pr.title}</span>
                                <span className={`pr-status ${pr.state}`}>{pr.state}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">No pull requests found</div>
            )}
        </div>
    );

    // Commit History Card
    const renderCommitHistoryCard = () => (
        <div className="github-feature-card">
            <div className="github-feature-icon">📊</div>
            <h3>Commit History</h3>
            <p>Visualize your project's commit history</p>
            {loading ? (
                <div className="loading-indicator">Loading commits...</div>
            ) : !isConnected ? (
                <div className="connect-message">Connect your GitHub account to view commits</div>
            ) : error ? (
                <div className="error-message">{error}</div>
            ) : commits.length > 0 ? (
                <div className="commit-history">
                    <div className="commit-timeline"></div>
                    {commits.map(commit => (
                        <div key={commit.sha} className="commit-item">
                            <div className="commit-message">{commit.commit.message}</div>
                            <div className="commit-meta">
                                <span>{formatDate(commit.commit.author.date)}</span>
                                <span>{commit.author ? commit.author.login : commit.commit.author.name}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">No commits found</div>
            )}
        </div>
    );

    // Code Review Tools Card
    const renderCodeReviewCard = () => (
        <div className="github-feature-card">
            <div className="github-feature-icon">🔍</div>
            <h3>Code Review Tools</h3>
            <p>Powerful tools for effective code reviews</p>
            {!isConnected ? (
                <div className="connect-message">Connect your GitHub account to use code review tools</div>
            ) : (
                <div className="code-review-tools">
                    <div className="review-tool">
                        <div className="review-tool-icon">💬</div>
                        <span>Comments</span>
                    </div>
                    <div className="review-tool">
                        <div className="review-tool-icon">✓</div>
                        <span>Approve</span>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="github-features-grid">
            {renderRepositoryCard()}
            {renderPullRequestsCard()}
            {renderCommitHistoryCard()}
            {renderCodeReviewCard()}
        </div>
    );
};

export default GitHubFeatureCards;