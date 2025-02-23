// webrtc-client.js
class WebRTCClient {
  constructor(signalingServer, roomId) {
    this.signalingServer = signalingServer;
    this.roomId = roomId;
    this.peerConnection = null;
    this.dataChannel = null;
    this.signalingServer.on('offer', this.handleOffer.bind(this));
    this.signalingServer.on('answer', this.handleAnswer.bind(this));
    this.signalingServer.on('ice-candidate', this.handleIceCandidate.bind(this));
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
    // Display the message in the chat UI
  }

  sendMessage(message) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(message);
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
      this.signalingServer