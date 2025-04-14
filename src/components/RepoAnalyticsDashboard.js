import React, { useState, useEffect } from 'react';
import { githubService } from '../services/github-service';
import './RepoAnalyticsDashboard.css';

const RepoAnalyticsDashboard = ({ repo }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        setError(null);
        
        const commitActivity = await githubService.getCommitActivity(repo.owner.login, repo.name);
        const contributorStats = await githubService.getContributorStats(repo.owner.login, repo.name);
        
        setStats({ commitActivity, contributorStats });
      } catch (err) {
        console.error('Error fetching repository statistics:', err);
        setError('Failed to load repository statistics');
      } finally {
        setLoading(false);
      }
    }
    
    if (repo) {
      fetchStats();
    }
  }, [repo]);
  
  if (!repo) return null;
  
  if (loading) {
    return <div className="loading-indicator">Loading repository statistics...</div>;
  }
  
  if (error) {
    return <div className="error-message">{error}</div>;
  }
  
  return (
    <div className="repo-analytics-dashboard">
      <h3>Repository Analytics</h3>
      
      <div className="analytics-section">
        <h4>Commit Activity</h4>
        {stats?.commitActivity ? (
          <div className="commit-activity-chart">
            {/* Simple visualization of commit activity */}
            <div className="chart-container">
              {stats.commitActivity.slice(0, 12).map((week, index) => (
                <div key={index} className="chart-bar-container">
                  <div 
                    className="chart-bar" 
                    style={{ height: `${Math.min(100, week.total * 5)}px` }}
                    title={`${week.total} commits`}
                  ></div>
                  <div className="chart-label">{index + 1}</div>
                </div>
              ))}
            </div>
            <div className="chart-legend">Weeks (most recent 12)</div>
          </div>
        ) : (
          <p>No commit activity data available</p>
        )}
      </div>
      
      <div className="analytics-section">
        <h4>Contributors</h4>
        {stats?.contributorStats && stats.contributorStats.length > 0 ? (
          <div className="contributors-list">
            {stats.contributorStats
              .sort((a, b) => b.total - a.total)
              .slice(0, 5)
              .map((contributor, index) => (
                <div key={index} className="contributor-item">
                  <img 
                    src={contributor.author.avatar_url} 
                    alt={contributor.author.login}
                    className="contributor-avatar"
                  />
                  <div className="contributor-info">
                    <div className="contributor-name">{contributor.author.login}</div>
                    <div className="contributor-commits">{contributor.total} commits</div>
                  </div>
                  <div 
                    className="contributor-bar" 
                    style={{ 
                      width: `${Math.min(100, (contributor.total / stats.contributorStats[0].total) * 100)}%` 
                    }}
                  ></div>
                </div>
              ))}
          </div>
        ) : (
          <p>No contributor data available</p>
        )}
      </div>
    </div>
  );
};

export default RepoAnalyticsDashboard;