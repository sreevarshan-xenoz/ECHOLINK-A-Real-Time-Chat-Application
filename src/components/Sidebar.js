import React, { useState, useEffect } from 'react';
import { webrtcService } from '../services/webrtc-service';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import './Sidebar.css';
import { FiHome, FiMessageSquare, FiCpu, FiGithub } from 'react-icons/fi';
import { Icon } from '@chakra-ui/react';

const Sidebar = ({ 
    onPeerSelect, 
    currentUser, 
    onAISelect,
    selectedPeer,
    isAIChatActive,
    onAIModelSelect,
    selectedAIModel,
    showApiInput,
    apiKey,
    setApiKey,
    onVerifyKey,
    isVerifying,
    isAiInitialized,
    setShowSettings,
    theme,
    setTheme,
    notifications,
    setShowTutorial,
    showTutorial
}) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [peers, setPeers] = useState([]);
    const [selectedPeerId, setSelectedPeerId] = useState(null);
    const [connectInput, setConnectInput] = useState('');
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState('peers'); // 'peers', 'ai', 'github', or 'settings'
    const [settings, setSettings] = useState({
        appearance: {
            theme: theme || 'dark',
            messageDensity: 'comfortable',
            bubbleStyle: 'modern',
            animationLevel: 'full'
        }
    });

    useEffect(() => {
        const unsubscribe = webrtcService.onMessage((message) => {
            if (message.type === 'PEER_CONNECTED') {
                setPeers(prev => [...prev, message.peerId]);
            } else if (message.type === 'PEER_DISCONNECTED') {
                setPeers(prev => prev.filter(id => id !== message.peerId));
            }
        });

        // Get initial peers
        setPeers(webrtcService.getConnectedPeers());

        return () => unsubscribe();
    }, []);

    const handlePeerSelect = (peerId) => {
        setSelectedPeerId(peerId);
        if (onPeerSelect) {
            onPeerSelect(peerId);
        }
        setActiveTab('peers');
        onAISelect(false); // Disable AI chat when selecting a peer
    };

    const handleAIChatSelect = () => {
        // Add a small visual feedback before switching tabs
        const aiTab = document.querySelector('.tab-button:nth-child(2)');
        if (aiTab) {
            aiTab.classList.add('pulse-effect');
            setTimeout(() => {
                aiTab.classList.remove('pulse-effect');
            }, 500);
        }
        
        if (onAISelect) {
            onAISelect();
        }
        setSelectedPeerId(null);
        if (onPeerSelect) {
            onPeerSelect(null);
        }
        setActiveTab('ai');
    };

    const handleSettingsSelect = () => {
        setActiveTab('settings');
    };

    const handleSettingsChange = (category, setting, value) => {
        setSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [setting]: value
            }
        }));
        
        // Update theme if that's what changed
        if (category === 'appearance' && setting === 'theme') {
            setTheme(value);
        }
    };

    const handleConnect = async (e) => {
        e.preventDefault();
        if (connectInput.trim()) {
            try {
                await webrtcService.initiateConnection(connectInput.trim());
                setConnectInput('');
            } catch (error) {
                console.error('Failed to connect:', error);
            }
        }
    };

    const handleCopyId = async () => {
        try {
            await navigator.clipboard.writeText(currentUser.id);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const getInitials = (peerId) => {
        return peerId.substring(0, 2).toUpperCase();
    };

    const filteredPeers = peers.filter(peerId =>
        peerId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleGitHubSelect = () => {
        navigate('/github');
    };

    return (
        <div className={`sidebar ${theme}`}>
            <div className="sidebar-header">
                <div className="user-profile">
                    <div className="user-profile-info">
                        <div className="user-avatar">
                            {getInitials(currentUser.id)}
                        </div>
                        <div className="user-details">
                            <span className="user-name">Your ID</span>
                            <div className="user-id">{currentUser.id}</div>
                            <span className="user-status">
                                <span className="status-indicator status-online"></span>
                                Online
                            </span>
                        </div>
                    </div>
                    <button 
                        onClick={handleCopyId}
                        className="copy-button"
                        title="Copy your ID to share with others"
                    >
                        {copied ? '✓ Copied' : '📋 Copy ID'}
                    </button>
                </div>
            </div>

            <div className="sidebar-tabs">
                <button 
                    className={`tab-button ${activeTab === 'peers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('peers')}
                >
                    👥 Peers
                </button>
                <button 
                    className={`tab-button ${activeTab === 'ai' ? 'active' : ''}`}
                    onClick={handleAIChatSelect}
                >
                    🤖 AI Chat
                </button>
                <button 
                    className={`tab-button ${activeTab === 'github' ? 'active' : ''}`}
                    onClick={handleGitHubSelect}
                >
                    <span className="github-icon">🔗</span> GitHub
                </button>
                <button 
                    className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={handleSettingsSelect}
                >
                    ⚙️ Settings
                </button>
            </div>

            {activeTab === 'peers' ? (
                <>
                    <div className="connect-container">
                        <h3>Connect with Others</h3>
                        <div className="connect-steps">
                            <p>1. Share your ID with friends</p>
                            <p>2. Or enter their ID below to connect</p>
                        </div>
                        <form onSubmit={handleConnect}>
                            <input
                                type="text"
                                value={connectInput}
                                onChange={(e) => setConnectInput(e.target.value)}
                                placeholder="Paste friend's ID here"
                                className="connect-input"
                            />
                            <button type="submit" className="connect-button">
                                Connect
                            </button>
                        </form>
                    </div>

                    <div className="search-container">
                        <input
                            type="text"
                            placeholder="Search peers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                    </div>

                    <div className="peers-list">
                        {filteredPeers.map((peerId) => (
                            <div
                                key={peerId}
                                className={`peer-item ${selectedPeerId === peerId ? 'selected' : ''}`}
                                onClick={() => handlePeerSelect(peerId)}
                            >
                                <div className="user-profile-info">
                                    <div className="user-avatar">
                                        {getInitials(peerId)}
                                    </div>
                                    <div className="peer-info">
                                        <div className="peer-header">
                                            <h4>{peerId.substring(0, 8)}...</h4>
                                            <span className="peer-status">
                                                <span className="status-indicator status-online"></span>
                                                online
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredPeers.length === 0 && (
                            <div className="no-peers">
                                <p>No peers found</p>
                                <p className="help-text">Connect to peers using their ID</p>
                            </div>
                        )}
                    </div>

                    {peers.length === 0 && (
                        <div className="no-peers-guide">
                            <h3>Welcome to Echo Link! 👋</h3>
                            <p>To start chatting:</p>
                            <ol>
                                <li>Copy your ID using the button above</li>
                                <li>Share it with your friends</li>
                                <li>Ask them to paste it in their connect field</li>
                                <li>Or paste their ID in your connect field</li>
                            </ol>
                        </div>
                    )}
                </>
            ) : activeTab === 'ai' ? (
                <div className="ai-chat-section">
                    <div className="ai-chat-info">
                        <div className="ai-avatar">
                            🤖
                        </div>
                        <div className="ai-details">
                            <h3>Echo AI Assistant</h3>
                            <p>Your personal AI chat companion</p>
                            {!isAiInitialized && (
                                <div className="ai-setup-notice">
                                    Please set up AI in settings to start chatting
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="ai-features">
                        <div className="feature-item">
                            <span>💡</span>
                            <p>Ask questions and get instant answers</p>
                        </div>
                        <div className="feature-item">
                            <span>📝</span>
                            <p>Get help with writing and analysis</p>
                        </div>
                        <div className="feature-item">
                            <span>🔍</span>
                            <p>Research and learn new topics</p>
                        </div>
                        <div className="feature-item">
                            <span>🎯</span>
                            <p>Get personalized recommendations</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="settings-content">
                    <div className="setting-item">
                        <label>Theme Style</label>
                        <select 
                            value={settings.appearance.theme}
                            onChange={(e) => handleSettingsChange('appearance', 'theme', e.target.value)}
                        >
                            <option value="dark">Dark Mode</option>
                            <option value="light">Light Mode</option>
                            <option value="high-contrast">High Contrast</option>
                        </select>
                    </div>
                    <div className="setting-item">
                        <label>Message Density</label>
                        <select
                            value={settings.appearance.messageDensity}
                            onChange={(e) => handleSettingsChange('appearance', 'messageDensity', e.target.value)}
                        >
                            <option value="compact">Compact</option>
                            <option value="comfortable">Comfortable</option>
                            <option value="relaxed">Relaxed</option>
                        </select>
                    </div>
                    <div className="setting-item">
                        <label>Bubble Style</label>
                        <select
                            value={settings.appearance.bubbleStyle}
                            onChange={(e) => handleSettingsChange('appearance', 'bubbleStyle', e.target.value)}
                        >
                            <option value="modern">Modern</option>
                            <option value="classic">Classic</option>
                            <option value="rounded">Rounded</option>
                        </select>
                    </div>
                    <div className="setting-item">
                        <label>Animations</label>
                        <select
                            value={settings.appearance.animationLevel}
                            onChange={(e) => handleSettingsChange('appearance', 'animationLevel', e.target.value)}
                        >
                            <option value="full">Full Animations</option>
                            <option value="minimal">Minimal Animations</option>
                            <option value="none">No Animations</option>
                        </select>
                    </div>
                    {!isAiInitialized && (
                        <div className="ai-setup-section">
                            <h3>AI Chat Setup</h3>
                            <p>Configure your AI provider to enable AI chat features</p>
                            <button 
                                className="setup-ai-button"
                                onClick={() => setShowSettings(true)}
                            >
                                Configure AI Settings
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className="sidebar-links">
                <NavLink to="/app" className="sidebar-link" activeClassName="active" exact>
                    <Icon as={FiHome} className="sidebar-icon" />
                    <span>Dashboard</span>
                </NavLink>
                
                <NavLink to="/app/chat" className="sidebar-link" activeClassName="active">
                    <Icon as={FiMessageSquare} className="sidebar-icon" />
                    <span>Chat</span>
                </NavLink>
                
                <NavLink to="/app/ai" className="sidebar-link" activeClassName="active">
                    <Icon as={FiCpu} className="sidebar-icon" />
                    <span>AURA AI</span>
                </NavLink>
                
                <NavLink to="/app/github" className="sidebar-link" activeClassName="active">
                    <Icon as={FiGithub} className="sidebar-icon" />
                    <span>GitHub</span>
                </NavLink>
            </div>
        </div>
    );
};

export default Sidebar;