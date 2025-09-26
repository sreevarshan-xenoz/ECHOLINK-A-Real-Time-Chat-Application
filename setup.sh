#!/bin/bash

# EchoLink Setup Script
# This script helps set up the development environment

echo "🚀 Setting up EchoLink Development Environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Install main dependencies
echo "📦 Installing main application dependencies..."
npm install

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server && npm install
cd ..

# Install signaling server dependencies
echo "📦 Installing signaling server dependencies..."
cd signaling-server && npm install
cd ..

# Update browser data
echo "🌐 Updating browser compatibility data..."
npx update-browserslist-db@latest

# Fix security vulnerabilities
echo "🔒 Fixing security vulnerabilities..."
npm audit fix

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Configure your .env file with actual credentials"
echo "2. Set up your Supabase database using the SQL scripts"
echo "3. Create a GitHub OAuth app for GitHub integration"
echo "4. Start the development servers:"
echo "   - Terminal 1: cd signaling-server && npm start"
echo "   - Terminal 2: cd server && npm start"
echo "   - Terminal 3: npm start"
echo ""
echo "📖 For more information, check the README.md file"