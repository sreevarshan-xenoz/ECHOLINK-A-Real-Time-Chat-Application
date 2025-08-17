const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');
const supabaseClient = require('./supabase-client');

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

// API routes for message history and groups
app.get('/api/messages/group/:groupId', async (req, res) => {
    try {
        const { groupId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        
        const { messages, error } = await supabaseClient.getGroupMessages(groupId, limit, offset);
        
        if (error) {
            console.error('Error fetching group messages:', error);
            return res.status(500).json({ error: 'Failed to fetch messages' });
        }
        
        res.json({ messages });
    } catch (err) {
        console.error('Exception fetching group messages:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/messages/direct/:userId/:peerId', async (req, res) => {
    try {
        const { userId, peerId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        
        const { messages, error } = await supabaseClient.getDirectMessages(userId, peerId, limit, offset);
        
        if (error) {
            console.error('Error fetching direct messages:', error);
            return res.status(500).json({ error: 'Failed to fetch messages' });
        }
        
        res.json({ messages });
    } catch (err) {
        console.error('Exception fetching direct messages:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// API routes for groups
app.get('/api/groups/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const { groups, error } = await supabaseClient.getUserGroups(userId);
        
        if (error) {
            console.error('Error fetching user groups:', error);
            return res.status(500).json({ error: 'Failed to fetch groups' });
        }
        
        res.json({ groups });
    } catch (err) {
        console.error('Exception fetching user groups:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/groups/:groupId/members', async (req, res) => {
    try {
        const { groupId } = req.params;
        
        const { members, error } = await supabaseClient.getGroupMembers(groupId);
        
        if (error) {
            console.error('Error fetching group members:', error);
            return res.status(500).json({ error: 'Failed to fetch group members' });
        }
        
        res.json({ members });
    } catch (err) {
        console.error('Exception fetching group members:', err);
        res.status(500).json({ error: 'Server error' });
    }
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

    // Direct messaging with persistence
    socket.on('send_direct_message', async (data) => {
        const { targetPeerId, message, type = 'text', parentMessageId = null } = data;
        const timestamp = new Date().toISOString();
        
        // Find the target user
        const targetUserId = peerIdToUserId.get(targetPeerId);
        const targetSocketId = connectedPeers.get(targetPeerId) || connectedUsers.get(targetPeerId);
        
        // Create message object
        const messageObject = {
            senderPeerId: socket.peerId,
            senderUserId: socket.userId,
            senderUserName: socket.userName,
            senderAvatarUrl: socket.avatarUrl,
            targetPeerId,
            targetUserId,
            message,
            type,
            timestamp,
            parentMessageId
        };
        
        // Store message in database
        try {
            const { data: savedMessage, error } = await supabaseClient.saveMessage({
                senderId: socket.userId,
                recipientId: targetUserId,
                groupId: null,
                content: message,
                type,
                parentMessageId,
                timestamp
            });
            
            if (error) {
                console.error('Error saving direct message to database:', error);
            } else {
                // Add database ID to the message object
                messageObject.id = savedMessage[0].id;
            }
        } catch (err) {
            console.error('Exception saving direct message to database:', err);
        }
        
        // Send to recipient if online
        if (targetSocketId) {
            io.to(targetSocketId).emit('direct_message', messageObject);
        }
        
        // Always send back to sender for confirmation
        socket.emit('direct_message_sent', messageObject);
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
    socket.on('create_group', async (data, callback) => {
        const { groupId, groupName, initialMembers = [] } = data;
        
        if (!socket.userId) {
            if (callback) callback({ success: false, error: 'User not authenticated' });
            return;
        }
        
        // Join the Socket.IO room
        socket.join(groupId);
        console.log(`User ${socket.userId} (Peer ${socket.peerId}) created group: ${groupId} (${groupName || 'Unnamed'})`);
        
        // Store group in database
        try {
            // Add the creator and any initial members to the group
            const allMembers = [socket.userId, ...initialMembers.filter(id => id !== socket.userId)];
            
            const { group, error } = await supabaseClient.createGroup(
                groupName || 'Unnamed Group', 
                socket.userId,
                allMembers
            );
            
            if (error) {
                console.error('Error creating group in database:', error);
                // Continue with in-memory group even if database fails
            } else {
                console.log(`Group created in database with ID: ${group.id}`);
            }
        } catch (err) {
            console.error('Exception creating group in database:', err);
            // Continue with in-memory group even if database fails
        }
        
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
                // Ensure the socket exists and has user information
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

    socket.on('join_group', async (data, callback) => {
        const { groupId } = data;
        
        if (!socket.userId) {
            if (callback) callback({ success: false, error: 'User not authenticated' });
            return;
        }
        
        // Join the Socket.IO room
        socket.join(groupId);
        console.log(`User ${socket.userId} (Peer ${socket.peerId}) joined group: ${groupId}`);
        
        // Add user to group in database if not already a member
        try {
            // First check if the group exists and if the user is already a member
            const { members, error: getMembersError } = await supabaseClient.getGroupMembers(groupId);
            
            if (!getMembersError) {
                const isAlreadyMember = members.some(member => member.user_id === socket.userId);
                
                if (!isAlreadyMember) {
                    // Add user to group_members table
                    const { data, error } = await supabaseClient.supabase
                        .from('group_members')
                        .insert({
                            group_id: groupId,
                            user_id: socket.userId,
                            role: 'member'
                        });
                    
                    if (error) {
                        console.error('Error adding user to group in database:', error);
                    }
                }
            }
        } catch (err) {
            console.error('Exception adding user to group in database:', err);
        }

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

    socket.on('leave_group', async (data, callback) => {
        const { groupId } = data;
        
        // Leave the Socket.IO room
        socket.leave(groupId);
        console.log(`User ${socket.userId} (Peer ${socket.peerId}) left group: ${groupId}`);
        
        // Remove user from group in database
        if (socket.userId) {
            try {
                const { error } = await supabaseClient.supabase
                    .from('group_members')
                    .delete()
                    .eq('group_id', groupId)
                    .eq('user_id', socket.userId);
                
                if (error) {
                    console.error('Error removing user from group in database:', error);
                }
            } catch (err) {
                console.error('Exception removing user from group in database:', err);
            }
        }
        
        // Notify other members in the group
        socket.to(groupId).emit('member_left', {
            groupId,
            peerId: socket.peerId,
            userId: socket.userId
        });
        
        if (callback) callback({ success: true, groupId });
    });

    socket.on('send_group_message', async (data) => {
        const { groupId, message, type = 'text', parentMessageId = null } = data;
        const timestamp = new Date().toISOString();
        
        // Create message object for database and broadcasting
        const messageObject = {
            groupId,
            senderPeerId: socket.peerId,
            senderUserId: socket.userId,
            senderUserName: socket.userName,
            senderAvatarUrl: socket.avatarUrl,
            message,
            type,
            timestamp,
            parentMessageId
        };
        
        // Store message in database
        try {
            const { data: savedMessage, error } = await supabaseClient.saveMessage({
                senderId: socket.userId,
                recipientId: null,
                groupId,
                content: message,
                type,
                parentMessageId,
                timestamp
            });
            
            if (error) {
                console.error('Error saving group message to database:', error);
            } else {
                // Add database ID to the message object
                messageObject.id = savedMessage[0].id;
            }
        } catch (err) {
            console.error('Exception saving group message to database:', err);
        }
        
        // Broadcast to all members of the group, including the sender
        io.to(groupId).emit('group_message', messageObject);
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