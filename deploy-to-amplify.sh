#!/bin/bash

# CareCircle AWS Amplify Deployment Script
# This script automates the deployment of CareCircle to AWS Amplify

set -e  # Exit on any error

echo "🚀 Starting CareCircle deployment to AWS Amplify..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
print_status "Checking prerequisites..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS CLI is not configured. Please run 'aws configure' first."
    exit 1
fi

# Check if SAM CLI is installed
if ! command -v sam &> /dev/null; then
    print_warning "SAM CLI is not installed. Installing via pip..."
    pip install aws-sam-cli
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version must be 18 or higher. Current version: $(node --version)"
    exit 1
fi

print_success "All prerequisites met!"

# Step 1: Deploy Backend Infrastructure
print_status "Step 1: Deploying backend infrastructure..."

cd backend

# Build SAM application
print_status "Building SAM application..."
sam build

# Deploy with guided setup if samconfig.toml doesn't exist
if [ ! -f "samconfig.toml" ]; then
    print_status "Running guided deployment (first time setup)..."
    sam deploy --guided
else
    print_status "Deploying with existing configuration..."
    sam deploy
fi

# Get stack outputs
print_status "Retrieving stack outputs..."
STACK_NAME=$(grep stack_name samconfig.toml | cut -d'"' -f2 2>/dev/null || echo "carecircle-backend")
AWS_REGION=$(aws configure get region || echo "us-east-1")

# Extract outputs
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' --output text)
USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' --output text)
API_ENDPOINT=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`CareCircleAPI`].OutputValue' --output text)

print_success "Backend deployed successfully!"
echo "User Pool ID: $USER_POOL_ID"
echo "User Pool Client ID: $USER_POOL_CLIENT_ID"
echo "API Endpoint: $API_ENDPOINT"

cd ..

# Step 2: Configure Frontend Environment
print_status "Step 2: Configuring frontend environment..."

cd frontend

# Create .env file
cat > .env << EOF
REACT_APP_AWS_REGION=$AWS_REGION
REACT_APP_USER_POOL_ID=$USER_POOL_ID
REACT_APP_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
REACT_APP_API_ENDPOINT=$API_ENDPOINT
EOF

print_success "Frontend environment configured!"

# Install dependencies
print_status "Installing frontend dependencies..."
npm install

# Build the application to test
print_status "Testing frontend build..."
npm run build

print_success "Frontend build successful!"

cd ..

# Step 3: Deploy to Amplify
print_status "Step 3: Setting up Amplify deployment..."

# Check if Amplify CLI is installed
if ! command -v amplify &> /dev/null; then
    print_status "Installing Amplify CLI..."
    npm install -g @aws-amplify/cli
fi

cd frontend

# Initialize Amplify if not already done
if [ ! -d "amplify" ]; then
    print_status "Initializing Amplify..."
    echo "Please follow the prompts to initialize Amplify:"
    echo "- Project name: carecircle"
    echo "- Environment: prod"
    echo "- Default editor: (your choice)"
    echo "- App type: javascript"
    echo "- Framework: react"
    echo "- Source directory: src"
    echo "- Build directory: build"
    echo "- Build command: npm run build"
    echo "- Start command: npm start"
    
    amplify init
    
    print_status "Adding hosting..."
    amplify add hosting
    
    print_status "Publishing to Amplify..."
    amplify publish
else
    print_status "Amplify already initialized. Publishing updates..."
    amplify publish
fi

cd ..

# Step 4: Enable Bedrock Access
print_status "Step 4: Checking Bedrock access..."

# Check if Bedrock access is enabled (this will fail if not enabled, but that's expected)
if aws bedrock list-foundation-models --region "$AWS_REGION" &> /dev/null; then
    print_success "Bedrock access is already enabled!"
else
    print_warning "Bedrock access may not be enabled. Please:"
    echo "1. Go to Amazon Bedrock Console"
    echo "2. Navigate to Model access"
    echo "3. Request access to 'Claude 3 Haiku'"
    echo "4. Wait for approval (usually instant)"
fi

# Step 5: Verify SES (optional)
print_status "Step 5: SES email verification (optional)..."
read -p "Do you want to verify an email address for SES notifications? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter email address to verify: " EMAIL_ADDRESS
    aws ses verify-email-identity --email-address "$EMAIL_ADDRESS" --region "$AWS_REGION"
    print_success "Verification email sent to $EMAIL_ADDRESS. Please check your email and click the verification link."
fi

# Final summary
print_success "🎉 CareCircle deployment completed!"
echo ""
echo "📋 Deployment Summary:"
echo "====================="
echo "Backend Stack: $STACK_NAME"
echo "AWS Region: $AWS_REGION"
echo "User Pool ID: $USER_POOL_ID"
echo "API Endpoint: $API_ENDPOINT"
echo ""
echo "🌐 Next Steps:"
echo "1. Check your Amplify Console for the frontend URL"
echo "2. Test the application by creating a user account"
echo "3. Verify all features are working correctly"
echo "4. Set up monitoring and alerts in CloudWatch"
echo ""
echo "📚 Documentation:"
echo "- User Guide: USER_GUIDE.md"
echo "- API Documentation: API_DOCUMENTATION.md"
echo "- Troubleshooting: TROUBLESHOOTING.md"
echo ""
print_success "Happy caregiving! 💙"