#!/bin/bash

# Deploy backend fix for task accept/complete URL encoding issue

echo "🚀 Deploying Backend Fix - Task URL Encoding"
echo "=============================================="
echo ""
echo "Fix: URL-decode task IDs in accept/complete endpoints"
echo "Issue: Task IDs with # character were not being decoded"
echo ""

cd "$(dirname "$0")/infrastructure"

if [ ! -f "cdk.json" ]; then
    echo "❌ Error: Not in infrastructure directory"
    exit 1
fi

echo "📦 Deploying backend changes..."
cdk deploy --require-approval never

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Backend deployed successfully!"
    echo ""
    echo "🧪 Test now:"
    echo "   1. Go to Tasks page"
    echo "   2. Click 'Accept' on a task"
    echo "   3. Task should update to 'In Progress' ✅"
    echo ""
else
    echo "❌ Deployment failed"
fi




