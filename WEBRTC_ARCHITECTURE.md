# ECHOLINK WebRTC Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ECHOLINK WebRTC SYSTEM                      │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐                                        ┌──────────────┐
│   User A     │                                        │   User B     │
│  (Browser)   │                                        │  (Browser)   │
└──────┬───────┘                                        └──────┬───────┘
       │                                                       │
       │ ┌─────────────────────────────────────────────────┐ │
       │ │         WebRTC Service (webrtc-service.js)      │ │
       │ │  - RTCPeerConnection Management                 │ │
       │ │  - Data Channel Setup                           │ │
       │ │  - AES-GCM Encryption                           │ │
       │ │  - ICE Candidate Handling                       │ │
       │ └─────────────────────────────────────────────────┘ │
       │                                                       │
       │                  Socket.IO (Signaling)                │
       └───────────────────────┬───────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Signaling Server   │
                    │  (server/index.js)  │
                    │   Port: 5000        │
                    │                     │
                    │  - Offer/Answer     │
                    │  - ICE Candidates   │
                    │  - User Presence    │
                    └─────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Supabase DB       │
                    │  (Optional)         │
                    │                     │
                    │  - Message History  │
                    │  - User Profiles    │
                    │  - Group Data       │
                    └─────────────────────┘

       After Connection Established:
       
┌──────────────┐                                        ┌──────────────┐
│   User A     │◄──────── P2P Data Channel ────────────►│   User B     │
│              │        (Encrypted Messages)            │              │
└──────────────┘        (No Server Relay)               └──────────────┘
```

---

## Connection Establishment Flow

```
User A                    Signaling Server                    User B
  │                              │                              │
  │──── connect (Socket.IO) ────►│                              │
  │                              │◄──── connect (Socket.IO) ────│
  │                              │                              │
  │── user_connected(peerA) ────►│                              │
  │                              │◄── user_connected(peerB) ────│
  │                              │                              │
  │                              │── online_users ─────────────►│
  │                              │                              │
  │                                                             │
  │ User A initiates connection to User B                      │
  │                                                             │
  │ 1. Create RTCPeerConnection                                │
  │ 2. Create Data Channel                                     │
  │ 3. createOffer()                                           │
  │ 4. setLocalDescription(offer)                              │
  │                              │                              │
  │────── offer ─────────────────►│                              │
  │                              │────── offer ─────────────────►│
  │                              │                              │
  │                              │                              │ 1. Create RTCPeerConnection
  │                              │                              │ 2. setRemoteDescription(offer)
  │                              │                              │ 3. createAnswer()
  │                              │                              │ 4. setLocalDescription(answer)
  │                              │                              │
  │                              │◄───── answer ────────────────│
  │◄───── answer ────────────────│                              │
  │                              │                              │
  │ setRemoteDescription(answer) │                              │
  │                              │                              │
  │                                                             │
  │ ICE Candidate Exchange (multiple)                          │
  │                              │                              │
  │── ice_candidate ─────────────►│                              │
  │                              │── ice_candidate ─────────────►│
  │                              │                              │ addIceCandidate()
  │                              │                              │
  │                              │◄─ ice_candidate ─────────────│
  │◄─ ice_candidate ─────────────│                              │
  │ addIceCandidate()            │                              │
  │                              │                              │
  │                                                             │
  │ ICE State: checking → connected                            │
  │ Data Channel: connecting → open                            │
  │                              │                              │
  │═══════════════════════════════════════════════════════════►│
  │          P2P Data Channel Established                      │
  │          (No more server relay needed)                     │
  │◄═══════════════════════════════════════════════════════════│
  │                              │                              │
