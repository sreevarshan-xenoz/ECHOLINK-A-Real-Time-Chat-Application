import React, { useState, useEffect, useRef } from 'react';
import { webrtcService } from '../services/webrtc-service';
import aiService from '../services/ai-service';
import './Chat.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { v4 as uuidv4 } from 'uuid';

const Chat = ({ currentUser, selectedPeer, isAIChatActive }) => {
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
    const [isAiInitialized, setIsAiInitialized] = useState(false);
    const completionTimeout = useRef(null);
    const [codeEditor, setCodeEditor] = useState({ visible: false, language: 'javascript', code: '' });
    const [sharedWorkspace, setSharedWorkspace] = useState(null);
    const [translatedMessages, setTranslatedMessages] = useState(new Map());
    const [userLanguage, setUserLanguage] = useState(navigator.language.split('-')[0]);
    const [isAIChatEnabled, setIsAIChatEnabled] = useState(false);
    const [aiPersonality, setAiPersonality] = useState("default");

    useEffect(() => {
        setIsAIChatEnabled(isAIChatActive);
    }, [isAIChatActive]);

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

    const handleCodeShare = () => {
        const codeMessage = {
            type: 'CODE_SHARE',
            code: codeEditor.code,
            language: codeEditor.language,
            timestamp: new Date().toISOString(),
            workspaceId: uuidv4()
        };
        webrtcService.sendMessage(codeMessage, selectedPeer);
        setMessages(prev => [...prev, { ...codeMessage, sender: currentUser.id }]);
        setCodeEditor({ ...codeEditor, visible: false });
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
                    .filter(msg => {
                        if (isAIChatActive) {
                            // Show all messages in AI chat mode
                            return true;
                        } else if (selectedPeer) {
                            // In peer chat mode, show messages between current user and selected peer
                            return msg.sender === selectedPeer || msg.sender === currentUser.id;
                        }
                        return false;
                    })
                    .map((message, index) => (
                        <div
                            key={index}
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
                    disabled={!selectedPeer || (selectedPeer && !peers.includes(selectedPeer))}
                >
                    📎
                </button>
                <button
                    className={`voice-button ${isRecording ? 'recording' : ''}`}
                    onClick={toggleVoiceRecording}
                    disabled={!selectedPeer || (selectedPeer && !peers.includes(selectedPeer))}
                >
                    🎤
                </button>
                <button
                    className="code-button"
                    onClick={() => setCodeEditor({ ...codeEditor, visible: !codeEditor.visible })}
                    disabled={!selectedPeer && !isAIChatActive}
                >
                    <span role="img" aria-label="code">⌨️</span>
                </button>
                <form className="text-input-form" onSubmit={handleSendMessage}>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={handleMessageChange}
                        placeholder={isAIChatActive ? "Chat with AI..." : "Type a message..."}
                        className="message-input"
                        disabled={!selectedPeer && !isAIChatActive}
                    />
                    <button 
                        type="submit" 
                        className="send-button"
                        disabled={!selectedPeer && !isAIChatActive}
                    >
                        Send
                    </button>
                </form>
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