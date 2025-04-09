import React, { useState, useEffect } from 'react';
import { githubService } from '../services/github-service';
import Editor from '@monaco-editor/react';
import './GitHubIntegration.css';

const GitHubIntegration = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [repositories, setRepositories] = useState([]);
    const [selectedRepo, setSelectedRepo] = useState(null);
    const [repoContent, setRepoContent] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileContent, setFileContent] = useState('');
    const [language, setLanguage] = useState('javascript');
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });
    const [breadcrumbs, setBreadcrumbs] = useState([]);
    const [currentPath, setCurrentPath] = useState('');

    useEffect(() => {
        initializeGitHub();
    }, []);

    const initializeGitHub = async () => {
        try {
            setLoading(true);
            const initialized = await githubService.initialize();
            setIsConnected(initialized);
            
            if (initialized) {
                const userData = githubService.getUserData();
                setUserData(userData);
                loadRepositories();
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

    const disconnectGitHub = async () => {
        try {
            setLoading(true);
            await githubService.disconnect();
            setIsConnected(false);
            setUserData(null);
            setRepositories([]);
            setSelectedRepo(null);
            setRepoContent([]);
            setSelectedFile(null);
            setFileContent('');
            showNotification('GitHub account disconnected successfully', 'success');
        } catch (error) {
            console.error('Error disconnecting GitHub account:', error);
            showNotification('Failed to disconnect GitHub account', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadRepositories = async () => {
        try {
            setLoading(true);
            const repos = await githubService.getRepositories();
            setRepositories(repos);
        } catch (error) {
            console.error('Error loading repositories:', error);
            showNotification('Failed to load repositories', 'error');
        } finally {
            setLoading(false);
        }
    };

    const selectRepository = async (repo) => {
        try {
            setLoading(true);
            setSelectedRepo(repo);
            setCurrentPath('');
            setBreadcrumbs([{ name: repo.name, path: '' }]);
            const content = await githubService.getRepositoryContent(repo.owner.login, repo.name);
            setRepoContent(content);
            setSelectedFile(null);
            setFileContent('');
        } catch (error) {
            console.error('Error loading repository content:', error);
            showNotification('Failed to load repository content', 'error');
        } finally {
            setLoading(false);
        }
    };

    const navigateDirectory = async (item) => {
        if (!selectedRepo) return;
        
        try {
            setLoading(true);
            const newPath = currentPath ? `${currentPath}/${item.name}` : item.name;
            setCurrentPath(newPath);
            
            // Update breadcrumbs
            const newBreadcrumbs = [...breadcrumbs];
            newBreadcrumbs.push({ name: item.name, path: newPath });
            setBreadcrumbs(newBreadcrumbs);
            
            const content = await githubService.getRepositoryContent(
                selectedRepo.owner.login,
                selectedRepo.name,
                newPath
            );
            setRepoContent(content);
            setSelectedFile(null);
            setFileContent('');
        } catch (error) {
            console.error('Error navigating directory:', error);
            showNotification('Failed to navigate directory', 'error');
        } finally {
            setLoading(false);
        }
    };

    const navigateBreadcrumb = async (breadcrumb, index) => {
        if (!selectedRepo) return;
        
        try {
            setLoading(true);
            setCurrentPath(breadcrumb.path);
            
            // Update breadcrumbs
            const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
            setBreadcrumbs(newBreadcrumbs);
            
            const content = await githubService.getRepositoryContent(
                selectedRepo.owner.login,
                selectedRepo.name,
                breadcrumb.path
            );
            setRepoContent(content);
            setSelectedFile(null);
            setFileContent('');
        } catch (error) {
            console.error('Error navigating breadcrumb:', error);
            showNotification('Failed to navigate breadcrumb', 'error');
        } finally {
            setLoading(false);
        }
    };

    const selectFile = async (file) => {
        try {
            setLoading(true);
            setSelectedFile(file);
            
            // Determine language from file extension
            const extension = file.name.split('.').pop().toLowerCase();
            const languageMap = {
                'js': 'javascript',
                'jsx': 'javascript',
                'ts': 'typescript',
                'tsx': 'typescript',
                'py': 'python',
                'java': 'java',
                'html': 'html',
                'css': 'css',
                'json': 'json',
                'md': 'markdown',
                'php': 'php',
                'rb': 'ruby',
                'go': 'go',
                'c': 'c',
                'cpp': 'cpp',
                'cs': 'csharp',
                'swift': 'swift',
                'kt': 'kotlin',
                'rs': 'rust'
            };
            setLanguage(languageMap[extension] || 'plaintext');
            
            const content = await githubService.getFileContent(file.download_url);
            setFileContent(content);
        } catch (error) {
            console.error('Error loading file content:', error);
            showNotification('Failed to load file content', 'error');
        } finally {
            setLoading(false);
        }
    };

    const saveFile = async () => {
        if (!selectedFile || !selectedRepo) return;
        
        try {
            setLoading(true);
            const message = `Update ${selectedFile.name} via ECHOLINK`;
            await githubService.updateFile(
                selectedRepo.owner.login,
                selectedRepo.name,
                selectedFile.path,
                fileContent,
                message,
                selectedFile.sha
            );
            showNotification('File saved successfully', 'success');
            
            // Refresh file to get new SHA
            await selectFile(selectedFile);
        } catch (error) {
            console.error('Error saving file:', error);
            showNotification('Failed to save file', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEditorChange = (value) => {
        setFileContent(value);
    };

    const showNotification = (message, type) => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    };

    if (loading && !isConnected) {
        return (
            <div className="github-loading">
                <div className="loading-spinner"></div>
                <p>Loading GitHub integration...</p>
            </div>
        );
    }

    return (
        <div className="github-integration-container">
            <div className="github-header">
                <h2>GitHub Integration</h2>
                <p>Connect your GitHub account to collaborate on code</p>
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
                    </div>
                    <div className="github-features">
                        <div className="feature-item">
                            <div className="feature-icon">📁</div>
                            <h4>Access Repositories</h4>
                            <p>Browse and access all your GitHub repositories</p>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon">📝</div>
                            <h4>Edit Code</h4>
                            <p>View and edit code with syntax highlighting</p>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon">🔄</div>
                            <h4>Sync Changes</h4>
                            <p>Commit changes directly to your repositories</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="github-connected-section">
                    <div className="github-user-info">
                        {userData && (
                            <>
                                <img src={userData.avatar_url} alt="GitHub Avatar" className="github-avatar" />
                                <div className="github-user-details">
                                    <h3>{userData.name || userData.login}</h3>
                                    <p>@{userData.login}</p>
                                    <button className="github-disconnect-button" onClick={disconnectGitHub}>
                                        Disconnect
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="github-workspace">
                        <div className="github-sidebar">
                            <h3>Your Repositories</h3>
                            <div className="repo-list">
                                {repositories.length > 0 ? (
                                    repositories.map(repo => (
                                        <div 
                                            key={repo.id} 
                                            className={`repo-item ${selectedRepo && selectedRepo.id === repo.id ? 'selected' : ''}`}
                                            onClick={() => selectRepository(repo)}
                                        >
                                            <div className="repo-icon">📁</div>
                                            <div className="repo-details">
                                                <h4>{repo.name}</h4>
                                                <p>{repo.description || 'No description'}</p>
                                                <div className="repo-meta">
                                                    <span>⭐ {repo.stargazers_count}</span>
                                                    <span>🍴 {repo.forks_count}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="no-repos-message">No repositories found</p>
                                )}
                            </div>
                        </div>

                        <div className="github-content">
                            {selectedRepo ? (
                                <>
                                    <div className="repo-header">
                                        <h3>{selectedRepo.name}</h3>
                                        <div className="breadcrumbs">
                                            {breadcrumbs.map((breadcrumb, index) => (
                                                <span key={index}>
                                                    <span 
                                                        className="breadcrumb-item" 
                                                        onClick={() => navigateBreadcrumb(breadcrumb, index)}
                                                    >
                                                        {breadcrumb.name}
                                                    </span>
                                                    {index < breadcrumbs.length - 1 && <span className="breadcrumb-separator">/</span>}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {selectedFile ? (
                                        <div className="file-editor">
                                            <div className="file-editor-header">
                                                <h4>{selectedFile.name}</h4>
                                                <button className="save-file-button" onClick={saveFile}>
                                                    Save Changes
                                                </button>
                                            </div>
                                            <div className="monaco-editor-container">
                                                <Editor
                                                    height="500px"
                                                    language={language}
                                                    value={fileContent}
                                                    onChange={handleEditorChange}
                                                    theme="vs-dark"
                                                    options={{
                                                        minimap: { enabled: true },
                                                        scrollBeyondLastLine: false,
                                                        fontSize: 14,
                                                        wordWrap: 'on'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="repo-browser">
                                            {repoContent.length > 0 ? (
                                                <div className="repo-items">
                                                    {repoContent
                                                        .sort((a, b) => {
                                                            // Directories first, then files
                                                            if (a.type === 'dir' && b.type !== 'dir') return -1;
                                                            if (a.type !== 'dir' && b.type === 'dir') return 1;
                                                            return a.name.localeCompare(b.name);
                                                        })
                                                        .map(item => (
                                                            <div 
                                                                key={item.sha} 
                                                                className={`repo-browser-item ${item.type}`}
                                                                onClick={() => item.type === 'dir' ? navigateDirectory(item) : selectFile(item)}
                                                            >
                                                                <div className="item-icon">
                                                                    {item.type === 'dir' ? '📁' : '📄'}
                                                                </div>
                                                                <div className="item-name">{item.name}</div>
                                                            </div>
                                                        ))
                                                    }
                                                </div>
                                            ) : (
                                                <div className="empty-repo-message">
                                                    <p>This repository is empty</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="select-repo-message">
                                    <div className="message-icon">📁</div>
                                    <h3>Select a Repository</h3>
                                    <p>Choose a repository from the sidebar to view its contents</p>
                                </div>
                            )}
                        </div>
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

export default GitHubIntegration;