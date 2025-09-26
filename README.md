# <img src="public/logo.png" alt="EchoLink Logo" width="48" height="48" style="vertical-align:middle;"> EchoLink - A Real-Time Chat Application

<p align="center">
  <img src="public/banner.png" alt="EchoLink Banner" width="600"/>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/build-passing-brightgreen" alt="Build Status"></a>
  <a href="#"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="#"><img src="https://img.shields.io/badge/platform-windows%20%7C%20web-blue" alt="Platform"></a>
  <a href="#"><img src="https://img.shields.io/badge/react-18.2.0-61dafb" alt="React"></a>
</p>

---

> **EchoLink** is a modern, feature-rich real-time chat application built with React, Firebase, and Electron. It offers seamless, secure communication and powerful developer collaboration tools.

---

## Table of Contents
- [Features](#features)
- [Screenshots](#screenshots)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Usage](#usage)
- [Testing](#testing)
- [How to Use](#how-to-use)
- [Network Requirements](#network-requirements)
- [Security](#security)
- [Deployment](#deployment)
- [Upgrade Plan](#upgrade-plan)
- [Troubleshooting](#troubleshooting)
- [Credits](#credits)
- [License](#license)

---

## 🚀 Features

- 🔒 **End-to-End Encryption**: Secure peer-to-peer messaging
- 💬 **Real-Time Messaging**: Instant, reliable chat
- 🤖 **AI-Powered Assistant**: Integrated Echo AI for smart replies, sentiment analysis, and more
- 📝 **Code Sharing & Execution**: Share and run code snippets in chat
- 🎤 **Voice Messages**: Record and send audio messages
- 🖼️ **File & Media Sharing**: Share files and images securely
- 🧑‍💻 **LeetCode & HackerRank Integration**: Share profiles, problems, and achievements
- 🖌️ **Collaborative Whiteboard**: Draw and brainstorm together
- 🌗 **Dark/Light Mode**: Switch themes for comfort
- 👤 **User Profiles**: Custom avatars and status
- 📱 **Cross-Platform**: Web and Windows desktop app

---

## 📸 Screenshots

<p align="center">
  <img src="public/screenshot1.png" alt="Chat Screenshot" width="350"/>
  <img src="public/screenshot2.png" alt="AI Assistant Screenshot" width="350"/>
</p>

*Add your own screenshots in the `public/` folder for a more personalized README!*

---

## 🛠 Technologies Used

- **React**
- **Firebase/Supabase**
- **Chakra UI**
- **WebRTC**
- **Electron** (for Windows app)
- **Redux**
- **React Router**

---

## ⚡ Installation

### Quick Setup (Recommended)
1. **Clone the repository**
   ```bash
   git clone https://github.com/sreevarshan-xenoz/ECHOLINK-A-Real-Time-Chat-Application.git
   cd ECHOLINK-A-Real-Time-Chat-Application
   ```

2. **Run the setup script**
   - **Windows:** Double-click `setup.bat` or run in PowerShell:
     ```powershell
     .\setup.bat
     ```
   - **Linux/Mac:**
     ```bash
     chmod +x setup.sh
     ./setup.sh
     ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Fill in your actual credentials (see setup guides below)

4. **Start all servers**
   ```bash
   npm run dev:all
   ```

### Manual Setup
1. **Install all dependencies**
   ```bash
   npm run install:all
   ```
2. **Fix security vulnerabilities**
   ```bash
   npm run audit:fix
   ```
3. **Update browser data**
   ```bash
   npm run update:browsers
   ```
4. **Configure environment variables** (see `.env.example`)
5. **Start servers individually**
   ```bash
   # Terminal 1: Signaling Server
   cd signaling-server && npm start
   
   # Terminal 2: Backend Server
   cd server && npm start
   
   # Terminal 3: Frontend
   npm start
   ```

---

## 💻 Usage

After installation, open [http://localhost:3000](http://localhost:3000) in your browser to use the application.

To run as a Windows desktop app:
```bash
npm run electron-dev
```

To build a Windows installer:
```bash
npm run electron-dist
```
The `.exe` installer will be in the `dist/` folder.

---

## 🧪 Testing

This project uses Jest and React Testing Library.

- **Run all tests:**
  ```bash
  npm test
  ```
- **Run tests once (CI):**
  ```bash
  CI=true npm test
  ```
- **Test coverage:**
  ```bash
  npm test -- --coverage
  ```
- **Add new tests:** Place `.test.js` or `.test.tsx` files next to components.

---

## 📚 How to Use

1. **Open the Application**
   - Go to [http://localhost:3000](http://localhost:3000) or launch the desktop app
   - The app generates a unique ID for you
2. **Connect with Friends**
   - Share your ID, connect, and start chatting
3. **Start Chatting**
   - Send text, voice, files, code, and more
   - Use AI, search, and theme features

---

## 🌐 Network Requirements
- Both users must access the signaling server (default: localhost:5000)
- WebRTC traffic must be allowed by the network/firewall
- STUN servers are used for NAT traversal

---

## 🔐 Security
- End-to-end AES-GCM encryption
- No messages stored on any server
- Peer-to-peer after initial connection
- Signaling server only for connection setup

---

## 🚀 Deployment
1. Deploy the signaling server to a public host (Heroku, DigitalOcean, etc.)
2. Update the server URL in `src/services/webrtc-service.js`
3. Deploy the client to a static host (Netlify, Vercel, etc.)

---

## 🛣️ Upgrade Plan

### ✅ Implemented
- **Robust Group Chat Features**: Enhanced group chat with member lists and typing indicators
- **Persistent Storage/Database Integration**: Messages and groups are now stored in Supabase database

### 🔜 Coming Soon
- Video calling
- User authentication and profiles
- Mobile apps
- Push notifications
- Scalable signaling server
- Moderation tools
- Screen sharing
- UI/UX improvements
- Bots/integrations
- Encrypted group chats

---

## 🛠 Troubleshooting
- **Can't connect:** Check IDs, server, and network
- **Messages not sending:** Check connection and refresh
- **Audio/file issues:** Check permissions and browser support

---

## 🙏 Credits

Enhanced by **SREE VARSHAN V**  
[github.com/sreevarshan-xenoz](https://github.com/sreevarshan-xenoz)

---

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.
