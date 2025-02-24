import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import { webrtcService } from './services/webrtc-service';
import { fileService } from './services/file-service';
import aiService from './services/ai-service';
import './App.css';

const App = () => {
    const [selectedPeer, setSelectedPeer] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedAIModel, setSelectedAIModel] = useState('openai');
    const [showApiInput, setShowApiInput] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isAiInitialized, setIsAiInitialized] = useState(false);
    const [networkStatus, setNetworkStatus] = useState({
        webrtc: false,
        stun: false,
        encryption: false
    });
    const [showSettings, setShowSettings] = useState(false);
    const [isAIChatActive, setIsAIChatActive] = useState(false);
    const [theme, setTheme] = useState('dark');
    const [notifications, setNotifications] = useState([]);
    const [showTutorial, setShowTutorial] = useState(true);

    useEffect(() => {
        document.body.className = theme;
    }, [theme]);

    const initializeServices = async () => {
        try {
            setError(null);
            setIsLoading(true);
            setNetworkStatus(prev => ({ ...prev, encryption: true }));

            // Initialize WebRTC
            await webrtcService.initialize();
            setNetworkStatus(prev => ({ ...prev, webrtc: true }));

            // Check STUN server connectivity
            const stunConnected = await webrtcService.checkStunConnectivity();
            setNetworkStatus(prev => ({ ...prev, stun: stunConnected }));

            if (!stunConnected) {
                throw new Error('STUN server connection failed. Check your network connection.');
            }

            setCurrentUser({
                id: webrtcService.getPeerId()
            });

            // Check for stored API key
            const storedApiKey = localStorage.getItem('ai_api_key');
            if (storedApiKey) {
                try {
                    await aiService.initialize(storedApiKey);
                    setIsAiInitialized(true);
                } catch (error) {
                    console.error('Failed to initialize AI service:', error);
                }
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
            setIsLoading(false);
        } catch (error) {
            console.error('Initialization error:', error);
            setError(error.message || 'Failed to initialize. Please check your connection.');
            setIsLoading(false);
        }
    };

    useEffect(() => {
        initializeServices();
        return () => {
            webrtcService.disconnect();
        };
    }, []);

    const handleRetry = () => {
        initializeServices();
    };

    const handlePeerSelect = (peerId) => {
        setSelectedPeer(peerId);
        setIsAIChatActive(false);
    };

    const handleAIChatSelect = () => {
        setSelectedPeer(null);
        setIsAIChatActive(true);
    };

    const handleModelSelect = async (model) => {
        if (isAiInitialized && selectedAIModel === model) return;
        setSelectedAIModel(model);
        setShowApiInput(true);
        setApiKey('');
        setIsAiInitialized(false);
    };

    const addNotification = (message, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    };

    const verifyAndInitializeAI = async (e) => {
        e.preventDefault();
        if (!apiKey.trim()) return;

        setIsVerifying(true);
        try {
            await aiService.initialize(apiKey);
            setIsAiInitialized(true);
            setShowApiInput(false);
            localStorage.setItem('ai_api_key', apiKey);
            addNotification('AI service initialized successfully', 'success');
        } catch (error) {
            console.error('AI initialization failed:', error);
            addNotification(error.message, 'error');
        } finally {
            setIsVerifying(false);
        }
    };

    if (isLoading) {
        return (
            <div className={`app loading ${theme}`}>
                <div className="loading-container">
                    <div className="wave-container">
                        <div className="wave"></div>
                        <div className="wave"></div>
                        <div className="wave"></div>
                    </div>
                    
                    <div className="loading-content">
                        <div className="logo-container">
                            <div className="logo-ring"></div>
                            <h1 className="logo-text">Echo Link</h1>
                        </div>
                        
                        <div className="loading-status">
                            <div className="status-items">
                                <div className={`status-item ${networkStatus.encryption ? 'connected' : ''}`}>
                                    <span className="status-icon">🔒</span>
                                    <span className="status-text">
                                        {networkStatus.encryption ? 'Encryption Ready' : 'Setting up encryption...'}
                                    </span>
                                </div>
                                <div className={`status-item ${networkStatus.webrtc ? 'connected' : ''}`}>
                                    <span className="status-icon">🌐</span>
                                    <span className="status-text">
                                        {networkStatus.webrtc ? 'WebRTC Connected' : 'Connecting WebRTC...'}
                                    </span>
                                </div>
                                <div className={`status-item ${networkStatus.stun ? 'connected' : ''}`}>
                                    <span className="status-icon">📡</span>
                                    <span className="status-text">
                                        {networkStatus.stun ? 'STUN Connected' : 'Establishing STUN...'}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="loading-progress">
                                <div 
                                    className="progress-bar" 
                                    style={{ 
                                        width: `${(Object.values(networkStatus).filter(Boolean).length / 3) * 100}%` 
                                    }}
                                ></div>
                            </div>
                            
                            <p className="loading-tip">
                                {!networkStatus.stun ? 
                                    "Tip: Ensure your firewall allows WebRTC connections" :
                                    !networkStatus.webrtc ? 
                                    "Tip: Check your internet connection" :
                                    "Almost ready..."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !currentUser) {
        return (
            <div className={`app error ${theme}`}>
                <div className="error-container">
                    <div className="error-content">
                        <div className="error-icon">⚠️</div>
                        <h2>Connection Error</h2>
                        <p className="error-message">
                            {error || 'Failed to initialize. Please check your connection.'}
                        </p>
                        <button onClick={handleRetry} className="retry-button">
                            <span className="icon">🔄</span> Retry Connection
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`app ${theme}`}>
            <div className="app-header">
                <div className="header-content">
                    <div className="header-left">
                        <h1>Echo Link</h1>
                        <span className="connection-status">
                            <span className="status-dot online"></span>
                            Connected
                        </span>
                    </div>
                    <div className="header-actions">
                        <button 
                            className="theme-toggle"
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            title="Toggle theme"
                        >
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                        <button 
                            className="settings-button"
                            onClick={() => setShowSettings(!showSettings)}
                            title="Settings"
                        >
                            ⚙️
                        </button>
                    </div>
                </div>

                {showSettings && (
                    <div className="settings-panel">
                        <div className="settings-header">
                            <h3>Settings</h3>
                            <button 
                                className="close-button"
                                onClick={() => setShowSettings(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="settings-content">
                            <div className="settings-section">
                                <h4>AI Configuration</h4>
                                <div className="ai-model-select">
                                    <p>Select AI Model</p>
                                    <div className="model-options">
                                        <button 
                                            className={`model-option ${selectedAIModel === 'openai' ? 'selected' : ''}`}
                                            onClick={() => handleModelSelect('openai')}
                                        >
                                            <span className="model-icon">🤖</span>
                                            OpenAI
                                            {selectedAIModel === 'openai' && isAiInitialized && 
                                                <span className="verified-badge">✓</span>}
                                        </button>
                                        <button 
                                            className={`model-option ${selectedAIModel === 'gemini' ? 'selected' : ''}`}
                                            onClick={() => handleModelSelect('gemini')}
                                        >
                                            <span className="model-icon">💫</span>
                                            Gemini
                                            {selectedAIModel === 'gemini' && isAiInitialized && 
                                                <span className="verified-badge">✓</span>}
                                        </button>
                                    </div>
                                </div>
                                {showApiInput && (
                                    <form onSubmit={verifyAndInitializeAI} className="api-key-form">
                                        <input
                                            type="password"
                                            placeholder={`Enter ${selectedAIModel} API Key`}
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            className="api-key-input"
                                        />
                                        <div className="form-actions">
                                            <button 
                                                type="submit" 
                                                className="verify-button"
                                                disabled={isVerifying}
                                            >
                                                {isVerifying ? 'Verifying...' : 'Verify'}
                                            </button>
                                            <button 
                                                type="button" 
                                                className="cancel-button"
                                                onClick={() => setShowApiInput(false)}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="notifications-container">
                    {notifications.map(notification => (
                        <div key={notification.id} className={`notification ${notification.type}`}>
                            {notification.message}
                        </div>
                    ))}
                </div>
            </div>

            <div className="app-content">
                <Sidebar
                    onPeerSelect={handlePeerSelect}
                    onAIChatSelect={handleAIChatSelect}
                    currentUser={currentUser}
                    isAiInitialized={isAiInitialized}
                />
                <Chat
                    currentUser={currentUser}
                    selectedPeer={selectedPeer}
                    isAIChatActive={isAIChatActive}
                />
            </div>

            {showTutorial && (
                <div className="tutorial-overlay">
                    <div className="tutorial-content">
                        <h2>Welcome to Echo Link! 👋</h2>
                        <div className="tutorial-steps">
                            <div className="tutorial-step">
                                <span className="step-number">1</span>
                                <p>Share your ID with friends to connect</p>
                            </div>
                            <div className="tutorial-step">
                                <span className="step-number">2</span>
                                <p>Enable AI features in settings</p>
                            </div>
                            <div className="tutorial-step">
                                <span className="step-number">3</span>
                                <p>Start chatting securely!</p>
                            </div>
                        </div>
                        <button 
                            className="tutorial-close"
                            onClick={() => setShowTutorial(false)}
                        >
                            Got it!
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App; 