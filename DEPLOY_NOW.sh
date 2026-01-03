#!/bin/bash

# Quick deployment script for AI Analysis fixes
# Deploys V1 (keywords) + V2 (intensity + sentiment) fixes

echo "🚀 Deploying AI Analysis Fixes to AWS"
echo "======================================"
echo ""
echo "Fixes included:"
echo "  ✅ V1: 25+ new health complaint keywords"
echo "  ✅ V2: Intensity detection (very, extremely, really)"
echo "  ✅ V2: Sentiment override (matches detected concerns)"
echo ""
echo "This will take ~5 minutes..."
echo ""

cd "$(dirname "$0")/infrastructure"

# Check if we're in the right directory
if [ ! -f "cdk.json" ]; then
    echo "❌ Error: Not in infrastructure directory"
    echo "   Please run from: /Users/psama0214/Hackathon-New/CareCircle"
    exit 1
fi

# Deploy using CDK
echo "📦 Running CDK deploy..."
echo ""

cdk deploy --require-approval never

if [ $? -eq 0 ]; then
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║              ✅ DEPLOYMENT SUCCESSFUL! ✅                     ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "🧪 TEST NOW:"
    echo "   1. Go to: http://localhost:3001"
    echo "   2. Navigate to: Call Elder"
    echo "   3. Test these phrases:"
    echo ""
    echo "      \"I am feeling very scared\""
    echo "      Expected: HIGH urgency, Negative sentiment ✅"
    echo ""
    echo "      \"I am not feeling okay today\""
    echo "      Expected: HIGH urgency, Negative sentiment ✅"
    echo ""
    echo "      \"Extremely worried and anxious\""
    echo "      Expected: HIGH urgency, Negative sentiment ✅"
    echo ""
    echo "🎉 Your AI analysis is now production-ready!"
    echo ""
else
    echo ""
    echo "❌ Deployment failed"
    echo ""
    echo "Common issues:"
    echo "  1. AWS credentials not configured"
    echo "  2. No permission to deploy"
    echo "  3. Stack already updating"
    echo ""
    echo "Try:"
    echo "  • Check AWS credentials: aws sts get-caller-identity"
    echo "  • Check CloudFormation console for errors"
    echo "  • Wait if another deployment is in progress"
    echo ""
fi




