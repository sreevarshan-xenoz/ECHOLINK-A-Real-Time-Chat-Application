import React from 'react';
import './Landing.css';

const LandingGitHubFeatures = () => {
    return (
        <div className="github-features-section scroll-animate">
            <h2>Code Collaboration</h2>
            <p className="section-description">
                Seamlessly integrate your GitHub repositories with ECHOLINK for enhanced code collaboration and real-time discussions.
            </p>
            
            <div className="github-features-grid">
                <div className="github-feature-card scroll-animate" style={{animationDelay: '0.1s'}}>
                    <div className="feature-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="#0f9afe">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                    </div>
                    <h3>Repository Integration</h3>
                    <p>Connect your GitHub repositories directly to ECHOLINK for seamless code discussions and reviews</p>
                </div>
                
                <div className="github-feature-card scroll-animate" style={{animationDelay: '0.3s'}}>
                    <div className="feature-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="#0f9afe">
                            <path d="M7.5 5.6L5 7L6.4 4.5L5 2L7.5 3.4L10 2L8.6 4.5L10 7L7.5 5.6M19.5 15.4L22 14L20.6 16.5L22 19L19.5 17.6L17 19L18.4 16.5L17 14L19.5 15.4M22 2L20.6 4.5L22 7L19.5 5.6L17 7L18.4 4.5L17 2L19.5 3.4L22 2M13.34 12.78L15.78 10.34L13.66 8.22L11.22 10.66L13.34 12.78M14.37 7.29L16.71 9.63C17.1 10 17.1 10.65 16.71 11.04L5.04 22.71C4.65 23.1 4 23.1 3.63 22.71L1.29 20.37C0.9 20 0.9 19.35 1.29 18.96L12.96 7.29C13.35 6.9 14 6.9 14.37 7.29Z"/>
                        </svg>
                    </div>
                    <h3>Code Editor</h3>
                    <p>Browse, edit, and commit code changes directly from ECHOLINK with our integrated code editor</p>
                </div>
                
                <div className="github-feature-card scroll-animate" style={{animationDelay: '0.5s'}}>
                    <div className="feature-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="#0f9afe">
                            <path d="M18,8H6V6H18V8M18,11H6V9H18V11M18,14H6V12H18V14M22,4A2,2 0 0,0 20,2H4A2,2 0 0,0 2,4V16A2,2 0 0,0 4,18H18L22,22V4Z"/>
                        </svg>
                    </div>
                    <h3>Pull Request Discussions</h3>
                    <p>Discuss pull requests in real-time with team members to streamline code reviews</p>
                </div>
                
                <div className="github-feature-card scroll-animate" style={{animationDelay: '0.7s'}}>
                    <div className="feature-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="#0f9afe">
                            <path d="M2.81,14.12L5.64,11.29L8.17,10.79C11.39,6.41 17.55,4.22 19.78,4.22C19.78,6.45 17.59,12.61 13.21,15.83L12.71,18.36L9.88,21.19L9.17,17.66C7.76,17.66 7.76,17.66 7.05,16.95C6.34,16.24 6.34,16.24 6.34,14.83L2.81,14.12M5.64,16.95L7.05,18.36L4.39,21.03H2.97V19.61L5.64,16.95M4.22,15.54L5.46,15.71L3,18.16V16.74L4.22,15.54M8.29,18.54L8.46,19.78L7.26,21H5.84L8.29,18.54M13,9.5A1.5,1.5 0 0,0 11.5,11A1.5,1.5 0 0,0 13,12.5A1.5,1.5 0 0,0 14.5,11A1.5,1.5 0 0,0 13,9.5Z"/>
                        </svg>
                    </div>
                    <h3>Issue Tracking</h3>
                    <p>Track and discuss GitHub issues directly within your chat conversations</p>
                </div>
            </div>
            
            <div className="github-cta scroll-animate">
                <button className="github-cta-button">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#ffffff" style={{marginRight: '10px'}}>
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    Explore GitHub Integration
                </button>
            </div>
        </div>
    );
};

export default LandingGitHubFeatures;