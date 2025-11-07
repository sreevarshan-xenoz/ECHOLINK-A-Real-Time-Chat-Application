import React, { useState, useEffect, useRef, useMemo, useCallback, memo, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { webrtcService } from '../services/webrtc-service';
import aiService from '../services/ai-service';
import * as supabaseService from '../services/supabase-service';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { v4 as uuidv4 } from 'uuid';
// Removed unused imports: List, AutoSizer
import { 
  LazyAISettings, 
  LazyProfile, 
  LazyMiniAIChat, 
  LazyCodeExecutionPanel,
  LazyVoiceMessageRecorder,
  LazyCollaborativeWhiteboard
} from './LazyComponents';
import {
  Box,
  Flex,
  Text,
  Input,
  Button,
  IconButton,
  Avatar,
  Badge,
  Divider,
  InputGroup,
  InputRightElement,
  Tooltip,
  useColorMode,
  HStack,
  VStack,
  Spacer,
  Heading,
  Container,
  useToast,
  Tag,
  TagLabel,
  Card,
  CardBody,
  Grid,
  Spinner,
} from '@chakra-ui/react';
import { IconWrapper } from '../utils/IconWrapper';
import CodingPlatformsTab from './CodingPlatformsTab';

// Message Status Component
const MessageStatus = memo(({ status, timestamp }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'sending': return '●';
      case 'sent': return '✓';
      case 'delivered': return '✓✓';
      case 'read': return '✓✓';
      case 'error': return '!';
      case 'queued': return '⏱';
      default: return '';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'sending': return 'gray.400';
      case 'sent': return 'blue.400';
      case 'delivered': return 'blue.400';
      case 'read': return 'green.400';
      case 'error': return 'red.400';
      case 'queued': return 'yellow.400';
      default: return 'gray.400';
    }
  };

  return (
    <Flex alignItems="center" fontSize="xs" color="gray.500">
      {status && (
        <Text color={getStatusColor()} mr={1} fontWeight="bold">
          {getStatusIcon()}
        </Text>
      )}
      {timestamp && (
        <Text>{new Date(timestamp).toLocaleTimeString()}</Text>
      )}
    </Flex>
  );
});

// Message Item Component
const MessageItem = memo(({ message, onReaction, onRetry, onMarkAsRead, onDelete }) => {
  const isSent = message.sender === 'user';
  const { colorMode } = useColorMode();
  
  const handleRetry = (e) => {
    e.stopPropagation();
    onRetry(message);
  };
  
  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(message);
  };
  
  useEffect(() => {
    // Send read receipt when message is visible
    if (message.sender !== 'user' && message.status !== 'read') {
      onMarkAsRead(message);
    }
  }, [message, onMarkAsRead]);
  
  return (
    <Box
      alignSelf={isSent ? 'flex-end' : 'flex-start'}
      maxWidth="80%"
      mb={3}
    >
      <Card
        bg={isSent 
          ? (colorMode === 'dark' ? 'blue.600' : 'blue.500') 
          : (colorMode === 'dark' ? 'gray.700' : 'gray.100')}
        color={isSent ? 'white' : (colorMode === 'dark' ? 'white' : 'black')}
        borderRadius={isSent ? "lg 2px 2px lg" : "2px lg lg 2px"}
        boxShadow="sm"
      >
        <CardBody py={2} px={3}>
          <Text>{message.text}</Text>
        </CardBody>
      </Card>
      <Flex 
        justifyContent={isSent ? 'flex-end' : 'flex-start'}
        alignItems="center"
        mt={1}
        fontSize="xs"
        color="gray.500"
      >
        <MessageStatus status={message.status} timestamp={message.timestamp} />
        {message.offline && (
          <Badge ml={2} colorScheme="yellow" size="sm">
            offline
          </Badge>
        )}
        {message.reactions?.map((reaction, index) => (
          <Tag key={index} size="sm" ml={1} borderRadius="full" variant="solid" colorScheme="blue">
            <TagLabel>{reaction}</TagLabel>
          </Tag>
        ))}
        {message.status === 'error' && (
          <HStack ml={2} spacing={1}>
            <Button size="xs" colorScheme="blue" onClick={handleRetry}>
              Retry
            </Button>
            <Button size="xs" colorScheme="red" onClick={handleDelete}>
              Delete
            </Button>
          </HStack>
        )}
      </Flex>
    </Box>
  );
});

