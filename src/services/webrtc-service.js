import { v4 as uuidv4 } from 'uuid';
import io from 'socket.io-client';
import * as supabaseService from './supabase-service';

class WebRTCService {
    constructor() {
        // Get the local IP address from the window.location or default to localhost
        const serverIP = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
        this.socket = io(`http://${serverIP}:5000`);
        
        this.connections = new Map(); // PeerId -> RTCPeerConnection
        this.dataChannels = new Map(); // PeerId -> RTCDataChannel
        this.messageHandlers = new Set();
        this.connectionStateHandlers = new Set();
        this.peerId = uuidv4();
        this.typingStatus = new Map(); // Track typing status
        this.pendingMessages = new Map(); // Messages waiting to be sent when connection is established
        this.offlineRecipients = new Set(); // Track offline recipients
        this.groupConnections = new Map(); // GroupId -> Set of peer IDs
        this.isAuthenticated = false;
        this.userId = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 2000; // Start with 2 seconds
        this.maxReconnectInterval = 60000; // Max 1 minute
        
        // Enhanced ICE server configuration with TURN servers
        this.configuration = {
            iceServers: [
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { 
                    urls: 'turn:numb.viagenie.ca',
                    username: 'webrtc@live.com',
                    credential: 'muazkh'
                },
                {
                    urls: 'turn:turn.anyfirewall.com:443?transport=tcp',
                    username: 'webrtc',
                    credential: 'webrtc'
                }
            ],
            iceTransportPolicy: 'all',
            iceCandidatePoolSize: 10
        };

        // Initialize socket event listeners
        this.socket.on('connect', () => {
            console.log('Connected to signaling server');
            this.reconnectAttempts = 0;
            this.reconnectInterval = 2000;
            this.socket.emit('user_connected', { peerId: this.peerId, userId: this.userId });
            
            // Process any pending messages
            this.processPendingMessages();
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from signaling server');
            this.attemptReconnect();
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.notifyConnectionState({
                type: 'error',
                detail: 'Signaling server connection error',
                error
            });
        });

        this.socket.on('user_status_change', (data) => {
            // Update our list of offline recipients
            if (data.status === 'offline') {
                this.offlineRecipients.add(data.userId);
            } else {
                this.offlineRecipients.delete(data.userId);
            }
            
            this.broadcastMessage({
                type: data.status === 'online' ? 'PEER_CONNECTED' : 'PEER_DISCONNECTED',
                peerId: data.userId
            });
            
            this.notifyConnectionState({
                type: 'peerStatus',
                peerId: data.userId,
                status: data.status
            });
        });

        // Handle offer messages for connection establishment
        this.socket.on('offer', async (data) => {
            try {
                await this.handleOffer(data.offer, data.senderId);
            } catch (error) {
                console.error('Error handling offer:', error);
                this.notifyConnectionState({
                    type: 'error',
                    detail: 'Error handling connection offer',
                    peerId: data.senderId,
                    error
                });
            }
        });

        // Handle answer messages for connection establishment
        this.socket.on('answer', async (data) => {
            try {
                await this.handleAnswer(data.answer, data.senderId);
            } catch (error) {
                console.error('Error handling answer:', error);
                this.notifyConnectionState({
                    type: 'error',
                    detail: 'Error handling connection answer',
                    peerId: data.senderId,
                    error
                });
            }
        });

        // Handle ICE candidate messages for connection establishment
        this.socket.on('ice_candidate', async (data) => {
            try {
                await this.handleIceCandidate(data.candidate, data.senderId);
            } catch (error) {
                console.error('Error handling ICE candidate:', error);
            }
        });

        // Initialize encryption key
        this.initializeEncryption();

        const MESSAGE_BATCH_SIZE = 50;
        const MESSAGE_BATCH_INTERVAL = 100; // ms
        let messageBatch = [];
        let batchTimeout = null;

        const processBatch = () => {
            if (messageBatch.length > 0) {
                const batch = messageBatch;
                messageBatch = [];
                batch.forEach(message => {
                    this.messageHandlers.forEach(handler => handler(message));
                });
            }
        };

        const addMessageToBatch = (message) => {
            messageBatch.push(message);
            if (messageBatch.length >= MESSAGE_BATCH_SIZE) {
                if (batchTimeout) {
                    clearTimeout(batchTimeout);
                }
                processBatch();
            } else if (!batchTimeout) {
                batchTimeout = setTimeout(() => {
                    batchTimeout = null;
                    processBatch();
                }, MESSAGE_BATCH_INTERVAL);
            }
        };

        // Debounce connection checks
        const debounce = (func, wait) => {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        };

        const debouncedCheckConnection = debounce(async (peer) => {
            try {
                const pc = this.connections.get(peer);
                if (!pc) return false;
                
                const stats = await pc.getStats();
                let isConnected = false;
                stats.forEach(report => {
                    if (report.type === "candidate-pair" && report.state === "succeeded") {
                        isConnected = true;
                    }
                });
                return isConnected;
            } catch (error) {
                console.error('Connection check failed:', error);
                return false;
            }
        }, 1000);

        // Update message handling
        const handleMessage = (message) => {
            addMessageToBatch(message);
        };

        // Update connection management
        const CONNECTION_CHECK_INTERVAL = 5000;
        let connectionCheckInterval;

        const startConnectionChecks = () => {
            if (connectionCheckInterval) return;
            connectionCheckInterval = setInterval(() => {
                Array.from(this.connections.keys()).forEach(peer => {
                    debouncedCheckConnection(peer);
                });
            }, CONNECTION_CHECK_INTERVAL);
        };

        const stopConnectionChecks = () => {
            if (connectionCheckInterval) {
                clearInterval(connectionCheckInterval);
                connectionCheckInterval = null;
            }
        };
        
        // Start connection checks
        startConnectionChecks();
    }

