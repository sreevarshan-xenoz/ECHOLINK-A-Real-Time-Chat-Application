import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { FaFolder, FaFile, FaCode, FaTerminal, FaGithub } from 'react-icons/fa';
import githubService from '../services/github';
import './CodeEditor.css';

const CodeEditor = ({ theme }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [fileTree, setFileTree] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [openFiles, setOpenFiles] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [terminalOutput, setTerminalOutput] = useState('Terminal ready.\n');
  const editorRef = useRef(null);

  // Handle editor mount
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Add custom themes if needed
    monaco.editor.defineTheme('echoLinkDark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1a1a1a',
        'editor.foreground': '#f8f8f8',
        'editorCursor.foreground': '#a0a0a0',
        'editor.lineHighlightBackground': '#232323',
        'editorLineNumber.foreground': '#707070',
        'editor.selectionBackground': '#444444',
        'editor.inactiveSelectionBackground': '#333333',
      }
    });
    
    monaco.editor.defineTheme('echoLinkLight', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#333333',
        'editorCursor.foreground': '#767676',
        'editor.lineHighlightBackground': '#f5f5f5',
        'editorLineNumber.foreground': '#aaaaaa',
        'editor.selectionBackground': '#dddddd',
        'editor.inactiveSelectionBackground': '#eeeeee',
      }
    });
    
    // Set the theme based on app theme
    monaco.editor.setTheme(theme === 'dark' ? 'echoLinkDark' : 'echoLinkLight');
  };

  // Load repository from GitHub
  const loadRepository = async () => {
    try {
      setLoading(true);
      setError(null);
      setFileTree([]);
      setOpenFiles([]);
      setActiveTab(null);
      setCurrentFile(null);
      setEditorContent('');
      
      const { owner, repo } = githubService.parseRepoUrl(repoUrl);
      const contents = await githubService.fetchRepoContents(owner, repo);
      const tree = githubService.buildFileTree(contents);
      
      setFileTree(tree);
      
      // Add a message to terminal
      setTerminalOutput(prev => 
        prev + `\nLoaded repository: ${owner}/${repo}\n`
      );
      
      setLoading(false);
    } catch (error) {
      setError(error.message);
      setLoading(false);
      setTerminalOutput(prev => 
        prev + `\nError: ${error.message}\n`
      );
    }
  };

  // Handle file item click in the file tree
  const handleFileClick = async (item) => {
    if (item.type === 'dir') {
      // Handle directory click - expand/collapse
      try {
        setLoading(true);
        const { owner, repo } = githubService.parseRepoUrl(repoUrl);
        const contents = await githubService.fetchRepoContents(owner, repo, item.path);
        
        // Update file tree with new children
        const updatedTree = fileTree.map(node => {
          if (node.path === item.path) {
            // Toggle children: if already has children, remove them, otherwise add
            return {
              ...node,
              children: node.children.length > 0 
                ? [] 
                : githubService.buildFileTree(contents)
            };
          }
          return node;
        });
        
        setFileTree(updatedTree);
        setLoading(false);
      } catch (error) {
        setError(error.message);
        setLoading(false);
      }
    } else {
      // Handle file click - open in editor
      try {
        setLoading(true);
        const { owner, repo } = githubService.parseRepoUrl(repoUrl);
        const content = await githubService.getFileContent(owner, repo, item.path);
        
        // Create an open file object
        const fileObj = {
          name: item.name,
          path: item.path,
          language: githubService.getLanguageFromFilename(item.name),
          content
        };
        
        // Check if file is already open
        const isAlreadyOpen = openFiles.some(file => file.path === item.path);
        
        if (!isAlreadyOpen) {
          setOpenFiles(prev => [...prev, fileObj]);
        }
        
        setCurrentFile(fileObj);
        setActiveTab(fileObj.path);
        setEditorContent(content);
        setLoading(false);
      } catch (error) {
        setError(error.message);
        setLoading(false);
      }
    }
  };

  // Handle tab click
  const handleTabClick = (filePath) => {
    const file = openFiles.find(f => f.path === filePath);
    if (file) {
      setCurrentFile(file);
      setActiveTab(file.path);
      setEditorContent(file.content);
    }
  };

  // Handle tab close
  const handleTabClose = (e, filePath) => {
    e.stopPropagation();
    
    const updatedFiles = openFiles.filter(f => f.path !== filePath);
    setOpenFiles(updatedFiles);
    
    if (activeTab === filePath) {
      // If we're closing the active tab, set a new active tab
      if (updatedFiles.length > 0) {
        const newActiveFile = updatedFiles[updatedFiles.length - 1];
        setCurrentFile(newActiveFile);
        setActiveTab(newActiveFile.path);
        setEditorContent(newActiveFile.content);
      } else {
        setCurrentFile(null);
        setActiveTab(null);
        setEditorContent('');
      }
    }
  };

  // Handle editor content change
  const handleEditorChange = (value) => {
    setEditorContent(value);
    
    // Update the content in the open files array
    if (currentFile) {
      setOpenFiles(prev => 
        prev.map(file => 
          file.path === currentFile.path 
            ? { ...file, content: value } 
            : file
        )
      );
      
      // Update current file
      setCurrentFile(prev => ({ ...prev, content: value }));
    }
  };

  // Save current file
  const saveCurrentFile = async () => {
    if (!currentFile) return;
    
    try {
      setLoading(true);
      const { owner, repo } = githubService.parseRepoUrl(repoUrl);
      
      // Add terminal message
      setTerminalOutput(prev => 
        prev + `\nSaving file: ${currentFile.path}...\n`
      );
      
      await githubService.commitFile(
        owner,
        repo,
        currentFile.path,
        editorContent,
        null,
        `Update ${currentFile.name} via EchoLink Code Editor`
      );
      
      setTerminalOutput(prev => 
        prev + `File saved successfully!\n`
      );
      
      setLoading(false);
    } catch (error) {
      setError(error.message);
      setTerminalOutput(prev => 
        prev + `Error saving file: ${error.message}\n`
      );
      setLoading(false);
    }
  };

  // Execute terminal command (simulated)
  const executeCommand = (command) => {
    setTerminalOutput(prev => 
      prev + `$ ${command}\n`
    );
    
    // Simple command simulation
    if (command.startsWith('ls')) {
      if (fileTree.length > 0) {
        const output = fileTree.map(item => item.name).join('  ');
        setTerminalOutput(prev => 
          prev + output + '\n\n'
        );
      } else {
        setTerminalOutput(prev => 
          prev + 'No repository loaded.\n\n'
        );
      }
    } else if (command.startsWith('echo')) {
      const message = command.substring(5);
      setTerminalOutput(prev => 
        prev + message + '\n\n'
      );
    } else if (command === 'clear') {
      setTerminalOutput('Terminal ready.\n');
    } else {
      setTerminalOutput(prev => 
        prev + `Command not recognized: ${command}\n\n`
      );
    }
  };

  // Handle terminal input
  const handleTerminalSubmit = (e) => {
    if (e.key === 'Enter') {
      const command = e.target.value.trim();
      if (command) {
        executeCommand(command);
        e.target.value = '';
      }
    }
  };

  return (
    <div className={`code-editor-container ${theme}`}>
      <div className="editor-header">
        <div className="repo-input">
          <FaGithub className="github-icon" />
          <input
            type="text"
            placeholder="Enter GitHub repository URL"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
          />
          <button onClick={loadRepository} disabled={loading}>
            {loading ? 'Loading...' : 'Load'}
          </button>
        </div>
        {currentFile && (
          <button className="save-button" onClick={saveCurrentFile} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>
      
      <div className="editor-main">
        <div className="file-explorer">
          <div className="explorer-header">
            <FaFolder className="folder-icon" />
            <span>Explorer</span>
          </div>
          <div className="file-tree">
            {fileTree.length > 0 ? (
              <ul>
                {fileTree.map((item) => (
                  <li 
                    key={item.path} 
                    className={`file-item ${item.type}`}
                    onClick={() => handleFileClick(item)}
                  >
                    {item.type === 'dir' ? (
                      <FaFolder className="file-icon folder" />
                    ) : (
                      <FaFile className="file-icon file" />
                    )}
                    <span>{item.name}</span>
                    
                    {/* Show children if expanded */}
                    {item.children && item.children.length > 0 && (
                      <ul className="file-children">
                        {item.children.map((child) => (
                          <li 
                            key={child.path} 
                            className={`file-item ${child.type}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFileClick(child);
                            }}
                          >
                            {child.type === 'dir' ? (
                              <FaFolder className="file-icon folder" />
                            ) : (
                              <FaFile className="file-icon file" />
                            )}
                            <span>{child.name}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                {error ? (
                  <p className="error-message">{error}</p>
                ) : (
                  <p>No repository loaded</p>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="editor-content">
          {openFiles.length > 0 && (
            <div className="editor-tabs">
              {openFiles.map((file) => (
                <div 
                  key={file.path} 
                  className={`editor-tab ${activeTab === file.path ? 'active' : ''}`}
                  onClick={() => handleTabClick(file.path)}
                >
                  <FaCode className="tab-icon" />
                  <span className="tab-name">{file.name}</span>
                  <button 
                    className="tab-close"
                    onClick={(e) => handleTabClose(e, file.path)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="monaco-container">
            {currentFile ? (
              <Editor
                height="100%"
                language={currentFile.language}
                value={editorContent}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  wordWrap: 'on',
                  automaticLayout: true,
                  lineNumbers: 'on',
                }}
              />
            ) : (
              <div className="empty-editor">
                <FaCode className="empty-icon" />
                <p>Open a file to start editing</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="terminal">
        <div className="terminal-header">
          <FaTerminal className="terminal-icon" />
          <span>Terminal</span>
        </div>
        <div className="terminal-content">
          <pre>{terminalOutput}</pre>
          <div className="terminal-input-line">
            <span className="prompt">$</span>
            <input 
              type="text" 
              className="terminal-input" 
              onKeyDown={handleTerminalSubmit}
              placeholder="Type command..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor; 