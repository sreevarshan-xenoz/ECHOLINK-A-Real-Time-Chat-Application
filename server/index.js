const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
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
    });

    socket.on('send_message', (data) => {
        const recipientSocket = connectedUsers.get(data.recipientId);
        if (recipientSocket) {
            io.to(recipientSocket).emit('receive_message', {
                senderId: data.senderId,
                message: data.message,
                timestamp: new Date()
            });
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
        }

        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 