// Main Chat Component
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
    const toast = useToast();
    const { colorMode } = useColorMode();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const [codeEditor, setCodeEditor] = useState({ visible: false, language: 'javascript', code: '' });
    const [translatedMessages, setTranslatedMessages] = useState(new Map());
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const [persistenceEnabled, setPersistenceEnabled] = useState(true);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [customEmojis, setCustomEmojis] = useState(['👍', '❤️', '😊', '😂', '👏', '🎉', '🔥', '🌟', '🎨', '🎮']);
    const [selectedMessageForReaction, setSelectedMessageForReaction] = useState(null);
    const [voiceTranscriptionEnabled, setVoiceTranscriptionEnabled] = useState(true);
    const [collaborativeEditingEnabled, setCollaborativeEditingEnabled] = useState(true);
    const [messageEditHistory, setMessageEditHistory] = useState(new Map());
    const [showAISettings, setShowAISettings] = useState(false);
    const [settings, setSettings] = useState({
        notifications: {
            enabled: true,
            sound: true
        },
        appearance: {
            theme: 'dark',
            fontSize: 'medium'
        },
        chat: {
            enterToSend: true,
            readReceipts: true
        },
        ai: {
            provider: 'openai',
            apiKey: '',
            model: 'gpt-3.5-turbo'
        },
        privacy: {
            encryptMessages: true,
            autoDeleteMessages: false
        }
    });
    
    // Removed mock chatbot responses - now using real AI service
    
    // Handler for settings changes
    const handleSettingsChange = (section, key, value) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: value
            }
        }));
    };
    
    // Toggle settings panel
    const toggleSettings = () => {
        setShowSettings(!showSettings);
    };
    
    // Handler for retrying failed messages
    const handleRetry = useCallback((message) => {
        if (!selectedPeer) return;
        
        setMessages(prev => prev.map(msg => 
            msg.id === message.id ? { ...msg, status: 'sending' } : msg
        ));
        
        const success = webrtcService.sendMessage(message, selectedPeer);
        
        if (success) {
            setMessages(prev => prev.map(msg => 
                msg.id === message.id ? { ...msg, status: 'sent', error: null } : msg
            ));
        } else {
            setMessages(prev => prev.map(msg => 
                msg.id === message.id ? { ...msg, status: 'error', error: 'Failed to send message' } : msg
            ));
        }
    }, [selectedPeer]);
    
    // Handler for marking messages as read
    const handleMarkAsRead = useCallback((message) => {
        if (!selectedPeer) return;
        
        setMessages(prev => prev.map(msg => 
            msg.id === message.id ? { ...msg, status: 'read' } : msg
        ));
        
        webrtcService.sendReadReceipt(message.id, selectedPeer);
    }, [selectedPeer]);
    
    // Handler for deleting messages
    const handleDeleteMessage = useCallback((message) => {
        setMessages(prev => prev.filter(msg => msg.id !== message.id));
        
        if (!isAIChatActive && selectedPeer) {
            webrtcService.sendMessage({
                type: 'DELETE_MESSAGE',
                messageId: message.id,
                sender: currentUser.id,
                timestamp: new Date().toISOString()
            }, selectedPeer);
        }
    }, [selectedPeer, isAIChatActive, currentUser]);
    
    useEffect(() => {
        const savedProfile = JSON.parse(localStorage.getItem('user_profile')) || null;
        if (savedProfile) {
            setUserProfile(savedProfile);
        } else {
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

    const handleReaction = useCallback((messageId, emoji) => {
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
    }, [currentUser, isAIChatActive, selectedPeer]);

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

    // Fetch message history when peer or group changes
    useEffect(() => {
        const fetchMessageHistory = async () => {
            if (!currentUser?.id) return;
            
            try {
                if (selectedPeer && !isAIChatActive) {
                    // Fetch direct messages
                    const { messages: historyMessages, error } = await supabaseService.getDirectMessages(
                        currentUser.id,
                        selectedPeer,
                        50,
                        0
                    );
                    
                    if (!error && historyMessages) {
                        // Transform database messages to UI format
                        const formattedMessages = historyMessages.map(msg => ({
                            id: msg.id,
                            text: msg.content,
                            sender: msg.sender_id,
                            timestamp: msg.created_at,
                            type: msg.message_type || 'CHAT',
                            status: msg.read ? 'read' : (msg.delivered ? 'delivered' : 'sent')
                        })).reverse(); // Reverse to show oldest first
                        
                        setMessages(formattedMessages);
                    }
                } else if (selectedGroup) {
                    // Fetch group messages
                    const { messages: historyMessages, error } = await supabaseService.getGroupMessages(
                        selectedGroup.id,
                        50,
                        0
                    );
                    
                    if (!error && historyMessages) {
                        const formattedMessages = historyMessages.map(msg => ({
                            id: msg.id,
                            text: msg.content,
                            sender: msg.sender_id,
                            timestamp: msg.created_at,
                            type: msg.message_type || 'CHAT',
                            status: 'sent',
                            groupId: msg.group_id
                        })).reverse();
                        
                        setMessages(formattedMessages);
                    }
                }
            } catch (error) {
                console.error('Error fetching message history:', error);
            }
        };
        
        fetchMessageHistory();
    }, [selectedPeer, selectedGroup, isAIChatActive, currentUser]);
    
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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
            type: 'CHAT',
            status: 'sending'
        };

        setMessages(prev => [...prev, messageData]);
        setNewMessage('');
        setMessageCompletion('');
        
        if (isAIChatActive) {
            if (!isAiInitialized) {
                addNotification('Please configure AI settings first', 'error');
                setShowAISettings(true);
                return;
            }

            try {
                // Use real AI service for chat
                const response = await aiService.chatWithAI(newMessage, currentUser?.id);
                const aiMessage = {
                    id: response.id,
                    text: response.content,
                    sender: 'AI_ASSISTANT',
                    timestamp: response.timestamp,
                    type: 'CHAT',
                    status: 'sent',
                    isAI: true
                };
                setMessages(prev => [...prev, aiMessage]);
            } catch (error) {
                console.error('Error getting AI response:', error);
                addNotification('Failed to get AI response. Please check your AI settings.', 'error');
                if (error.message.includes('API key') || error.message.includes('not initialized')) {
                    setShowAISettings(true);
                }
            }
        } else if (selectedPeer) {
            // Send via WebRTC
            const success = webrtcService.sendMessage(messageData, selectedPeer);
            
            // Persist to database
            if (currentUser?.id && persistenceEnabled) {
                try {
                    await supabaseService.saveMessage({
                        senderId: currentUser.id,
                        recipientId: selectedPeer,
                        groupId: null,
                        content: newMessage,
                        type: 'TEXT',
                        parentMessageId: null
                    });
                } catch (error) {
                    console.error('Error persisting message:', error);
                }
            }
            
            if (success) {
                setMessages(prev => prev.map(msg => 
                    msg.id === messageId ? { ...msg, status: 'sent' } : msg
                ));
            } else if (persistenceEnabled) {
                setMessages(prev => prev.map(msg => 
                    msg.id === messageId ? { ...msg, status: 'queued', offline: true } : msg
                ));
            } else {
                setMessages(prev => prev.map(msg => 
                    msg.id === messageId ? { ...msg, status: 'error', error: 'Failed to send message' } : msg
                ));
            }
            
            if (selectedPeer) {
                webrtcService.setTypingStatus(false, selectedPeer);
            }
        } else if (selectedGroup) {
            const groupMessageData = {
                ...messageData,
                groupId: selectedGroup.id
            };
            
            // Send via WebRTC
            const success = webrtcService.sendMessage(groupMessageData);
            
            // Persist to database
            if (currentUser?.id && persistenceEnabled) {
                try {
                    await supabaseService.saveMessage({
                        senderId: currentUser.id,
                        recipientId: null,
                        groupId: selectedGroup.id,
                        content: newMessage,
                        type: 'TEXT',
                        parentMessageId: null
                    });
                } catch (error) {
                    console.error('Error persisting group message:', error);
                }
            }
            
            if (success) {
                setMessages(prev => prev.map(msg => 
                    msg.id === messageId ? { ...msg, status: 'sent' } : msg
                ));
            } else if (persistenceEnabled) {
                setMessages(prev => prev.map(msg => 
                    msg.id === messageId ? { ...msg, status: 'queued', offline: true } : msg
                ));
            } else {
                setMessages(prev => prev.map(msg => 
                    msg.id === messageId ? { ...msg, status: 'error', error: 'Failed to send message' } : msg
                ));
            }
        }

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

    // Memoized filtered messages
    const filteredMessages = useMemo(() => {
        return messages.filter(msg => 
            !searchQuery || 
            (msg.text && msg.text.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [messages, searchQuery]);

    const MessageRow = ({ index, style }) => {
        const message = filteredMessages[index];
        const isAIMessage = isAIChatActive && message.sender === 'AI_ASSISTANT';
        const isSystemMessage = message.isSystemMessage;
        const isEditable = message.sender === currentUser.id && !isAIMessage && !isSystemMessage;
        
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
                                <MessageStatus 
                                    status={message.status} 
                                    timestamp={message.timestamp} 
                                />
                                {message.status === 'error' && (
                                    <div className="message-actions">
                                        <button 
                                            className="retry-button"
                                            onClick={() => handleRetry(message)}
                                        >
                                            Retry
                                        </button>
                                        <button 
                                            className="delete-button"
                                            onClick={() => handleDeleteMessage(message)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                )}
                                {message.offline && <span className="offline-indicator">offline</span>}
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
                    onRetry={handleRetry}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDeleteMessage}
                />
            ))}
        </div>
    ), [filteredMessages, handleReaction, handleRetry, handleMarkAsRead, handleDeleteMessage]);

    const createGroup = async (name, members) => {
        try {
            const result = await webrtcService.createGroup(name, members);
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to create group');
            }
            
            addNotification(`Group "${name}" created successfully`, 'success');
            setActiveGroups(prev => [...prev, result.group]);
            setSelectedGroup(result.group);
        } catch (error) {
            console.error('Error creating group:', error);
            addNotification('Failed to create group', 'error');
        }
    };

    const togglePersistence = () => {
        const newValue = !persistenceEnabled;
        setPersistenceEnabled(newValue);
        webrtcService.enablePersistence(newValue);
        addNotification(`Message persistence ${newValue ? 'enabled' : 'disabled'}`, 'info');
    };

    const handleConnectWithPeers = () => {
        webrtcService.showConnectionDialog();
    };

    // Modified rendering for modals using our LazyComponents
    const renderAISettings = () => {
        if (!showAISettings) return null;
        
        return (
            <Suspense fallback={<Box p={4}>Loading settings...</Box>}>
                <LazyAISettings 
                    onClose={() => setShowAISettings(false)} 
                    addNotification={addNotification} 
                    currentUser={currentUser}
                />
            </Suspense>
        );
    };
    
    const renderProfileModal = () => {
        if (!showProfileModal) return null;
        
        return (
            <Suspense fallback={<Box p={4}>Loading profile...</Box>}>
                <LazyProfile 
                    currentUser={currentUser} 
                    onClose={() => setShowProfileModal(false)} 
                    onProfileUpdate={handleProfileUpdate}
                />
            </Suspense>
        );
    };

    return (
        <Flex 
            direction="column" 
            h="100vh" 
            bg={colorMode === 'dark' ? 'gray.900' : 'gray.50'}
        >
            {/* Chat header */}
            <Flex 
                p={3} 
                bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'} 
                borderBottomWidth="1px"
                borderBottomColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
                alignItems="center"
                boxShadow="sm"
            >
                <Box>
                    <Flex alignItems="center">
                        <Avatar 
                            size="md" 
                            name={isAIChatActive ? "AI" : selectedPeer || "User"} 
                            bg={isAIChatActive ? "purple.500" : "blue.500"}
                            mr={3}
                        />
                        <Box>
                            <Heading size="md">
                                {isAIChatActive ? 'Echo AI Assistant' : userProfile?.displayName || selectedPeer || 'Select a peer'}
                            </Heading>
                            <Flex alignItems="center">
                                <Badge 
                                    colorScheme={isAIChatActive ? "purple" : "blue"}
                                    variant="subtle"
                                    fontSize="xs"
                                    px={2}
                                    py={0.5}
                                    borderRadius="full"
                                >
                                    {isAIChatActive ? '🤖 AI Chat' : '👥 Peer Chat'}
                                </Badge>
                                {!isAIChatActive && typingStatus[selectedPeer] && (
                                    <Text ml={2} fontSize="xs" color="gray.500" fontStyle="italic">
                                        typing...
                                    </Text>
                                )}
                            </Flex>
                        </Box>
                    </Flex>
                </Box>
                <Spacer />
                <HStack spacing={1}>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => navigate('/dashboard')}
                        colorScheme="blue"
                        borderRadius="full"
                        _hover={{ bg: colorMode === 'dark' ? 'blue.800' : 'blue.50' }}
                    >
                        Dashboard
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/github')}
                        colorScheme="blue"
                        borderRadius="full"
                        _hover={{ bg: colorMode === 'dark' ? 'blue.800' : 'blue.50' }}
                    >
                        GitHub
                    </Button>
                    <IconButton
                        aria-label="Settings"
                        icon={'⚙️'}
                        variant="ghost"
                        borderRadius="full"
                        onClick={() => setShowSettings(!showSettings)}
                    />
                </HStack>
            </Flex>

            {/* Chat content area */}
            <Flex flex="1" overflow="hidden">
                <Box 
                    w="250px" 
                    bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'} 
                    p={4}
                    borderRightWidth="1px"
                    borderRightColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
                    overflowY="auto"
                    display={{ base: 'none', md: 'block' }}
                >
                    <VStack spacing={4} align="stretch">
                        <Box>
                            <Heading size="sm" mb={2} color={colorMode === 'dark' ? 'blue.200' : 'blue.600'}>Your ID</Heading>
                            <Flex 
                                bg={colorMode === 'dark' ? 'gray.700' : 'gray.50'} 
                                p={2} 
                                borderRadius="md"
                                alignItems="center"
                                justifyContent="space-between"
                                borderWidth="1px"
                                borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                            >
                                <Text fontSize="sm" fontFamily="monospace" isTruncated>
                                    {currentUser?.id || '380b5d29-aed6-4904-891a-5d0a39b2e4df'}
                                </Text>
                                <IconButton
                                    aria-label="Copy ID"
                                    icon={'📋'}
                                    size="xs"
                                    variant="ghost"
                                    onClick={() => {
                                        navigator.clipboard.writeText(currentUser?.id);
                                        toast({
                                            title: "ID copied to clipboard",
                                            status: "success",
                                            duration: 2000,
                                        });
                                    }}
                                />
                            </Flex>
                        </Box>
                        
                        <Box 
                            p={3} 
                            bg={colorMode === 'dark' ? 'gray.700' : 'blue.50'} 
                            borderRadius="md"
                            borderWidth="1px"
                            borderColor={colorMode === 'dark' ? 'gray.600' : 'blue.100'}
                        >
                            <Heading size="sm" mb={2} color={colorMode === 'dark' ? 'blue.200' : 'blue.600'}>Connect with Others</Heading>
                            <Text fontSize="xs" mb={2}>1. Share your ID with friends</Text>
                            <Text fontSize="xs" mb={2}>2. Or enter their ID below to connect</Text>
                            <Input 
                                placeholder="Paste friend's ID here" 
                                size="sm" 
                                mb={2}
                                bg={colorMode === 'dark' ? 'gray.600' : 'white'}
                                borderColor={colorMode === 'dark' ? 'gray.500' : 'gray.300'}
                            />
                            <Button 
                                colorScheme="blue" 
                                size="sm" 
                                width="full"
                                borderRadius="md"
                            >
                                Connect
                            </Button>
                        </Box>
                        
                        <Divider borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'} />
                        
                        <Box>
                            <Heading size="sm" mb={2} color={colorMode === 'dark' ? 'blue.200' : 'blue.600'}>
                                Welcome to Echo Link! 👋
                            </Heading>
                            <Text fontSize="xs" mb={2} fontWeight="medium">To start chatting:</Text>
                            <Box fontSize="xs" color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}>
                                <HStack mb={1}>
                                    <Text>1.</Text>
                                    <Text>Copy your ID using the button above</Text>
                                </HStack>
                                <HStack mb={1}>
                                    <Text>2.</Text>
                                    <Text>Share it with your friends</Text>
                                </HStack>
                                <HStack mb={1}>
                                    <Text>3.</Text>
                                    <Text>Ask them to paste it in their connect field</Text>
                                </HStack>
                                <HStack mb={1}>
                                    <Text>4.</Text>
                                    <Text>Or paste their ID in your connect field</Text>
                                </HStack>
                            </Box>
                        </Box>
                    </VStack>
                </Box>

                {/* Chat messages area */}
                <Flex 
                    flex="1" 
                    direction="column" 
                    p={4}
                    overflowY="auto"
                    bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
                >
                    {filteredMessages.length === 0 ? (
                        <Flex 
                            direction="column" 
                            alignItems="center" 
                            justifyContent="center" 
                            textAlign="center"
                            height="100%"
                        >
                            <Box 
                                fontSize="5xl" 
                                mb={4} 
                                bg={colorMode === 'dark' ? 'gray.700' : 'blue.50'} 
                                p={5} 
                                borderRadius="full"
                                color={colorMode === 'dark' ? 'blue.200' : 'blue.500'}
                            >
                                👋
                            </Box>
                            <Heading size="md" mb={2} color={colorMode === 'dark' ? 'blue.200' : 'blue.600'}>
                                Start a conversation
                            </Heading>
                            <Text mb={4} color={colorMode === 'dark' ? 'gray.400' : 'gray.600'} maxWidth="400px">
                                Connect with someone to chat or try out the AI assistant. Your messages will appear here.
                            </Text>
                            <HStack spacing={4}>
                                <Button 
                                    colorScheme="blue" 
                                    borderRadius="full"
                                    boxShadow="md"
                                    leftIcon="👥"
                                    onClick={handleConnectWithPeers}
                                    _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                                    transition="all 0.2s"
                                >
                                    Connect
                                </Button>
                                <Button 
                                    colorScheme="purple" 
                                    borderRadius="full"
                                    boxShadow="md"
                                    leftIcon="🤖"
                                    onClick={() => navigate('/ai')}
                                    _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                                    transition="all 0.2s"
                                >
                                    Try AI Chat
                                </Button>
                            </HStack>
                        </Flex>
                    ) : (
                        <VStack spacing={2} align="stretch">
                            {filteredMessages.map(message => (
                                <MessageItem
                                    key={message.id}
                                    message={message}
                                    onReaction={handleReaction}
                                    onRetry={handleRetry}
                                    onMarkAsRead={handleMarkAsRead}
                                    onDelete={handleDeleteMessage}
                                />
                            ))}
                            <div ref={messagesEndRef} />
                        </VStack>
                    )}
                </Flex>

                {/* New right sidebar */}
                <Box 
                    w="280px" 
                    bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'} 
                    p={4}
                    borderLeftWidth="1px"
                    borderLeftColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
                    overflowY="auto"
                    display={{ base: 'none', lg: 'block' }}
                >
                    <VStack spacing={4} align="stretch">
                        {/* Contact info */}
                        {selectedPeer && (
                            <Box 
                                p={3} 
                                bg={colorMode === 'dark' ? 'gray.700' : 'blue.50'} 
                                borderRadius="md"
                                borderWidth="1px"
                                borderColor={colorMode === 'dark' ? 'gray.600' : 'blue.100'}
                            >
                                <Heading size="sm" mb={3} color={colorMode === 'dark' ? 'blue.200' : 'blue.600'}>
                                    Contact Info
                                </Heading>
                                <VStack align="start" spacing={2}>
                                    <HStack>
                                        <Text fontSize="xs" fontWeight="bold">Name:</Text>
                                        <Text fontSize="xs">{userProfile?.displayName || selectedPeer}</Text>
                                    </HStack>
                                    <HStack>
                                        <Text fontSize="xs" fontWeight="bold">Status:</Text>
                                        <Badge colorScheme="green" fontSize="xs">Online</Badge>
                                    </HStack>
                                    <HStack>
                                        <Text fontSize="xs" fontWeight="bold">ID:</Text>
                                        <Text fontSize="xs" isTruncated>{selectedPeer}</Text>
                                    </HStack>
                                </VStack>
                            </Box>
                        )}

                        {/* Mini AI Chat */}
                        <Suspense fallback={<Box p={2} textAlign="center"><Spinner size="sm" /></Box>}>
                            <LazyMiniAIChat />
                        </Suspense>

                        {/* Code Execution Panel */}
                        <Suspense fallback={<Box p={2} textAlign="center"><Spinner size="sm" /></Box>}>
                            <LazyCodeExecutionPanel onShareCode={handleShareCode} />
                        </Suspense>

                        {/* Voice Message Recorder */}
                        <Suspense fallback={<Box p={2} textAlign="center"><Spinner size="sm" /></Box>}>
                            <LazyVoiceMessageRecorder onSendVoiceMessage={handleVoiceTranscription} />
                        </Suspense>

                        {/* Collaborative Whiteboard */}
                        <Suspense fallback={<Box p={2} textAlign="center"><Spinner size="sm" /></Box>}>
                            <LazyCollaborativeWhiteboard onShareWhiteboard={(blob, filename) => {
                                // Handle sharing whiteboard image
                                // For now, just create a message with the image
                                const reader = new FileReader();
                                reader.readAsDataURL(blob);
                                reader.onloadend = () => {
                                    const base64data = reader.result;
                                    const newMessage = {
                                        id: uuidv4(),
                                        sender: 'user',
                                        text: `Shared whiteboard: ${filename}`,
                                        timestamp: new Date().toISOString(),
                                        type: 'IMAGE',
                                        imageData: base64data
                                    };
                                    setMessages(prev => [...prev, newMessage]);
                                    scrollToBottom();
                                };
                            }} />
                        </Suspense>

                        {/* Quick actions */}
                        <Box>
                            <Heading size="sm" mb={2} color={colorMode === 'dark' ? 'blue.200' : 'blue.600'}>
                                Quick Actions
                            </Heading>
                            <VStack spacing={2}>
                                <Button
                                    leftIcon={'📁'}
                                    colorScheme="blue"
                                    variant="outline"
                                    size="sm"
                                    width="full"
                                    justifyContent="flex-start"
                                    onClick={() => fileInputRef.current?.click()}
                                    borderRadius="md"
                                    bg={colorMode === 'dark' ? 'gray.700' : 'blue.50'}
                                >
                                    Send a file
                                </Button>
                                <Button
                                    leftIcon={'💻'}
                                    colorScheme="purple"
                                    variant="outline"
                                    size="sm"
                                    width="full"
                                    justifyContent="flex-start"
                                    onClick={() => setCodeEditor({ ...codeEditor, visible: true })}
                                    borderRadius="md"
                                    bg={colorMode === 'dark' ? 'gray.700' : 'blue.50'}
                                >
                                    Share code
                                </Button>
                                <Button
                                    leftIcon={'🔄'}
                                    colorScheme="green"
                                    variant="outline"
                                    size="sm"
                                    width="full"
                                    justifyContent="flex-start"
                                    onClick={() => setShowAISettings(true)}
                                    borderRadius="md"
                                    bg={colorMode === 'dark' ? 'gray.700' : 'blue.50'}
                                >
                                    AI settings
                                </Button>
                                <Button
                                    leftIcon={'📊'}
                                    colorScheme="orange"
                                    variant="outline"
                                    size="sm"
                                    width="full"
                                    justifyContent="flex-start"
                                    onClick={() => navigate('/dashboard')}
                                    borderRadius="md"
                                    bg={colorMode === 'dark' ? 'gray.700' : 'blue.50'}
                                >
                                    View stats
                                </Button>
                            </VStack>
                        </Box>
                        
                        {/* Media shared section */}
                        <Box>
                            <Heading size="sm" mb={2} color={colorMode === 'dark' ? 'blue.200' : 'blue.600'}>
                                Shared Media
                            </Heading>
                            <Grid templateColumns="repeat(3, 1fr)" gap={2}>
                                {filteredMessages
                                    .filter(msg => msg.type === 'FILE_META')
                                    .slice(0, 6)
                                    .map((file, index) => (
                                        <Box 
                                            key={index}
                                            bg={colorMode === 'dark' ? 'gray.700' : 'blue.50'} 
                                            borderRadius="md"
                                            p={2}
                                            textAlign="center"
                                        >
                                            <Text fontSize="xl">📄</Text>
                                            <Text fontSize="xs" isTruncated>{file.name}</Text>
                                        </Box>
                                    ))}
                                {filteredMessages.filter(msg => msg.type === 'FILE_META').length === 0 && (
                                    <Text fontSize="xs" color="gray.500">No media shared yet</Text>
                                )}
                            </Grid>
                        </Box>

                        {/* Smart suggestions */}
                        {isAiInitialized && (
                            <Box>
                                <Heading size="sm" mb={2} color={colorMode === 'dark' ? 'blue.200' : 'blue.600'}>
                                    Smart Suggestions
                                </Heading>
                                <VStack align="stretch" spacing={2}>
                                    {smartReplies.length > 0 ? (
                                        smartReplies.map((reply, index) => (
                                            <Button
                                                key={index}
                                                size="xs"
                                                variant="outline"
                                                colorScheme="blue"
                                                onClick={() => {
                                                    setNewMessage(reply);
                                                    // Focus the input after setting the message
                                                    setTimeout(() => document.querySelector('input[placeholder="Type a message..."]').focus(), 0);
                                                }}
                                            >
                                                {reply}
                                            </Button>
                                        ))
                                    ) : (
                                        <Text fontSize="xs" color="gray.500">
                                            AI will suggest replies based on conversation context
                                        </Text>
                                    )}
                                </VStack>
                            </Box>
                        )}

                        {/* Code snippets */}
                        <Box>
                            <Heading size="sm" mb={2} color={colorMode === 'dark' ? 'blue.200' : 'blue.600'}>
                                Recent Code Snippets
                            </Heading>
                            {filteredMessages.filter(msg => msg.type === 'CODE_SHARE').length > 0 ? (
                                filteredMessages
                                    .filter(msg => msg.type === 'CODE_SHARE')
                                    .slice(0, 2)
                                    .map((snippet, index) => (
                                        <Box 
                                            key={index}
                                            bg={colorMode === 'dark' ? 'gray.700' : 'blue.50'} 
                                            borderRadius="md"
                                            p={2}
                                            mb={2}
                                            fontSize="xs"
                                            cursor="pointer"
                                            onClick={() => setCodeEditor({
                                                visible: true,
                                                language: snippet.language,
                                                code: snippet.code
                                            })}
                                        >
                                            <Flex justifyContent="space-between" mb={1}>
                                                <Badge colorScheme="purple">{snippet.language}</Badge>
                                                <Text fontSize="xs">{new Date(snippet.timestamp).toLocaleTimeString()}</Text>
                                            </Flex>
                                            <Box 
                                                bg={colorMode === 'dark' ? 'gray.600' : 'blue.100'} 
                                                p={1} 
                                                borderRadius="sm"
                                                fontFamily="monospace"
                                                noOfLines={3}
                                            >
                                                {snippet.code.substring(0, 100)}
                                                {snippet.code.length > 100 && '...'}
                                            </Box>
                                        </Box>
                                    ))
                            ) : (
                                <Text fontSize="xs" color="gray.500">No code snippets shared yet</Text>
                            )}
                        </Box>

                        {/* Search messages */}
                        <Box>
                            <Heading size="sm" mb={2} color={colorMode === 'dark' ? 'blue.200' : 'blue.600'}>
                                Search Messages
                            </Heading>
                            <InputGroup size="sm">
                                <Input
                                    placeholder="Search in conversation..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    bg={colorMode === 'dark' ? 'gray.700' : 'blue.50'}
                                    borderColor={colorMode === 'dark' ? 'gray.600' : 'blue.200'}
                                    _focus={{ 
                                        borderColor: 'blue.400', 
                                        boxShadow: `0 0 0 1px ${colorMode === 'dark' ? 'blue.400' : 'blue.400'}`
                                    }}
                                />
                                <InputRightElement>
                                    {'🔍'}
                                </InputRightElement>
                            </InputGroup>
                        </Box>

                        {/* Coding Platforms Integration */}
                        <CodingPlatformsTab />

                    </VStack>
                </Box>
            </Flex>

            {/* Message input */}
            <Box 
                p={3} 
                bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'} 
                borderTopWidth="1px"
                borderTopColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
            >
                <Flex>
                    <InputGroup size="md">
                        <Input
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={handleInputChange}
                            onKeyPress={handleKeyPress}
                            bg={colorMode === 'dark' ? 'gray.700' : 'blue.50'}
                            borderColor={colorMode === 'dark' ? 'gray.600' : 'blue.200'}
                            _focus={{ 
                                borderColor: 'blue.400', 
                                boxShadow: `0 0 0 1px ${colorMode === 'dark' ? 'blue.400' : 'blue.400'}`
                            }}
                            borderRadius="full"
                            pr="4.5rem"
                        />
                        <InputRightElement width="4.5rem">
                            <Button 
                                h="1.75rem" 
                                size="sm" 
                                colorScheme="blue"
                                onClick={handleSendMessage}
                                isDisabled={!newMessage.trim()}
                                borderRadius="full"
                            >
                                Send
                            </Button>
                        </InputRightElement>
                    </InputGroup>
                </Flex>
                
                {/* Message persistence toggle */}
                <Flex justifyContent="flex-end" mt={2}>
                    <Button
                        size="xs"
                        variant={persistenceEnabled ? "solid" : "outline"}
                        colorScheme={persistenceEnabled ? "green" : "gray"}
                        onClick={togglePersistence}
                        borderRadius="full"
                    >
                        {persistenceEnabled ? "Persistence: On" : "Persistence: Off"}
                    </Button>
                </Flex>
            </Box>

            {/* Modals with lazy loading */}
            {renderAISettings()}
            {renderProfileModal()}

            {/* Connection status indicator */}
            {connectionState !== 'connected' && (
                <Box 
                    position="fixed" 
                    bottom="4" 
                    left="50%" 
                    transform="translateX(-50%)"
                    bg={connectionState === 'reconnecting' ? 'yellow.500' : 'red.500'}
                    color="white"
                    px={4}
                    py={2}
                    borderRadius="full"
                    boxShadow="md"
                >
                    {connectionState === 'reconnecting' ? 'Reconnecting...' : 'Connection error. Working offline.'}
                </Box>
            )}

            {/* Credits */}
            <Box
                position="fixed"
                bottom="2"
                right="2"
                fontSize="xs"
                color={colorMode === 'dark' ? 'gray.500' : 'gray.600'}
                textAlign="right"
                zIndex="1"
            >
                <Text>
                    Enhanced by <Text as="span" fontWeight="bold">SREE VARSHAN V</Text>
                </Text>
                <Text>
                    <a 
                        href="https://github.com/sreevarshan-xenoz" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'underline' }}
                    >
                        github.com/sreevarshan-xenoz
                    </a>
                </Text>
            </Box>
        </Flex>
    );
};

export default Chat;