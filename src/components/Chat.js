import React, { useState, useEffect, useRef, useMemo } from 'react';
import { webrtcService } from '../services/webrtc-service';
import aiService from '../services/ai-service';
import AISettings from './AISettings';
import './Chat.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { v4 as uuidv4 } from 'uuid';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

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
    
    const handleCustomEmojiAdd = (emoji) => {
        if (!customEmojis.includes(emoji)) {
            setCustomEmojis(prev => [...prev, emoji]);
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
            messageAlignment: 'right'
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
                case 'VOICE_MESSAGE':
                case 'FILE_META':
                case 'FILE_CHUNK':
                    setMessages(prev => [...prev, message]);
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
                if (isAIChatActive) return true;
                if (selectedPeer) {
                    return msg.sender === selectedPeer || msg.sender === currentUser.id;
                }
                return false;
            })
            .filter(msg => 
                !searchQuery || msg.text?.toLowerCase().includes(searchQuery.toLowerCase())
            );
    }, [messages, isAIChatActive, selectedPeer, currentUser.id, searchQuery]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleInputChange = (e) => {
        setNewMessage(e.target.value);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && settings.enterToSend) {
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

        if (isAIChatActive) {
            setMessages(prev => [...prev, messageData]);
            setNewMessage('');

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
        } else if (selectedPeer) {
            setMessages(prev => [...prev, messageData]);
            webrtcService.sendMessage(messageData, selectedPeer);
            setNewMessage('');
            if (selectedPeer) {
                webrtcService.setTypingStatus(false, selectedPeer);
            }
        }

        setNewMessage('');
        setMessageCompletion('');
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
        return (
            <div style={style}>
                <div
                    className={`message ${message.sender === currentUser.id ? 'sent' : 'received'} ${isAIMessage ? 'ai-message' : ''}`}
                    data-sender={message.sender}
                >
                    <div className="message-content">
                        {message.type === 'CHAT' && (
                            <>
                                <p>{message.text}</p>
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

    return (
        <div className="chat-container">
            <div className="chat-header">
                <div className="chat-user-info">
                    <div className={`avatar ${isAIChatActive ? 'ai-avatar' : ''}`}>
                        {isAIChatActive ? '🤖' : selectedPeer?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="user-details">
                        <h3>{isAIChatActive ? 'AI Assistant' : selectedPeer?.name}</h3>
                        <span className="status">Online</span>
                    </div>
                </div>
                <div className="chat-actions">
                    <button
                        className="theme-toggle"
                        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                    >
                        {theme === 'light' ? '🌙' : '☀️'}
                    </button>
                    <button
                        className="settings-button"
                        onClick={toggleSettings}
                        title="Settings"
                    >
                        ⚙️
                    </button>
                    {renderSettingsPanel()}
                </div>
            </div>

            <div className="messages-container">
                <AutoSizer>
                    {({ height, width }) => (
                        <List
                            height={height}
                            itemCount={filteredMessages.length}
                            itemSize={100}
                            width={width}
                        >
                            {MessageRow}
                        </List>
                    )}
                </AutoSizer>
                <div ref={messagesEndRef} />
            </div>

            <div className="message-input-container">
                <div className="button-group">
                    <button
                        className="code-button"
                        onClick={() => setCodeEditor({ ...codeEditor, visible: !codeEditor.visible })}
                        title="Share Code"
                    >
                        {"</"}
                    </button>
                    <button
                        className={`voice-button ${isRecording ? 'recording' : ''}`}
                        onClick={async () => {
                            if (isRecording) {
                                mediaRecorder.stop();
                                setIsRecording(false);
                            } else {
                                try {
                                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                                    const recorder = new MediaRecorder(stream);
                                    const chunks = [];

                                    recorder.ondataavailable = (e) => chunks.push(e.data);
                                    recorder.onstop = async () => {
                                        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                                        const audioUrl = URL.createObjectURL(audioBlob);
                                        const transcription = await aiService.transcribeAudio(audioBlob);
                                        
                                        const voiceMessage = {
                                            id: uuidv4(),
                                            type: 'VOICE_MESSAGE',
                                            audioUrl,
                                            transcription,
                                            sender: currentUser.id,
                                            timestamp: new Date().toISOString()
                                        };

                                        setMessages(prev => [...prev, voiceMessage]);
                                        if (!isAIChatActive && selectedPeer) {
                                            webrtcService.sendMessage(voiceMessage, selectedPeer);
                                        }

                                        stream.getTracks().forEach(track => track.stop());
                                    };

                                    recorder.start();
                                    setMediaRecorder(recorder);
                                    setIsRecording(true);
                                } catch (error) {
                                    console.error('Error accessing microphone:', error);
                                    addNotification('Failed to access microphone', 'error');
                                }
                            }
                        }}
                        title={isRecording ? 'Stop Recording' : 'Record Voice Message'}
                    >
                        {isRecording ? '⏹️' : '🎤'}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                    />
                    <button
                        className="attach-button"
                        onClick={() => fileInputRef.current?.click()}
                        title="Attach File"
                    >
                        📎
                    </button>
                </div>
                <input
                    type="text"
                    className="message-input"
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                />
                <button className="send-button" onClick={handleSendMessage}>
                    ➤
                </button>
            </div>

            {codeEditor.visible && (
                <div className="code-editor-container">
                    <select
                        value={codeEditor.language}
                        onChange={(e) => setCodeEditor({ ...codeEditor, language: e.target.value })}
                    >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                    </select>
                    <textarea
                        value={codeEditor.code}
                        onChange={(e) => setCodeEditor({ ...codeEditor, code: e.target.value })}
                        placeholder="Enter your code here..."
                    />
                    <div className="code-editor-actions">
                        <button onClick={handleShareCode}>Share Code</button>
                        <button onClick={() => setCodeEditor({ ...codeEditor, visible: false })}>Cancel</button>
                    </div>
                </div>
            )}

            {showAISettings && (
                <AISettings 
                    onClose={() => setShowAISettings(false)}
                    addNotification={addNotification}
                />
            )}

            {showSettings && (
                <div className="settings-panel">
                    <div className="settings-header">
                        <h2>Chat Settings</h2>
                        <button className="close-button" onClick={() => setShowSettings(false)}>×</button>
                    </div>
                    <div className="settings-content">
                        <div className="settings-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={settings.notifications}
                                    onChange={(e) => setSettings({...settings, notifications: e.target.checked})}
                                />
                                Enable Notifications
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={settings.soundEffects}
                                    onChange={(e) => setSettings({...settings, soundEffects: e.target.checked})}
                                />
                                Sound Effects
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={settings.enterToSend}
                                    onChange={(e) => setSettings({...settings, enterToSend: e.target.checked})}
                                />
                                Press Enter to Send
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chat;