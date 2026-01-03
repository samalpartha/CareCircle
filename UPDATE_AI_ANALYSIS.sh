#!/bin/bash

# Quick update script for AI Analysis Lambda function
# Fixes the issue where "not feeling okay" wasn't being detected

echo "🔧 Updating AI Analysis Lambda Function"
echo "========================================"
echo ""

cd "$(dirname "$0")"

# Find the Lambda function name
FUNCTION_NAME=$(aws lambda list-functions --query "Functions[?contains(FunctionName, 'AIAnalysis')].FunctionName" --output text)

if [ -z "$FUNCTION_NAME" ]; then
    echo "❌ Could not find AI Analysis Lambda function"
    echo "   Looking for functions with 'AIAnalysis' in the name..."
    echo ""
    echo "Available functions:"
    aws lambda list-functions --query "Functions[].FunctionName" --output text
    echo ""
    echo "Please run from infrastructure directory:"
    echo "  cd infrastructure && cdk deploy"
    exit 1
fi

echo "✅ Found function: $FUNCTION_NAME"
echo ""

# Option 1: Quick code update (if function exists)
echo "📦 Creating deployment package..."
cd backend/functions/ai-analysis

# Create a temporary directory for the package
rm -rf package
mkdir -p package

# Copy function code
cp app.py package/

# Install dependencies
pip3 install -r requirements.txt -t package/ --quiet

# Create ZIP file
cd package
zip -r ../ai-analysis.zip . -q
cd ..

echo "✅ Package created: ai-analysis.zip"
echo ""

# Update Lambda function code
echo "🚀 Updating Lambda function code..."
aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file fileb://ai-analysis.zip \
    --output text

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ AI Analysis Lambda function updated successfully!"
    echo ""
    echo "🧪 Testing the fix:"
    echo "   1. Go to http://localhost:3001"
    echo "   2. Navigate to 'Call Elder'"
    echo "   3. Enter transcript: 'I am not feeling okay today'"
    echo "   4. Click 'Analyze with AI'"
    echo "   5. Should now show: 'Emotional/health concerns expressed by elder'"
    echo ""
    echo "⏱️  Note: First call after update may take 10-15 seconds (cold start)"
else
    echo ""
    echo "❌ Update failed. Try full redeployment:"
    echo "   cd infrastructure && cdk deploy"
fi

# Cleanup
rm -rf package ai-analysis.zip

cd ../../..




