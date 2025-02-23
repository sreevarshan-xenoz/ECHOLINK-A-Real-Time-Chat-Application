import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import { webrtcService } from './services/webrtc-service';
import './App.css';

const App = () => {
    const [selectedPeer, setSelectedPeer] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    
    useEffect(() => {
        // Set current user with WebRTC peer ID
        setCurrentUser({
            id: webrtcService.getPeerId()
        });
    }, []);

    const handlePeerSelect = (peerId) => {
        setSelectedPeer(peerId);
    };

    if (!currentUser) {
        return (
            <div className="app loading">
                <div className="loading-text">
                    Initializing WebRTC...
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            <Sidebar
                onPeerSelect={handlePeerSelect}
                currentUser={currentUser}
            />
            <Chat
                currentUser={currentUser}
                selectedPeer={selectedPeer}
            />
        </div>
    );
};

export default App; 