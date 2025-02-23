// webrtc-client.js
import { io } from 'socket.io-client';

class WebRTCClient {
  constructor(signalingServerUrl, roomId) {
    this.signalingServer = io(signalingServerUrl);
    this.roomId = roomId;
    this.peerConnection = null;
    this.dataChannel = null;
    this.signalingServer.on('offer', this.handleOffer.bind(this));
    this.signalingServer.on('answer', this.handleAnswer.bind(this));
    this.signalingServer.on('ice-candidate', this.handleIceCandidate.bind(this));
    this.signalingServer.emit('join', this.roomId);
  }

  async createPeerConnection() {
    this.peerConnection = new RTCPeerConnection();
    this.peerConnection.onicecandidate = this.handleIceCandidateEvent.bind(this);
    this.peerConnection.ondatachannel = this.handleDataChannel.bind(this);
  }

  createDataChannel() {
    this.dataChannel = this.peerConnection.createDataChannel('chat');
    this.dataChannel.onopen = this.handleDataChannelOpen.bind(this);
    this.dataChannel.onmessage = this.handleDataChannelMessage.bind(this);
  }

  handleDataChannel(event) {
    this.dataChannel = event.channel;
    this.dataChannel.onopen = this.handleDataChannelOpen.bind(this);
    this.dataChannel.onmessage = this.handleDataChannelMessage.bind(this);
  }

  handleDataChannelOpen() {
    console.log('Data channel is open');
  }

  handleDataChannelMessage(event) {
    console.log('Received message:', event.data);
    const chatLog = document.getElementById('chatLog');
    const messageElement = document.createElement('p');
    messageElement.textContent = 'Peer: ' + event.data;
    chatLog.appendChild(messageElement);
  }

  sendMessage(message) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(message);
      const chatLog = document.getElementById('chatLog');
      const messageElement = document.createElement('p');
      messageElement.textContent = 'You: ' + message;
      chatLog.appendChild(messageElement);
    }
  }

  async createOffer() {
    await this.createPeerConnection();
    this.createDataChannel();
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    this.signalingServer.emit('offer', this.roomId, offer);
  }

  async handleOffer(offer) {
    await this.createPeerConnection();
    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    this.signalingServer.emit('answer', this.roomId, answer);
  }

  async handleAnswer(answer) {
    await this.peerConnection.setRemoteDescription(answer);
  }

  handleIceCandidateEvent(event) {
    if (event.candidate) {
      this.signalingServer.emit('ice-candidate', this.roomId, event.candidate);
    }
  }

  async handleIceCandidate(candidate) {
    await this.peerConnection.addIceCandidate(candidate);
  }
}

export { WebRTCClient };