    async attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.notifyConnectionState({
                type: 'error',
                detail: 'Max reconnection attempts reached for signaling server',
                fatal: true
            });
            return;
        }

        this.reconnectAttempts++;
        const timeout = Math.min(this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1), this.maxReconnectInterval);
        
        this.notifyConnectionState({
            type: 'reconnecting',
            attempt: this.reconnectAttempts,
            maxAttempts: this.maxReconnectAttempts,
            nextAttemptIn: timeout
        });
        
        setTimeout(() => {
            if (!this.socket.connected) {
                this.socket.connect();
            }
        }, timeout);
    }

    setUserId(userId) {
        this.userId = userId;
        this.isAuthenticated = !!userId;
        if (this.socket.connected && userId) {
            this.socket.emit('user_connected', { peerId: this.peerId, userId });
        }
    }

    async initialize() {
        try {
            // Check WebRTC support
            if (!window.RTCPeerConnection) {
                throw new Error('WebRTC is not supported in this browser');
            }

            // Create a test connection to verify STUN servers
            const testConnection = new RTCPeerConnection(this.configuration);
            await this.checkStunConnectivity(testConnection);
            testConnection.close();

            console.log('WebRTC Service initialized with ID:', this.peerId);
            
            // Start the connection status heartbeat
            this.startConnectionHeartbeat();
            
            return true;
        } catch (error) {
            console.error('Failed to initialize WebRTC:', error);
            this.notifyConnectionState({
                type: 'error',
                detail: 'Failed to initialize WebRTC service',
                error
            });
            throw error;
        }
    }

    async checkStunConnectivity(connection = null) {
        try {
            const pc = connection || new RTCPeerConnection(this.configuration);
            
            return new Promise((resolve, reject) => {
                let timeout = setTimeout(() => {
                    pc.close();
                    reject(new Error('STUN connectivity check timeout'));
                }, 2000);

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        clearTimeout(timeout);
                        if (!connection) pc.close();
                        resolve(true);
                    }
                };

                // Create a data channel to trigger ICE candidate gathering
                pc.createDataChannel('test');
                pc.createOffer()
                    .then(offer => pc.setLocalDescription(offer))
                    .catch(err => {
                        clearTimeout(timeout);
                        if (!connection) pc.close();
                        reject(err);
                    });
            });
        } catch (error) {
            console.error('STUN connectivity check failed:', error);
            return false;
        }
    }

    async initializeEncryption() {
        // Generate encryption key using Web Crypto API
        const key = await window.crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256
            },
            true,
            ["encrypt", "decrypt"]
        );
        this.encryptionKey = key;
    }

    async encryptMessage(message) {
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(message));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        
        const encryptedData = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            this.encryptionKey,
            data
        );

        return {
            data: Array.from(new Uint8Array(encryptedData)),
            iv: Array.from(iv)
        };
    }

    async decryptMessage(encryptedMessage) {
        const decryptedData = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: new Uint8Array(encryptedMessage.iv)
            },
            this.encryptionKey,
            new Uint8Array(encryptedMessage.data)
        );

        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decryptedData));
    }

    async startVoiceRecording() {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks = [];

        mediaRecorder.addEventListener("dataavailable", event => {
            audioChunks.push(event.data);
        });

        mediaRecorder.addEventListener("stop", async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            this.lastRecordedAudio = { blob: audioBlob, url: audioUrl };
        });

        mediaRecorder.start();
        return mediaRecorder;
    }

    async shareFile(file, peerId) {
        const buffer = await file.arrayBuffer();
        const chunkSize = 16384; // 16KB chunks
        const chunks = Math.ceil(buffer.byteLength / chunkSize);
        const fileId = uuidv4();

        // Send file metadata
        this.sendMessage({
            type: 'FILE_META',
            fileId: fileId,
            name: file.name,
            size: file.size,
            chunks: chunks,
            mimeType: file.type
        }, peerId);

        // Send file chunks
        for (let i = 0; i < chunks; i++) {
            const chunk = buffer.slice(i * chunkSize, (i + 1) * chunkSize);
            this.sendMessage({
                type: 'FILE_CHUNK',
                fileId: fileId,
                chunk: Array.from(new Uint8Array(chunk)),
                index: i
            }, peerId);
        }
    }

    setTypingStatus(isTyping, peerId) {
        this.sendMessage({
            type: 'TYPING_STATUS',
            isTyping: isTyping
        }, peerId);
    }

    addReaction(messageId, reaction, peerId) {
        this.sendMessage({
            type: 'REACTION',
            messageId: messageId,
            reaction: reaction
        }, peerId);
    }

    createPeerConnection(peerId) {
        if (this.connections.has(peerId)) {
            return this.connections.get(peerId);
        }

        try {
            const peerConnection = new RTCPeerConnection(this.configuration);
            
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    this.socket.emit('ice_candidate', {
                        candidate: event.candidate,
                        recipientId: peerId,
                        senderId: this.peerId
                    });
                }
            };

            peerConnection.oniceconnectionstatechange = () => {
                const state = peerConnection.iceConnectionState;
                console.log(`ICE connection state with ${peerId}: ${state}`);
                
                this.notifyConnectionState({
                    type: 'iceConnectionState',
                    peerId,
                    state
                });
                
                if (state === 'failed' || state === 'disconnected') {
                    this.handleConnectionFailure(peerId, peerConnection);
                } else if (state === 'connected') {
                    // Connection established, try to send any pending messages
                    this.processPendingMessagesForPeer(peerId);
                }
            };
            
            peerConnection.onconnectionstatechange = () => {
                const state = peerConnection.connectionState;
                console.log(`Connection state with ${peerId}: ${state}`);
                
                this.notifyConnectionState({
                    type: 'connectionState',
                    peerId,
                    state
                });
                
                if (state === 'failed' || state === 'disconnected') {
                    this.handleConnectionFailure(peerId, peerConnection);
                } else if (state === 'connected') {
                    // Connection established, try to send any pending messages
                    this.processPendingMessagesForPeer(peerId);
                }
            };
            
            // Create data channel
            const dataChannel = peerConnection.createDataChannel('chat', {
                ordered: true
            });
            
            this.setupDataChannel(dataChannel, peerId);
            
            // Handle incoming data channels
            peerConnection.ondatachannel = (event) => {
                this.setupDataChannel(event.channel, peerId);
            };

            this.connections.set(peerId, peerConnection);
            return peerConnection;
        } catch (error) {
            console.error(`Error creating peer connection with ${peerId}:`, error);
            this.notifyConnectionState({
                type: 'error',
                detail: 'Error creating peer connection',
                peerId,
                error
            });
            throw error;
        }
    }

    handleConnectionFailure(peerId, peerConnection) {
        // Check if it's worth trying to restart ICE
        if (peerConnection.restartIce) {
            console.log(`Attempting ICE restart for peer ${peerId}`);
            try {
                peerConnection.restartIce();
                
                // Create a new offer with ICE restart flag if we're the initiator
                this.initiateConnection(peerId, true);
                
                return; // Exit early to give ICE restart a chance
            } catch (error) {
                console.error(`ICE restart failed for peer ${peerId}:`, error);
            }
        }
        
        // If ICE restart isn't supported or fails, recreate the connection
        console.log(`Recreating connection with peer ${peerId}`);
        this.closeConnection(peerId);
        
        // Queue connection re-establishment
        setTimeout(() => {
            this.initiateConnection(peerId);
        }, 1000);
    }

    closeConnection(peerId) {
        const connection = this.connections.get(peerId);
        if (connection) {
            // Close all data channels
            if (this.dataChannels.has(peerId)) {
                const channels = this.dataChannels.get(peerId);
                if (Array.isArray(channels)) {
                    channels.forEach(channel => {
                        if (channel.readyState !== 'closed') {
                            channel.close();
                        }
                    });
                } else if (channels && channels.readyState !== 'closed') {
                    channels.close();
                }
                this.dataChannels.delete(peerId);
            }
            
            // Close the connection
            if (connection.signalingState !== 'closed') {
                connection.close();
            }
            this.connections.delete(peerId);
        }
    }

    setupDataChannel(dataChannel, peerId) {
        dataChannel.onopen = () => {
            console.log(`Data channel with ${peerId} opened`);
            this.notifyConnectionState({
                type: 'dataChannelState',
                peerId,
                state: 'open'
            });
            
            // Process any pending messages for this peer
            this.processPendingMessagesForPeer(peerId);
        };

        dataChannel.onclose = () => {
            console.log(`Data channel with ${peerId} closed`);
            this.notifyConnectionState({
                type: 'dataChannelState',
                peerId,
                state: 'closed'
            });
        };
        
        dataChannel.onerror = (error) => {
            console.error(`Data channel error with ${peerId}:`, error);
            this.notifyConnectionState({
                type: 'dataChannelState',
                peerId,
                state: 'error',
                error
            });
        };
        
        dataChannel.onmessage = async (event) => {
            try {
                const encryptedMessage = JSON.parse(event.data);
                const message = await this.decryptMessage(encryptedMessage);
                
                // Process received message
                this.processReceivedMessage(message, peerId);
            } catch (error) {
                console.error('Error processing message:', error);
            }
        };
        
        // Store the data channel
        if (!this.dataChannels.has(peerId)) {
            this.dataChannels.set(peerId, []);
        }
        this.dataChannels.get(peerId).push(dataChannel);
    }

    async processReceivedMessage(message, peerId) {
        // Handle delivery receipts
        if (message.type === 'DELIVERY_RECEIPT') {
            // Update UI for delivered message
            this.messageHandlers.forEach(handler => handler({
                type: 'DELIVERY_RECEIPT',
                messageId: message.messageId,
                peerId: message.sender
            }));
            return;
        }
        
        // Handle read receipts
        if (message.type === 'READ_RECEIPT') {
            // Update UI for read message
            this.messageHandlers.forEach(handler => handler({
                type: 'READ_RECEIPT',
                messageId: message.messageId,
                peerId: message.sender
            }));
            return;
        }
        
        // For regular messages, send a delivery receipt
        if (message.id) {
            this.sendDeliveryReceipt(message.id, peerId);
        }
        
        // Process the received message
        this.messageHandlers.forEach(handler => handler(message));
        
        // If we have persistence enabled and user is authenticated, save to database
        if (this.isAuthenticated && this.isPersistenceEnabled && message.type === 'CHAT') {
            try {
                await this.saveMessageToDb(message, peerId);
            } catch (error) {
                console.error('Error saving message to database:', error);
            }
        }
    }

    async saveMessageToDb(message, peerId) {
        try {
            // Encrypt the message content for storage
            const { data: encryptedData, iv } = await this.encryptMessage({
                text: message.text,
                timestamp: message.timestamp,
                sender: message.sender,
                additional: message.additional
            });
            
            // Save to Supabase
            const result = await supabaseService.saveMessage({
                senderId: message.sender,
                recipientId: message.sender === this.userId ? peerId : this.userId,
                encryptedContent: JSON.stringify(encryptedData),
                encryptionIv: JSON.stringify(iv),
                type: message.type || 'TEXT',
                parentMessageId: message.parentId || null
            });
            
            if (result.error) {
                throw result.error;
            }
            
            return result.data;
        } catch (error) {
            console.error('Error saving message to database:', error);
            throw error;
        }
    }

    sendDeliveryReceipt(messageId, peerId) {
        const receipt = {
            type: 'DELIVERY_RECEIPT',
            messageId,
            sender: this.userId || this.peerId,
            timestamp: new Date().toISOString()
        };
        
        this.sendMessage(receipt, peerId);
    }

    sendReadReceipt(messageId, peerId) {
        const receipt = {
            type: 'READ_RECEIPT',
            messageId,
            sender: this.userId || this.peerId,
            timestamp: new Date().toISOString()
        };
        
        this.sendMessage(receipt, peerId);
    }

    async initiateConnection(peerId, iceRestart = false) {
        try {
            console.log(`Initiating connection with peer ${peerId}`);
            
            // Create peer connection if it doesn't exist
            const peerConnection = this.createPeerConnection(peerId);
            
            // Create an offer with ICE restart if needed
            const offer = await peerConnection.createOffer({
                iceRestart: iceRestart,
                offerToReceiveAudio: false,
                offerToReceiveVideo: false
            });
            
            await peerConnection.setLocalDescription(offer);
            
            // Send the offer to the peer via the signaling server
            this.socket.emit('offer', {
                offer: peerConnection.localDescription,
                recipientId: peerId,
                senderId: this.peerId
            });
            
            this.notifyConnectionState({
                type: 'connecting',
                peerId,
                initiator: true
            });
            
            return true;
        } catch (error) {
            console.error(`Error initiating connection with peer ${peerId}:`, error);
            this.notifyConnectionState({
                type: 'error',
                detail: 'Error initiating connection',
                peerId,
                error
            });
            return false;
        }
    }

    async handleOffer(offer, senderId) {
        try {
            const peerConnection = this.createPeerConnection(senderId);
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            return answer;
        } catch (error) {
            console.error('Error handling offer:', error);
            throw error;
        }
    }

    async handleAnswer(answer, senderId) {
        try {
            const peerConnection = this.connections.get(senderId);
            if (peerConnection) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            }
        } catch (error) {
            console.error('Error handling answer:', error);
            throw error;
        }
    }

    async handleIceCandidate(candidate, senderId) {
        try {
            const peerConnection = this.connections.get(senderId);
            if (peerConnection) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
            throw error;
        }
    }

    sendMessage(message, peerId = null) {
        // For group messages
        if (message.groupId) {
            return this.sendGroupMessage(message);
        }

        // Handle direct messages
        if (!peerId) {
            console.error('Peer ID is required for direct messages');
            return false;
        }

        // Check if recipient is offline
        if (this.offlineRecipients.has(peerId)) {
            console.log(`Recipient ${peerId} is offline, queueing message`);
            this.queueOfflineMessage(message, peerId);
            return false;
        }

        // Check if we have a data channel
        if (!this.dataChannels.has(peerId) || !this.dataChannels.get(peerId).length) {
            console.log(`No data channel for peer ${peerId}, initiating connection`);
            this.addPendingMessage(message, peerId);
            this.initiateConnection(peerId);
            return false;
        }

        // Get the data channel
        const channels = this.dataChannels.get(peerId);
        const channel = channels[0]; // Use the first channel

        // Check if the channel is open
        if (channel.readyState !== 'open') {
            console.log(`Data channel with ${peerId} not open (${channel.readyState}), queueing message`);
            this.addPendingMessage(message, peerId);
            return false;
        }

        // Send the message
        this.encryptAndSendMessage(message, channel);
        return true;
    }

    sendGroupMessage(message) {
        if (!message.groupId) {
            console.error('Group ID is required for group messages');
            return false;
        }

        // Get the members of the group
        const groupMembers = this.groupConnections.get(message.groupId) || new Set();
        let sentToAny = false;

        // Send to each member
        for (const memberId of groupMembers) {
            // Skip sending to ourselves
            if (memberId === this.userId || memberId === this.peerId) continue;

            // Try to send the message
            const sent = this.sendMessage({ ...message, recipientId: memberId }, memberId);
            sentToAny = sentToAny || sent;
        }

        return sentToAny;
    }

    addPendingMessage(message, peerId) {
        if (!this.pendingMessages.has(peerId)) {
            this.pendingMessages.set(peerId, []);
        }
        this.pendingMessages.get(peerId).push(message);
    }

    processPendingMessages() {
        for (const [peerId, messages] of this.pendingMessages.entries()) {
            this.processPendingMessagesForPeer(peerId);
        }
    }

    processPendingMessagesForPeer(peerId) {
        if (!this.pendingMessages.has(peerId)) return;

        const messages = this.pendingMessages.get(peerId);
        const newPending = [];

        for (const message of messages) {
            const sent = this.sendMessage(message, peerId);
            if (!sent) {
                newPending.push(message);
            }
        }

        if (newPending.length === 0) {
            this.pendingMessages.delete(peerId);
        } else {
            this.pendingMessages.set(peerId, newPending);
        }
    }

    async queueOfflineMessage(message, recipientId) {
        if (!this.isAuthenticated) {
            console.warn('Cannot queue offline messages without authentication');
            this.addPendingMessage(message, recipientId);
            return;
        }

        try {
            // Encrypt and save to database
            const { data: encryptedData, iv } = await this.encryptMessage({
                text: message.text,
                timestamp: message.timestamp,
                sender: message.sender,
                additional: message.additional
            });

            // Save message to database
            const result = await supabaseService.saveMessage({
                senderId: this.userId,
                recipientId: recipientId,
                encryptedContent: JSON.stringify(encryptedData),
                encryptionIv: JSON.stringify(iv),
                type: message.type || 'TEXT',
                parentMessageId: message.parentId || null
            });

            if (result.error) {
                throw result.error;
            }

            // Add to offline queue
            await supabaseService.addToOfflineQueue(result.data[0].id, recipientId);

            // Notify UI that message is queued
            this.messageHandlers.forEach(handler => handler({
                    ...message,
                status: 'queued',
                offline: true
            }));

        } catch (error) {
            console.error('Error queuing offline message:', error);
            // Fall back to pending messages
            this.addPendingMessage(message, recipientId);
        }
    }

    async encryptAndSendMessage(message, channel) {
        try {
            // Encrypt the message
            const encryptedMessage = await this.encryptMessage(message);
            
            // Send the encrypted message
            channel.send(JSON.stringify(encryptedMessage));
            return true;
        } catch (error) {
            console.error('Error sending encrypted message:', error);
            return false;
        }
    }

    // Add group chat functions
    async createGroup(name, members) {
        if (!this.isAuthenticated) {
            console.error('Authentication required to create groups');
            return { success: false, error: 'Authentication required' };
        }

        try {
            // Create group in database
            const result = await supabaseService.createGroup(name, this.userId, members);
            
            if (result.error) {
                throw result.error;
            }

            // Add to local group tracking
            const groupId = result.group.id;
            this.groupConnections.set(groupId, new Set([this.userId, ...members]));

            // Notify members about the new group
            for (const memberId of members) {
                if (memberId === this.userId) continue;
                
                this.sendMessage({
                    type: 'GROUP_CREATED',
                    groupId,
                    groupName: name,
                    createdBy: this.userId,
                    members: [this.userId, ...members],
                    timestamp: new Date().toISOString()
                }, memberId);
            }

            return {
                success: true,
                group: result.group
            };
        } catch (error) {
            console.error('Error creating group:', error);
            return {
                success: false,
                error: error.message || 'Failed to create group'
            };
        }
    }

    async getGroups() {
        if (!this.isAuthenticated) {
            console.error('Authentication required to get groups');
            return { groups: [], error: 'Authentication required' };
        }

        try {
            const result = await supabaseService.getUserGroups(this.userId);
            
            if (result.error) {
                throw result.error;
            }

            // Update local group tracking
            for (const group of result.groups) {
                if (!this.groupConnections.has(group.id)) {
                    // We need to fetch the members for this group
                    // This would require an additional API call to get members
                    this.groupConnections.set(group.id, new Set([this.userId]));
                }
            }

            return { groups: result.groups, error: null };
        } catch (error) {
            console.error('Error fetching groups:', error);
            return { groups: [], error: error.message || 'Failed to fetch groups' };
        }
    }

    // Add connection state notification
    notifyConnectionState(state) {
        this.connectionStateHandlers.forEach(handler => handler(state));
    }

    onConnectionState(handler) {
        this.connectionStateHandlers.add(handler);
        return () => {
            this.connectionStateHandlers.delete(handler);
        };
    }

    // Connection heartbeat to track online status
    startConnectionHeartbeat() {
        // Only start if authenticated
        if (!this.isAuthenticated) return;
        
        const HEARTBEAT_INTERVAL = 30000; // 30 seconds
        
        setInterval(async () => {
            if (this.isAuthenticated) {
                try {
                    await supabaseService.updateConnectionStatus(this.userId, 'online');
                } catch (error) {
                    console.error('Error updating connection status:', error);
                }
            }
        }, HEARTBEAT_INTERVAL);
    }

    // Enable/disable message persistence
    enablePersistence(enabled = true) {
        this.isPersistenceEnabled = enabled;
    }

    // Add method to check for and deliver offline messages
    async checkOfflineMessages() {
        if (!this.isAuthenticated) {
            console.warn('Cannot check offline messages without authentication');
            return { delivered: 0 };
        }

        try {
            // Get offline messages from database
            const result = await supabaseService.getOfflineMessages(this.userId);
            
            if (result.error) {
                throw result.error;
            }

            let delivered = 0;
            
            // Process each offline message
            for (const item of result.messages) {
                const message = item.messages;
                
                try {
                    // Try to decrypt the message
                    const decrypted = await this.decryptMessage({
                        data: JSON.parse(message.encrypted_content),
                        iv: JSON.parse(message.encryption_iv)
                    });
                    
                    // Deliver to UI
                    this.messageHandlers.forEach(handler => handler({
                        id: message.id,
                        text: decrypted.text,
                        sender: message.sender_id,
                        timestamp: message.created_at,
                        type: message.message_type,
                        status: 'delivered',
                        fromOfflineQueue: true
                    }));
                    
                    delivered++;
                    
                    // Mark as delivered and remove from queue
                    await supabaseService.markMessageDelivered(message.id);
                    await supabaseService.removeFromOfflineQueue(item.id);
                } catch (error) {
                    console.error('Error processing offline message:', error);
                }
            }
            
            return { delivered };
        } catch (error) {
            console.error('Error checking offline messages:', error);
            return { delivered: 0, error };
        }
    }

    broadcastMessage(message) {
        this.messageHandlers.forEach(handler => handler(message));
    }

    onMessage(handler) {
        this.messageHandlers.add(handler);
        return () => this.messageHandlers.delete(handler);
    }

    getPeerId() {
        return this.peerId;
    }

    getConnectedPeers() {
        return Array.from(this.dataChannels.entries())
            .filter(([_, channel]) => channel.readyState === 'open')
            .map(([peerId]) => peerId);
    }

    disconnect() {
        this.connections.forEach(connection => connection.close());
        this.connections.clear();
        this.dataChannels.clear();
        this.messageHandlers.clear();
    }
}

// Create and export instance
export const webrtcService = new WebRTCService(); 