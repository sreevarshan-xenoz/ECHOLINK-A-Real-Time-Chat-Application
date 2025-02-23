import React, { useState, useEffect, useRef } from 'react';
import { webrtcService } from '../services/webrtc-service';
import { aiService } from '../services/ai-service';
import './Chat.css';

const Chat = ({ currentUser, selectedPeer }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [peers, setPeers] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [typingStatus, setTypingStatus] = useState({});
    const [darkMode, setDarkMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    let typingTimeout = null;
    const [smartReplies, setSmartReplies] = useState([]);
    const [messageCompletion, setMessageCompletion] = useState('');
    const [sentiment, setSentiment] = useState(null);
    const [language, setLanguage] = useState(null);
    const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || '');
    const [isAiInitialized, setIsAiInitialized] = useState(false);
    const completionTimeout = useRef(null);

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

    useEffect(() => {
        if (apiKey && !isAiInitialized) {
            initializeAI();
        }
    }, [apiKey]);

    const initializeAI = async () => {
        try {
            await aiService.initialize(apiKey);
            setIsAiInitialized(true);
            localStorage.setItem('openai_api_key', apiKey);
        } catch (error) {
            console.error('Failed to initialize AI:', error);
        }
    };

    const handleMessageChange = async (e) => {
        const text = e.target.value;
        setNewMessage(text);
        
        // Handle typing indicator
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
        if (newMessage.trim() && selectedPeer) {
            const message = {
                type: 'CHAT',
                text: newMessage,
                timestamp: new Date().toISOString(),
            };

            // Analyze message before sending
            if (isAiInitialized) {
                const [messageSentiment, messageLanguage] = await Promise.all([
                    aiService.getSentiment(newMessage),
                    aiService.detectLanguage(newMessage)
                ]);

                message.sentiment = messageSentiment;
                message.language = messageLanguage;
                
                // Add to AI service history for context
                aiService.addToHistory({
                    text: newMessage,
                    sender: currentUser.id,
                    timestamp: message.timestamp
                });
            }

            webrtcService.sendMessage(message, selectedPeer);
            setMessages(prev => [...prev, { ...message, sender: currentUser.id }]);
            setNewMessage('');
            setMessageCompletion('');
            webrtcService.setTypingStatus(false, selectedPeer);
        }
    };

    const toggleVoiceRecording = async () => {
        if (isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
            const { blob, url } = webrtcService.lastRecordedAudio;
            
            const message = {
                type: 'VOICE_MESSAGE',
                audioUrl: url,
                audioData: Array.from(new Uint8Array(await blob.arrayBuffer())),
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
        setDarkMode(!darkMode);
        document.body.classList.toggle('dark-mode');
    };

    const filteredMessages = searchQuery
        ? messages.filter(msg => 
            msg.text?.toLowerCase().includes(searchQuery.toLowerCase()))
        : messages;

    // Handle incoming messages with AI analysis
    useEffect(() => {
        const unsubscribe = webrtcService.onMessage(async (message) => {
            switch (message.type) {
                case 'CHAT':
                    if (isAiInitialized) {
                        // Generate smart replies for received messages
                        const replies = await aiService.getSmartReplies(message.text);
                        setSmartReplies(replies);
                        
                        // Add to AI service history
                        aiService.addToHistory({
                            text: message.text,
                            sender: message.sender,
                            timestamp: message.timestamp
                        });
                    }
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

        return () => unsubscribe();
    }, [isAiInitialized]);

    const useSmartReply = (reply) => {
        setNewMessage(reply);
        setSmartReplies([]);
    };

    const useCompletion = () => {
        if (messageCompletion) {
            setNewMessage(prev => prev + messageCompletion);
            setMessageCompletion('');
        }
    };

    // Render AI features
    const renderAIFeatures = () => {
        if (!isAiInitialized) {
            return (
                <div className="ai-setup">
                    <input
                        type="password"
                        placeholder="Enter OpenAI API Key to enable AI features"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="api-key-input"
                    />
                    <button onClick={initializeAI} className="ai-setup-button">
                        Enable AI Features
                    </button>
                </div>
            );
        }
        return null;
    };

    return (
        <div className={`chat-container ${darkMode ? 'dark' : ''}`}>
            <div className="chat-header">
                <div className="chat-user-info">
                    <div className="user-details">
                        <h3>{selectedPeer ? selectedPeer.substring(0, 8) + '...' : 'Select a peer'}</h3>
                        <span className="status">
                            {peers.includes(selectedPeer) ? 'online' : 'offline'}
                        </span>
                        {typingStatus[selectedPeer] && <span className="typing-indicator">typing...</span>}
                    </div>
                </div>
                <div className="chat-actions">
                    <input
                        type="text"
                        placeholder="Search messages..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                    <button onClick={toggleDarkMode} className="theme-toggle">
                        {darkMode ? '☀️' : '🌙'}
                    </button>
                </div>
            </div>

            <div className="messages-container">
                {filteredMessages
                    .filter(msg => 
                        msg.sender === selectedPeer || 
                        (msg.sender === currentUser.id && msg.recipient === selectedPeer)
                    )
                    .map((message, index) => (
                        <div
                            key={index}
                            className={`message ${message.sender === currentUser.id ? 'sent' : 'received'}`}
                        >
                            <div className="message-content">
                                {message.type === 'CHAT' && (
                                    <>
                                        <p>{message.text}</p>
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
                                    <audio controls src={message.audioUrl} />
                                )}
                                {message.type === 'FILE_META' && (
                                    <div className="file-message">
                                        <span>📎 {message.name}</span>
                                        <span className="file-size">
                                            {(message.size / 1024).toFixed(1)} KB
                                        </span>
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
                    ))}
                <div ref={messagesEndRef} />
            </div>

            {smartReplies.length > 0 && (
                <div className="smart-replies">
                    {smartReplies.map((reply, index) => (
                        <button
                            key={index}
                            onClick={() => useSmartReply(reply)}
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

            {renderAIFeatures()}

            <div className="message-input-container">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />
                <button
                    className="attachment-button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!selectedPeer || !peers.includes(selectedPeer)}
                >
                    📎
                </button>
                <button
                    className={`voice-button ${isRecording ? 'recording' : ''}`}
                    onClick={toggleVoiceRecording}
                    disabled={!selectedPeer || !peers.includes(selectedPeer)}
                >
                    🎤
                </button>
                <form className="text-input-form" onSubmit={handleSendMessage}>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={handleMessageChange}
                        placeholder="Type a message..."
                        className="message-input"
                        disabled={!selectedPeer || !peers.includes(selectedPeer)}
                    />
                    <button 
                        type="submit" 
                        className="send-button"
                        disabled={!selectedPeer || !peers.includes(selectedPeer)}
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Chat; 