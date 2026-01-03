# AWS Amplify Deployment Guide for CareCircle

This guide will walk you through deploying the CareCircle application to AWS Amplify.

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **GitHub Repository** (recommended) or local Git repository
3. **AWS CLI** configured with your credentials
4. **Node.js 18+** and npm installed

## Deployment Steps

### Step 1: Deploy Backend Infrastructure First

The backend must be deployed before the frontend to get the necessary configuration values.

```bash
# Navigate to the backend directory
cd backend

# Install AWS SAM CLI if not already installed
# On macOS: brew install aws-sam-cli
# On other platforms: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html

# Build the SAM application
sam build

# Deploy the backend stack
sam deploy --guided
```

During the guided deployment, you'll be prompted for:
- **Stack Name**: `carecircle-backend`
- **AWS Region**: `us-east-1` (recommended)
- **Confirm changes before deploy**: Y
- **Allow SAM to create IAM roles**: Y
- **Save parameters to samconfig.toml**: Y

**Important**: Save the outputs from this deployment - you'll need them for frontend configuration.

### Step 2: Configure Frontend Environment

Create or update the frontend environment configuration:

```bash
cd frontend

# Create .env file with backend outputs
cat > .env << EOF
REACT_APP_AWS_REGION=us-east-1
REACT_APP_USER_POOL_ID=your_user_pool_id_from_sam_output
REACT_APP_USER_POOL_CLIENT_ID=your_client_id_from_sam_output
REACT_APP_API_ENDPOINT=your_api_endpoint_from_sam_output
EOF
```

### Step 3: Deploy to AWS Amplify

#### Option A: Deploy via AWS Console (Recommended)

1. **Go to AWS Amplify Console**
   - Navigate to https://console.aws.amazon.com/amplify/
   - Click "New app" → "Host web app"

2. **Connect Repository**
   - Choose your Git provider (GitHub recommended)
   - Select your CareCircle repository
   - Choose the main/master branch

3. **Configure Build Settings**
   - Amplify will auto-detect the `amplify.yml` file
   - Review the build configuration
   - Add environment variables:
     ```
     REACT_APP_AWS_REGION=us-east-1
     REACT_APP_USER_POOL_ID=your_user_pool_id
     REACT_APP_USER_POOL_CLIENT_ID=your_client_id
     REACT_APP_API_ENDPOINT=your_api_endpoint
     ```

4. **Deploy**
   - Click "Save and deploy"
   - Wait for the build to complete (5-10 minutes)

#### Option B: Deploy via Amplify CLI

```bash
# Install Amplify CLI if not already installed
npm install -g @aws-amplify/cli

# Configure Amplify CLI
amplify configure

# Initialize Amplify in your project
amplify init
# Choose:
# - Project name: carecircle
# - Environment: prod
# - Default editor: Visual Studio Code (or your preference)
# - App type: javascript
# - Framework: react
# - Source directory: src
# - Build directory: build
# - Build command: npm run build
# - Start command: npm start

# Add hosting
amplify add hosting
# Choose: Amazon CloudFront and S3

# Publish the app
amplify publish
```

### Step 4: Configure Custom Domain (Optional)

If you have a custom domain:

1. **In Amplify Console**
   - Go to your app → Domain management
   - Click "Add domain"
   - Enter your domain name
   - Follow DNS configuration instructions

### Step 5: Set Up Environment Variables

In the Amplify Console:
1. Go to your app → Environment variables
2. Add the following variables:
   ```
   REACT_APP_AWS_REGION=us-east-1
   REACT_APP_USER_POOL_ID=your_user_pool_id
   REACT_APP_USER_POOL_CLIENT_ID=your_client_id
   REACT_APP_API_ENDPOINT=your_api_endpoint
   ```

### Step 6: Enable Bedrock Access

1. **Go to Amazon Bedrock Console**
   - Navigate to Model access
   - Request access to "Claude 3 Haiku"
   - Wait for approval (usually instant)

### Step 7: Verify SES for Email Notifications

```bash
# Verify your email address for SES
aws ses verify-email-identity --email-address noreply@yourdomain.com
# Check your email and click the verification link
```

## Post-Deployment Configuration

### Update CORS Settings

If you encounter CORS issues, update your API Gateway CORS settings:

```bash
# In your backend template.yaml, ensure CORS is properly configured
# The template already includes CORS configuration
```

### Test the Deployment

1. **Visit your Amplify URL**
2. **Create a test user account**
3. **Verify all features work**:
   - User registration/login
   - Dashboard loading
   - API calls to backend
   - Real-time features

## Monitoring and Maintenance

### CloudWatch Monitoring

- Monitor Lambda function performance
- Check API Gateway metrics
- Review DynamoDB usage

### Cost Optimization

- Monitor AWS costs in the Billing dashboard
- Set up billing alerts
- Review resource usage regularly

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version (should be 18+)
   - Verify all dependencies are installed
   - Check environment variables

2. **API Connection Issues**
   - Verify backend is deployed and running
   - Check API endpoint URL
   - Verify CORS configuration

3. **Authentication Issues**
   - Verify Cognito User Pool configuration
   - Check User Pool Client settings
   - Ensure environment variables are correct

### Useful Commands

```bash
# Check Amplify app status
amplify status

# View logs
amplify console

# Update environment variables
amplify env checkout prod
amplify env update

# Redeploy
amplify publish
```

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to Git
2. **IAM Permissions**: Use least privilege principle
3. **HTTPS**: Amplify automatically provides SSL certificates
4. **Authentication**: Cognito handles secure user authentication

## Next Steps

After successful deployment:

1. **Set up monitoring and alerts**
2. **Configure backup strategies**
3. **Set up CI/CD pipeline for automated deployments**
4. **Performance optimization**
5. **User acceptance testing**

## Support

For issues with deployment:
1. Check AWS Amplify documentation
2. Review CloudWatch logs
3. Check AWS service health dashboard
4. Contact AWS support if needed

---

**Estimated Deployment Time**: 30-45 minutes
**Estimated Monthly Cost**: $5-20 (within AWS Free Tier limits for development)