import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { githubService } from '../services/github-service';
import './CodeEditor.css';

const CodeEditor = ({ repositoryUrl, initialPath = '' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [repoInfo, setRepoInfo] = useState(null);
  const [fileTree, setFileTree] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [currentLanguage, setCurrentLanguage] = useState('javascript');
  const [openFiles, setOpenFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [showTerminal, setShowTerminal] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const editorRef = useRef(null);
  const [theme, setTheme] = useState('vs-dark');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  
  // Parse repository URL to get owner and repo
  useEffect(() => {
    if (!repositoryUrl) return;
    
    setIsLoading(true);
    
    try {
      // Extract owner and repo from GitHub URL
      // Expected format: https://github.com/owner/repo or just owner/repo
      let owner, repo;
      
      if (repositoryUrl.includes('github.com')) {
        const urlParts = repositoryUrl.split('/');
        const repoIndex = urlParts.findIndex(part => part === 'github.com') + 1;
        owner = urlParts[repoIndex];
        repo = urlParts[repoIndex + 1]?.split('.git')[0];
      } else {
        const parts = repositoryUrl.split('/');
        if (parts.length >= 2) {
          owner = parts[0];
          repo = parts[1]?.split('.git')[0];
        }
      }
      
      if (owner && repo) {
        setRepoInfo({ owner, repo });
        cloneRepository(owner, repo);
      } else {
        showNotification('Invalid repository URL format', 'error');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error parsing repository URL:', error);
      showNotification('Failed to parse repository URL', 'error');
      setIsLoading(false);
    }
  }, [repositoryUrl]);
  
  const cloneRepository = async (owner, repo) => {
    try {
      showNotification(`Cloning ${owner}/${repo}...`, 'info');
      
      // Fetch repository contents from GitHub API
      const contents = await githubService.getRepositoryContent(owner, repo);
      buildFileTree(contents);
      
      showNotification(`Repository ${owner}/${repo} cloned successfully`, 'success');
    } catch (error) {
      console.error('Error cloning repository:', error);
      showNotification('Failed to clone repository', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const buildFileTree = (items, path = '') => {
    const tree = items.map(item => {
      return {
        id: item.sha,
        name: item.name,
        path: path ? `${path}/${item.name}` : item.name,
        type: item.type,
        url: item.download_url,
        size: item.size
      };
    });
    
    // Sort directories first, then files
    tree.sort((a, b) => {
      if (a.type === 'dir' && b.type !== 'dir') return -1;
      if (a.type !== 'dir' && b.type === 'dir') return 1;
      return a.name.localeCompare(b.name);
    });
    
    setFileTree(tree);
  };
  
  const fetchDirectoryContents = async (item) => {
    if (!repoInfo) return;
    
    try {
      setIsLoading(true);
      const contents = await githubService.getRepositoryContent(
        repoInfo.owner,
        repoInfo.repo,
        item.path
      );
      
      setCurrentPath(item.path);
      buildFileTree(contents, item.path);
    } catch (error) {
      console.error('Error fetching directory contents:', error);
      showNotification('Failed to fetch directory contents', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const openFile = async (file) => {
    if (!repoInfo) return;
    
    try {
      setIsLoading(true);
      const content = await githubService.getFileContent(file.url);
      
      // Determine language based on file extension
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
      
      setCurrentLanguage(languageMap[extension] || 'plaintext');
      setFileContent(content);
      setCurrentFile(file);
      
      // Add to open files if not already open
      if (!openFiles.some(f => f.path === file.path)) {
        setOpenFiles([...openFiles, file]);
      }
      
      setIsDirty(false);
    } catch (error) {
      console.error('Error opening file:', error);
      showNotification('Failed to open file', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEditorChange = (value) => {
    setFileContent(value);
    setIsDirty(true);
  };
  
  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };
  
  const saveFile = async () => {
    if (!currentFile || !repoInfo || !isDirty) return;
    
    try {
      setIsLoading(true);
      const message = `Update ${currentFile.name} via ECHOLINK`;
      await githubService.updateFile(
        repoInfo.owner,
        repoInfo.repo,
        currentFile.path,
        fileContent,
        message,
        currentFile.id
      );
      
      setIsDirty(false);
      showNotification('File saved successfully', 'success');
    } catch (error) {
      console.error('Error saving file:', error);
      showNotification('Failed to save file', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const closeFile = (filePath) => {
    const newOpenFiles = openFiles.filter(f => f.path !== filePath);
    setOpenFiles(newOpenFiles);
    
    // If closing current file, open the first available file or clear the editor
    if (currentFile?.path === filePath) {
      if (newOpenFiles.length > 0) {
        openFile(newOpenFiles[0]);
      } else {
        setCurrentFile(null);
        setFileContent('');
      }
    }
  };
  
  const navigateUp = async () => {
    if (!currentPath || !repoInfo) return;
    
    const pathParts = currentPath.split('/');
    pathParts.pop();
    const parentPath = pathParts.join('/');
    
    try {
      setIsLoading(true);
      const contents = await githubService.getRepositoryContent(
        repoInfo.owner,
        repoInfo.repo,
        parentPath
      );
      
      setCurrentPath(parentPath);
      buildFileTree(contents, parentPath);
    } catch (error) {
      console.error('Error navigating up:', error);
      showNotification('Failed to navigate to parent directory', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const executeCommand = (command) => {
    setTerminalOutput([...terminalOutput, `> ${command}`, 'Command execution is simulated in this environment']);
  };
  
  const toggleTerminal = () => {
    setShowTerminal(!showTerminal);
  };
  
  const handleSearch = async () => {
    if (!searchQuery.trim() || !repoInfo) return;
    
    try {
      setIsSearching(true);
      const results = await githubService.searchRepository(
        repoInfo.owner,
        repoInfo.repo,
        searchQuery
      );
      
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching repository:', error);
      showNotification('Failed to search repository', 'error');
    } finally {
      setIsSearching(false);
    }
  };
  
  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };
  
  const toggleTheme = () => {
    setTheme(theme === 'vs-dark' ? 'vs-light' : 'vs-dark');
  };
  
  // Editor actions mapping
  const editorActions = [
    { icon: '💾', label: 'Save', action: saveFile, disabled: !isDirty },
    { icon: '🔍', label: 'Find', action: () => editorRef.current?.getAction('actions.find').run(), disabled: !currentFile },
    { icon: '⚙️', label: 'Settings', action: toggleTheme, disabled: false },
    { icon: '📺', label: 'Terminal', action: toggleTerminal, disabled: false }
  ];
  
  return (
    <div className={`code-editor-container ${theme}`}>
      <div className="editor-header">
        <div className="repo-info">
          {repoInfo && <span>{repoInfo.owner}/{repoInfo.repo}</span>}
        </div>
        <div className="editor-actions">
          {editorActions.map((action, index) => (
            <button 
              key={index} 
              onClick={action.action} 
              disabled={action.disabled}
              className="action-button"
              title={action.label}
            >
              {action.icon}
            </button>
          ))}
        </div>
      </div>
      
      <div className="editor-body">
        <div className="file-explorer">
          <div className="file-explorer-header">
            <h3>EXPLORER</h3>
            {currentPath && (
              <button className="navigate-up" onClick={navigateUp} title="Navigate Up">
                ⬆️
              </button>
            )}
          </div>
          
          <div className="current-path">
            {currentPath || '/'} 
          </div>
          
          <div className="file-list">
            {isLoading ? (
              <div className="loading-indicator">Loading...</div>
            ) : (
              fileTree.map(item => (
                <div 
                  key={item.path} 
                  className={`file-item ${item.type}`}
                  onClick={() => item.type === 'dir' ? fetchDirectoryContents(item) : openFile(item)}
                >
                  <span className="file-icon">
                    {item.type === 'dir' ? '📁' : getFileIcon(item.name)}
                  </span>
                  <span className="file-name">{item.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="editor-content">
          <div className="editor-tabs">
            {openFiles.map(file => (
              <div 
                key={file.path} 
                className={`editor-tab ${currentFile?.path === file.path ? 'active' : ''}`}
                onClick={() => openFile(file)}
              >
                <span className="tab-icon">{getFileIcon(file.name)}</span>
                <span className="tab-name">{file.name}</span>
                <span className="tab-close" onClick={(e) => { e.stopPropagation(); closeFile(file.path); }}>×</span>
              </div>
            ))}
          </div>
          
          <div className="monaco-container">
            {currentFile ? (
              <Editor
                height="100%"
                language={currentLanguage}
                value={fileContent}
                theme={theme}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  lineNumbers: 'on',
                  renderWhitespace: 'selection',
                  tabSize: 2
                }}
              />
            ) : (
              <div className="empty-editor">
                <div className="empty-editor-content">
                  <h3>No file open</h3>
                  <p>Select a file from the explorer to begin editing</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {showTerminal && (
        <div className="terminal">
          <div className="terminal-header">
            <span>TERMINAL</span>
            <button onClick={toggleTerminal}>×</button>
          </div>
          <div className="terminal-content">
            {terminalOutput.map((line, index) => (
              <div key={index} className="terminal-line">{line}</div>
            ))}
            <div className="terminal-input">
              <span>$</span>
              <input 
                type="text" 
                placeholder="Enter command..." 
                onKeyDown={(e) => e.key === 'Enter' && executeCommand(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
      
      {notification.show && (
        <div className={`editor-notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
};

// Helper function to get file icon based on extension
const getFileIcon = (fileName) => {
  const extension = fileName.split('.').pop().toLowerCase();
  const iconMap = {
    'js': '📄',
    'jsx': '⚛️',
    'ts': '📄',
    'tsx': '⚛️',
    'py': '🐍',
    'java': '☕',
    'html': '📄',
    'css': '🎨',
    'json': '📄',
    'md': '📝',
    'php': '🐘',
    'rb': '💎',
    'go': '🔵',
    'c': '📄',
    'cpp': '📄',
    'cs': '📄',
    'swift': '🔶',
    'kt': '📄',
    'rs': '⚙️',
    // Add more extensions as needed
  };
  
  return iconMap[extension] || '📄';
};

export default CodeEditor; 