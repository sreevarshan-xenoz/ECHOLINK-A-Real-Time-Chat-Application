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
        
        // Exchange code for access token with GitHub
        const response = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: process.env.REACT_APP_GITHUB_CLIENT_ID,
            client_secret: process.env.REACT_APP_GITHUB_CLIENT_SECRET,
            code: code
        }, {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Error exchanging GitHub code for token:', error);
        res.status(500).json({ error: 'Failed to exchange code for token' });
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