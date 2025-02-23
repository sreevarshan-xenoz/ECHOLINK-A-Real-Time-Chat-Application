// server.js
    const express = require('express');
    const http = require('http');
    const socketIo = require('socket.io');

    const app = express();
    const server = http.createServer(app);
    const io = socketIo(server);

    io.on('connection', (socket) => {
      console.log('New client connected');

      socket.on('join', (roomId) => {
        socket.join(roomId);
        console.log(`Client joined room: ${roomId}`);
      });

      socket.on('offer', (roomId, offer) => {
        socket.to(roomId).emit('offer', offer);
      });

      socket.on('answer', (roomId, answer) => {
        socket.to(roomId).emit('answer', answer);
      });

      socket.on('ice-candidate', (roomId, candidate) => {
        socket.to(roomId).emit('ice-candidate', candidate);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected');
      });
    });

    const PORT = process.env.PORT || 8080;
    server.listen(PORT, () => console.log(`Signaling server listening on port ${PORT}`));