#!/bin/bash

echo "🔍 Testing CareCircle API Backend..."
echo "======================================"
echo ""

API_BASE="https://gb1jhkkzl2.execute-api.us-east-1.amazonaws.com/prod"

# Test 1: Check if API Gateway is responding
echo "Test 1: API Gateway Health Check"
echo "GET $API_BASE/"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_BASE/" 2>&1)
echo "$RESPONSE"
echo ""

# Test 2: Check Alerts endpoint (without auth - should get 401)
echo "Test 2: Alerts Endpoint (No Auth - Should return 401)"
echo "GET $API_BASE/alerts"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_BASE/alerts" 2>&1)
echo "$RESPONSE"
echo ""

# Test 3: Check with token (if provided)
if [ -n "$1" ]; then
    echo "Test 3: Alerts Endpoint (With Token)"
    echo "GET $API_BASE/alerts (with Authorization header)"
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: Bearer $1" "$API_BASE/alerts" 2>&1)
    echo "$RESPONSE"
    echo ""
    
    echo "Test 4: AI Analysis Endpoint (With Token)"
    echo "POST $API_BASE/analyze/transcript"
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
        -H "Authorization: Bearer $1" \
        -H "Content-Type: application/json" \
        -d '{"transcript":"I feel dizzy","duration":10,"language":"en"}' \
        "$API_BASE/analyze/transcript" 2>&1)
    echo "$RESPONSE"
    echo ""
else
    echo "Test 3: Skipped (no token provided)"
    echo "To test with token, run: ./test-api.sh YOUR_TOKEN"
    echo ""
fi

echo "======================================"
echo "✅ Testing complete!"