```

---

## Message Flow (After Connection)

```
User A                                                          User B
  │                                                               │
  │ 1. User types message                                        │
  │ 2. webrtcService.sendMessage(msg, peerB)                     │
  │ 3. Check data channel state === 'open'                       │
  │ 4. encryptMessage(msg) with AES-GCM                          │
  │ 5. dataChannel.send(encryptedMsg)                            │
  │                                                               │
  │═══════════════════ Encrypted P2P ═══════════════════════════►│
  │                                                               │
  │                                                               │ 1. dataChannel.onmessage fires
  │                                                               │ 2. decryptMessage(encryptedMsg)
  │                                                               │ 3. processReceivedMessage(msg)
  │                                                               │ 4. Update UI
  │                                                               │ 5. sendDeliveryReceipt()
  │                                                               │
  │◄══════════════════ Delivery Receipt ═════════════════════════│
  │                                                               │
  │ Update message status to 'delivered'                         │
  │                                                               │
```

---

## Data Channel Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    RTCPeerConnection                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              Data Channel: "chat"                         │ │
│  │              - ordered: true                              │ │
│  │              - reliable: true (default)                   │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │                                                           │ │
│  │  Message Types Supported:                                │ │
│  │  ✅ CHAT - Text messages                                 │ │
│  │  ✅ FILE_META - File metadata                            │ │
│  │  ✅ FILE_CHUNK - File data chunks (16KB)                 │ │
│  │  ✅ TYPING_STATUS - Typing indicators                    │ │
│  │  ✅ REACTION - Message reactions                         │ │
│  │  ✅ DELIVERY_RECEIPT - Message delivered                 │ │
│  │  ✅ READ_RECEIPT - Message read                          │ │
│  │  ✅ DELETE_MESSAGE - Message deletion                    │ │
│  │  ✅ EDIT_MESSAGE - Message editing                       │ │
│  │  ✅ GROUP_CREATED - Group chat creation                  │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Encryption Layer: AES-GCM (256-bit)                           │
│  - Each message encrypted with unique IV                       │
│  - Key generated via Web Crypto API                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ICE Configuration

```
┌─────────────────────────────────────────────────────────────────┐
│                    ICE Server Configuration                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STUN Servers (NAT Discovery):                                 │
│  ✅ stun:stun1.l.google.com:19302                              │
│  ✅ stun:stun2.l.google.com:19302                              │
│                                                                 │
│  TURN Servers (Relay Fallback):                                │
│  ⚠️ turn:numb.viagenie.ca                                      │
│     username: webrtc@live.com                                  │
│     credential: muazkh                                         │
│     [WARNING: Hardcoded credentials]                           │
│                                                                 │
│  ⚠️ turn:turn.anyfirewall.com:443?transport=tcp               │
│     username: webrtc                                           │
│     credential: webrtc                                         │
│     [WARNING: Hardcoded credentials]                           │
│                                                                 │
│  Settings:                                                      │
│  - iceTransportPolicy: 'all'                                   │
│  - iceCandidatePoolSize: 10                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Connection State Machine

```
┌─────────────┐
│   Initial   │
└──────┬──────┘
       │
       │ initiateConnection()
       ▼
┌─────────────┐
│ Connecting  │◄──────────────┐
└──────┬──────┘               │
       │                      │
       │ ICE: checking        │ Reconnection
       ▼                      │ (ICE restart)
┌─────────────┐               │
│  Connected  │               │
└──────┬──────┘               │
       │                      │
       │ Network issue        │
       ▼                      │
┌─────────────┐               │
│Disconnected │───────────────┘
└──────┬──────┘
       │
       │ Max retries exceeded
       ▼
┌─────────────┐
│   Failed    │
└─────────────┘

State Handlers:
- oniceconnectionstatechange
- onconnectionstatechange
- handleConnectionFailure()
- restartIce() or recreate connection
```

---

