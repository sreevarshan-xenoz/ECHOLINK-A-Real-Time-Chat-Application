import React from 'react';

const GitHubFeatureCards = () => {
  return (
    <div className="github-features">
      <div className="feature-card">
        <div className="feature-icon">📁</div>
        <h4>Repository Access</h4>
        <p>Browse and search all your GitHub repositories directly from ECHOLINK</p>
      </div>
      
      <div className="feature-card">
        <div className="feature-icon">💻</div>
        <h4>Code Viewing & Editing</h4>
        <p>View and edit code files with syntax highlighting and automatic saving</p>
      </div>
      
      <div className="feature-card">
        <div className="feature-icon">👥</div>
        <h4>Collaborative Editing</h4>
        <p>Edit code files together in real-time with your connected peers</p>
      </div>
      
      <div className="feature-card">
        <div className="feature-icon">📊</div>
        <h4>Repository Analytics</h4>
        <p>See detailed analytics about your repositories including commit activity</p>
      </div>
      
      <div className="feature-card">
        <div className="feature-icon">🔄</div>
        <h4>Commit Changes</h4>
        <p>Make changes to your code and commit them directly to GitHub</p>
      </div>
      
      <div className="feature-card">
        <div className="feature-icon">🔍</div>
        <h4>Search & Filter</h4>
        <p>Find repositories and files quickly with powerful search capabilities</p>
      </div>
    </div>
  );
};

export default GitHubFeatureCards;