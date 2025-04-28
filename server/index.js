const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(bodyParser.json());

// GitHub OAuth endpoint
app.post('/api/github/oauth/token', async (req, res) => {
    try {
        const { code } = req.body;
        
        console.log('Received GitHub OAuth code exchange request');
        
        if (!code) {
            console.error('No code provided in request');
            return res.status(400).json({ error: 'No code provided' });
        }
        
        // Log the values being used (without exposing the full client secret)
        const clientId = process.env.REACT_APP_GITHUB_CLIENT_ID;
        const clientSecret = process.env.REACT_APP_GITHUB_CLIENT_SECRET;
        console.log(`Using Client ID: ${clientId}`);
        console.log(`Client Secret available: ${!!clientSecret}`);
        
        if (!clientId || !clientSecret) {
            console.error('GitHub OAuth credentials missing in environment variables');
            return res.status(500).json({ error: 'Server configuration error' });
        }
        
        // Exchange code for access token with GitHub
        console.log('Making request to GitHub OAuth API');
        const response = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: clientId,
            client_secret: clientSecret,
            code: code
        }, {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log('GitHub OAuth response received');
        
        // Check if we got an access token
        if (response.data && response.data.access_token) {
            console.log('Successfully received access token');
            res.json(response.data);
        } else {
            console.error('GitHub response did not contain access token:', response.data);
            res.status(400).json({ error: 'Invalid response from GitHub', details: response.data });
        }
    } catch (error) {
        console.error('Error exchanging GitHub code for token:', error);
        // Enhanced error reporting
        const errorDetails = {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        };
        console.error('Error details:', errorDetails);
        res.status(500).json({ error: 'Failed to exchange code for token', details: errorDetails });
    }
});

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Store connected users
const connectedUsers = new Map(); // userId -> socketId
const connectedPeers = new Map(); // peerId -> socketId
const userIdToPeerId = new Map(); // userId -> peerId
const peerIdToUserId = new Map(); // peerId -> userId
const peerGroups = new Map(); // groupId -> Set of peerIds