## File Transfer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      File Transfer Flow                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Sender:                                                        │
│  1. file.arrayBuffer()                                         │
│  2. Split into 16KB chunks                                     │
│  3. Send FILE_META (name, size, chunks, mimeType)              │
│  4. Send FILE_CHUNK messages (index 0 to N)                    │
│                                                                 │
│  Receiver:                                                      │
│  1. Receive FILE_META → Initialize buffer                      │
│  2. Receive FILE_CHUNK → Store by index                        │
│  3. All chunks received → Reconstruct file                     │
│  4. Create Blob → Generate download URL                        │
│                                                                 │
│  Chunk Size: 16,384 bytes (16KB)                               │
│  Max File Size: Unlimited (chunked transfer)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Encryption Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Message Encryption (AES-GCM)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Initialization (per user):                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ window.crypto.subtle.generateKey()                       │  │
│  │   - Algorithm: AES-GCM                                   │  │
│  │   - Key Length: 256 bits                                 │  │
│  │   - Extractable: true                                    │  │
│  │   - Usages: ['encrypt', 'decrypt']                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Encryption (per message):                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. JSON.stringify(message)                               │  │
│  │ 2. TextEncoder.encode(json)                              │  │
│  │ 3. Generate random IV (12 bytes)                         │  │
│  │ 4. crypto.subtle.encrypt(AES-GCM, key, data, iv)         │  │
│  │ 5. Return { data: encryptedBytes, iv: ivBytes }          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Decryption (per message):                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. crypto.subtle.decrypt(AES-GCM, key, data, iv)         │  │
│  │ 2. TextDecoder.decode(decryptedBytes)                    │  │
│  │ 3. JSON.parse(json)                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ⚠️ Note: Each peer generates their own key                    │
│           Keys are NOT exchanged (not true E2EE)               │
│           Messages encrypted per-peer, not per-conversation    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Reconnection Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    Connection Failure Handling                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Trigger: ICE state = 'failed' or 'disconnected'               │
│                                                                 │
│  Step 1: Try ICE Restart (if supported)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ if (peerConnection.restartIce) {                         │  │
│  │     peerConnection.restartIce();                         │  │
│  │     initiateConnection(peerId, iceRestart: true);        │  │
│  │ }                                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Step 2: Fallback - Recreate Connection                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ closeConnection(peerId);                                 │  │
│  │ setTimeout(() => {                                       │  │
│  │     initiateConnection(peerId);                          │  │
│  │ }, 1000); // Fixed 1s delay                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ⚠️ Issue: No exponential backoff                              │
│  ✅ Recommendation: Implement retry with backoff               │
│                                                                 │
│  Pending Messages:                                              │
│  - Queued in pendingMessages Map                               │
│  - Sent when connection re-establishes                         │
│  - processPendingMessagesForPeer() on 'connected' state        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Redux State Management

```
┌─────────────────────────────────────────────────────────────────┐
│                    Redux Store (peersSlice)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  State Structure:                                               │
│  {                                                              │
│    connections: {                                               │
│      [peerId]: RTCPeerConnection  // Non-serializable          │
│    },                                                           │
│    dataChannels: {                                              │
│      [peerId]: RTCDataChannel     // Non-serializable          │
│    },                                                           │
│    peers: EntityAdapter<Peer> {                                │
│      [peerId]: {                                               │
│        id: string,                                             │
│        status: 'connecting' | 'connected' | 'disconnected',    │
│        userInfo: { name, avatar },                             │
│        lastActivity: timestamp                                 │
│      }                                                          │
│    }                                                            │
│  }                                                              │
│                                                                 │
│  Actions:                                                       │
│  - setPeerConnection(peerId, connection)                       │
│  - setDataChannel(peerId, channel)                             │
│  - updatePeerStatus(peerId, status)                            │
│  - addPeer(peer)                                               │
│  - removePeer(peerId)                                          │
│                                                                 │
│  ⚠️ Note: RTCPeerConnection stored outside Redux               │
│           (non-serializable check ignored)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## What's NOT Implemented

```
┌─────────────────────────────────────────────────────────────────┐
│                    Missing Features                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ❌ Video Calling:                                              │
│     - No getUserMedia() for video                              │
│     - No addTrack() to add video stream                        │
│     - No ontrack handler to receive video                      │
│     - No <video> element rendering                             │
│                                                                 │
│  ❌ Audio Calling:                                              │
│     - getUserMedia() exists (VoiceMessageRecorder)             │
│     - But NOT connected to RTCPeerConnection                   │
│     - No real-time audio streaming                             │
│                                                                 │
│  ❌ Screen Sharing:                                             │
│     - No getDisplayMedia() usage                               │
│     - No screen track handling                                 │
│                                                                 │
│  ❌ Multi-party Calls:                                          │
│     - Only P2P (peer-to-peer)                                  │
│     - No SFU (Selective Forwarding Unit)                       │
│     - No MCU (Multipoint Control Unit)                         │
│                                                                 │
│  ❌ Simulcast:                                                  │
│     - No multi-quality video streams                           │
│     - No adaptive bitrate                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Performance Characteristics

