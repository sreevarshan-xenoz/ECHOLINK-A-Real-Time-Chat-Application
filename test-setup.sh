#!/bin/bash

# ECHOLINK Setup Test Script
# Tests that all components are properly configured

echo "🔍 ECHOLINK Setup Verification"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓${NC} Found $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not found. Please install Node.js"
    exit 1
fi

# Check npm
echo -n "Checking npm... "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓${NC} Found v$NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm not found"
    exit 1
fi

# Check if node_modules exists
echo -n "Checking dependencies... "
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Frontend dependencies installed"
else
    echo -e "${YELLOW}⚠${NC} Frontend dependencies not installed. Run: npm install"
fi

if [ -d "server/node_modules" ]; then
    echo -e "${GREEN}✓${NC} Server dependencies installed"
else
    echo -e "${YELLOW}⚠${NC} Server dependencies not installed. Run: cd server && npm install"
fi

if [ -d "signaling-server/node_modules" ]; then
    echo -e "${GREEN}✓${NC} Signaling server dependencies installed"
else
    echo -e "${YELLOW}⚠${NC} Signaling server dependencies not installed. Run: cd signaling-server && npm install"
fi

# Check environment files
echo ""
echo "Checking environment configuration..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} Root .env file exists"
    
    # Check for required variables
    if grep -q "REACT_APP_SUPABASE_URL" .env; then
        echo -e "${GREEN}  ✓${NC} REACT_APP_SUPABASE_URL configured"
    else
        echo -e "${YELLOW}  ⚠${NC} REACT_APP_SUPABASE_URL not found in .env"
    fi
    
    if grep -q "REACT_APP_SUPABASE_ANON_KEY" .env; then
        echo -e "${GREEN}  ✓${NC} REACT_APP_SUPABASE_ANON_KEY configured"
    else
        echo -e "${YELLOW}  ⚠${NC} REACT_APP_SUPABASE_ANON_KEY not found in .env"
    fi
else
    echo -e "${RED}✗${NC} Root .env file not found. Copy .env.example to .env"
fi

if [ -f "server/.env" ]; then
    echo -e "${GREEN}✓${NC} Server .env file exists"
    
    if grep -q "REACT_APP_SUPABASE_URL" server/.env; then
        echo -e "${GREEN}  ✓${NC} Server Supabase URL configured"
    else
        echo -e "${YELLOW}  ⚠${NC} Server Supabase URL not found"
    fi
    
    if grep -q "USE_MONGODB" server/.env; then
        USE_MONGO=$(grep "USE_MONGODB" server/.env | cut -d '=' -f2)
        if [ "$USE_MONGO" = "true" ]; then
            echo -e "${GREEN}  ✓${NC} MongoDB enabled"
            if grep -q "MONGODB_URI" server/.env; then
                echo -e "${GREEN}  ✓${NC} MongoDB URI configured"
            else
                echo -e "${RED}  ✗${NC} MongoDB URI not found but MongoDB is enabled"
            fi
        else
            echo -e "${GREEN}  ✓${NC} Using Supabase only (MongoDB disabled)"
        fi
    fi
else
    echo -e "${RED}✗${NC} Server .env file not found. Copy .env.example to server/.env"
fi

# Check MongoDB (if enabled)
echo ""
echo "Checking database connectivity..."
if [ -f "server/.env" ] && grep -q "USE_MONGODB=true" server/.env; then
    echo -n "Testing MongoDB connection... "
    if command -v mongosh &> /dev/null || command -v mongo &> /dev/null; then
        echo -e "${GREEN}✓${NC} MongoDB client found"
    else
        echo -e "${YELLOW}⚠${NC} MongoDB client not found. Install MongoDB if using local DB"
    fi
else
    echo -e "${GREEN}✓${NC} Using Supabase (MongoDB not enabled)"
fi

# Check ports
echo ""
echo "Checking port availability..."
check_port() {
    PORT=$1
    NAME=$2
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}⚠${NC} Port $PORT ($NAME) is already in use"
    else
        echo -e "${GREEN}✓${NC} Port $PORT ($NAME) is available"
    fi
}

check_port 3000 "Frontend"
check_port 5000 "Backend Server"
check_port 1234 "Collaborative Server"

# Summary
echo ""
echo "================================"
echo "Summary:"
echo ""

if [ -d "node_modules" ] && [ -d "server/node_modules" ] && [ -f ".env" ] && [ -f "server/.env" ]; then
    echo -e "${GREEN}✓ Setup looks good!${NC}"
    echo ""
    echo "To start the application:"
    echo "  npm run dev:all"
    echo ""
    echo "Or start servers individually:"
    echo "  Terminal 1: cd signaling-server && npm start"
    echo "  Terminal 2: cd server && npm start"
    echo "  Terminal 3: npm start"
else
    echo -e "${YELLOW}⚠ Setup incomplete${NC}"
    echo ""
    echo "Next steps:"
    if [ ! -d "node_modules" ]; then
        echo "  1. Run: npm install"
    fi
    if [ ! -d "server/node_modules" ]; then
        echo "  2. Run: cd server && npm install"
    fi
    if [ ! -d "signaling-server/node_modules" ]; then
        echo "  3. Run: cd signaling-server && npm install"
    fi
    if [ ! -f ".env" ]; then
        echo "  4. Copy .env.example to .env and configure"
    fi
    if [ ! -f "server/.env" ]; then
        echo "  5. Copy .env.example to server/.env and configure"
    fi
fi

echo ""
echo "For detailed setup instructions, see:"
echo "  - README.md"
echo "  - REVIVE_CHANGES.md"
echo ""
