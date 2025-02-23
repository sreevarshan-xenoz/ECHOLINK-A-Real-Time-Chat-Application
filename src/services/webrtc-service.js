import { v4 as uuidv4 } from 'uuid';

class WebRTCService {
    constructor() {
        this.connections = new Map(); // PeerId -> RTCPeerConnection
        this.dataChannels = new Map(); // PeerId -> RTCDataChannel
        this.messageHandlers = new Set();
        this.peerId = uuidv4();
        this.typingStatus = new Map(); // Track typing status
        
        // STUN servers for NAT traversal
        this.configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ]
        };

        // Initialize encryption key
        this.initializeEncryption();
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

    async createPeerConnection(peerId) {
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

        this.connections.set(peerId, peerConnection);
        return peerConnection;
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
            console.log(`Data channel closed with peer: ${peerId}`);
            this.broadcastMessage({
                type: 'PEER_DISCONNECTED',
                peerId: peerId
            });
        };

        dataChannel.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'TYPING_STATUS') {
                this.typingStatus.set(peerId, data.isTyping);
                this.broadcastMessage(data);
            } else {
                const decryptedMessage = await this.decryptMessage(data.data);
                this.messageHandlers.forEach(handler => handler(decryptedMessage));
            }
        };

        this.dataChannels.set(peerId, dataChannel);
    }

    async initiateConnection(peerId) {
        const peerConnection = await this.createPeerConnection(peerId);
        
        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            
            this.broadcastMessage({
                type: 'OFFER',
                offer: offer,
                sender: this.peerId,
                recipient: peerId
            });
        } catch (error) {
            console.error('Error creating offer:', error);
            this.connections.delete(peerId);
        }
    }

    async handleOffer(offer, senderId) {
        const peerConnection = await this.createPeerConnection(senderId);
        
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            this.broadcastMessage({
                type: 'ANSWER',
                answer: answer,
                sender: this.peerId,
                recipient: senderId
            });
        } catch (error) {
            console.error('Error handling offer:', error);
            this.connections.delete(senderId);
        }
    }

    async handleAnswer(answer, senderId) {
        const peerConnection = this.connections.get(senderId);
        if (peerConnection) {
            try {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            } catch (error) {
                console.error('Error handling answer:', error);
            }
        }
    }

    async handleIceCandidate(candidate, senderId) {
        const peerConnection = this.connections.get(senderId);
        if (peerConnection) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.error('Error handling ICE candidate:', error);
            }
        }
    }

    async sendMessage(message, peerId) {
        const dataChannel = this.dataChannels.get(peerId);
        if (dataChannel && dataChannel.readyState === 'open') {
            const encryptedMessage = await this.encryptMessage({
                ...message,
                id: uuidv4(),
                sender: this.peerId,
                recipient: peerId,
                timestamp: new Date().toISOString()
            });

            dataChannel.send(JSON.stringify({
                type: message.type,
                data: encryptedMessage
            }));
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
        this.dataChannels.forEach(channel => channel.close());
        this.connections.clear();
        this.dataChannels.clear();
        this.messageHandlers.clear();
    }
}

export const webrtcService = new WebRTCService(); 