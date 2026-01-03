#!/bin/bash

# CareCircle Keep-Alive Script
# Automatically restarts the server if it crashes

echo "🛡️  CareCircle Keep-Alive Monitor"
echo "=================================="
echo ""
echo "This script will:"
echo "  ✅ Monitor port 3001"
echo "  ✅ Auto-restart if server crashes"
echo "  ✅ Log all restarts"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""

RESTART_COUNT=0
LOG_FILE="frontend-restarts.log"

# Navigate to project root
cd "$(dirname "$0")"

# Function to start the server
start_server() {
    echo "🚀 Starting server... (Restart #$RESTART_COUNT)"
    echo "[$(date)] Starting server (Restart #$RESTART_COUNT)" >> "$LOG_FILE"
    
    cd frontend
    PORT=3001 BROWSER=none NODE_OPTIONS="--max-old-space-size=4096" npm start &
    SERVER_PID=$!
    cd ..
    
    echo "   PID: $SERVER_PID"
    sleep 10  # Give it time to start
}

# Function to check if server is running
is_server_running() {
    lsof -i :3001 > /dev/null 2>&1
    return $?
}

# Initial start
start_server

# Monitor loop
while true; do
    sleep 30  # Check every 30 seconds
    
    if ! is_server_running; then
        echo ""
        echo "❌ [$(date)] Server crashed! Restarting..."
        echo "[$(date)] Server crashed - auto-restarting" >> "$LOG_FILE"
        
        RESTART_COUNT=$((RESTART_COUNT + 1))
        
        # Kill any zombie processes
        lsof -ti:3001 | xargs kill -9 2>/dev/null
        sleep 2
        
        # Restart
        start_server
        
        # If restarting too frequently, something is wrong
        if [ $RESTART_COUNT -gt 10 ]; then
            echo ""
            echo "⚠️  WARNING: Server has crashed $RESTART_COUNT times!"
            echo "   There may be a serious issue. Check:"
            echo "   - frontend/npm-debug.log"
            echo "   - System resources (Activity Monitor)"
            echo "   - Recent code changes"
            echo ""
        fi
    else
        # Server is running - show status
        printf "\r✅ Server OK (Uptime: %s, Restarts: %d)" "$(date +%H:%M:%S)" "$RESTART_COUNT"
    fi
done




