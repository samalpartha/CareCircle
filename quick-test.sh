#!/bin/bash

TOKEN="$1"

if [ -z "$TOKEN" ]; then
    echo "Usage: ./quick-test.sh YOUR_TOKEN"
    exit 1
fi

API="https://gb1jhkkzl2.execute-api.us-east-1.amazonaws.com/prod"

echo "🧪 Testing API with your token..."
echo ""

# Test 1: GET /alerts (correct method)
echo "Test 1: GET /alerts"
curl -s -X GET \
  "$API/alerts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nHTTP: %{http_code}\n\n"

# Test 2: GET /tasks
echo "Test 2: GET /tasks"
curl -s -X GET \
  "$API/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nHTTP: %{http_code}\n\n"

# Test 3: POST /analyze/transcript (AI Analysis)
echo "Test 3: POST /analyze/transcript (AI Analysis)"
curl -s -X POST \
  "$API/analyze/transcript" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"transcript":"I feel dizzy","duration":10,"language":"en"}' \
  -w "\nHTTP: %{http_code}\n\n"





