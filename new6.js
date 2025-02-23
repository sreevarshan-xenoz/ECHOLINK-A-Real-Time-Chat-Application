// app.js
import { createNode } from './libp2p-client.js';
import { WebRTCClient } from './webrtc-client.js';

const signalingServerUrl = 'http://localhost:8080'; // Replace with your signaling server URL if different
const roomId = 'my-chat-room'; // You can change the room ID

async function startChat() {
  const node = await createNode();
  const webrtcClient = new WebRTCClient(signalingServerUrl, roomId);

  const sendButton = document.getElementById('sendButton');
  const messageInput = document.getElementById('messageInput');

  sendButton.addEventListener('click', () => {
    const message = messageInput.value;
    webrtcClient.sendMessage(message);
    messageInput.value = '';
  });

  // Start the WebRTC connection
  webrtcClient.createOffer();
}

startChat();