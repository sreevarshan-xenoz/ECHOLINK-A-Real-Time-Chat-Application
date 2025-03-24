import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

const Landing = () => {
    useEffect(() => {
        // Add scroll animation observer
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, { threshold: 0.1 });

        // Observe all elements with animation class
        document.querySelectorAll('.scroll-animate').forEach(el => {
            observer.observe(el);
        });

        return () => {
            // Clean up
            document.querySelectorAll('.scroll-animate').forEach(el => {
                observer.unobserve(el);
            });
        };
    }, []);

    return (
        <div className="landing-container">
            <div className="landing-content">
                <div className="landing-header scroll-animate">
                    <h1>ECHOLINK</h1>
                    <p className="tagline">Secure, Real-Time Communication</p>
                </div>
                
                <div className="features">
                    <div className="feature-card scroll-animate">
                        <div className="feature-icon">🔒</div>
                        <h3>End-to-End Encryption</h3>
                        <p>Your conversations are secured with state-of-the-art encryption</p>
                    </div>
                    <div className="feature-card scroll-animate" style={{animationDelay: '0.2s'}}>
                        <div className="feature-icon">⚡</div>
                        <h3>Real-Time Chat</h3>
                        <p>Instant messaging with no delays or interruptions</p>
                    </div>
                    <div className="feature-card scroll-animate" style={{animationDelay: '0.4s'}}>
                        <div className="feature-icon">🤖</div>
                        <h3>AI-Powered Assistant</h3>
                        <p>Get help and answers with our integrated AI chat</p>
                    </div>
                </div>
                
                <div className="about-section scroll-animate">
                    <h2>About ECHOLINK</h2>
                    <p className="about-description">
                        ECHOLINK is a cutting-edge communication platform designed for secure, efficient, and 
                        feature-rich conversations. Built with privacy at its core, it combines the power of 
                        WebRTC technology with modern AI capabilities.
                    </p>
                    
                    <div className="timeline">
                        <div className="timeline-item scroll-animate" style={{animationDelay: '0.1s'}}>
                            <div className="timeline-icon">🚀</div>
                            <div className="timeline-content">
                                <h4>Launched in 2025</h4>
                                <p>Bringing secure chat to everyone</p>
                            </div>
                        </div>
                        <div className="timeline-item scroll-animate" style={{animationDelay: '0.3s'}}>
                            <div className="timeline-icon">💡</div>
                            <div className="timeline-content">
                                <h4>Innovative Technology</h4>
                                <p>Using WebRTC for direct peer connections</p>
                            </div>
                        </div>
                        <div className="timeline-item scroll-animate" style={{animationDelay: '0.5s'}}>
                            <div className="timeline-icon">🔐</div>
                            <div className="timeline-content">
                                <h4>Privacy Focused</h4>
                                <p>No tracking, no data storage, just secure communication</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="creator-section scroll-animate">
                    <h2>Created By</h2>
                    <div className="creator-profile">
                        <div className="creator-avatar">👨‍💻</div>
                        <h3>SREE VARSHAN V</h3>
                        <p>Developer & Designer</p>
                    </div>
                </div>
                
                <div className="cta-container scroll-animate">
                    <Link to="/chat" className="cta-button">Start Chatting</Link>
                </div>
                
                <div className="landing-footer scroll-animate">
                    <p>© 2024 ECHOLINK - Secure Communications</p>
                </div>
            </div>
        </div>
    );
};

export default Landing; 