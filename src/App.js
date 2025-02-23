import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import { webrtcService } from './services/webrtc-service';
import { fileService } from './services/file-service';
import './App.css';

const App = () => {
    const [selectedPeer, setSelectedPeer] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [networkStatus, setNetworkStatus] = useState({
        webrtc: false,
        stun: false
    });
    
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
    };

    if (isLoading) {
        return (
            <div className="app loading">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <div className="loading-status">
                        <h2>Echo Link</h2>
                        <p>Initializing secure connection...</p>
                        <div className="status-items">
                            <div className={`status-item ${networkStatus.webrtc ? 'connected' : ''}`}>
                                WebRTC {networkStatus.webrtc ? '✓' : '...'}
                            </div>
                            <div className={`status-item ${networkStatus.stun ? 'connected' : ''}`}>
                                STUN {networkStatus.stun ? '✓' : '...'}
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
                <h1>Echo Link</h1>
            </div>
            <div className="app-content">
                <Sidebar
                    onPeerSelect={handlePeerSelect}
                    currentUser={currentUser}
                />
                <Chat
                    currentUser={currentUser}
                    selectedPeer={selectedPeer}
                />
            </div>
        </div>
    );
};

export default App; 