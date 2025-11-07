# 🚀 ECHOLINK Quick Start Guide

Get ECHOLINK up and running in 5 minutes!

---

## Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works)
- Git

---

## 1️⃣ Clone & Install (2 minutes)

```bash
# Clone the repository
git clone https://github.com/sreevarshan-xenoz/ECHOLINK-A-Real-Time-Chat-Application.git
cd ECHOLINK-A-Real-Time-Chat-Application

# Checkout the revive-alive branch
git checkout revive-alive

# Install all dependencies
npm run install:all
```

---

## 2️⃣ Setup Supabase (2 minutes)

### Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up/login
3. Click "New Project"
4. Note your **Project URL** and **anon public key**

### Run Database Setup
1. In Supabase dashboard, go to **SQL Editor**
2. Copy contents of `server/supabase-setup.sql`
3. Paste and click **Run**
4. Verify tables were created in **Table Editor**

---

## 3️⃣ Configure Environment (1 minute)

```bash
# Copy environment templates
cp .env.example .env
cp .env.example server/.env

# Edit .env files with your Supabase credentials
# Replace these values:
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Quick Edit (Linux/Mac):**
```bash
# Replace with your actual values
sed -i 's|your_supabase_url_here|https://xxxxx.supabase.co|g' .env
sed -i 's|your_supabase_anon_key_here|eyJhbGc...|g' .env

# Copy to server
cp .env server/.env
```

---

## 4️⃣ Start Application (30 seconds)

```bash
# Start all servers at once
npm run dev:all
```

**Or start individually:**
```bash
# Terminal 1: Signaling Server
cd signaling-server && npm start

# Terminal 2: Backend Server  
cd server && npm start

# Terminal 3: Frontend
npm start
```

---

## 5️⃣ Test It Out! (1 minute)

1. **Open Browser:** http://localhost:3000
2. **Sign Up:** Create an account
3. **Copy Your ID:** From the sidebar
4. **Open Incognito:** Open another browser window
5. **Sign Up Again:** Create second account
6. **Connect:** Paste first user's ID in second window
7. **Chat:** Send messages - they persist to database!

---

## ✅ Verify Setup

Run the automated verification:
```bash
./test-setup.sh
```

Should show all green checkmarks ✓

---

## 🎯 Quick Feature Test

### Test Real Data Persistence
1. Send a message
2. Refresh the page
3. Message should still be there! ✨

### Test AI Chat (Optional)
1. Click "AI Chat" in sidebar
2. Click settings icon
3. Add OpenAI or Gemini API key
4. Chat with real AI (no more mocks!)

### Test WebRTC
1. Connect with another user
2. Send messages in real-time
3. Try voice messages
4. Share files

---

## 🐛 Troubleshooting

### "Cannot connect to server"
```bash
# Check if servers are running
lsof -i :3000  # Frontend
lsof -i :5000  # Backend
lsof -i :1234  # Collaborative server

# Restart servers
npm run dev:all
```

### "Messages not persisting"
```bash
# Verify Supabase credentials
cat .env | grep SUPABASE

# Check server logs
cd server && npm start
# Look for "Connected to Supabase" or errors
```

### "Dependencies not found"
```bash
# Reinstall everything
npm run clean
npm run install:all
```

### "Port already in use"
```bash
# Kill processes on ports
kill -9 $(lsof -t -i:3000)
kill -9 $(lsof -t -i:5000)
kill -9 $(lsof -t -i:1234)
```

---

## 📚 Next Steps

### Explore Features
- ✅ Real-time messaging
- ✅ Group chats
- ✅ AI assistant
- ✅ File sharing
- ✅ Code sharing
- ✅ Voice messages
- ✅ Reactions
- ✅ GitHub integration

### Optional Enhancements

#### Add MongoDB (Optional)
```bash
# Install MongoDB
brew install mongodb-community  # Mac
# or
sudo apt install mongodb        # Linux

# Enable in server/.env
USE_MONGODB=true
MONGODB_URI=mongodb://localhost:27017/echolink

# Restart server
cd server && npm start
```

#### Configure AI Services
1. Get API key from:
   - [OpenAI](https://platform.openai.com/api-keys)
   - [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to AI Settings in app
3. Chat with real AI!

#### Setup GitHub OAuth
1. Create OAuth app at [GitHub Settings](https://github.com/settings/developers)
2. Add credentials to `.env`:
   ```
   REACT_APP_GITHUB_CLIENT_ID=your_client_id
   REACT_APP_GITHUB_CLIENT_SECRET=your_client_secret
   ```
3. Restart servers

---

## 🎓 Learn More

- **Full Documentation:** [README.md](README.md)
- **Change Log:** [REVIVE_CHANGES.md](REVIVE_CHANGES.md)
- **Implementation Details:** [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- **Supabase Setup:** [SUPABASE_SETUP.md](SUPABASE_SETUP.md)

---

## 💡 Pro Tips

### Development Workflow
```bash
# Watch for changes
npm run dev:all

# Type checking
npm run type-check:watch

# Linting
npm run lint:fix

# Format code
npm run format
```

### Database Management
```bash
# View Supabase data
# Go to: https://app.supabase.com/project/_/editor

# Export data
# Use Supabase dashboard: Database → Backups

# Reset database
# Re-run server/supabase-setup.sql
```

### Debugging
```bash
# Enable verbose logging
NODE_ENV=development npm run dev:all

# Check browser console
# Open DevTools → Console

# Check server logs
cd server && npm start
# Watch for errors
```

---

## 🚀 Deploy to Production

### Quick Deploy (Vercel + Supabase)

1. **Frontend (Vercel):**
   ```bash
   npm install -g vercel
   vercel
   # Follow prompts
   ```

2. **Backend (Heroku/Railway):**
   ```bash
   # Push to Heroku
   heroku create echolink-backend
   git push heroku revive-alive:main
   
   # Or use Railway
   railway init
   railway up
   ```

3. **Update Environment:**
   - Add production Supabase URL
   - Update CORS origins
   - Set NODE_ENV=production

---

## 🎉 Success!

You now have a fully functional real-time chat application with:
- ✅ Real database persistence
- ✅ AI integration
- ✅ WebRTC communication
- ✅ No mock data!

**Happy Chatting! 💬**

---

## 🆘 Need Help?

- **Issues:** [GitHub Issues](https://github.com/sreevarshan-xenoz/ECHOLINK-A-Real-Time-Chat-Application/issues)
- **Discussions:** [GitHub Discussions](https://github.com/sreevarshan-xenoz/ECHOLINK-A-Real-Time-Chat-Application/discussions)
- **Email:** Contact repository maintainer

---

**Last Updated:** January 7, 2025  
**Branch:** revive-alive  
**Status:** ✅ Production Ready
