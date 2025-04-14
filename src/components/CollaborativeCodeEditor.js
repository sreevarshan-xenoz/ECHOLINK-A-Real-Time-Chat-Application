import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import './CollaborativeCodeEditor.css';

const CollaborativeCodeEditor = ({ 
  roomId, 
  language = 'javascript', 
  initialContent = '',
  readOnly = false,
  onContentChange = () => {}
}) => {
  const editorRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    if (!editorRef.current) return;
    
    // Create a Yjs document
    const ydoc = new Y.Doc();
    
    // Connect to WebSocket server
    const provider = new WebsocketProvider(
      'ws://localhost:1234', 
      `echolink-collab-${roomId}`, 
      ydoc
    );
    
    provider.on('status', event => {
      setConnected(event.status === 'connected');
    });
    
    // Get the shared text
    const ytext = ydoc.getText('monaco');
    
    // If there's initial content and the document is empty, set it
    if (initialContent && ytext.toString() === '') {
      ytext.insert(0, initialContent);
    }
    
    // Bind Monaco editor to Yjs
    const binding = new MonacoBinding(
      ytext, 
      editorRef.current.getModel(), 
      new Set([editorRef.current]), 
      provider.awareness
    );
    
    // Set up awareness (cursor presence)
    provider.awareness.setLocalStateField('user', {
      name: localStorage.getItem('username') || 'Anonymous',
      color: '#' + Math.floor(Math.random() * 16777215).toString(16)
    });
    
    // Update users list when awareness changes
    const updateUsers = () => {
      const states = Array.from(provider.awareness.getStates().values());
      const userList = states
        .filter(state => state.user)
        .map(state => state.user);
      setUsers(userList);
    };
    
    provider.awareness.on('change', updateUsers);
    updateUsers();
    
    // Set up content change handler
    const contentChangeHandler = () => {
      onContentChange(ytext.toString());
    };
    ytext.observe(contentChangeHandler);
    
    return () => {
      // Clean up
      ytext.unobserve(contentChangeHandler);
      provider.awareness.off('change', updateUsers);
      provider.disconnect();
      ydoc.destroy();
    };
  }, [roomId, initialContent, onContentChange]);
  
  function handleEditorDidMount(editor) {
    editorRef.current = editor;
    editor.updateOptions({ readOnly });
  }
  
  return (
    <div className="collaborative-editor-container">
      <div className="editor-header">
        <div className="connection-status">
          <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}></span>
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <div className="active-users">
          {users.map((user, index) => (
            <div 
              key={index} 
              className="user-indicator" 
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      </div>
      <Editor
        height="70vh"
        language={language}
        defaultValue={initialContent}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          automaticLayout: true
        }}
      />
    </div>
  );
};

export default CollaborativeCodeEditor;