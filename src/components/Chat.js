import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { webrtcService } from '../services/webrtc-service';
import aiService from '../services/ai-service';
import AISettings from './AISettings';
import Profile from './Profile';
import './Chat.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { v4 as uuidv4 } from 'uuid';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

const MessageItem = memo(({ message, onReaction }) => {
    return (
        <div className={`message ${message.sender === 'user' ? 'sent' : 'received'}`}>
            <div className="message-content">{message.text}</div>
            <div className="message-timestamp">{new Date(message.timestamp).toLocaleTimeString()}</div>
            <div className="message-reactions">
                {message.reactions?.map((reaction, index) => (
                    <span key={index} className="reaction">{reaction}</span>
                ))}
            </div>
        </div>
    );
});

const Chat = ({ 
    currentUser, 
    selectedPeer, 
    isAIChatActive,
    selectedAIModel,
    isAiInitialized,
    showSettings,
    setShowSettings,
    showTutorial,
    setShowTutorial,
    addNotification,
    theme,
    setTheme
}) => {
    const navigate = useNavigate();
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const completionTimeout = useRef(null);

    // State declarations
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [peers, setPeers] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [typingStatus, setTypingStatus] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [smartReplies, setSmartReplies] = useState([]);
    const [messageCompletion, setMessageCompletion] = useState('');
    const [sentiment, setSentiment] = useState(null);
    const [language, setLanguage] = useState(null);
    const [codeEditor, setCodeEditor] = useState({ visible: false, language: 'javascript', code: '' });
    const [sharedWorkspace, setSharedWorkspace] = useState(null);
    const [translatedMessages, setTranslatedMessages] = useState(new Map());
    const [userLanguage, setUserLanguage] = useState(navigator.language.split('-')[0]);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const [customEmojis, setCustomEmojis] = useState(['👍', '❤️', '😊', '😂', '👏', '🎉', '🔥', '🌟', '🎨', '🎮']);
    const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
    const [selectedMessageForReaction, setSelectedMessageForReaction] = useState(null);
    const [voiceTranscriptionEnabled, setVoiceTranscriptionEnabled] = useState(true);
    const [collaborativeEditingEnabled, setCollaborativeEditingEnabled] = useState(true);
    const [messageEditHistory, setMessageEditHistory] = useState(new Map());

    const handleBack = () => {
        navigate('/');
    };

    // Load user profile from localStorage on component mount
    useEffect(() => {
        const savedProfile = JSON.parse(localStorage.getItem('user_profile')) || null;
        if (savedProfile) {
            setUserProfile(savedProfile);
        } else {
            // Set default profile if none exists
            const defaultProfile = {
                displayName: `User-${currentUser?.id?.substring(0, 6)}`,
                avatarUrl: ''
            };
            setUserProfile(defaultProfile);
        }
    }, [currentUser?.id]);

    const handleProfileUpdate = (profileData) => {
        setUserProfile(profileData);
    };

    const handleTranslateMessage = async (messageId, text) => {
        if (translatedMessages.has(messageId)) {
            const newTranslatedMessages = new Map(translatedMessages);
            newTranslatedMessages.delete(messageId);
            setTranslatedMessages(newTranslatedMessages);
        } else {
            try {
                const translatedText = await aiService.translateText(text, userLanguage);
                const newTranslatedMessages = new Map(translatedMessages);
                newTranslatedMessages.set(messageId, translatedText);
                setTranslatedMessages(newTranslatedMessages);
            } catch (error) {
                console.error('Translation error:', error);
                addNotification('Failed to translate message', 'error');
            }
        }
    };

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const fileMessage = {
            id: uuidv4(),
            type: 'FILE_META',
            name: file.name,
            size: file.size,
            sender: currentUser.id,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, fileMessage]);
        if (!isAIChatActive && selectedPeer) {
            webrtcService.sendMessage(fileMessage, selectedPeer);
            await webrtcService.sendFile(file, selectedPeer);
        }

        event.target.value = '';
    };

    const handleReaction = (messageId, emoji) => {
        const reactionMessage = {
            type: 'REACTION',
            messageId,
            reaction: emoji,
            sender: currentUser.id,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => prev.map(msg =>
            msg.id === messageId
                ? { ...msg, reactions: [...(msg.reactions || []), emoji] }
                : msg
        ));

        if (!isAIChatActive && selectedPeer) {
            webrtcService.sendMessage(reactionMessage, selectedPeer);
        }
    };

    const handleCustomEmojiAdd = (emoji) => {
        if (!customEmojis.includes(emoji)) {
            setCustomEmojis(prev => [...prev, emoji]);
        }
        if (selectedMessageForReaction) {
            handleReaction(selectedMessageForReaction, emoji);
            setSelectedMessageForReaction(null);
            setEmojiPickerVisible(false);
        }
    };

    const handleVoiceTranscription = async (audioBlob) => {
        if (!voiceTranscriptionEnabled) return null;
        try {
            const transcription = await aiService.transcribeAudio(audioBlob);
            return transcription;
        } catch (error) {
            console.error('Transcription error:', error);
            addNotification('Failed to transcribe voice message', 'error');
            return null;
        }
    };

    const handleCollaborativeEdit = (messageId, newContent) => {
        if (!collaborativeEditingEnabled) return;
        
        const editHistory = messageEditHistory.get(messageId) || [];
        const editData = {
            timestamp: new Date().toISOString(),
            content: newContent,
            editor: currentUser.id
        };
        
        setMessageEditHistory(prev => {
            const newMap = new Map(prev);
            newMap.set(messageId, [...editHistory, editData]);
            return newMap;
        });

        setMessages(prev => prev.map(msg =>
            msg.id === messageId
                ? { ...msg, content: newContent }
                : msg
        ));

        if (!isAIChatActive && selectedPeer) {
            webrtcService.sendMessage({
                type: 'EDIT',
                messageId,
                content: newContent,
                editor: currentUser.id,
                timestamp: new Date().toISOString()
            }, selectedPeer);
        }
    };

    return (
        <div className="chat-container">
            <div className="chat-navigation">
                <button onClick={handleBack} className="back-button">← Back</button>
                <Link to="/dashboard" className="dashboard-link">Dashboard</Link>
                <Link to="/download" className="download-link">Download App</Link>
            </div>
            <div className="chat-content">
                {/* Chat messages and functionality will be implemented here */}
            </div>
        </div>
    );
};

export default Chat;
