import React, { useEffect, useState } from 'react';
import { useCallback } from 'react';
import Particles from 'react-tsparticles';

export const ParticleBackground = () => {
    const particlesInit = useCallback(async (engine) => {
        await engine.init();
    }, []);

    return (
        <Particles
            id="particles-js"
            init={particlesInit}
            options={{
                fullScreen: {
                    enable: true,
                    zIndex: -1
                },
                fpsLimit: 60,
                particles: {
                    number: {
                        value: 80,
                        density: {
                            enable: true,
                            value_area: 800
                        }
                    },
                    color: {
                        value: "#0f9afe"
                    },
                    shape: {
                        type: "circle"
                    },
                    opacity: {
                        value: 0.5,
                        random: false
                    },
                    size: {
                        value: 3,
                        random: true
                    },
                    links: {
                        enable: true,
                        distance: 150,
                        color: "#0f9afe",
                        opacity: 0.4,
                        width: 1
                    },
                    move: {
                        enable: true,
                        speed: 2,
                        direction: "none",
                        random: false,
                        straight: false,
                        out_mode: "out",
                        bounce: false,
                    }
                },
                interactivity: {
                    detect_on: "canvas",
                    events: {
                        onhover: {
                            enable: true,
                            mode: "repulse"
                        },
                        resize: true
                    },
                    modes: {
                        repulse: {
                            distance: 100,
                            duration: 0.4
                        }
                    }
                },
                retina_detect: true
            }}
        />
    );
};

export const StatsSection = () => {
    const [stats, setStats] = useState({
        users: 0,
        messages: 0,
        uptime: 0,
        aiInteractions: 0,
        dataEncrypted: 0,
        responseTime: 0
    });

    useEffect(() => {
        // Animate numbers
        const interval = setInterval(() => {
            setStats(prev => ({
                users: prev.users < 1000 ? prev.users + 5 : 1000,
                messages: prev.messages < 5000 ? prev.messages + 25 : 5000,
                uptime: prev.uptime < 99 ? prev.uptime + 1 : 99,
                aiInteractions: prev.aiInteractions < 2000 ? prev.aiInteractions + 10 : 2000,
                dataEncrypted: prev.dataEncrypted < 10 ? prev.dataEncrypted + 0.05 : 10,
                responseTime: prev.responseTime < 100 ? prev.responseTime + 1 : 100
            }));
        }, 50);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="stats-section">
            <div className="stat-card">
                <div className="stat-number">{stats.users.toLocaleString()}+</div>
                <div className="stat-label">Active Users</div>
            </div>
            <div className="stat-card">
                <div className="stat-number">{stats.messages.toLocaleString()}+</div>
                <div className="stat-label">Messages Sent</div>
            </div>
            <div className="stat-card">
                <div className="stat-number">{stats.uptime}%</div>
                <div className="stat-label">Uptime</div>
            </div>
            <div className="stat-card">
                <div className="stat-number">{stats.aiInteractions.toLocaleString()}+</div>
                <div className="stat-label">AI Interactions</div>
            </div>
            <div className="stat-card">
                <div className="stat-number">{stats.dataEncrypted.toFixed(1)}TB</div>
                <div className="stat-label">Data Encrypted</div>
            </div>
            <div className="stat-card">
                <div className="stat-number">{stats.responseTime}ms</div>
                <div className="stat-label">Avg Response Time</div>
            </div>
        </div>
    );
};

export const FeatureComparison = () => {
    return (
        <div className="feature-comparison">
            <table className="comparison-table">
                <thead>
                    <tr>
                        <th>Features</th>
                        <th>EchoLink</th>
                        <th>Others</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>End-to-End Encryption</td>
                        <td><span className="feature-check">✓</span></td>
                        <td><span className="feature-cross">✗</span></td>
                    </tr>
                    <tr>
                        <td>Decentralized</td>
                        <td><span className="feature-check">✓</span></td>
                        <td><span className="feature-cross">✗</span></td>
                    </tr>
                    <tr>
                        <td>Real-time Chat</td>
                        <td><span className="feature-check">✓</span></td>
                        <td><span className="feature-check">✓</span></td>
                    </tr>
                    <tr>
                        <td>File Sharing</td>
                        <td><span className="feature-check">✓</span></td>
                        <td><span className="feature-check">✓</span></td>
                    </tr>
                    <tr>
                        <td>GitHub Integration</td>
                        <td><span className="feature-check">✓</span></td>
                        <td><span className="feature-cross">✗</span></td>
                    </tr>
                    <tr>
                        <td>Code Collaboration</td>
                        <td><span className="feature-check">✓</span></td>
                        <td><span className="feature-cross">✗</span></td>
                    </tr>
                    <tr>
                        <td>Open Source</td>
                        <td><span className="feature-check">✓</span></td>
                        <td><span className="feature-cross">✗</span></td>
                    </tr>
                </tbody>
            </table>
            <div className="comparison-note">
                <p>EchoLink is the only chat platform that seamlessly integrates with GitHub, allowing developers to discuss code, review pull requests, and collaborate in real-time.</p>
            </div>
        </div>
    );
};

export const FloatingChatPreview = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages] = useState([
        { text: "Hey! Welcome to EchoLink!", sender: "bot" },
        { text: "Experience real-time, secure chat.", sender: "bot" },
        { text: "How does it work?", sender: "user" },
        { text: "We use P2P technology for direct, encrypted communication!", sender: "bot" }
    ]);

    return (
        <>
            <div className="floating-chat-preview" onClick={() => setIsOpen(!isOpen)}>
                <div className="floating-chat-icon">💬</div>
            </div>
            <div className={`chat-popup ${isOpen ? 'active' : ''}`}>
                <div className="chat-popup-header">
                    <span>Live Demo</span>
                    <button onClick={() => setIsOpen(false)}>×</button>
                </div>
                <div className="chat-popup-messages">
                    {messages.map((msg, index) => (
                        <div key={index} className={`preview-message ${msg.sender}`}>
                            {msg.text}
                        </div>
                    ))}
                </div>
                <div className="chat-popup-input">
                    <input type="text" placeholder="Type a message..." disabled />
                    <button disabled>Send</button>
                </div>
            </div>
        </>
    );
};