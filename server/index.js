const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();

// 1. Refined CORS Configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://your-production-domain.com'] // Replace with your actual production frontend domain
  : ['http://localhost:3000', 'http://127.0.0.1:3000']; // Common development origins

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(bodyParser.json());

// GitHub OAuth credentials (replace with your actual credentials or use environment variables)
// Load environment variables from .env file
require('dotenv').config({ path: '../.env' });

const GITHUB_CLIENT_ID = process.env.REACT_APP_GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.REACT_APP_GITHUB_CLIENT_SECRET;
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || 'http://localhost:5000/auth/github/callback'; // Ensure this matches your GitHub app settings

// In-memory storage (Consider Redis or a database for production)
const connectedUsers = new Map(); // userId -> socket.id
const connectedPeers = new Map(); // peerId -> socket.id
const userIdToPeerId = new Map(); // userId -> peerId
const peerIdToUserId = new Map(); // peerId -> userId
// No longer need peerGroups, as Socket.IO rooms will manage group membership implicitly

app.get('/', (req, res) => {
    res.send('Signaling server is running');
});

// GitHub OAuth Step 1: Redirect to GitHub's authorization page
app.get('/auth/github', (req, res) => {
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${GITHUB_REDIRECT_URI}&scope=user:email`;
    res.redirect(githubAuthUrl);
});

// GitHub OAuth Step 2: GitHub redirects back to your server
app.get('/auth/github/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).send('Authorization code is missing');
    }

    try {
        // Exchange authorization code for an access token
        const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: GITHUB_CLIENT_ID,
            client_secret: GITHUB_CLIENT_SECRET,
            code: code,
            redirect_uri: GITHUB_REDIRECT_URI
        }, {
            headers: { Accept: 'application/json' }
        });

        const accessToken = tokenResponse.data.access_token;
        if (!accessToken) {
            return res.status(500).send('Failed to obtain access token');
        }

        // Fetch user information from GitHub API
        const userResponse = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `token ${accessToken}` }
        });

        const userData = userResponse.data;
        const userId = userData.id.toString(); // Use GitHub user ID as our userId
        const userName = userData.login;
        const userAvatar = userData.avatar_url;

        // TODO: Store or update user information in your database here if needed

        // Redirect user back to the frontend with user info (or a session token)
        // For simplicity, redirecting with query parameters. In production, use a more secure method like JWT.
        const frontendRedirectUrl = process.env.NODE_ENV === 'production' 
            ? 'https://your-production-domain.com/auth/callback' 
            : 'http://localhost:3000/auth/callback';
        
        res.redirect(`${frontendRedirectUrl}?userId=${userId}&userName=${userName}&avatarUrl=${encodeURIComponent(userAvatar)}&accessToken=${accessToken}`);

    } catch (error) {
        console.error('GitHub OAuth error:', error.response ? error.response.data : error.message);
        res.status(500).send('An error occurred during GitHub authentication.');
    }
});

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: function (origin, callback) {
          if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS for Socket.IO'));
          }
        },
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('user_connected', (data) => {
        const { peerId, userId, userName, avatarUrl } = data;
        console.log(`User connected - peerId: ${peerId}, userId: ${userId || 'anonymous'}, userName: ${userName}`);
        
        // 2. Optimized Socket.IO Disconnect Logic: Store identifiers on the socket object
        socket.peerId = peerId;
        if (userId) {
            socket.userId = userId;
            socket.userName = userName; // Store userName for status updates
            socket.avatarUrl = avatarUrl; // Store avatarUrl for status updates
        }

        connectedPeers.set(peerId, socket.id);
        if (userId) {
            connectedUsers.set(userId, socket.id);
            userIdToPeerId.set(userId, peerId);
            peerIdToUserId.set(peerId, userId);

            // Broadcast new user's status to all other connected clients
            socket.broadcast.emit('user_status_change', {
                userId,
                peerId,
                userName,
                avatarUrl,
                status: 'online'
            });
        }
        // Send list of currently online users to the newly connected user
        const onlineUsers = [];
        for (const [uid, sid] of connectedUsers.entries()) {
            const pid = userIdToPeerId.get(uid);
            const userSocket = io.sockets.sockets.get(sid);
            if (pid && userSocket) {
                 onlineUsers.push({ userId: uid, peerId: pid, userName: userSocket.userName, avatarUrl: userSocket.avatarUrl, status: 'online' });
            }
        }
        socket.emit('online_users', onlineUsers);
        console.log('Connected peers:', Array.from(connectedPeers.keys()));
        console.log('Connected users:', Array.from(connectedUsers.keys()));
    });

    // WebRTC Signaling
    socket.on('offer', (data) => {
        const targetSocketId = connectedPeers.get(data.targetPeerId) || connectedUsers.get(data.targetPeerId); // Allow targeting by userId too
        if (targetSocketId) {
            io.to(targetSocketId).emit('offer', { 
                sdp: data.sdp, 
                senderPeerId: socket.peerId, 
                senderUserId: socket.userId 
            });
        } else {
            console.log(`Target peer ${data.targetPeerId} not found for offer`);
        }
    });

    socket.on('answer', (data) => {
        const targetSocketId = connectedPeers.get(data.targetPeerId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('answer', { 
                sdp: data.sdp, 
                senderPeerId: socket.peerId, 
                senderUserId: socket.userId 
            });
        } else {
            console.log(`Target peer ${data.targetPeerId} not found for answer`);
        }
    });

    socket.on('candidate', (data) => {
        const targetSocketId = connectedPeers.get(data.targetPeerId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('candidate', { 
                candidate: data.candidate, 
                senderPeerId: socket.peerId, 
                senderUserId: socket.userId 
            });
        } else {
            console.log(`Target peer ${data.targetPeerId} not found for candidate`);
        }
    });

    // 3. Socket.IO Rooms for Group Management
    socket.on('create_group', (data, callback) => {
        const { groupId, groupName } = data; // groupName can be used for display or future persistence
        socket.join(groupId);
        console.log(`User ${socket.userId} (Peer ${socket.peerId}) created/joined group: ${groupId} (${groupName || 'Unnamed'})`);

        // Notify other members in the group about the new joiner
        socket.to(groupId).emit('member_joined', {
            groupId,
            peerId: socket.peerId,
            userId: socket.userId,
            userName: socket.userName,
            avatarUrl: socket.avatarUrl
        });

        // Get current members to send back to the joiner
        const membersInRoom = [];
        const roomSocketIds = io.sockets.adapter.rooms.get(groupId);
        if (roomSocketIds) {
            roomSocketIds.forEach(socketId => {
                const memberSocket = io.sockets.sockets.get(socketId);
                // Ensure the socket exists and has user information (especially if a socket disconnected abruptly)
                if (memberSocket && memberSocket.userId) { 
                    membersInRoom.push({
                        userId: memberSocket.userId,
                        peerId: memberSocket.peerId,
                        userName: memberSocket.userName,
                        avatarUrl: memberSocket.avatarUrl
                    });
                }
            });
        }

        if (callback) callback({ success: true, groupId, members: membersInRoom });
    });

    socket.on('join_group', (data, callback) => {
        const { groupId } = data;
        socket.join(groupId);
        console.log(`User ${socket.userId} (Peer ${socket.peerId}) joined group: ${groupId}`);

        // Notify other members in the group about the new joiner
        socket.to(groupId).emit('member_joined', {
            groupId,
            peerId: socket.peerId,
            userId: socket.userId,
            userName: socket.userName,
            avatarUrl: socket.avatarUrl
        });

        // Get current members to send back to the joiner
        const membersInRoom = [];
        const roomSocketIds = io.sockets.adapter.rooms.get(groupId);
        if (roomSocketIds) {
            roomSocketIds.forEach(socketId => {
                const memberSocket = io.sockets.sockets.get(socketId);
                if (memberSocket && memberSocket.userId) { 
                    membersInRoom.push({
                        userId: memberSocket.userId,
                        peerId: memberSocket.peerId,
                        userName: memberSocket.userName,
                        avatarUrl: memberSocket.avatarUrl
                    });
                }
            });
        }

        if (callback) callback({ success: true, groupId, members: membersInRoom });
    });

    socket.on('leave_group', (data, callback) => {
        const { groupId } = data;
        socket.leave(groupId);
        console.log(`User ${socket.userId} (Peer ${socket.peerId}) left group: ${groupId}`);
        // Notify other members in the group
        socket.to(groupId).emit('member_left', {
            groupId,
            peerId: socket.peerId,
            userId: socket.userId
        });
        if (callback) callback({ success: true, groupId });
    });

    socket.on('send_group_message', (data) => {
        const { groupId, message, type = 'text' } = data;
        // Broadcast to all members of the group, including the sender
        io.to(groupId).emit('group_message', {
            groupId,
            senderPeerId: socket.peerId,
            senderUserId: socket.userId,
            senderUserName: socket.userName,
            senderAvatarUrl: socket.avatarUrl,
            message,
            type,
            timestamp: new Date().toISOString()
        });
    });
    
    socket.on('send_group_signal', (data) => {
        const { groupId, signalType, signalData } = data;
        // Relay signals like 'offer', 'answer', 'candidate' within a group
        // The sender should not receive their own signal back
        socket.to(groupId).emit('group_signal', {
            groupId,
            senderPeerId: socket.peerId,
            senderUserId: socket.userId,
            signalType, // e.g., 'offer', 'answer', 'candidate'
            signalData  // The actual SDP or candidate
        });
    });

    // Group Typing Indicators
    socket.on('start_typing_group', (data) => {
        const { groupId } = data;
        // Ensure the user is actually in the group before broadcasting
        if (socket.rooms.has(groupId) && socket.userId) {
            socket.to(groupId).emit('member_typing_start', {
                groupId,
                userId: socket.userId,
                userName: socket.userName // Send userName for display purposes
            });
        }
    });

    socket.on('stop_typing_group', (data) => {
        const { groupId } = data;
        if (socket.rooms.has(groupId) && socket.userId) {
            socket.to(groupId).emit('member_typing_stop', {
                groupId,
                userId: socket.userId,
                userName: socket.userName
            });
        }
    });

    // Handle disconnections
    socket.on('disconnect', () => {
        const disconnectedPeerId = socket.peerId;
        const disconnectedUserId = socket.userId;

        if (disconnectedPeerId) {
            connectedPeers.delete(disconnectedPeerId);
            peerIdToUserId.delete(disconnectedPeerId);
            console.log(`Peer disconnected: ${disconnectedPeerId}`);
        }
        
        if (disconnectedUserId) {
            connectedUsers.delete(disconnectedUserId);
            userIdToPeerId.delete(disconnectedUserId);
            console.log(`User disconnected: ${disconnectedUserId}`);

            // Broadcast user's offline status
            io.emit('user_status_change', {
                userId: disconnectedUserId,
                peerId: disconnectedPeerId, // May or may not be present if only userId was set
                userName: socket.userName, // Send userName if available
                status: 'offline'
            });
        }

        // Socket.IO handles room cleanup automatically when a socket disconnects.
        // If you need to notify remaining room members about a departure explicitly
        // (beyond the generic 'user_status_change'), you can iterate through socket.rooms.
        // However, the 'member_left' event should be preferred from an explicit 'leave_group' action.
        // For abrupt disconnects, 'user_status_change' covers the status update.

        console.log('Client disconnected:', socket.id, 'Peer:', disconnectedPeerId, 'User:', disconnectedUserId);
        console.log('Remaining connected peers:', Array.from(connectedPeers.keys()));
        console.log('Remaining connected users:', Array.from(connectedUsers.keys()));
    });
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Standard for listening on all available network interfaces

server.listen(PORT, HOST, () => {
    console.log(`Server listening on ${HOST}:${PORT}`);
});