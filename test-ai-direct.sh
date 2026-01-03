#!/bin/bash

echo "🤖 Testing CareCircle AI Analysis Directly"
echo "=========================================="
echo ""

if [ -z "$1" ]; then
    echo "❌ Error: No token provided"
    echo ""
    echo "Usage: ./test-ai-direct.sh YOUR_TOKEN"
    echo ""
    echo "To get your token:"
    echo "1. Open your app (localhost:3002)"
    echo "2. Open Console (F12)"
    echo "3. Run this code:"
    echo ""
    echo "(() => {"
    echo "  const prefix = 'CognitoIdentityServiceProvider.3fnpfoqg3f2vevpfqqtt9rqui0';"
    echo "  const user = localStorage.getItem(prefix + '.LastAuthUser');"
    echo "  const token = localStorage.getItem(\`\${prefix}.\${user}.idToken\`);"
    echo "  console.log(token);"
    echo "  copy(token);"
    echo "})();"
    echo ""
    exit 1
fi

TOKEN="$1"
API_BASE="https://gb1jhkkzl2.execute-api.us-east-1.amazonaws.com/prod"

echo "📝 Token length: ${#TOKEN} characters"
echo "🔗 API Endpoint: $API_BASE/analyze/transcript"
echo ""

echo "🚀 Sending AI Analysis request..."
echo "Transcript: 'I feel dizzy and forgot to take my Metformin this morning'"
echo ""

RESPONSE=$(curl -s -w "\n\nHTTP_STATUS:%{http_code}\nTIME_TOTAL:%{time_total}s" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "I feel dizzy and I think I forgot to take my Metformin this morning. What day is it?",
    "duration": 30,
    "language": "en"
  }' \
  "$API_BASE/analyze/transcript" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
TIME=$(echo "$RESPONSE" | grep "TIME_TOTAL:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/^$/,$d')

echo "📊 Results:"
echo "─────────────────────────────────────"
echo "HTTP Status: $HTTP_CODE"
echo "Response Time: $TIME"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ SUCCESS! AI Analysis completed"
    echo ""
    echo "Response:"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
elif [ "$HTTP_CODE" = "401" ]; then
    echo "❌ AUTHENTICATION FAILED (401 Unauthorized)"
    echo "Your token is invalid or expired."
    echo ""
    echo "Solution:"
    echo "1. Sign out of the app"
    echo "2. Sign back in"
    echo "3. Get a fresh token"
    echo "4. Try again"
elif [ "$HTTP_CODE" = "403" ]; then
    echo "❌ FORBIDDEN (403)"
    echo "You don't have permission to access this resource."
    echo ""
    echo "Possible causes:"
    echo "- Token format is wrong"
    echo "- User doesn't have required permissions"
elif [ "$HTTP_CODE" = "500" ]; then
    echo "❌ SERVER ERROR (500)"
    echo "The Lambda function encountered an error."
    echo ""
    echo "Response:"
    echo "$BODY"
    echo ""
    echo "Check Lambda logs:"
    echo "aws logs tail /aws/lambda/CareCircleStack2-AIAnalysisFunction --follow"
else
    echo "⚠️ UNEXPECTED RESPONSE"
    echo ""
    echo "Response:"
    echo "$BODY"
fi

echo ""
echo "─────────────────────────────────────"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "🎉 Your backend is working perfectly!"
    echo ""
    echo "Next steps:"
    echo "1. Use this same token in your app"
    echo "2. The AI analysis feature should work now"
    echo "3. If it still fails in the app, check browser console for errors"
else
    echo "💡 Troubleshooting tips:"
    echo "- If 401: Get a fresh token (tokens expire after 1 hour)"
    echo "- If timeout: Lambda cold start (try again, it will be faster)"
    echo "- If 500: Check CloudWatch logs for Lambda errors"
fi

echo ""