```
┌─────────────────────────────────────────────────────────────────┐
│                    Performance Metrics                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Message Latency:                                               │
│  - Encryption: ~5-10ms (AES-GCM)                               │
│  - P2P Transmission: ~10-50ms (local network)                  │
│  - P2P Transmission: ~50-200ms (internet)                      │
│  - Total: ~20-220ms end-to-end                                 │
│                                                                 │
│  Connection Establishment:                                      │
│  - STUN check: ~1-5 seconds                                    │
│  - Offer/Answer: ~500ms                                        │
│  - ICE gathering: ~2-5 seconds                                 │
│  - Total: ~3-10 seconds                                        │
│                                                                 │
│  File Transfer:                                                 │
│  - Chunk size: 16KB                                            │
│  - Throughput: ~1-10 MB/s (depends on connection)              │
│  - 100MB file: ~10-100 seconds                                 │
│                                                                 │
│  Message Batching:                                              │
│  - Batch size: 50 messages                                     │
│  - Batch interval: 100ms                                       │
│  - Reduces UI updates for high-frequency messages              │
│                                                                 │
│  Connection Monitoring:                                         │
│  - Heartbeat: 30 seconds (Supabase status update)              │
│  - Connection check: 5 seconds (debounced)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    Security Architecture                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ Encryption:                                                 │
│     - AES-GCM 256-bit for all messages                         │
│     - Unique IV per message                                    │
│     - Web Crypto API (browser native)                          │
│                                                                 │
│  ⚠️ Key Management:                                             │
│     - Each peer generates own key                              │
│     - Keys NOT exchanged between peers                         │
│     - NOT true end-to-end encryption                           │
│     - Messages encrypted in transit only                       │
│                                                                 │
│  ⚠️ TURN Credentials:                                           │
│     - Hardcoded in source code                                 │
│     - Public credentials (can be abused)                       │
│     - Should use environment variables                         │
│                                                                 │
│  ✅ P2P Communication:                                          │
│     - Direct peer-to-peer after connection                     │
│     - No server relay for messages                             │
│     - Signaling server only for setup                          │
│                                                                 │
│  ⚠️ Authentication:                                             │
│     - Optional (can use without auth)                          │
│     - GitHub OAuth available                                   │
│     - Peer ID is UUID (not authenticated)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Production Deployment                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Frontend (React App):                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Hosting: Netlify / Vercel / S3 + CloudFront             │  │
│  │ Build: npm run build                                     │  │
│  │ Static files: HTML, JS, CSS                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Signaling Server (Node.js):                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Hosting: Heroku / DigitalOcean / AWS EC2                │  │
│  │ Port: 5000 (configurable)                                │  │
│  │ WebSocket: Socket.IO                                     │  │
│  │ Database: Supabase (cloud)                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  STUN/TURN Servers:                                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ STUN: Google public servers (free)                       │  │
│  │ TURN: Self-hosted coturn OR Twilio/Xirsys (paid)         │  │
│  │ Recommendation: Use private TURN with auth               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Configuration:                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Update webrtc-service.js:                                │  │
│  │   - Change Socket.IO URL to production server            │  │
│  │   - Use environment variables for TURN                   │  │
│  │                                                          │  │
│  │ Environment Variables:                                   │  │
│  │   REACT_APP_SIGNALING_URL=https://signal.example.com    │  │
│  │   REACT_APP_TURN_URL=turn:turn.example.com:3478         │  │
│  │   REACT_APP_TURN_USERNAME=<dynamic>                     │  │
│  │   REACT_APP_TURN_CREDENTIAL=<dynamic>                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

**Document Version:** 1.0  
**Last Updated:** November 10, 2025  
**Maintained By:** ECHOLINK Development Team
