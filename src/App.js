import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import Landing from './components/Landing';
import { webrtcService } from './services/webrtc-service';
import { fileService } from './services/file-service';
import aiService from './services/ai-service';
import './App.css';

const MainApp = () => {
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

            await new Promise(resolve => setTimeout(resolve, 500));
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

    const LoadingScreen = ({ networkStatus }) => {
        const [particles, setParticles] = useState([]);

        useEffect(() => {
            // Create particles
            const newParticles = Array.from({ length: 20 }, (_, i) => ({
                id: i,
                x: Math.random() * 100,
                y: Math.random() * 100,
                tx: (Math.random() - 0.5) * 200,
                ty: (Math.random() - 0.5) * 200,
            }));
            setParticles(newParticles);
        }, []);

        const progress = (Object.values(networkStatus).filter(Boolean).length / 3) * 100;
        
        return (
            <div className={`app loading ${theme}`}>
                <div className="loading-container">
                    <div className="particles">
                        {particles.map(particle => (
                            <div
                                key={particle.id}
                                className="particle"
                                style={{
                                    left: `${particle.x}%`,
                                    top: `${particle.y}%`,
                                    '--tx': `${particle.tx}px`,
                                    '--ty': `${particle.ty}px`
                                }}
                            />
                        ))}
                    </div>
                    
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
                                <div 
                                    className={`status-item ${networkStatus.encryption ? 'connected' : ''}`}
                                    title={networkStatus.encryption ? 'Encryption Ready' : 'Setting up encryption...'}
                                >
                                    <span className="status-icon">🔒</span>
                                    <span className="status-text">
                                        {networkStatus.encryption ? 'Encryption Ready' : 'Setting up encryption...'}
                                    </span>
                                </div>
                                <div 
                                    className={`status-item ${networkStatus.webrtc ? 'connected' : ''}`}
                                    title={networkStatus.webrtc ? 'WebRTC Connected' : 'Connecting WebRTC...'}
                                >
                                    <span className="status-icon">🌐</span>
                                    <span className="status-text">
                                        {networkStatus.webrtc ? 'WebRTC Connected' : 'Connecting WebRTC...'}
                                    </span>
                                </div>
                                <div 
                                    className={`status-item ${networkStatus.stun ? 'connected' : ''}`}
                                    title={networkStatus.stun ? 'STUN Connected' : 'Establishing STUN...'}
                                >
                                    <span className="status-icon">📡</span>
                                    <span className="status-text">
                                        {networkStatus.stun ? 'STUN Connected' : 'Establishing STUN...'}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="loading-progress">
                                <div 
                                    className="progress-bar" 
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            
                            <p className="loading-tip">
                                {!networkStatus.stun ? 
                                    "Tip: Ensure your firewall allows WebRTC connections" :
                                    !networkStatus.webrtc ? 
                                    "Tip: Check your internet connection" :
                                    progress === 100 ?
                                    "Almost ready..." :
                                    "Initializing secure connection..."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (error) {
        return (
            <div className="error-container">
                <div className="error-message">
                    <h2>Connection Error</h2>
                    <p>{error}</p>
                    <button onClick={handleRetry} className="retry-button">Retry Connection</button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return <LoadingScreen networkStatus={networkStatus} />;
    }

    return (
        <div className={`app-container ${theme}`}>
            <Sidebar
                currentUser={currentUser}
                onPeerSelect={handlePeerSelect}
                onAISelect={handleAIChatSelect}
                selectedPeer={selectedPeer}
                isAIChatActive={isAIChatActive}
                onAIModelSelect={handleModelSelect}
                selectedAIModel={selectedAIModel}
                showApiInput={showApiInput}
                apiKey={apiKey}
                setApiKey={setApiKey}
                onVerifyKey={verifyAndInitializeAI}
                isVerifying={isVerifying}
                isAiInitialized={isAiInitialized}
                setShowSettings={setShowSettings}
                theme={theme}
                setTheme={setTheme}
                notifications={notifications}
                setShowTutorial={setShowTutorial}
            />
            <Chat
                selectedPeer={selectedPeer}
                currentUser={currentUser}
                isAIChatActive={isAIChatActive}
                selectedAIModel={selectedAIModel}
                isAiInitialized={isAiInitialized}
                showSettings={showSettings}
                setShowSettings={setShowSettings}
                showTutorial={showTutorial}
                setShowTutorial={setShowTutorial}
                addNotification={addNotification}
            />
        </div>
    );
};

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/chat" element={<MainApp />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
};

export default App; 