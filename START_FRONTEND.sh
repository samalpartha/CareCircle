#!/bin/bash

# CareCircle Frontend Startup Script
# Fixes connection drops on port 3001

echo "🔧 CareCircle Frontend - Stable Startup Script"
echo "================================================"

# Navigate to frontend directory
cd "$(dirname "$0")/frontend"

# Kill any existing processes on port 3001
echo "🧹 Cleaning up port 3001..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
sleep 2

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Set environment variables to prevent connection drops
export PORT=3001
export BROWSER=none
export WATCHPACK_POLLING=true
export FAST_REFRESH=true
export CHOKIDAR_USEPOLLING=false
export CI=false

# Increase Node memory limit to prevent crashes
export NODE_OPTIONS="--max-old-space-size=4096"

echo ""
echo "✅ Starting React development server on port 3001..."
echo "🌐 Access at: http://localhost:3001"
echo ""
echo "💡 Tips to prevent connection drops:"
echo "   - Keep this terminal window open"
echo "   - Don't put your Mac to sleep"
echo "   - Disable VPN if experiencing issues"
echo "   - Check Activity Monitor if server crashes"
echo ""
echo "🛑 To stop: Press Ctrl+C"
echo "================================================"
echo ""

# Start the development server
npm start




