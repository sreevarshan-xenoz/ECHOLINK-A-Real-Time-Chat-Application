import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import { webrtcService } from './services/webrtc-service';
import { fileService } from './services/file-service';
import { aiService } from './services/ai-service';
import './App.css';

const App = () => {
    const [selectedPeer, setSelectedPeer] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedAIModel, setSelectedAIModel] = useState('openai'); // Default model
    const [showApiInput, setShowApiInput] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isAiInitialized, setIsAiInitialized] = useState(false);
    const [networkStatus, setNetworkStatus] = useState({
        webrtc: false,
        stun: false
    });
    const [showSettings, setShowSettings] = useState(false);
    
    const initializeServices = async () => {
        try {
            setError(null);
            setIsLoading(true);

            // Initialize WebRTC
            await webrtcService.initialize();
            setNetworkStatus(prev => ({ ...prev, webrtc: true }));

            // Check STUN server connectivity
            const stunConnected = await webrtcService.checkStunConnectivity();
            setNetworkStatus(prev => ({ ...prev, stun: stunConnected }));

            if (!stunConnected) {
                throw new Error('STUN server connection failed. Check your network connection.');
            }

            // Set current user with WebRTC peer ID
            setCurrentUser({
                id: webrtcService.getPeerId()
            });

            // Artificial delay for loading screen
            await new Promise(resolve => setTimeout(resolve, 3000));
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
    };

    const handleModelSelect = async (model) => {
        if (isAiInitialized && selectedAIModel === model) return;
        
        setSelectedAIModel(model);
        setShowApiInput(true);
        setApiKey('');
        setIsAiInitialized(false);
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
        } catch (error) {
            console.error('AI initialization failed:', error);
            setError('Invalid API key. Please try again.');
        } finally {
            setIsVerifying(false);
        }
    };

    if (isLoading) {
        return (
            <div className="app loading">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <div className="loading-status">
                        <h2>Echo Link</h2>
                        <div className="ai-model-select">
                            <p>Select AI Model</p>
                            <div className="model-options">
                                <button 
                                    className={`model-option ${selectedAIModel === 'openai' ? 'selected' : ''}`}
                                    onClick={() => handleModelSelect('openai')}
                                >
                                    <span className="model-icon">🤖</span>
                                    OpenAI
                                    {selectedAIModel === 'openai' && isAiInitialized && <span className="verified-badge">✓</span>}
                                </button>
                                <button 
                                    className={`model-option ${selectedAIModel === 'claude' ? 'selected' : ''}`}
                                    onClick={() => handleModelSelect('claude')}
                                >
                                    <span className="model-icon">🧠</span>
                                    Claude
                                    {selectedAIModel === 'claude' && isAiInitialized && <span className="verified-badge">✓</span>}
                                </button>
                                <button 
                                    className={`model-option ${selectedAIModel === 'gemini' ? 'selected' : ''}`}
                                    onClick={() => handleModelSelect('gemini')}
                                >
                                    <span className="model-icon">💫</span>
                                    Gemini
                                    {selectedAIModel === 'gemini' && isAiInitialized && <span className="verified-badge">✓</span>}
                                </button>
                            </div>
                        </div>
                        <p>Establishing Secure Connection</p>
                        <div className="status-items">
                            <div className={`status-item ${networkStatus.webrtc ? 'connected' : ''}`}>
                                WebRTC {networkStatus.webrtc ? '✓ Connected' : 'Connecting...'}
                            </div>
                            <div className={`status-item ${networkStatus.stun ? 'connected' : ''}`}>
                                STUN {networkStatus.stun ? '✓ Connected' : 'Establishing...'}
                            </div>
                            <div className="status-item connected">
                                Initializing End-to-End Encryption
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !currentUser) {
        return (
            <div className="app loading">
                <div className="error-container">
                    <div className="error-message">
                        {error || 'Failed to initialize. Please check your connection.'}
                    </div>
                    <button onClick={handleRetry} className="retry-button">
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            <div className="app-header">
                <div className="header-content">
                    <h1>Echo Link</h1>
                    <button 
                        className="settings-button"
                        onClick={() => setShowSettings(!showSettings)}
                        title="Settings"
                    >
                        ⚙️
                    </button>
                </div>
                {showSettings && (
                    <div className="settings-panel">
                        <div className="settings-header">
                            <h3>AI Settings</h3>
                            <button 
                                className="close-button"
                                onClick={() => setShowSettings(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="ai-model-select">
                            <p>Select AI Model</p>
                            <div className="model-options">
                                <button 
                                    className={`model-option ${selectedAIModel === 'openai' ? 'selected' : ''}`}
                                    onClick={() => handleModelSelect('openai')}
                                >
                                    <span className="model-icon">🤖</span>
                                    OpenAI
                                    {selectedAIModel === 'openai' && isAiInitialized && <span className="verified-badge">✓</span>}
                                </button>
                                <button 
                                    className={`model-option ${selectedAIModel === 'claude' ? 'selected' : ''}`}
                                    onClick={() => handleModelSelect('claude')}
                                >
                                    <span className="model-icon">🧠</span>
                                    Claude
                                    {selectedAIModel === 'claude' && isAiInitialized && <span className="verified-badge">✓</span>}
                                </button>
                                <button 
                                    className={`model-option ${selectedAIModel === 'gemini' ? 'selected' : ''}`}
                                    onClick={() => handleModelSelect('gemini')}
                                >
                                    <span className="model-icon">💫</span>
                                    Gemini
                                    {selectedAIModel === 'gemini' && isAiInitialized && <span className="verified-badge">✓</span>}
                                </button>
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
                                </form>
                            )}
                            {error && <div className="error-message">{error}</div>}
                        </div>
                    </div>
                )}
            </div>
            <div className="app-content">
                <Sidebar
                    onPeerSelect={handlePeerSelect}
                    currentUser={currentUser}
                />
                <Chat
                    currentUser={currentUser}
                    selectedPeer={selectedPeer}
                    aiModel={selectedAIModel}
                    isAiInitialized={isAiInitialized}
                />
            </div>
        </div>
    );
};

export default App; 