// server/collaborative-server.js
const WebSocket = require('ws');
const http = require('http');
const { setupWSConnection } = require('y-websocket/bin/utils');

const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('Collaborative Editing Server');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req, { docName: req.url.slice(1).split('?')[0] });
});

server.listen(1234, () => {
  console.log('Collaborative editing server running on port 1234');
});