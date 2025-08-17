import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';
import { ParticleBackground, StatsSection, FeatureComparison, FloatingChatPreview } from './LandingFeatures';
import LandingGitHubFeatures from './LandingGitHubFeatures';
import Auth from './Auth';
import { getCurrentUser, signOut } from '../services/supabase-service';
import { Text, Box, useColorModeValue, Link as ChakraLink } from '@chakra-ui/react';

const FloatingCube = () => {
    const cubeRef = useRef(null);

    useEffect(() => {
        const cube = cubeRef.current;
        let rotateX = 0;
        let rotateY = 0;

        const handleMouseMove = (e) => {
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;
            
            rotateX = (clientY - innerHeight / 2) / 20;
            rotateY = (clientX - innerWidth / 2) / 20;
            
            cube.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="floating-cube" ref={cubeRef}>
            <div className="cube-face front"></div>
            <div className="cube-face back"></div>
            <div className="cube-face right"></div>
            <div className="cube-face left"></div>
            <div className="cube-face top"></div>
            <div className="cube-face bottom"></div>
        </div>
    );
};

const ChatPreview = () => {
    return (
        <div className="chat-preview">
            <div className="chat-preview-header">
                <div className="preview-avatar">👤</div>
                <div className="preview-status">Online</div>
            </div>
            <div className="chat-preview-messages">
                <div className="preview-message received">Hey there! 👋</div>
                <div className="preview-message sent">Hi! How are you?</div>
                <div className="preview-message received">I'm great! Let's chat securely!</div>
            </div>
            <div className="chat-preview-input">
                <input type="text" placeholder="Type a message..." disabled />
                <button disabled>Send</button>
            </div>
        </div>
    );
};

const Landing = () => {
    const [showPreview, setShowPreview] = useState(false);
    const [showAuth, setShowAuth] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const { user: currentUser } = await getCurrentUser();
        setUser(currentUser);
    };

    const handleAuthSuccess = (data) => {
        setUser(data.user);
        setShowAuth(false);
    };

    const handleSignOut = async () => {
        await signOut();
        setUser(null);
    };
    
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
            <ParticleBackground />
            <div className="landing-content">
                <FloatingCube />
                <div className="landing-header scroll-animate">
                    <h1>ECHOLINK</h1>
                    <p className="tagline">Secure, Real-Time Communication</p>
                    <div className="auth-buttons">
                        {user ? (
                            <>
                                <Link to="/chat" className="cta-button">Start Chatting in Web</Link>
                                <Link to="/download" className="auth-button">Download App</Link>
                                <Link to="/dashboard" className="auth-button">Dashboard</Link>
                                <button onClick={handleSignOut} className="auth-button">Sign Out</button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setShowAuth(true)} className="cta-button">Get Started</button>
                                <Link to="/download" className="auth-button">Download App</Link>
                            </>
                        )}
                    </div>
                    
                    <div className="echo-ai-section">
                        <Link 
                            to="/ai"
                            className="echo-ai-chat-button"
                        >
                            <span className="echo-ai-chat-button-icon">🤖</span>
                            Chat with Echo AI
                        </Link>
                    </div>
                </div>
                {showAuth && <Auth onAuthSuccess={handleAuthSuccess} />}
                
                <div className="features" id="features">
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
                
                <div className="demo-section scroll-animate">
                    <h2>See It In Action</h2>
                    <div className="demo-container">
                        <div className="demo-text">
                            <h3>Experience Real-Time Chat</h3>
                            <p>Try our interactive demo to see how ECHOLINK works. Secure, fast, and user-friendly.</p>
                            <button 
                                className="demo-button" 
                                onClick={() => setShowPreview(!showPreview)}
                            >
                                {showPreview ? 'Hide Demo' : 'Show Demo'}
                            </button>
                        </div>
                        {showPreview && <ChatPreview />}
                    </div>
                </div>

                <div className="about-section scroll-animate" id="about">
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
                

                
                <div className="ai-features-section scroll-animate">
                    <h2>AI-Powered Features</h2>
                    <div className="ai-features-grid">
                        <div className="ai-feature-card scroll-animate" style={{animationDelay: '0.1s'}}>
                            <div className="feature-icon">🧠</div>
                            <h3>Smart Replies</h3>
                            <p>Get intelligent response suggestions based on conversation context</p>
                        </div>
                        <div className="ai-feature-card scroll-animate" style={{animationDelay: '0.3s'}}>
                            <div className="feature-icon">😊</div>
                            <h3>Sentiment Analysis</h3>
                            <p>Understand the emotional tone of messages in real-time</p>
                        </div>
                        <div className="ai-feature-card scroll-animate" style={{animationDelay: '0.5s'}}>
                            <div className="feature-icon">🌍</div>
                            <h3>Language Translation</h3>
                            <p>Break language barriers with instant message translation</p>
                        </div>
                        <div className="ai-feature-card scroll-animate" style={{animationDelay: '0.7s'}}>
                            <div className="feature-icon">📝</div>
                            <h3>Message Completion</h3>
                            <p>Intelligent text completion as you type</p>
                        </div>
                    </div>
                </div>

                <LandingGitHubFeatures />

                <StatsSection />
                
                <div className="comparison-section scroll-animate">
                    <h2>Why Choose ECHOLINK?</h2>
                    <FeatureComparison />
                </div>

                <FloatingChatPreview />

            </div>
            
            {/* Professional Footer */}
            <footer className="professional-footer">
                <div className="footer-container">
                    {/* Main Footer Content */}
                    <div className="footer-main">
                        {/* Company Section */}
                        <div className="footer-section company-section">
                            <div className="footer-logo">
                                <div className="logo-icon">🔗</div>
                                <h3>ECHOLINK</h3>
                            </div>
                            <p className="company-description">
                                Secure, real-time communication platform designed for privacy-focused users. 
                                Connect, chat, and collaborate with end-to-end encryption.
                            </p>
                            <div className="social-links">
                                <a href="https://github.com/sreevarshan-xenoz/ECHOLINK-A-Real-Time-Chat-Application" 
                                   target="_blank" rel="noopener noreferrer" 
                                   className="social-link github">
                                    <span>GitHub</span>
                                </a>
                                <a href="https://twitter.com/echolink" 
                                   target="_blank" rel="noopener noreferrer" 
                                   className="social-link twitter">
                                    <span>Twitter</span>
                                </a>
                                <a href="https://linkedin.com/company/echolink" 
                                   target="_blank" rel="noopener noreferrer" 
                                   className="social-link linkedin">
                                    <span>LinkedIn</span>
                                </a>
                            </div>
                        </div>

                        {/* Product Section */}
                        <div className="footer-section">
                            <h4>Product</h4>
                            <ul>
                                <li><Link to="/#features">Features</Link></li>
                                <li><Link to="/ai">AI Assistant</Link></li>
                                <li><Link to="/download">Download</Link></li>
                                <li><Link to="/dashboard">Dashboard</Link></li>
                                <li><Link to="/github">GitHub Integration</Link></li>
                            </ul>
                        </div>

                        {/* Resources Section */}
                        <div className="footer-section">
                            <h4>Resources</h4>
                            <ul>
                                <li><Link to="/docs">Documentation</Link></li>
                                <li><Link to="/api">API Reference</Link></li>
                                <li><Link to="/tutorials">Tutorials</Link></li>
                                <li><Link to="/blog">Blog</Link></li>
                                <li><Link to="/changelog">Changelog</Link></li>
                            </ul>
                        </div>

                        {/* Company Section */}
                        <div className="footer-section">
                            <h4>Company</h4>
                            <ul>
                                <li><Link to="/#about">About Us</Link></li>
                                <li><Link to="/careers">Careers</Link></li>
                                <li><Link to="/contact">Contact</Link></li>
                                <li><Link to="/press">Press Kit</Link></li>
                                <li><Link to="/partners">Partners</Link></li>
                            </ul>
                        </div>

                        {/* Legal Section */}
                        <div className="footer-section">
                            <h4>Legal</h4>
                            <ul>
                                <li><Link to="/privacy">Privacy Policy</Link></li>
                                <li><Link to="/terms">Terms of Service</Link></li>
                                <li><Link to="/security">Security</Link></li>
                                <li><Link to="/cookies">Cookie Policy</Link></li>
                                <li><Link to="/gdpr">GDPR</Link></li>
                            </ul>
                        </div>
                    </div>

                    {/* Newsletter Signup */}
                    <div className="newsletter-section">
                        <div className="newsletter-content">
                            <div className="newsletter-text">
                                <h4>Stay Updated</h4>
                                <p>Get the latest updates, security tips, and feature announcements.</p>
                            </div>
                            <div className="newsletter-form">
                                <input 
                                    type="email" 
                                    placeholder="Enter your email"
                                    className="newsletter-input"
                                />
                                <button className="newsletter-button">
                                    Subscribe
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer Bottom */}
                    <div className="footer-bottom">
                        <div className="footer-bottom-content">
                            <div className="copyright">
                                © 2025 ECHOLINK. All rights reserved.
                            </div>
                            <div className="footer-meta">
                                <span>Made with ❤️ for secure communication</span>
                                <span className="divider">•</span>
                                <span>Version 1.0.0</span>
                            </div>
                            <div className="creator-credit">
                                <Text fontSize="sm" color="#a5b1c2">
                                    Enhanced by{' '}
                                    <ChakraLink 
                                        href="https://github.com/sreevarshan-xenoz" 
                                        isExternal
                                        color="var(--neon-blue)"
                                        textDecoration="none"
                                        _hover={{ textDecoration: 'underline' }}
                                    >
                                        SREE VARSHAN V
                                    </ChakraLink>
                                </Text>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;