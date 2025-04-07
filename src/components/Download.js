import React from 'react';
import './Download.css';

const Download = () => {
    const features = [
        {
            title: 'Real-Time Chat',
            description: 'Experience seamless real-time communication with peers and AI assistance',
            icon: '💬'
        },
        {
            title: 'AI Integration',
            description: 'Smart AI-powered features to enhance your chat experience',
            icon: '🤖'
        },
        {
            title: 'Secure P2P',
            description: 'End-to-end encrypted peer-to-peer communication',
            icon: '🔒'
        },
        {
            title: 'Cross-Platform',
            description: 'Available on Windows, macOS, and Linux',
            icon: '🖥️'
        }
    ];

    const downloadOptions = [
        {
            platform: 'Windows',
            version: 'v1.0.0',
            icon: '🪟',
            fileName: 'echolink-windows-x64.exe'
        },
        {
            platform: 'macOS',
            version: 'v1.0.0',
            icon: '🍎',
            fileName: 'echolink-macos.dmg'
        },
        {
            platform: 'Linux',
            version: 'v1.0.0',
            icon: '🐧',
            fileName: 'echolink-linux.AppImage'
        }
    ];

    const handleDownload = (platform, fileName) => {
        // Implement actual download logic here
        console.log(`Downloading ${fileName} for ${platform}`);
    };

    return (
        <div className="download-container">
            <div className="download-header">
                <h1>Download EchoLink</h1>
                <p>Choose your platform and start chatting today</p>
            </div>

            <div className="download-options">
                {downloadOptions.map((option, index) => (
                    <div key={index} className="download-card">
                        <div className="platform-icon">{option.icon}</div>
                        <h2>{option.platform}</h2>
                        <p className="version">{option.version}</p>
                        <button
                            className="download-button"
                            onClick={() => handleDownload(option.platform, option.fileName)}
                        >
                            Download for {option.platform}
                        </button>
                    </div>
                ))}
            </div>

            <div className="features-section">
                <h2>Why Choose EchoLink?</h2>
                <div className="features-grid">
                    {features.map((feature, index) => (
                        <div key={index} className="feature-card">
                            <div className="feature-icon">{feature.icon}</div>
                            <h3>{feature.title}</h3>
                            <p>{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="system-requirements">
                <h2>System Requirements</h2>
                <div className="requirements-grid">
                    <div className="requirement-item">
                        <h3>Windows</h3>
                        <ul>
                            <li>Windows 10 or later</li>
                            <li>4GB RAM minimum</li>
                            <li>500MB free disk space</li>
                        </ul>
                    </div>
                    <div className="requirement-item">
                        <h3>macOS</h3>
                        <ul>
                            <li>macOS 10.15 or later</li>
                            <li>4GB RAM minimum</li>
                            <li>500MB free disk space</li>
                        </ul>
                    </div>
                    <div className="requirement-item">
                        <h3>Linux</h3>
                        <ul>
                            <li>Ubuntu 20.04 or equivalent</li>
                            <li>4GB RAM minimum</li>
                            <li>500MB free disk space</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Download;