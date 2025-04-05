import React, { useState, useEffect } from 'react';
import { saveUserProfile, getUserProfile } from '../services/supabase-service';
import './Profile.css';

const Profile = ({ currentUser, onClose, onProfileUpdate }) => {
    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [customAvatar, setCustomAvatar] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
        const loadProfile = async () => {
            // Try to load profile from Supabase first
            if (currentUser?.id) {
                const { profile } = await getUserProfile(currentUser.id);
                if (profile) {
                    setDisplayName(profile.displayName || '');
                    setAvatarUrl(profile.avatarUrl || '');
                    setPreviewUrl(profile.avatarUrl || '');
                    return;
                }
            }
            
            // Fall back to localStorage if Supabase data not available
            const savedProfile = JSON.parse(localStorage.getItem('user_profile')) || {};
            if (savedProfile.displayName) {
                setDisplayName(savedProfile.displayName);
            } else {
                // Set default display name based on user ID
                setDisplayName(`User-${currentUser?.id?.substring(0, 6)}`);
            }
            if (savedProfile.avatarUrl) {
                setAvatarUrl(savedProfile.avatarUrl);
                setPreviewUrl(savedProfile.avatarUrl);
            }
        };
        
        loadProfile();
    }, [currentUser]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type.startsWith('image/')) {
            setCustomAvatar(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreviewUrl(e.target.result);
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please select an image file');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const profileData = {
                displayName: displayName.trim() || `User-${currentUser?.id?.substring(0, 6)}`,
                avatarUrl: previewUrl || ''
            };
            
            // Save to localStorage as fallback
            localStorage.setItem('user_profile', JSON.stringify(profileData));
            
            // Save to Supabase if user is logged in
            if (currentUser?.id) {
                await saveUserProfile(currentUser.id, profileData);
            }
            
            // Notify parent component about the update
            if (onProfileUpdate) {
                onProfileUpdate(profileData);
            }
            
            onClose();
        } catch (error) {
            console.error('Failed to save profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const avatarOptions = [
        '👤', '👩', '👨', '👧', '👦', '👵', '👴', '👱‍♀️', '👱', '👸', 
        '🤴', '👰', '🤵', '👼', '🙍‍♀️', '🙍', '🙎‍♀️', '🙎', '🙅‍♀️', '🙅'
    ];

    return (
        <div className="profile-container">
            <div className="profile-header">
                <h2>Edit Your Profile</h2>
                <button className="close-button" onClick={onClose}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="profile-form">
                <div className="avatar-preview">
                    {previewUrl ? (
                        <img src={previewUrl} alt="Profile Preview" className="avatar-image" />
                    ) : (
                        <div className="avatar-placeholder">
                            {displayName ? displayName.charAt(0).toUpperCase() : '👤'}
                        </div>
                    )}
                </div>
                
                <div className="form-group">
                    <label>Display Name:</label>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your display name"
                        className="display-name-input"
                    />
                </div>

                <div className="form-group">
                    <label>Upload Profile Picture:</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="file-input"
                    />
                </div>

                <div className="form-group">
                    <label>Or Choose an Avatar:</label>
                    <div className="avatar-options">
                        {avatarOptions.map((avatar, index) => (
                            <button
                                key={index}
                                type="button"
                                className={`avatar-option ${!previewUrl && avatar === avatarUrl ? 'selected' : ''}`}
                                onClick={() => {
                                    setAvatarUrl(avatar);
                                    setPreviewUrl('');
                                    setCustomAvatar(null);
                                }}
                            >
                                {avatar}
                            </button>
                        ))}
                    </div>
                </div>

                <button 
                    type="submit" 
                    className="save-button" 
                    disabled={isLoading}
                >
                    {isLoading ? 'Saving...' : 'Save Profile'}
                </button>
            </form>
        </div>
    );
};

export default Profile;