// Handle WebRTC signaling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('user_connected', (data) => {
        const { peerId, userId } = data;
        console.log(`User connected - peerId: ${peerId}, userId: ${userId || 'anonymous'}`);
        
        // Store mappings
        connectedPeers.set(peerId, socket.id);
        
        if (userId) {
            connectedUsers.set(userId, socket.id);
            userIdToPeerId.set(userId, peerId);
            peerIdToUserId.set(peerId, userId);
            
            // Broadcast user's online status
            socket.broadcast.emit('user_status_change', {
                userId: userId,
                peerId: peerId,
                status: 'online'
            });
        }
        
        // Send current online peers to the new user
        const onlinePeers = [];
        for (const [pid, sid] of connectedPeers.entries()) {
            if (pid !== peerId) {
                const uid = peerIdToUserId.get(pid);
                onlinePeers.push({
                    peerId: pid,
                    userId: uid
                });
            }
        }
        
        socket.emit('online_peers', onlinePeers);
    });

    // WebRTC signaling
    socket.on('offer', (data) => {
        const { recipientId, senderId, offer } = data;
        console.log(`Offer from ${senderId} to ${recipientId}`);
        
        const recipientSocketId = connectedPeers.get(recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('offer', {
                offer,
                senderId
            });
        } else {
            // Recipient not connected
            socket.emit('peer_unavailable', {
                peerId: recipientId,
                reason: 'disconnected'
            });
        }
    });

    socket.on('answer', (data) => {
        const { recipientId, senderId, answer } = data;
        console.log(`Answer from ${senderId} to ${recipientId}`);
        
        const recipientSocketId = connectedPeers.get(recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('answer', {
                answer,
                senderId
            });
        }
    });

    socket.on('ice_candidate', (data) => {
        const { recipientId, senderId, candidate } = data;
        
        const recipientSocketId = connectedPeers.get(recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('ice_candidate', {
                candidate,
                senderId
            });
        }
    });

    // Message handling (only used if peers can't connect directly)
    socket.on('send_message', (data) => {
        const recipientSocket = connectedUsers.get(data.recipientId) || connectedPeers.get(data.recipientId);
        if (recipientSocket) {
            io.to(recipientSocket).emit('receive_message', {
                senderId: data.senderId,
                message: data.message,
                timestamp: new Date()
            });
            console.log(`Message sent from ${data.senderId} to ${data.recipientId}`);
        } else {
            // Queue for offline delivery
            socket.emit('message_queued', {
                messageId: data.messageId,
                recipientId: data.recipientId,
                timestamp: new Date()
            });
        }
    });

    // Group chat functions
    socket.on('create_group', (data) => {
        const { groupId, name, createdBy, members } = data;
        
        // Track group members
        if (!peerGroups.has(groupId)) {
            peerGroups.set(groupId, new Set(members));
        }
        
        // Notify all members
        for (const memberId of members) {
            if (memberId === createdBy) continue; // Creator already knows
            
            const memberSocket = connectedUsers.get(memberId) || connectedPeers.get(memberId);
            if (memberSocket) {
                io.to(memberSocket).emit('group_created', {
                    groupId,
                    name,
                    createdBy,
                    members
                });
            }
        }
    });

    socket.on('join_group', (data) => {
        const { groupId, userId, peerId } = data;
        
        if (peerGroups.has(groupId)) {
            // Add to group
            peerGroups.get(groupId).add(peerId);
            
            // Notify other members
            for (const memberId of peerGroups.get(groupId)) {
                if (memberId === peerId) continue;
                
                const memberSocket = connectedPeers.get(memberId);
                if (memberSocket) {
                    io.to(memberSocket).emit('member_joined', {
                        groupId,
                        peerId,
                        userId
                    });
                }
            }
        }
    });

    socket.on('leave_group', (data) => {
        const { groupId, peerId } = data;
        
        if (peerGroups.has(groupId)) {
            // Remove from group
            peerGroups.get(groupId).delete(peerId);
            
            // Notify other members
            for (const memberId of peerGroups.get(groupId)) {
                const memberSocket = connectedPeers.get(memberId);
                if (memberSocket) {
                    io.to(memberSocket).emit('member_left', {
                        groupId,
                        peerId
                    });
                }
            }
            
            // Clean up empty groups
            if (peerGroups.get(groupId).size === 0) {
                peerGroups.delete(groupId);
            }
        }
    });

    socket.on('typing', (data) => {
        const recipientSocket = connectedUsers.get(data.recipientId) || connectedPeers.get(data.recipientId);
        if (recipientSocket) {
            io.to(recipientSocket).emit('user_typing', {
                userId: data.senderId,
                peerId: data.peerId,
                isTyping: data.isTyping
            });
        }
    });

    // Handle disconnections
    socket.on('disconnect', () => {
        // Find the disconnected user
        let disconnectedPeerId = null;
        let disconnectedUserId = null;
        
        for (const [peerId, socketId] of connectedPeers.entries()) {
            if (socketId === socket.id) {
                disconnectedPeerId = peerId;
                break;
            }
        }
        
        for (const [userId, socketId] of connectedUsers.entries()) {
            if (socketId === socket.id) {
                disconnectedUserId = userId;
                break;
            }
        }
        
        // Clean up
        if (disconnectedPeerId) {
            connectedPeers.delete(disconnectedPeerId);
            peerIdToUserId.delete(disconnectedPeerId);
            
            console.log(`Peer disconnected: ${disconnectedPeerId}`);
        }
        
        if (disconnectedUserId) {
            connectedUsers.delete(disconnectedUserId);
            userIdToPeerId.delete(disconnectedUserId);
            
            // Broadcast status change
            io.emit('user_status_change', {
                userId: disconnectedUserId,
                peerId: disconnectedPeerId,
                status: 'offline'
            });
            
            console.log(`User disconnected: ${disconnectedUserId}`);
        }
        
        // Remove from groups
        for (const [groupId, members] of peerGroups.entries()) {
            if (disconnectedPeerId && members.has(disconnectedPeerId)) {
                members.delete(disconnectedPeerId);
                
                // Notify remaining members
                for (const memberId of members) {
                    const memberSocket = connectedPeers.get(memberId);
                    if (memberSocket) {
                        io.to(memberSocket).emit('member_left', {
                            groupId,
                            peerId: disconnectedPeerId
                        });
                    }
                }
                
                // Clean up empty groups
                if (members.size === 0) {
                    peerGroups.delete(groupId);
                }
            }
        }
    });
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});