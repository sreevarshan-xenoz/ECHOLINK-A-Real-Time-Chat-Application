import { v4 as uuidv4 } from 'uuid';
import io from 'socket.io-client';

class WebRTCService {
    constructor() {
        // Get the local IP address from the window.location or default to localhost
        const serverIP = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
        this.socket = io(`http://${serverIP}:5000`);
        
        this.connections = new Map(); // PeerId -> RTCPeerConnection
        this.dataChannels = new Map(); // PeerId -> RTCDataChannel
        this.messageHandlers = new Set();
        this.peerId = uuidv4();
        this.typingStatus = new Map(); // Track typing status
        
        // STUN servers for NAT traversal
        this.configuration = {
            iceServers: [
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ]
        };

        // Initialize socket event listeners
        this.socket.on('connect', () => {
            console.log('Connected to signaling server');
            this.socket.emit('user_connected', this.peerId);
        });

        this.socket.on('user_status_change', (data) => {
            this.broadcastMessage({
                type: data.status === 'online' ? 'PEER_CONNECTED' : 'PEER_DISCONNECTED',
                peerId: data.userId
            });
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
            return true;
        } catch (error) {
            console.error('Failed to initialize WebRTC:', error);
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
        try {
            const peerConnection = new RTCPeerConnection(this.configuration);
            
            // Create data channel
            const dataChannel = peerConnection.createDataChannel('chat');
            this.setupDataChannel(dataChannel, peerId);

            // Handle incoming data channels
            peerConnection.ondatachannel = (event) => {
                this.setupDataChannel(event.channel, peerId);
            };

            // Handle ICE candidates
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    this.broadcastMessage({
                        type: 'ICE_CANDIDATE',
                        candidate: event.candidate,
                        sender: this.peerId,
                        recipient: peerId
                    });
                }
            };

            // Handle connection state changes
            peerConnection.onconnectionstatechange = () => {
                if (peerConnection.connectionState === 'connected') {
                    this.broadcastMessage({
                        type: 'PEER_CONNECTED',
                        peerId: peerId
                    });
                } else if (peerConnection.connectionState === 'disconnected' || 
                         peerConnection.connectionState === 'failed') {
                    this.handlePeerDisconnection(peerId);
                }
            };

            this.connections.set(peerId, peerConnection);
            return peerConnection;
        } catch (error) {
            console.error('Error creating peer connection:', error);
            throw error;
        }
    }

    setupDataChannel(dataChannel, peerId) {
        dataChannel.onopen = () => {
            console.log(`Data channel opened with peer: ${peerId}`);
            this.broadcastMessage({
                type: 'PEER_CONNECTED',
                peerId: peerId
            });
        };

        dataChannel.onclose = () => {
            this.handlePeerDisconnection(peerId);
        };

        dataChannel.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.messageHandlers.forEach(handler => handler(message));
            } catch (error) {
                console.error('Error handling message:', error);
            }
        };

        this.dataChannels.set(peerId, dataChannel);
    }

    handlePeerDisconnection(peerId) {
        this.connections.get(peerId)?.close();
        this.connections.delete(peerId);
        this.dataChannels.delete(peerId);
        
        this.broadcastMessage({
            type: 'PEER_DISCONNECTED',
            peerId: peerId
        });
    }

    async initiateConnection(peerId) {
        try {
            const peerConnection = this.createPeerConnection(peerId);
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            
            return offer;
        } catch (error) {
            console.error('Error initiating connection:', error);
            throw error;
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

    sendMessage(message, peerId) {
        try {
            const dataChannel = this.dataChannels.get(peerId);
            if (dataChannel?.readyState === 'open') {
                dataChannel.send(JSON.stringify({
                    ...message,
                    sender: this.peerId,
                    timestamp: new Date().toISOString()
                }));
            } else {
                throw new Error('Data channel not ready');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
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

export const webrtcService = new WebRTCService(); 