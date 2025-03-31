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
    const [isAIChatEnabled, setIsAIChatEnabled] = useState(false);
    const [aiPersonality, setAiPersonality] = useState("default");
    const [showAISettings, setShowAISettings] = useState(false);
    const [settings, setSettings] = useState({
        notifications: true,
        soundEffects: true,
        messagePreview: true,
        chatBackground: 'default',
        fontSize: 'medium',
        bubbleStyle: 'modern',
        enterToSend: true,
        autoScroll: true,
        readReceipts: true,
        typingIndicator: true
    });
    const [batchSize] = useState(50);
    const [visibleMessages, setVisibleMessages] = useState([]);
    const [completionSuggestion, setCompletionSuggestion] = useState('');
    const [isUsingCompletion, setIsUsingCompletion] = useState(false);

    // Effects
    useEffect(() => {
        // Handle chat mode changes
        setIsAIChatEnabled(isAIChatActive);
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
    }, [selectedPeer]);

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
    }, []);

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

        const messageData = {
            id: uuidv4(),
            text: newMessage,
            sender: currentUser.id,
            timestamp: new Date().toISOString(),
            type: 'CHAT'
        };

        if (isAIChatActive) {
            setMessages(prev => [...prev, messageData]);

            try {
                if (!isAiInitialized) {
                    throw new Error('AI is not initialized. Please configure AI in settings (⚙️).');
                }

                const aiResponse = await aiService.chatWithAI(newMessage);
                if (aiResponse) {
                    const aiMessage = {
                        type: 'CHAT',
                        text: aiResponse.text,
                        timestamp: aiResponse.timestamp,
                        sender: 'AI_ASSISTANT',
                        id: uuidv4(),
                        isAI: true
                    };
                    setMessages(prev => [...prev, aiMessage]);
                    scrollToBottom();
                }
            } catch (error) {
                console.error('Error getting AI response:', error);
                setMessages(prev => [...prev, {
                    type: 'CHAT',
                    text: error.message || 'Sorry, I encountered an error. Please try again.',
                    timestamp: new Date().toISOString(),
                    sender: 'AI_ASSISTANT',
                    id: uuidv4(),
                    isAI: true,
                    isError: true
                }]);

                if (error.message.includes('API key')) {
                    addNotification('API key is invalid. Please update it in settings.', 'error');
                }
            }
        } else if (selectedPeer) {
            if (isAiInitialized) {
                const [messageSentiment, messageLanguage] = await Promise.all([
                    aiService.getSentiment(newMessage),
                    aiService.detectLanguage(newMessage)
                ]);

                messageData.sentiment = messageSentiment;
                messageData.language = messageLanguage;
            }

            setMessages(prev => [...prev, messageData]);
            webrtcService.sendMessage(messageData, selectedPeer);
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
        return (
            <div style={style}>
                <div
                    className={`message ${message.sender === currentUser.id ? 'sent' : 'received'}`}
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

    return (
        <div className="chat-container">
            <div className="chat-header">
                <div className="chat-user-info">
                    <div className={`avatar ${isAIChatActive ? 'ai-avatar' : ''}`}>
                        {isAIChatActive ? '🤖' : selectedPeer?.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-details">
                        <h3>{isAIChatActive ? 'AI Assistant' : selectedPeer}</h3>
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
                        onClick={() => setShowSettings(true)}
                        title="Open Settings"
                    >
                        ⚙️
                    </button>
                    {isAIChatActive && (
                        <button 
                            className="ai-settings-button"
                            onClick={() => setShowAISettings(true)}
                            title="Configure AI Settings"
                        >
                            🤖
                        </button>
                    )}
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
        </div>
    );
};

export default Chat;