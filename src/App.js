import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import Sidebar from './components/Sidebar';
import Landing from './components/Landing';
import { webrtcService } from './services/webrtc-service';
import { fileService } from './services/file-service';
import aiService from './services/ai-service';

import './App.css';

const Chat = lazy(() => import('./components/Chat'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const GitHubHome = lazy(() => import('./components/GitHubHome'));
const GitHubIntegration = lazy(() => import('./components/GitHubIntegration'));
const AIChat = lazy(() => import('./components/AIChat'));

// Create a Chakra UI theme
const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  colors: {
    primary: {
      50: '#e6ffff',
      100: '#b3ffff',
      200: '#80ffff',
      300: '#4dffff',
      400: '#1affff',
      500: '#00f7ff',
      600: '#00c3ff',
      700: '#0088cc',
      800: '#006699',
      900: '#004466',
    },
  },
});

// Wrap a standalone component with ChakraProvider to ensure theme consistency
const ChakraTheme = ({ children }) => (
  <ChakraProvider theme={theme}>
    {children}
  </ChakraProvider>
);

const ErrorScreen = ({ error, onRetry }) => {
    return (
        <div className="error-container">
            <div className="error-message">
                <h2>Connection Error</h2>
                <p>{error}</p>
                <button onClick={onRetry} className="retry-button">Retry Connection</button>
            </div>
        </div>
    );
};

const MainApp = ({ initialView }) => {
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
    const [isAIChatActive, setIsAIChatActive] = useState(initialView === 'ai');
    const [showPeerConnect, setShowPeerConnect] = useState(initialView === 'peer-chat');
    const [notifications, setNotifications] = useState([]);
    const [showTutorial, setShowTutorial] = useState(true);

    useEffect(() => {
        document.body.className = theme.config.initialColorMode;
        document.documentElement.setAttribute('data-theme', theme.config.initialColorMode);
    }, [theme.config.initialColorMode]);

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
        
        // Set initial view based on prop
        if (initialView === 'peer-chat') {
            setShowPeerConnect(true);
        } else if (initialView === 'ai') {
            setIsAIChatActive(true);
        }
        
        return () => {
            webrtcService.disconnect();
        };
    }, [initialView]);

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
        if (!isAiInitialized) {
            setShowSettings(true);
            addNotification('Please configure AI settings to start chatting', 'info');
        }
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
            <div className={`app loading ${theme.config.initialColorMode}`}>
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
            <ErrorScreen error={error} onRetry={handleRetry} />
        );
    }

    if (isLoading) {
        return <LoadingScreen networkStatus={networkStatus} />;
    }

    return (
        <div className={`app ${theme.config.initialColorMode}`}>
            {isLoading ? (
                <LoadingScreen networkStatus={networkStatus} />
            ) : error ? (
                <ErrorScreen error={error} onRetry={handleRetry} />
            ) : (
                <div className="app-container">
                    <Sidebar
                        currentUser={currentUser}
                        onPeerSelect={handlePeerSelect}
                        onAIChatSelect={handleAIChatSelect}
                        isAIChatActive={isAIChatActive}
                        theme={theme.config.initialColorMode}
                        onShowSettings={() => setShowSettings(true)}
                        showTutorial={showTutorial}
                        setShowTutorial={setShowTutorial}
                        showPeerConnect={showPeerConnect}
                    />
                    <div className="main-content">
                        <Suspense fallback={<div className="loading-container"><div className="loading-spinner"></div></div>}>
                            <Routes>
                                <Route path="/" element={<Dashboard currentUser={currentUser} />} />
                                <Route path="/chat" element={
                                    selectedPeer ? (
                                        <Chat currentUser={currentUser} selectedPeer={selectedPeer} />
                                    ) : isAIChatActive ? (
                                        <AIChat />
                                    ) : (
                                        <Navigate to="/app" />
                                    )
                                } />
                                <Route path="/ai" element={<AIChat />} />
                                <Route path="/github" element={<GitHubHome />} />
                                <Route path="/github/integration" element={<GitHubIntegration />} />
                            </Routes>
                        </Suspense>
                        
                        {/* Peer Connect Modal */}
                        {showPeerConnect && !selectedPeer && !isAIChatActive && (
                            <div className="peer-connect-modal">
                                <div className="peer-connect-content">
                                    <h2>Connect with Peers</h2>
                                    <p>Your Peer ID: <strong>{currentUser?.id || 'Not available'}</strong></p>
                                    <p>Share your Peer ID with others to let them connect with you.</p>
                                    
                                    <div className="peer-connect-form">
                                        <input 
                                            type="text" 
                                            placeholder="Enter Peer ID to connect" 
                                            className="peer-id-input" 
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handlePeerSelect(e.target.value);
                                                    setShowPeerConnect(false);
                                                }
                                            }}
                                        />
                                        <button 
                                            className="connect-button"
                                            onClick={(e) => {
                                                const peerIdInput = e.target.previousSibling;
                                                if (peerIdInput && peerIdInput.value) {
                                                    handlePeerSelect(peerIdInput.value);
                                                    setShowPeerConnect(false);
                                                }
                                            }}
                                        >
                                            Connect
                                        </button>
                                    </div>
                                    
                                    <button 
                                        className="cancel-button"
                                        onClick={() => setShowPeerConnect(false)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const App = () => {
    return (
        <ChakraProvider theme={theme}>
            <Router>
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/app/*" element={<MainApp />} />
                    <Route path="/chat" element={
                        <Suspense fallback={<div className="loading-container"><div className="loading-spinner"></div></div>}>
                            <AIChat />
                        </Suspense>
                    } />
                    <Route path="/peer-chat" element={
                        <Suspense fallback={<div className="loading-container"><div className="loading-spinner"></div></div>}>
                            <MainApp initialView="peer-chat" />
                        </Suspense>
                    } />
                </Routes>
            </Router>
        </ChakraProvider>
    );
};

export default App;