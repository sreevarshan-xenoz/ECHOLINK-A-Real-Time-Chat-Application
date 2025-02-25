import React, { useState, useEffect, useRef, useMemo } from 'react';
import { webrtcService } from '../services/webrtc-service';
import aiService from '../services/ai-service';
import './Chat.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { v4 as uuidv4 } from 'uuid';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

const Chat = ({ currentUser, selectedPeer, isAIChatActive }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [peers, setPeers] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [typingStatus, setTypingStatus] = useState({});
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    let typingTimeout = null;
    const [smartReplies, setSmartReplies] = useState([]);
    const [messageCompletion, setMessageCompletion] = useState('');
    const [sentiment, setSentiment] = useState(null);
    const [language, setLanguage] = useState(null);
    const [isAiInitialized, setIsAiInitialized] = useState(false);
    const completionTimeout = useRef(null);
    const [codeEditor, setCodeEditor] = useState({ visible: false, language: 'javascript', code: '' });
    const [sharedWorkspace, setSharedWorkspace] = useState(null);
    const [translatedMessages, setTranslatedMessages] = useState(new Map());
    const [userLanguage, setUserLanguage] = useState(navigator.language.split('-')[0]);
    const [isAIChatEnabled, setIsAIChatEnabled] = useState(false);
    const [aiPersonality, setAiPersonality] = useState("default");
    const [showSettings, setShowSettings] = useState(false);
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
    
    // Memoize filtered messages
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

    useEffect(() => {
        setIsAIChatEnabled(isAIChatActive);
    }, [isAIChatActive]);

    // Clear messages when switching between peers or AI chat
    useEffect(() => {
        setMessages([]);
    }, [selectedPeer, isAIChatActive]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

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
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleMessageChange = async (e) => {
        const text = e.target.value;
        setNewMessage(text);
        
        // Handle typing indicator only for peer chat
        if (selectedPeer) {
            clearTimeout(typingTimeout);
            webrtcService.setTypingStatus(true, selectedPeer);
            typingTimeout = setTimeout(() => {
                webrtcService.setTypingStatus(false, selectedPeer);
            }, 1000);
        }

        // Get message completion suggestions
        if (isAiInitialized && text.trim().length > 3) {
            clearTimeout(completionTimeout.current);
            completionTimeout.current = setTimeout(async () => {
                const completion = await aiService.getMessageCompletion(text);
                setMessageCompletion(completion);
            }, 500);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const messageData = {
            type: 'CHAT',
            text: newMessage,
            timestamp: new Date().toISOString(),
            sender: currentUser.id,
            id: uuidv4()
        };

        if (isAIChatActive) {
            // Add user message to messages immediately
            setMessages(prev => [...prev, messageData]);

            // Get AI response
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
                // Add specific error message to chat
                setMessages(prev => [...prev, {
                    type: 'CHAT',
                    text: error.message || 'Sorry, I encountered an error. Please try again.',
                    timestamp: new Date().toISOString(),
                    sender: 'AI_ASSISTANT',
                    id: uuidv4(),
                    isAI: true,
                    isError: true
                }]);

                // If API key is invalid, reset initialization
                if (error.message.includes('API key')) {
                    setIsAiInitialized(false);
                }
            }
        } else if (selectedPeer) {
            // Handle peer chat
            if (isAiInitialized) {
                const [messageSentiment, messageLanguage] = await Promise.all([
                    aiService.getSentiment(newMessage),
                    aiService.detectLanguage(newMessage)
                ]);

                messageData.sentiment = messageSentiment;
                messageData.language = messageLanguage;
            }

            // Add message to messages immediately
            setMessages(prev => [...prev, messageData]);
            
            // Send to peer
            webrtcService.sendMessage(messageData, selectedPeer);
        }

        setNewMessage('');
        setMessageCompletion('');
        if (selectedPeer) {
            webrtcService.setTypingStatus(false, selectedPeer);
        }
    };

    const toggleVoiceRecording = async () => {
        if (isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
            const { blob, url } = webrtcService.lastRecordedAudio;
            
            let transcription = null;
            if (isAiInitialized) {
                transcription = await aiService.transcribeAudio(blob);
            }
            
            const message = {
                type: 'VOICE_MESSAGE',
                audioUrl: url,
                audioData: Array.from(new Uint8Array(await blob.arrayBuffer())),
                transcription: transcription,
                timestamp: new Date().toISOString(),
            };

            webrtcService.sendMessage(message, selectedPeer);
            setMessages(prev => [...prev, { ...message, sender: currentUser.id }]);
        } else {
            const recorder = await webrtcService.startVoiceRecording();
            setMediaRecorder(recorder);
            setIsRecording(true);
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (file && selectedPeer) {
            await webrtcService.shareFile(file, selectedPeer);
        }
    };

    const handleReaction = (messageId, reaction) => {
        webrtcService.addReaction(messageId, reaction, selectedPeer);
    };

    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
        document.body.classList.toggle('dark-mode');
    };

    const handleTranslateMessage = async (messageId, text) => {
        if (translatedMessages.has(messageId)) {
            setTranslatedMessages(prev => {
                const next = new Map(prev);
                next.delete(messageId);
                return next;
            });
            return;
        }

        try {
            const detectedLang = await aiService.detectLanguage(text);
            if (detectedLang === userLanguage) return;

            const translation = await aiService.translateText(text, detectedLang, userLanguage);
            setTranslatedMessages(prev => {
                const next = new Map(prev);
                next.set(messageId, translation);
                return next;
            });
        } catch (error) {
            console.error('Translation failed:', error);
        }
    };

    const handleAIChat = async (text) => {
        if (!isAiInitialized || !isAIChatEnabled) return;

        const aiResponse = await aiService.chatWithAI(text);
        if (aiResponse) {
            setMessages(prev => [...prev, {
                type: 'CHAT',
                text: aiResponse.text,
                timestamp: aiResponse.timestamp,
                sender: 'AI_ASSISTANT',
                isAI: true
            }]);
        }
    };

    const toggleAIChat = () => {
        const newState = !isAIChatEnabled;
        setIsAIChatEnabled(newState);
        if (!newState) {
            aiService.clearAIChatHistory();
        }
    };

    const changeAIPersonality = (personality) => {
        switch (personality) {
            case 'professional':
                aiService.setAIPersonality("You are a professional assistant, focused on providing accurate and formal responses.");
                break;
            case 'friendly':
                aiService.setAIPersonality("You are a friendly and casual AI, using informal language and emojis occasionally.");
                break;
            case 'concise':
                aiService.setAIPersonality("You provide brief, direct answers without unnecessary elaboration.");
                break;
            default:
                aiService.setAIPersonality("You are Echo, a friendly and helpful AI assistant. You're knowledgeable but concise in your responses.");
        }
        setAiPersonality(personality);
    };

    const handleSettingChange = (setting, value) => {
        setSettings(prev => ({
            ...prev,
            [setting]: value
        }));
        // Save settings to localStorage
        localStorage.setItem('chat_settings', JSON.stringify({
            ...settings,
            [setting]: value
        }));
    };

    // Load settings from localStorage
    useEffect(() => {
        const savedSettings = localStorage.getItem('chat_settings');
        if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
        }
    }, []);

    const MessageInput = () => {
        const [showEmoji, setShowEmoji] = useState(false);
        const [attachmentType, setAttachmentType] = useState(null);
        const inputRef = useRef(null);
        
        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey && settings.enterToSend) {
                e.preventDefault();
                handleSendMessage(e);
            } else if (e.key === 'Tab' && messageCompletion) {
                e.preventDefault();
                setNewMessage(messageCompletion);
                setMessageCompletion('');
            }
        };

        const handlePaste = async (e) => {
            const items = e.clipboardData.items;
            for (let item of items) {
                if (item.type.indexOf('image') !== -1) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    await handleFileSelect({ target: { files: [file] } });
                }
            }
        };

        return (
            <div className="message-input-container">
                <div className="input-actions">
                    <button 
                        className="action-button"
                        onClick={() => setShowEmoji(!showEmoji)}
                        title="Emoji picker"
                    >
                        😊
                    </button>
                    <button 
                        className="action-button"
                        onClick={() => fileInputRef.current.click()}
                        title="Attach file"
                    >
                        📎
                    </button>
                    <button 
                        className="action-button"
                        onClick={toggleVoiceRecording}
                        title={isRecording ? "Stop recording" : "Start voice message"}
                    >
                        {isRecording ? '⏹️' : '🎤'}
                    </button>
                </div>
                
                <div className="input-wrapper">
                    <textarea
                        ref={inputRef}
                        className="message-input"
                        value={newMessage}
                        onChange={handleMessageChange}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder={isAIChatActive ? "Ask me anything..." : "Type a message..."}
                        rows={1}
                        style={{ height: 'auto' }}
                    />
                    
                    {messageCompletion && (
                        <div className="message-completion">
                            <span className="completion-text">{messageCompletion}</span>
                            <span className="completion-hint">Press Tab to complete</span>
                        </div>
                    )}
                </div>
                
                <button 
                    className={`action-button send-button ${newMessage.trim() ? 'active' : ''}`}
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    title="Send message"
                >
                    ➤
                </button>
                
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    multiple
                />
            </div>
        );
    };

    const handleSmartReply = (reply) => {
        setNewMessage(reply);
        handleSendMessage({ preventDefault: () => {} });
    };

    const useCompletion = (text) => {
        if (text.length > 0 && !isUsingCompletion) {
            aiService.getMessageCompletion(text)
                .then(completion => {
                    setCompletionSuggestion(completion);
                })
                .catch(error => {
                    console.error('Error getting completion:', error);
                    setCompletionSuggestion('');
                });
        } else {
            setCompletionSuggestion('');
        }
    };

    const handleCodeShare = (code, language) => {
        const codeMessage = {
            type: 'code',
            content: code,
            language: language || 'javascript'
        };
        handleSendMessage({ preventDefault: () => {} }, codeMessage);
    };

    return (
        <div className={`chat-container ${isDarkMode ? 'dark' : ''} background-${settings.chatBackground}`}>
            <div className="chat-header">
                <div className="chat-user-info">
                    {selectedPeer ? (
                        <>
                            <div className="avatar">{selectedPeer.substring(0, 2).toUpperCase()}</div>
                            <div className="user-details">
                                <h3>{selectedPeer}</h3>
                                <span className="status">online</span>
                            </div>
                        </>
                    ) : isAIChatActive ? (
                        <>
                            <div className="avatar ai-avatar">🤖</div>
                            <div className="user-details">
                                <h3>AI Assistant</h3>
                                <span className="status">ready</span>
                            </div>
                        </>
                    ) : null}
                </div>
                <div className="chat-actions">
                    <button 
                        className="settings-button"
                        onClick={() => setShowSettings(!showSettings)}
                        title="Chat settings"
                    >
                        ⚙️
                    </button>
                    <button
                        className="theme-toggle"
                        onClick={toggleDarkMode}
                        title="Toggle dark mode"
                    >
                        {isDarkMode ? '☀️' : '🌙'}
                    </button>
                </div>
            </div>

            {showSettings && (
                <div className="settings-panel">
                    <div className="settings-header">
                        <h3>Chat Settings</h3>
                        <button 
                            className="close-button"
                            onClick={() => setShowSettings(false)}
                        >
                            ×
                        </button>
                    </div>
                    <div className="settings-content">
                        <div className="settings-section">
                            <h4>Notifications</h4>
                            <label className="setting-item">
                                <span>Message Notifications</span>
                                <input
                                    type="checkbox"
                                    checked={settings.notifications}
                                    onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                                />
                            </label>
                            <label className="setting-item">
                                <span>Sound Effects</span>
                                <input
                                    type="checkbox"
                                    checked={settings.soundEffects}
                                    onChange={(e) => handleSettingChange('soundEffects', e.target.checked)}
                                />
                            </label>
                            <label className="setting-item">
                                <span>Message Preview</span>
                                <input
                                    type="checkbox"
                                    checked={settings.messagePreview}
                                    onChange={(e) => handleSettingChange('messagePreview', e.target.checked)}
                                />
                            </label>
                        </div>

                        <div className="settings-section">
                            <h4>Appearance</h4>
                            <label className="setting-item">
                                <span>Chat Background</span>
                                <select
                                    value={settings.chatBackground}
                                    onChange={(e) => handleSettingChange('chatBackground', e.target.value)}
                                >
                                    <option value="default">Default</option>
                                    <option value="gradient">Gradient</option>
                                    <option value="solid">Solid Color</option>
                                    <option value="pattern">Pattern</option>
                                </select>
                            </label>
                            <label className="setting-item">
                                <span>Font Size</span>
                                <select
                                    value={settings.fontSize}
                                    onChange={(e) => handleSettingChange('fontSize', e.target.value)}
                                >
                                    <option value="small">Small</option>
                                    <option value="medium">Medium</option>
                                    <option value="large">Large</option>
                                </select>
                            </label>
                            <label className="setting-item">
                                <span>Message Bubble Style</span>
                                <select
                                    value={settings.bubbleStyle}
                                    onChange={(e) => handleSettingChange('bubbleStyle', e.target.value)}
                                >
                                    <option value="modern">Modern</option>
                                    <option value="classic">Classic</option>
                                    <option value="minimal">Minimal</option>
                                </select>
                            </label>
                        </div>

                        <div className="settings-section">
                            <h4>Chat Behavior</h4>
                            <label className="setting-item">
                                <span>Enter to Send</span>
                                <input
                                    type="checkbox"
                                    checked={settings.enterToSend}
                                    onChange={(e) => handleSettingChange('enterToSend', e.target.checked)}
                                />
                            </label>
                            <label className="setting-item">
                                <span>Auto Scroll to Bottom</span>
                                <input
                                    type="checkbox"
                                    checked={settings.autoScroll}
                                    onChange={(e) => handleSettingChange('autoScroll', e.target.checked)}
                                />
                            </label>
                            <label className="setting-item">
                                <span>Read Receipts</span>
                                <input
                                    type="checkbox"
                                    checked={settings.readReceipts}
                                    onChange={(e) => handleSettingChange('readReceipts', e.target.checked)}
                                />
                            </label>
                            <label className="setting-item">
                                <span>Typing Indicator</span>
                                <input
                                    type="checkbox"
                                    checked={settings.typingIndicator}
                                    onChange={(e) => handleSettingChange('typingIndicator', e.target.checked)}
                                />
                            </label>
                        </div>
                    </div>
                </div>
            )}

            <div className="messages-container">
                <AutoSizer>
                    {({ height, width }) => (
                        <List
                            height={height}
                            width={width}
                            itemCount={filteredMessages.length}
                            itemSize={80} // Adjust based on average message height
                            overscanCount={5}
                        >
                            {MessageRow}
                        </List>
                    )}
                </AutoSizer>
                <div ref={messagesEndRef} />
            </div>

            {smartReplies.length > 0 && (
                <div className="smart-replies">
                    {smartReplies.map((reply, index) => (
                        <button
                            key={index}
                            onClick={() => handleSmartReply(reply)}
                            className="smart-reply-button"
                        >
                            {reply}
                        </button>
                    ))}
                </div>
            )}

            {messageCompletion && (
                <div className="message-completion" onClick={useCompletion}>
                    {newMessage}<span className="completion-suggestion">{messageCompletion}</span>
                </div>
            )}

            {isAiInitialized && (
                <div className="ai-chat-controls">
                    <div className="ai-toggle">
                        <button 
                            className={`ai-toggle-button ${isAIChatEnabled ? 'active' : ''}`}
                            onClick={toggleAIChat}
                        >
                            {isAIChatEnabled ? '🤖 AI Chat Active' : '🤖 Enable AI Chat'}
                        </button>
                    </div>
                    {isAIChatEnabled && (
                        <div className="ai-personality-selector">
                            <select 
                                value={aiPersonality}
                                onChange={(e) => changeAIPersonality(e.target.value)}
                                className="personality-select"
                            >
                                <option value="default">Default</option>
                                <option value="professional">Professional</option>
                                <option value="friendly">Friendly</option>
                                <option value="concise">Concise</option>
                            </select>
                        </div>
                    )}
                </div>
            )}

            <MessageInput />

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
                        <option value="ruby">Ruby</option>
                    </select>
                    <textarea
                        value={codeEditor.code}
                        onChange={(e) => setCodeEditor({ ...codeEditor, code: e.target.value })}
                        placeholder="Write or paste your code here..."
                    />
                    <div className="code-editor-actions">
                        <button onClick={handleCodeShare}>Share Code</button>
                        <button onClick={() => setCodeEditor({ ...codeEditor, visible: false })}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chat; 