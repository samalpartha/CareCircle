#!/bin/bash

# Quick fix for CRITICAL hardcoded values
# Fixes mock mode flags that are still using mock data

echo "🔧 Fixing Critical Hardcoded Values"
echo "====================================="
echo ""

cd "$(dirname "$0")"

echo "📋 Issues to fix:"
echo "  1. useMockForAlerts = true → false"
echo "  2. useMockForFamily = true → false"
echo ""

# Backup first
cp frontend/src/services/api.js frontend/src/services/api.js.backup
echo "✅ Backed up api.js → api.js.backup"
echo ""

# Fix 1: Alerts using mock data
echo "🔧 Fix 1: Disabling mock mode for Alerts..."
sed -i '' 's/const useMockForAlerts = true/const useMockForAlerts = false/' frontend/src/services/api.js

if [ $? -eq 0 ]; then
    echo "✅ Fixed: useMockForAlerts now false"
else
    echo "❌ Failed to fix useMockForAlerts"
fi

# Fix 2: Family management using mock data
echo "🔧 Fix 2: Disabling mock mode for Family Management..."
sed -i '' 's/const useMockForFamily = true/const useMockForFamily = false/' frontend/src/services/api.js

if [ $? -eq 0 ]; then
    echo "✅ Fixed: useMockForFamily now false"
else
    echo "❌ Failed to fix useMockForFamily"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║              ✅ CRITICAL FIXES APPLIED! ✅                    ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Changes made:"
echo "  • Alerts now use REAL backend (not mock data)"
echo "  • Family management now uses REAL backend (not mock data)"
echo ""
echo "⚠️  IMPORTANT: Your frontend is still running!"
echo "   The changes will hot-reload automatically."
echo ""
echo "🧪 TEST NOW:"
echo "   1. Check Alerts on Dashboard"
echo "   2. Check Family Management page"
echo "   3. Verify data comes from backend"
echo ""
echo "🔙 To undo: mv frontend/src/services/api.js.backup frontend/src/services/api.js"
echo ""
echo "📊 For full audit report, see: HARDCODED_VALUES_AUDIT.md"
echo ""




