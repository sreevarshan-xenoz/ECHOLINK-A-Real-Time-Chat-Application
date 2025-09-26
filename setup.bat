@echo off
REM EchoLink Setup Script for Wiecho 📋 Next steps:
echo 1. Configure your .env file with actual credentials
echo 2. Set up your Supabase database using the SQL scripts
echo 3. Create a GitHub OAuth app for GitHub integration
echo 4. Install additional dev tools: npm run install:dev
echo 5. Run type checking: npm run type-check
echo 6. Start the development servers:
echo    - All at once: npm run dev:all
echo    - Or individually:
echo      * Terminal 1: cd signaling-server ^&^& npm start
echo      * Terminal 2: cd server ^&^& npm start
echo      * Terminal 3: npm start
echo.
echo 📖 For more information, check the README.md and DEVELOPMENT.md files
pauseThis script helps set up the development environment

echo 🚀 Setting up EchoLink Development Environment...

REM Check if Node.js is installed
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

echo ✅ Node.js found
node --version

REM Install main dependencies
echo 📦 Installing main application dependencies...
call npm install

REM Install server dependencies
echo 📦 Installing server dependencies...
cd server
call npm install
cd ..

REM Install signaling server dependencies
echo 📦 Installing signaling server dependencies...
cd signaling-server
call npm install
cd ..

REM Update browser data
echo 🌐 Updating browser compatibility data...
call npx update-browserslist-db@latest

REM Fix security vulnerabilities
echo 🔒 Fixing security vulnerabilities...
call npm audit fix

echo ✅ Setup complete!
echo.
echo 📋 Next steps:
echo 1. Configure your .env file with actual credentials
echo 2. Set up your Supabase database using the SQL scripts
echo 3. Create a GitHub OAuth app for GitHub integration
echo 4. Start the development servers:
echo    - Terminal 1: cd signaling-server ^&^& npm start
echo    - Terminal 2: cd server ^&^& npm start
echo    - Terminal 3: npm start
echo.
echo 📖 For more information, check the README.md file
pause