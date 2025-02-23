import React, { useState, useEffect } from 'react';
import { webrtcService } from '../services/webrtc-service';
import './Sidebar.css';

const Sidebar = ({ onPeerSelect, currentUser }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [peers, setPeers] = useState([]);
    const [selectedPeerId, setSelectedPeerId] = useState(null);
    const [connectInput, setConnectInput] = useState('');
    const [copied, setCopied] = useState(false);

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
        onPeerSelect(peerId);
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

    return (
        <div className="sidebar glass-container">
            <div className="sidebar-header">
                <div className="user-profile">
                    <div className="user-profile-info">
                        <div className="user-avatar">
                            {getInitials(currentUser.id)}
                        </div>
                        <div className="user-details">
                            <span className="user-name">Your ID</span>
                            <span className="user-status">
                                <span className="status-indicator status-online"></span>
                                Online
                            </span>
                        </div>
                    </div>
                    <button 
                        onClick={handleCopyId}
                        className="copy-button"
                    >
                        {copied ? '✓ Copied' : '📋 Copy ID'}
                    </button>
                </div>
            </div>

            <div className="connect-container">
                <form onSubmit={handleConnect}>
                    <input
                        type="text"
                        value={connectInput}
                        onChange={(e) => setConnectInput(e.target.value)}
                        placeholder="Enter peer ID to connect"
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
        </div>
    );
};

export default Sidebar; 