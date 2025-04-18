import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
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
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [peers, setPeers] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [typingStatus, setTypingStatus] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    let typingTimeout = null;
    const [smartReplies, setSmartReplies] = useState([]);
    const [messageCompletion, setMessageCompletion] = useState('');
    const [sentiment, setSentiment] = useState(null);
    const [language, setLanguage] = useState(null);
    const completionTimeout = useRef(null);
    const [codeEditor, setCodeEditor] = useState({ visible: false, language: 'javascript', code: '' });
    const [sharedWorkspace, setSharedWorkspace] = useState(null);
    const [translatedMessages, setTranslatedMessages] = useState(new Map());
    const [userLanguage, setUserLanguage] = useState(navigator.language.split('-')[0]);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [userProfile, setUserProfile] = useState(null);

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

    const [customEmojis, setCustomEmojis] = useState(['👍', '❤️', '😊', '😂', '👏', '🎉', '🔥', '🌟', '🎨', '🎮']);
    const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
    const [selectedMessageForReaction, setSelectedMessageForReaction] = useState(null);
    const [voiceTranscriptionEnabled, setVoiceTranscriptionEnabled] = useState(true);
    const [collaborativeEditingEnabled, setCollaborativeEditingEnabled] = useState(true);
    const [messageEditHistory, setMessageEditHistory] = useState(new Map());
    
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
                ? { ...msg, text: newContent, isEdited: true, editHistory: [...editHistory, editData] }
                : msg
        ));

        if (!isAIChatActive && selectedPeer) {
            webrtcService.sendMessage({
                type: 'EDIT_MESSAGE',
                messageId,
                newContent,
                editData,
                sender: currentUser.id,
                timestamp: new Date().toISOString()
            }, selectedPeer);
        }
    };
    const [showAISettings, setShowAISettings] = useState(false);

    useEffect(() => {
        if (isAiInitialized && selectedAIModel) {
            aiService.setModel(selectedAIModel);
        }
    }, [isAiInitialized, selectedAIModel]);

    const toggleSettings = () => {
        if (isAIChatActive) {
            setShowAISettings(!showAISettings);
        } else {
            setShowSettings(!showSettings);
        }
    };

    const handleSettingsChange = (category, setting, value) => {
        setSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [setting]: value
            }
        }));

        // Apply immediate effects
        if (category === 'appearance' && setting === 'theme') {
            setTheme(value);
        }
    };

    const [settings, setSettings] = useState({
        notifications: {
            enabled: true,
            sound: true,
            desktop: true,
            preview: true
        },
        appearance: {
            theme: theme,
            chatBackground: 'default',
            fontSize: 'medium',
            bubbleStyle: 'modern',
            messageAlignment: 'right',
            messageDensity: 'comfortable',
            animationLevel: 'full'
        },
        chat: {
            enterToSend: true,
            autoScroll: true,
            readReceipts: true,
            typingIndicator: true,
            messageTranslation: true,
            smartReplies: true
        },
        ai: {
            provider: 'openai',
            apiKey: '',
            model: 'gpt-3.5-turbo',
            personality: 'default',
            autoComplete: true,
            smartReplies: true
        },
        privacy: {
            encryptMessages: true,
            autoDeleteMessages: false,
            deleteAfter: '24h',
            blockList: []
        }
    });
    const [batchSize] = useState(50);
    const [visibleMessages] = useState([]);
    const [completionSuggestion] = useState('');
    const [isUsingCompletion] = useState(false);

    const [isAIChatEnabled, setIsAIChatEnabled] = useState(isAIChatActive);
    const [useBasicChatbot, setUseBasicChatbot] = useState(true);

    // Basic chatbot responses
    const basicChatbotResponses = {
        "hello": "Hello! I'm a basic chatbot. I can help you with simple tasks. Type 'help' to see what I can do.",
        "hi": "Hi there! Need any help? Type 'help' to see what I can do.",
        "help": "I can help you with:\n- Basic chat features\n- File sharing\n- Code sharing\n- Voice messages\nTo enable AI features, click the settings icon and configure your API key.",
        "how are you": "I'm functioning well! How can I assist you today?",
        "bye": "Goodbye! Have a great day!",
        "features": "Current features:\n- Real-time messaging\n- File sharing\n- Code sharing\n- Voice messages\n- Reactions\nEnable AI for more advanced features!",
        "ai": "To enable AI features, click the settings icon (⚙️) and configure your API key. This will unlock:\n- Smart replies\n- Message completion\n- Sentiment analysis\n- Language translation"
    };

    // Basic chatbot response handler
    const getBasicChatbotResponse = (message) => {
        const lowercaseMessage = message.toLowerCase().trim();
        for (const [key, response] of Object.entries(basicChatbotResponses)) {
            if (lowercaseMessage.includes(key)) {
                return response;
            }
        }
        return "I'm a basic chatbot. I can only understand simple commands. Type 'help' to see what I can do.";
    };

    // Effects
    useEffect(() => {
        // Handle chat mode changes
        setMessages([]);
        
        // Add transition effect when switching chat modes
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            // Add transition class for animation
            chatContainer.classList.add('mode-transition');
            
            // Set data attribute for mode-specific styling
            chatContainer.setAttribute('data-chat-mode', isAIChatActive ? 'ai' : 'peer');
            console.log('Setting chat mode to:', isAIChatActive ? 'ai' : 'peer');
            
            // Add a visual flash effect to indicate mode change
            const flashElement = document.createElement('div');
            flashElement.className = 'mode-change-flash';
            chatContainer.appendChild(flashElement);
            
            // Display a temporary transition message
            const transitionMessage = {
                id: uuidv4(),
                type: 'SYSTEM',
                text: `Switched to ${isAIChatActive ? 'AI Chat' : 'Peer Chat'} mode`,
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            };
            setMessages([transitionMessage]);
            
            setTimeout(() => {
                chatContainer.classList.remove('mode-transition');
                if (flashElement && flashElement.parentNode) {
                    flashElement.parentNode.removeChild(flashElement);
                }
            }, 500);
        }

        // Update document title to reflect current chat mode
        document.title = isAIChatActive ? 'EchoLink - AI Chat' : 'EchoLink - Peer Chat';

        // Cleanup function
        return () => {
            if (completionTimeout.current) {
                clearTimeout(completionTimeout.current);
            }
        };
    }, [isAIChatActive]);

    // Handle peer selection changes
    useEffect(() => {
        if (selectedPeer) {
            setMessages([]);
        }
    }, [selectedPeer, setMessages]);

    // WebRTC message handling effect
    useEffect(() => {
        const unsubscribe = webrtcService.onMessage((message) => {
            switch (message.type) {
                case 'CHAT':
                case 'FILE_META':
                case 'FILE_CHUNK':
                    setMessages(prev => [...prev, message]);
                    break;
                case 'VOICE_MESSAGE':
                    const processVoiceMessage = async () => {
                        if (voiceTranscriptionEnabled) {
                            const transcription = await handleVoiceTranscription(message.audioBlob);
                            setMessages(prev => [...prev, { ...message, transcription }]);
                        } else {
                            setMessages(prev => [...prev, message]);
                        }
                    };
                    processVoiceMessage();
                    break;
                case 'PEER_CONNECTED':
                    setPeers(prev => [...prev, message.peerId]);
                    break;
                case 'PEER_DISCONNECTED':
                    setPeers(prev => prev.filter(id => id !== message.peerId));
                    break;
                case 'TYPING_STATUS':
                    setTypingStatus(prev => ({
                        ...prev,
                        [message.sender]: message.isTyping
                    }));
                    break;
                case 'REACTION':
                    setMessages(prev => prev.map(msg =>
                        msg.id === message.messageId
                            ? { ...msg, reactions: [...(msg.reactions || []), message.reaction] }
                            : msg
                    ));
                    break;
                case 'EDIT_MESSAGE':
                    setMessages(prev => prev.map(msg =>
                        msg.id === message.messageId
                            ? { 
                                ...msg, 
                                text: message.newContent, 
                                isEdited: true,
                                editHistory: [...(msg.editHistory || []), message.editData]
                            }
                            : msg
                    ));
                    setMessageEditHistory(prev => {
                        const newMap = new Map(prev);
                        const history = newMap.get(message.messageId) || [];
                        newMap.set(message.messageId, [...history, message.editData]);
                        return newMap;
                    });
                    break;
                default:
                    break;
            }
        });

        setPeers(webrtcService.getConnectedPeers());
        
        return () => {
            unsubscribe();
            setMessages([]);
            setTypingStatus({});
            setPeers([]);
            if (typingTimeout) clearTimeout(typingTimeout);
            if (completionTimeout.current) clearTimeout(completionTimeout.current);
        };
    }, [typingTimeout, setMessages, setPeers, setTypingStatus]);

    // AI chat cleanup effect
    useEffect(() => {
        if (!isAIChatEnabled) {
            aiService.clearAIChatHistory();
        }
        return () => {
            if (isAIChatEnabled) {
                setIsAIChatEnabled(false);
                aiService.clearAIChatHistory();
            }
        };
    }, [isAIChatEnabled]);

    // Scroll effect
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Memoized filtered messages
    const filteredMessages = useMemo(() => {
        return messages
            .filter(msg => {
                if (msg.isSystemMessage) return true; // Always show system messages
                if (isAIChatActive) return true;
                if (selectedPeer) {
                    return msg.sender === selectedPeer || msg.sender === currentUser.id;
                }
                return false;
            })
            .filter(msg => 
                msg.isSystemMessage || !searchQuery || msg.text?.toLowerCase().includes(searchQuery.toLowerCase())
            );
    }, [messages, isAIChatActive, selectedPeer, currentUser.id, searchQuery]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleInputChange = (e) => {
        setNewMessage(e.target.value);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!newMessage.trim()) return;

        const messageId = uuidv4();
        const timestamp = new Date().toISOString();

        const messageData = {
            id: messageId,
            text: newMessage,
            sender: currentUser.id,
            timestamp: timestamp,
            type: 'CHAT'
        };

        // Add message to the UI immediately for better user experience
        setMessages(prev => [...prev, messageData]);
        setNewMessage('');
        setMessageCompletion('');
        
        // Handle AI chat mode
        if (isAIChatActive) {
            if (!isAiInitialized) {
                if (useBasicChatbot) {
                    const botResponse = {
                        type: 'CHAT',
                        text: getBasicChatbotResponse(newMessage),
                        timestamp: new Date().toISOString(),
                        sender: 'AI_ASSISTANT',
                        id: uuidv4(),
                        isAI: true
                    };
                    setMessages(prev => [...prev, botResponse]);
                } else {
                    addNotification('Please configure AI settings first', 'error');
                    setShowAISettings(true);
                }
                return;
            }

            try {
                const response = await aiService.handleHelpQuery(newMessage);
                setMessages(prev => [...prev, response]);
            } catch (error) {
                console.error('Error getting AI response:', error);
                addNotification('Failed to get AI response', 'error');
                if (error.message.includes('API key')) {
                    setShowAISettings(true);
                }
            }
        } 
        // Handle peer chat mode
        else if (selectedPeer) {
            webrtcService.sendMessage(messageData, selectedPeer);
            if (selectedPeer) {
                webrtcService.setTypingStatus(false, selectedPeer);
            }
        }

        // Reset typing status
        if (selectedPeer) {
            webrtcService.setTypingStatus(false, selectedPeer);
        }
    };

    const handleShareCode = () => {
        if (!codeEditor.code.trim()) return;

        const codeMessage = {
            id: uuidv4(),
            type: 'CODE_SHARE',
            code: codeEditor.code,
            language: codeEditor.language,
            sender: currentUser.id,
            timestamp: Date.now(),
            workspaceId: uuidv4()
        };

        setMessages(prev => [...prev, codeMessage]);
        setCodeEditor({ ...codeEditor, visible: false, code: '' });

        if (!isAIChatActive) {
            webrtcService.sendMessage(codeMessage);
        }
    };

    // Message row renderer for virtualization
    const MessageRow = ({ index, style }) => {
        const message = filteredMessages[index];
        const isAIMessage = isAIChatActive && message.sender === 'AI_ASSISTANT';
        const isSystemMessage = message.isSystemMessage;
        const isEditable = message.sender === currentUser.id && !isAIMessage && !isSystemMessage;
        
        // Special rendering for system messages
        if (isSystemMessage) {
            return (
                <div style={style}>
                    <div className="system-message">
                        <div className="system-message-content">
                            <span className="system-icon">🔔</span>
                            <p>{message.text}</p>
                        </div>
                    </div>
                </div>
            );
        }
        
        return (
            <div style={style}>
                <div
                    className={`message ${message.sender === currentUser.id ? 'sent' : 'received'} ${isAIMessage ? 'ai-message' : ''} ${message.isEdited ? 'edited' : ''}`}
                    data-sender={message.sender}
                >
                    <div className="message-content">
                        {message.type === 'CHAT' && (
                            <>
                                {isEditable ? (
                                    <div className="editable-message">
                                        <p>{message.text}</p>
                                        <button 
                                            className="edit-button"
                                            onClick={() => handleCollaborativeEdit(message.id, message.text)}
                                        >
                                            ✏️
                                        </button>
                                    </div>
                                ) : (
                                    <p>{message.text}</p>
                                )}
                                {message.isEdited && (
                                    <span className="edit-indicator">
                                        edited {new Date(message.editHistory?.slice(-1)[0]?.timestamp).toLocaleTimeString()}
                                    </span>
                                )}
                                {translatedMessages.has(message.id) && (
                                    <p className="translated-text">
                                        {translatedMessages.get(message.id)}
                                    </p>
                                )}
                                <div className="message-actions">
                                    <button 
                                        className="translate-button"
                                        onClick={() => handleTranslateMessage(message.id, message.text)}
                                    >
                                        {translatedMessages.has(message.id) ? 'Show Original' : '🌐 Translate'}
                                    </button>
                                    <button
                                        className="reaction-button"
                                        onClick={() => {
                                            setSelectedMessageForReaction(message.id);
                                            setEmojiPickerVisible(true);
                                        }}
                                    >
                                        😊 React
                                    </button>
                                </div>
                                {message.sentiment && (
                                    <span className={`sentiment-indicator ${message.sentiment.toLowerCase()}`}>
                                        {message.sentiment === 'POSITIVE' ? '😊' : 
                                         message.sentiment === 'NEGATIVE' ? '😔' : '😐'}
                                    </span>
                                )}
                                {message.language && (
                                    <span className="language-indicator">
                                        {message.language}
                                    </span>
                                )}
                            </>
                        )}
                        {message.type === 'VOICE_MESSAGE' && (
                            <div className="voice-message">
                                <audio controls src={message.audioUrl} />
                                {message.transcription && (
                                    <div className="transcription">
                                        <p><i>Transcription: {message.transcription}</i></p>
                                    </div>
                                )}
                            </div>
                        )}
                        {message.type === 'FILE_META' && (
                            <div className="file-message">
                                <span>📎 {message.name}</span>
                                <span className="file-size">
                                    {(message.size / 1024).toFixed(1)} KB
                                </span>
                            </div>
                        )}
                        {message.type === 'CODE_SHARE' && (
                            <div className="code-share-container">
                                <div className="code-header">
                                    <span className="language-tag">{message.language}</span>
                                    <button onClick={() => navigator.clipboard.writeText(message.code)}>
                                        Copy Code
                                    </button>
                                    {message.sender === currentUser.id && (
                                        <button onClick={() => setSharedWorkspace(message.workspaceId)}>
                                            Edit Live
                                        </button>
                                    )}
                                </div>
                                <SyntaxHighlighter 
                                    language={message.language}
                                    style={atomDark}
                                    showLineNumbers={true}
                                >
                                    {message.code}
                                </SyntaxHighlighter>
                            </div>
                        )}
                        <span className="timestamp">
                            {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                        <div className="message-reactions">
                            {message.reactions?.map((reaction, i) => (
                                <span key={i} className="reaction">{reaction}</span>
                            ))}
                            <div className="reaction-picker">
                                {['👍', '❤️', '😊', '😂', '👏', '🎉'].map(emoji => (
                                    <span
                                        key={emoji}
                                        onClick={() => handleReaction(message.id, emoji)}
                                        className="reaction-option"
                                    >
                                        {emoji}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderSettingsPanel = () => {
        if (!showSettings) return null;
        
        return (
            <div className="settings-panel">
                <div className="settings-header">
                    <h2>Settings</h2>
                    <button className="close-button" onClick={() => setShowSettings(false)}>×</button>
                </div>
                <div className="settings-content">
                    <div className="settings-section">
                        <h3>Notifications</h3>
                        <div className="settings-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={settings.notifications.enabled}
                                    onChange={(e) => handleSettingsChange('notifications', 'enabled', e.target.checked)}
                                />
                                Enable Notifications
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={settings.notifications.sound}
                                    onChange={(e) => handleSettingsChange('notifications', 'sound', e.target.checked)}
                                />
                                Sound Effects
                            </label>
                        </div>
                    </div>
                    
                    <div className="settings-section">
                        <h3>Appearance</h3>
                        <div className="settings-group">
                            <label>Theme</label>
                            <select
                                value={settings.appearance.theme}
                                onChange={(e) => handleSettingsChange('appearance', 'theme', e.target.value)}
                            >
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                            </select>
                            
                            <label>Font Size</label>
                            <select
                                value={settings.appearance.fontSize}
                                onChange={(e) => handleSettingsChange('appearance', 'fontSize', e.target.value)}
                            >
                                <option value="small">Small</option>
                                <option value="medium">Medium</option>
                                <option value="large">Large</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="settings-section">
                        <h3>Chat</h3>
                        <div className="settings-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={settings.chat.enterToSend}
                                    onChange={(e) => handleSettingsChange('chat', 'enterToSend', e.target.checked)}
                                />
                                Press Enter to Send
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={settings.chat.readReceipts}
                                    onChange={(e) => handleSettingsChange('chat', 'readReceipts', e.target.checked)}
                                />
                                Read Receipts
                            </label>
                        </div>
                    </div>
                    
                    <div className="settings-section">
                        <h3>Message Features</h3>
                        <div className="settings-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={voiceTranscriptionEnabled}
                                    onChange={(e) => setVoiceTranscriptionEnabled(e.target.checked)}
                                />
                                Voice Message Transcription
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={collaborativeEditingEnabled}
                                    onChange={(e) => setCollaborativeEditingEnabled(e.target.checked)}
                                />
                                Collaborative Editing
                            </label>
                        </div>
                    </div>

                    <div className="settings-section">
                        <h3>AI Settings</h3>
                        <div className="settings-group">
                            <label>Provider</label>
                            <select
                                value={settings.ai.provider}
                                onChange={(e) => handleSettingsChange('ai', 'provider', e.target.value)}
                            >
                                <option value="openai">OpenAI</option>
                                <option value="gemini">Google Gemini</option>
                                <option value="ollama">Ollama (Local)</option>
                            </select>
                            
                            <label>API Key</label>
                            <input
                                type="password"
                                value={settings.ai.apiKey}
                                onChange={(e) => handleSettingsChange('ai', 'apiKey', e.target.value)}
                                placeholder="Enter your API key"
                            />
                            
                            <label>Model</label>
                            <select
                                value={settings.ai.model}
                                onChange={(e) => handleSettingsChange('ai', 'model', e.target.value)}
                            >
                                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                <option value="gpt-4">GPT-4</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="settings-section">
                        <h3>Privacy</h3>
                        <div className="settings-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={settings.privacy.encryptMessages}
                                    onChange={(e) => handleSettingsChange('privacy', 'encryptMessages', e.target.checked)}
                                />
                                Encrypt Messages
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={settings.privacy.autoDeleteMessages}
                                    onChange={(e) => handleSettingsChange('privacy', 'autoDeleteMessages', e.target.checked)}
                                />
                                Auto Delete Messages
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const memoizedMessageList = useMemo(() => (
    <div className="messages-list">
        {filteredMessages.map(message => (
            <MessageItem
                key={message.id}
                message={message}
                onReaction={(reaction) => handleReaction(message.id, reaction)}
            />
        ))}
    </div>
), [filteredMessages, handleReaction]);

return (
        <div className={`chat-container ${theme} ${isAIChatActive ? 'ai-mode-active' : 'peer-mode-active'}`} data-chat-mode={isAIChatActive ? 'ai' : 'peer'}>
            <div className="chat-header">
                <div className="chat-user-info">
                    <div 
                        className={`avatar ${isAIChatActive ? 'ai-avatar' : ''}`}
                        onClick={() => !isAIChatActive && setShowProfileModal(true)}
                        style={{ cursor: !isAIChatActive ? 'pointer' : 'default' }}
                    >
                        {isAIChatActive ? '🤖' : 
                         userProfile?.avatarUrl ? 
                            (userProfile.avatarUrl.startsWith('data:') ? 
                                <img src={userProfile.avatarUrl} alt="Profile" className="avatar-image" /> : 
                                userProfile.avatarUrl) : 
                            (userProfile?.displayName?.charAt(0) || currentUser?.id?.charAt(0) || '👤')}
                    </div>
                    <div className="user-details">
                        <h3>
                            {isAIChatActive ? 'AI Assistant' : 
                             userProfile?.displayName || selectedPeer || 'Unknown User'}
                        </h3>
                        <div className="chat-mode-indicator">
                            <span className={`mode-badge ${isAIChatActive ? 'ai-mode' : 'peer-mode'}`}>
                                {isAIChatActive ? '🤖 AI Chat Mode' : '👥 Peer Chat Mode'}
                                <span className="mode-status-dot"></span>
                            </span>
                            <span className="mode-description">
                                {isAIChatActive 
                                    ? 'Chatting with AI Assistant' 
                                    : selectedPeer 
                                        ? `Connected with ${selectedPeer.substring(0, 8)}...` 
                                        : 'Select a peer to start chatting'}
                            </span>
                        </div>
                        <span className="status">
                            <span className="status-dot"></span>
                            Online
                        </span>
                        {!isAIChatActive && typingStatus[selectedPeer] && (
                            <div className="typing-indicator">
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                                typing...
                            </div>
                        )}
                    </div>
                </div>
                <div className="chat-actions">
                    <button 
                        onClick={() => setShowProfileModal(true)} 
                        className="profile-button"
                        title="Edit your profile"
                    >
                        {userProfile?.avatarUrl && userProfile.avatarUrl.startsWith('data:') ? 
                            <img src={userProfile.avatarUrl} alt="Profile" className="button-avatar-image" /> : 
                            '👤'}
                    </button>
                    <button 
                        onClick={toggleSettings} 
                        className="settings-button"
                        title={isAIChatActive ? "AI Settings" : "Chat Settings"}
                    >
                        ⚙️
                    </button>
                </div>
            </div>

            <div className="messages-container">
                {filteredMessages.length === 0 && !isAIChatActive && !selectedPeer && (
                    <div className="no-peers-message">
                        <div className="empty-state-icon">👥</div>
                        <h3>No conversations yet</h3>
                        <p>You need to connect with peers to start chatting</p>
                        <button className="connect-peers-button" onClick={() => webrtcService.showConnectionDialog()}>Connect with Peers</button>
                    </div>
                )}
                {filteredMessages.map((message, index) => (
                    <div key={message.id} style={{padding: '8px', width: '100%'}}>
                        <MessageRow
                            index={index}
                            style={{
                                padding: '8px',
                                width: '100%'
                            }}
                        />
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="message-input-container">
                <input
                    type="text"
                    className="message-input"
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                />
                <button
                    className="send-button"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                >
                    ➤
                </button>
            </div>

            {showAISettings && (
                <AISettings 
                    onClose={() => setShowAISettings(false)} 
                    addNotification={addNotification} 
                    currentUser={currentUser}
                />
            )}

            {showProfileModal && (
                <Profile 
                    currentUser={currentUser} 
                    onClose={() => setShowProfileModal(false)} 
                    onProfileUpdate={handleProfileUpdate}
                />
            )}

            {renderSettingsPanel()}
        </div>
    );
};

export default Chat;