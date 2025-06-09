# P2P Chat Application

A decentralized peer-to-peer chat application using WebRTC for direct communication between browsers.

## Features
- 🔒 End-to-end encryption
- 📱 Real-time messaging
- 🎤 Voice messages
- 📎 File sharing
- 👍 Message reactions
- 🌙 Dark mode
- 🔍 Message search
- ⌨️ Typing indicators

## Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/sreevarshan-xenoz/ECHOLINK-A-Real-Time-Chat-Application.git
cd ECHOLINK-A-Real-Time-Chat-Application
```

### 2. Install Dependencies
First, install the client dependencies:
```bash
npm install
```

Then, install the server dependencies:
```bash
cd server
npm install
cd ..
```

### 3. Start the Server
The server is needed for initial peer discovery. In a terminal window:
```bash
cd server
npm start
```
This will start the server on port 5000.

### 4. Start the Client
In a new terminal window:
```bash
npm start
```
This will start the React application on port 3000.

## How to Use

1. **Open the Application**
   - Open `http://localhost:3000` in your browser
   - The app will generate a unique ID for you

2. **Connect with Friends**
   - Share your ID with your friend (click the "Copy ID" button)
   - Ask your friend to paste your ID in their "Enter peer ID to connect" field
   - Once connected, you'll see each other in the peers list

3. **Start Chatting**
   - Click on a connected peer in the sidebar to start chatting
   - You can send:
     - Text messages
     - Voice messages (click the microphone icon)
     - Files (click the attachment icon)
   - React to messages by hovering over them
   - Use dark mode toggle for different themes
   - Search through messages using the search bar

## Network Requirements

- Both users need to be able to access the signaling server (default: localhost:5000)
- For direct connections, both users' networks should allow WebRTC traffic
- If behind NAT, the application uses STUN servers for connection establishment

## Security

- All messages are encrypted end-to-end using AES-GCM
- No messages are stored on any server
- All communication is peer-to-peer after initial connection
- The signaling server only helps in establishing the initial connection

## Deployment

To deploy for public use:

1. Deploy the signaling server to a public host (e.g., Heroku, DigitalOcean)
2. Update the server URL in `src/services/webrtc-service.js`
3. Deploy the client application to a static host (e.g., Netlify, Vercel)

## Upgrade Plan

This section outlines potential future enhancements to take ECHOLINK to the next level:

- **Group Chat Functionality**: Implement robust group chat features, allowing multiple users to communicate in a single conversation.
- **Video Calling**: Integrate video calling capabilities using WebRTC for a richer communication experience.
- **Persistent Storage/Database Integration**: For users who want to retain chat history across sessions or devices, integrate a database (e.g., Supabase, Firebase, or a self-hosted solution like PostgreSQL with a backend API) to store messages and user data securely.
- **User Authentication and Profiles**: Implement a proper user authentication system (e.g., OAuth, email/password) and allow users to create profiles with avatars and status messages.
- **Mobile Applications**: Develop native or cross-platform (e.g., React Native, Flutter) mobile applications for iOS and Android to expand accessibility.
- **Push Notifications**: Add push notifications to alert users of new messages when the application is not active.
- **Scalable Signaling Server**: For larger deployments, enhance the signaling server architecture for better scalability and reliability, potentially using technologies like Redis for session management and load balancing.
- **Advanced Moderation Tools**: For public or larger group chats, introduce moderation tools for administrators.
- **Screen Sharing**: Add screen sharing capabilities, further enhancing collaborative features.
- **Improved UI/UX**: Continuously refine the user interface and user experience based on user feedback and modern design principles.
- **Bots and Integrations**: Allow for the integration of bots or third-party services within chats.
- **End-to-End Encrypted Group Chats**: Extend end-to-end encryption to group chats, which can be complex but offers maximum privacy.

## Troubleshooting

1. **Can't Connect to Peers**
   - Check if both users have different IDs
   - Ensure both users are running the latest version
   - Check if the signaling server is running
   - Verify network/firewall settings

2. **Messages Not Sending**
   - Ensure both users are still connected
   - Check your internet connection
   - Try refreshing the page

3. **Audio/File Sharing Issues**
   - Ensure you've granted necessary browser permissions
   - Check if your browser supports WebRTC file sharing
   - Verify the file size is within limits
