import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { supabase } from '../services/supabase-service';
import { Link } from 'react-router-dom';
import GitHubIntegration from './GitHubIntegration';
import GitHubFeatureCards from './GitHubFeatureCards';
import aiService from '../services/ai-service';

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState(null);
    const [theme, setTheme] = useState('light');
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });
    const [chatPreferences, setChatPreferences] = useState({
        messageDensity: 'comfortable',
        fontSize: 'medium',
        showTimestamps: true,
        enableEmojis: true,
        enableSounds: true
    });
    const [aiSettings, setAiSettings] = useState({
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 2000
    });
    const [accessibility, setAccessibility] = useState({
        highContrast: false,
        reducedMotion: false,
        fontSize: 'medium'
    });

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                
                if (profile) {
                    setName(profile.full_name || '');
                    setTheme(profile.theme || 'light');
                    if (profile.chat_preferences) setChatPreferences(profile.chat_preferences);
                    if (profile.ai_settings) setAiSettings(profile.ai_settings);
                    if (profile.accessibility) setAccessibility(profile.accessibility);
                }
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            showNotification('Error fetching profile', 'error');
        } finally {
            setLoading(false);
        }
    };

    const updateProfile = async () => {
        try {
            setLoading(true);
            const updates = {
                id: user.id,
                full_name: name,
                theme: theme,
                chat_preferences: chatPreferences,
                ai_settings: aiSettings,
                accessibility: accessibility,
                updated_at: new Date()
            };

            const { error } = await supabase
                .from('profiles')
                .upsert(updates);

            if (error) throw error;
            showNotification('Profile updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating profile:', error);
            showNotification('Error updating profile', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarChange = async (event) => {
        try {
            setLoading(true);
            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { error: updateError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    avatar_url: fileName,
                    updated_at: new Date()
                });

            if (updateError) throw updateError;
            setAvatar(URL.createObjectURL(file));
            showNotification('Avatar updated successfully!', 'success');
        } catch (error) {
            console.error('Error uploading avatar:', error);
            showNotification('Error uploading avatar', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showNotification = (message, type) => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
                <p>Loading profile...</p>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-nav">
                <Link to="/chat" className="nav-link">← Back to Chat</Link>
            </div>
            
            <div className="dashboard-header">
                <h1>User Dashboard</h1>
                <p>Manage your profile and preferences</p>
            </div>

            <div className="dashboard-content">
                <div className="profile-section">
                    <h2>Profile Settings</h2>
                    <div className="avatar-upload">
                        <img
                            src={avatar || 'default-avatar.png'}
                            alt="Profile"
                            className="profile-avatar"
                        />
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="avatar-input"
                            id="avatar-upload"
                        />
                        <label htmlFor="avatar-upload" className="upload-button">
                            Change Avatar
                        </label>
                    </div>

                    <div className="form-group">
                        <label>Display Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your display name"
                        />
                    </div>

                    <div className="form-group">
                        <label>Theme Preference</label>
                        <select
                            value={theme}
                            onChange={(e) => setTheme(e.target.value)}
                        >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="system">System Default</option>
                        </select>
                    </div>
                </div>

                <div className="preferences-section">
                    <h2>Chat Preferences</h2>
                    <div className="form-group">
                        <label>Message Density</label>
                        <select
                            value={chatPreferences.messageDensity}
                            onChange={(e) => setChatPreferences(prev => ({
                                ...prev,
                                messageDensity: e.target.value
                            }))}
                        >
                            <option value="comfortable">Comfortable</option>
                            <option value="compact">Compact</option>
                            <option value="cozy">Cozy</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Font Size</label>
                        <select
                            value={chatPreferences.fontSize}
                            onChange={(e) => setChatPreferences(prev => ({
                                ...prev,
                                fontSize: e.target.value
                            }))}
                        >
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                        </select>
                    </div>

                    <div className="form-group checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={chatPreferences.showTimestamps}
                                onChange={(e) => setChatPreferences(prev => ({
                                    ...prev,
                                    showTimestamps: e.target.checked
                                }))}
                            />
                            Show Message Timestamps
                        </label>
                    </div>

                    <div className="form-group checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={chatPreferences.enableEmojis}
                                onChange={(e) => setChatPreferences(prev => ({
                                    ...prev,
                                    enableEmojis: e.target.checked
                                }))}
                            />
                            Enable Emoji Support
                        </label>
                    </div>

                    <div className="form-group checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={chatPreferences.enableSounds}
                                onChange={(e) => setChatPreferences(prev => ({
                                    ...prev,
                                    enableSounds: e.target.checked
                                }))}
                            />
                            Enable Sound Effects
                        </label>
                    </div>
                </div>

                <div className="ai-settings-section">
                    <h2>AI Assistant Settings</h2>
                    <div className="form-group">
                        <label>AI Model</label>
                        <select
                            value={aiSettings.model}
                            onChange={(e) => setAiSettings(prev => ({
                                ...prev,
                                model: e.target.value
                            }))}
                        >
                            <option value="gpt-4">GPT-4 (Premium)</option>
                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                            <option value="gemini-pro">Gemini Pro</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>AI Temperature (Creativity: 0-1)</label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={aiSettings.temperature}
                            onChange={(e) => setAiSettings(prev => ({
                                ...prev,
                                temperature: parseFloat(e.target.value)
                            }))}
                        />
                        <span className="range-value">{aiSettings.temperature}</span>
                    </div>

                    <div className="form-group">
                        <label>Max Response Length (Tokens)</label>
                        <select
                            value={aiSettings.maxTokens}
                            onChange={(e) => setAiSettings(prev => ({
                                ...prev,
                                maxTokens: parseInt(e.target.value)
                            }))}
                        >
                            <option value="1000">Short (1000)</option>
                            <option value="2000">Medium (2000)</option>
                            <option value="4000">Long (4000)</option>
                        </select>
                    </div>
                </div>

                <div className="accessibility-section">
                    <h2>Accessibility</h2>
                    <div className="form-group checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={accessibility.highContrast}
                                onChange={(e) => setAccessibility(prev => ({
                                    ...prev,
                                    highContrast: e.target.checked
                                }))}
                            />
                            High Contrast Mode
                        </label>
                    </div>

                    <div className="form-group checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={accessibility.reducedMotion}
                                onChange={(e) => setAccessibility(prev => ({
                                    ...prev,
                                    reducedMotion: e.target.checked
                                }))}
                            />
                            Reduced Motion
                        </label>
                    </div>

                    <div className="form-group">
                        <label>Font Size</label>
                        <select
                            value={accessibility.fontSize}
                            onChange={(e) => setAccessibility(prev => ({
                                ...prev,
                                fontSize: e.target.value
                            }))}
                        >
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                            <option value="x-large">Extra Large</option>
                        </select>
                    </div>
                </div>

                <div className="github-section">
                    <h2>Code Collaboration</h2>
                    <p>Connect with GitHub to collaborate on code, manage repositories, and review pull requests</p>
                    
                    <GitHubFeatureCards />
                    
                    <GitHubIntegration />
                </div>

                <button
                    className="save-button"
                    onClick={updateProfile}
                    disabled={loading}
                >
                    {loading ? 'Saving...' : 'Save All Changes'}
                </button>

                {notification.show && (
                    <div className={`notification ${notification.type}`}>
                        {notification.message}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;