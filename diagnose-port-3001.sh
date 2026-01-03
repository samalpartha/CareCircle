#!/bin/bash

# CareCircle Port 3001 Diagnostic Script
# Identifies why connection drops occur

echo "🔍 CareCircle Port 3001 Diagnostics"
echo "===================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check if port is in use
echo "1️⃣  Checking port 3001 status..."
if lsof -i :3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Port 3001 is in use${NC}"
    echo "   Processes using port 3001:"
    lsof -i :3001 | grep -v COMMAND
else
    echo -e "${RED}❌ Port 3001 is NOT in use${NC}"
    echo "   The server is not running!"
fi
echo ""

# 2. Check Node.js version
echo "2️⃣  Checking Node.js version..."
NODE_VERSION=$(node --version 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | tr -d 'v')
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        echo -e "${YELLOW}⚠️  Warning: Node 18+ recommended (you have Node $MAJOR_VERSION)${NC}"
    fi
else
    echo -e "${RED}❌ Node.js not found${NC}"
fi
echo ""

# 3. Check npm version
echo "3️⃣  Checking npm version..."
NPM_VERSION=$(npm --version 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ npm: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm not found${NC}"
fi
echo ""

# 4. Check if node_modules exists
echo "4️⃣  Checking dependencies..."
if [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✅ node_modules exists${NC}"
    MODULE_COUNT=$(find frontend/node_modules -maxdepth 1 -type d | wc -l)
    echo "   Packages installed: ~$MODULE_COUNT"
else
    echo -e "${RED}❌ node_modules missing${NC}"
    echo "   Run: cd frontend && npm install"
fi
echo ""

# 5. Check file watcher limits (macOS)
echo "5️⃣  Checking system file limits..."
MAX_FILES=$(sysctl -n kern.maxfiles 2>/dev/null)
MAX_FILES_PER_PROC=$(sysctl -n kern.maxfilesperproc 2>/dev/null)
if [ -n "$MAX_FILES" ]; then
    echo "   kern.maxfiles: $MAX_FILES"
    if [ "$MAX_FILES" -lt 65536 ]; then
        echo -e "${YELLOW}⚠️  Low limit. Recommended: 65536${NC}"
        echo "   Fix: sudo sysctl -w kern.maxfiles=65536"
    else
        echo -e "${GREEN}✅ File limit is good${NC}"
    fi
fi
if [ -n "$MAX_FILES_PER_PROC" ]; then
    echo "   kern.maxfilesperproc: $MAX_FILES_PER_PROC"
    if [ "$MAX_FILES_PER_PROC" -lt 65536 ]; then
        echo -e "${YELLOW}⚠️  Low limit. Recommended: 65536${NC}"
        echo "   Fix: sudo sysctl -w kern.maxfilesperproc=65536"
    else
        echo -e "${GREEN}✅ Per-process limit is good${NC}"
    fi
fi
echo ""

# 6. Check memory usage
echo "6️⃣  Checking system resources..."
MEMORY_INFO=$(top -l 1 | grep PhysMem)
echo "   $MEMORY_INFO"

CPU_INFO=$(top -l 1 | grep "CPU usage")
echo "   $CPU_INFO"
echo ""

# 7. Check for Node processes
echo "7️⃣  Checking Node.js processes..."
NODE_PROCS=$(ps aux | grep -i "node\|react-scripts" | grep -v grep | grep -v "diagnose")
if [ -n "$NODE_PROCS" ]; then
    echo -e "${GREEN}✅ Node processes found:${NC}"
    echo "$NODE_PROCS" | while read line; do
        echo "   $line"
    done
else
    echo -e "${YELLOW}⚠️  No Node/React processes running${NC}"
fi
echo ""

# 8. Check for .env file
echo "8️⃣  Checking configuration..."
if [ -f "frontend/.env" ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    echo "   Contents:"
    cat frontend/.env | while read line; do
        echo "   $line"
    done
else
    echo -e "${YELLOW}⚠️  No .env file found${NC}"
    echo "   Creating recommended .env..."
fi
echo ""

# 9. Check recent crashes
echo "9️⃣  Checking for recent errors..."
if [ -f "frontend/npm-debug.log" ]; then
    echo -e "${YELLOW}⚠️  npm-debug.log found (indicates recent crash)${NC}"
    echo "   Last 5 error lines:"
    grep -i "error" frontend/npm-debug.log | tail -5 | while read line; do
        echo "   $line"
    done
else
    echo -e "${GREEN}✅ No crash logs found${NC}"
fi
echo ""

# 10. Test connectivity
echo "🔟  Testing localhost connectivity..."
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is responding on port 3001${NC}"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001)
    echo "   HTTP Status: $HTTP_CODE"
else
    echo -e "${RED}❌ Cannot connect to port 3001${NC}"
    echo "   Server is not running or not accessible"
fi
echo ""

# Summary and recommendations
echo "================================================"
echo "📋 SUMMARY & RECOMMENDATIONS"
echo "================================================"
echo ""

# Determine the main issue
if ! lsof -i :3001 > /dev/null 2>&1; then
    echo -e "${RED}🔴 MAIN ISSUE: Server is not running${NC}"
    echo ""
    echo "Quick fix:"
    echo "  ./START_FRONTEND.sh"
    echo ""
elif [ "$MAX_FILES" -lt 65536 ] 2>/dev/null; then
    echo -e "${YELLOW}🟡 POTENTIAL ISSUE: Low file watcher limits${NC}"
    echo ""
    echo "This can cause random crashes. Fix with:"
    echo "  sudo sysctl -w kern.maxfiles=65536"
    echo "  sudo sysctl -w kern.maxfilesperproc=65536"
    echo ""
elif ! curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo -e "${YELLOW}🟡 POTENTIAL ISSUE: Server running but not responding${NC}"
    echo ""
    echo "Try restarting:"
    echo "  lsof -ti:3001 | xargs kill -9"
    echo "  ./START_FRONTEND.sh"
    echo ""
else
    echo -e "${GREEN}🟢 Everything looks good!${NC}"
    echo ""
    echo "If you're still experiencing drops, try:"
    echo "  1. Check Activity Monitor for high CPU/memory"
    echo "  2. Disable VPN"
    echo "  3. Keep Mac awake (don't let it sleep)"
    echo "  4. Use: caffeinate -d ./START_FRONTEND.sh"
    echo ""
fi

echo "📚 For more help, see: FIX_CONNECTION_DROPS.md"
echo ""




