import React, { useState } from 'react';
import './ConnectionDialog.css';

const ConnectionDialog = ({ myAddresses, onConnect }) => {
    const [peerAddress, setPeerAddress] = useState('');
    const [error, setError] = useState('');

    const handleConnect = async (e) => {
        e.preventDefault();
        setError('');
        
        try {
            await onConnect(peerAddress);
            setPeerAddress('');
        } catch (err) {
            setError('Failed to connect: ' + err.message);
        }
    };

    return (
        <div className="connection-dialog">
            <div className="my-addresses">
                <h3>My Addresses:</h3>
                <div className="address-list">
                    {myAddresses.map((addr, index) => (
                        <div key={index} className="address-item">
                            <code>{addr}</code>
                            <button
                                onClick={() => navigator.clipboard.writeText(addr)}
                                className="copy-button"
                            >
                                Copy
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <form onSubmit={handleConnect} className="connect-form">
                <h3>Connect to Peer:</h3>
                <input
                    type="text"
                    value={peerAddress}
                    onChange={(e) => setPeerAddress(e.target.value)}
                    placeholder="Enter peer multiaddr"
                    className="peer-input"
                />
                <button type="submit" className="connect-button">
                    Connect
                </button>
                {error && <div className="error-message">{error}</div>}
            </form>
        </div>
    );
};

export default ConnectionDialog; 