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
const connectedUsers = new Map();

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('user_connected', (userId) => {
        connectedUsers.set(userId, socket.id);
        io.emit('user_status_change', {
            userId: userId,
            status: 'online'
        });
        console.log(`User connected: ${userId}`);
    });

    socket.on('send_message', (data) => {
        const recipientSocket = connectedUsers.get(data.recipientId);
        if (recipientSocket) {
            io.to(recipientSocket).emit('receive_message', {
                senderId: data.senderId,
                message: data.message,
                timestamp: new Date()
            });
            console.log(`Message sent from ${data.senderId} to ${data.recipientId}`);
        }
    });

    socket.on('typing', (data) => {
        const recipientSocket = connectedUsers.get(data.recipientId);
        if (recipientSocket) {
            io.to(recipientSocket).emit('user_typing', {
                userId: data.senderId
            });
        }
    });

    socket.on('disconnect', () => {
        let disconnectedUserId;
        for (const [userId, socketId] of connectedUsers.entries()) {
            if (socketId === socket.id) {
                disconnectedUserId = userId;
                break;
            }
        }

        if (disconnectedUserId) {
            connectedUsers.delete(disconnectedUserId);
            io.emit('user_status_change', {
                userId: disconnectedUserId,
                status: 'offline'
            });
            console.log(`User disconnected: ${disconnectedUserId}`);
        }
    });
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});