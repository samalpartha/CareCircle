# CareCircle Deployment Guide

## Prerequisites

Before deploying CareCircle, ensure you have:

- AWS Account with appropriate permissions
- Node.js 18+ and npm installed
- Python 3.11+ installed
- AWS CLI configured with credentials
- AWS CDK installed (`npm install -g aws-cdk`)
- AWS Amplify CLI installed (`npm install -g @aws-amplify/cli`)

## Step-by-Step Deployment

### 1. Clone and Install Dependencies

```bash
# Clone the repository
cd CareCircle

# Install all dependencies
npm run install:all

# Or install individually:
cd frontend && npm install
cd ../backend && pip install -r requirements.txt
cd ../infrastructure && npm install
```

### 2. Configure AWS Credentials

```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter default region (e.g., us-east-1)
# Enter default output format (json)
```

### 3. Bootstrap AWS CDK (First Time Only)

```bash
cd infrastructure
cdk bootstrap aws://ACCOUNT-ID/REGION
```

Replace `ACCOUNT-ID` with your AWS account ID and `REGION` with your preferred region.

### 4. Deploy Backend Infrastructure

```bash
cd infrastructure

# Synthesize CloudFormation template
cdk synth

# Deploy infrastructure
cdk deploy

# Save the outputs for frontend configuration
```

**Important Outputs:**
- `UserPoolId`: Cognito User Pool ID
- `UserPoolClientId`: Cognito User Pool Client ID
- `APIEndpoint`: API Gateway URL
- `DynamoDBTableName`: DynamoDB table name

### 5. Configure Frontend

Update `frontend/src/aws-exports.js` with the CDK outputs:

```javascript
const awsconfig = {
  aws_project_region: 'us-east-1', // Your region
  aws_cognito_region: 'us-east-1',
  aws_user_pools_id: 'YOUR_USER_POOL_ID', // From CDK output
  aws_user_pools_web_client_id: 'YOUR_CLIENT_ID', // From CDK output
  API: {
    endpoints: [
      {
        name: 'CareCircleAPI',
        endpoint: 'YOUR_API_ENDPOINT', // From CDK output
        region: 'us-east-1',
      },
    ],
  },
};
```

Or create a `.env` file in the frontend directory:

```bash
REACT_APP_AWS_REGION=us-east-1
REACT_APP_USER_POOL_ID=your_user_pool_id
REACT_APP_USER_POOL_CLIENT_ID=your_client_id
REACT_APP_API_ENDPOINT=your_api_endpoint
```

### 6. Initialize Amplify

```bash
cd frontend

# Initialize Amplify
amplify init

# Follow the prompts:
# - Project name: CareCircle
# - Environment: dev
# - Default editor: your choice
# - App type: javascript
# - Framework: react
# - Source directory: src
# - Distribution directory: build
# - Build command: npm run build
# - Start command: npm start
# - Use AWS profile: yes
```

### 7. Add Amplify Hosting

```bash
# Add hosting
amplify add hosting

# Choose: Hosting with Amplify Console
# Choose: Manual deployment

# Publish the app
amplify publish
```

### 8. Verify Deployment

Visit the Amplify hosting URL provided after deployment. You should see the CareCircle login page.

## Post-Deployment Configuration

### 1. Verify SES Email (for Email Notifications)

```bash
aws ses verify-email-identity --email-address noreply@yourdomain.com
```

Check your email and click the verification link.

### 2. Enable Bedrock Models

In AWS Console:
1. Go to Amazon Bedrock
2. Request access to Claude 3 Haiku model
3. Wait for approval (usually instant for Haiku)

### 3. Create Test Users

```bash
# Via AWS Console or CLI
aws cognito-idp sign-up \
  --client-id YOUR_CLIENT_ID \
  --username testuser \
  --password TestPassword123! \
  --user-attributes Name=email,Value=test@example.com
```

### 4. Populate Sample Data (Optional)

Create a test family and members in DynamoDB:

```bash
# Use the AWS Console or run the seed script
python backend/scripts/seed_data.py
```

## Testing the Deployment

### 1. Test Frontend

```bash
cd frontend
npm start
```

Visit `http://localhost:3000` and:
- Sign up with a new account
- Verify email
- Log in and explore the dashboard

### 2. Test API

```bash
# Get authentication token first (sign in via UI)
# Then test API endpoints

curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-api-endpoint/prod/tasks
```

### 3. Test AI Analysis

Use the Call Interface in the application to:
1. Start a voice call
2. Speak into the microphone
3. End the call
4. Verify transcript and AI analysis appear

## Monitoring and Logs

### View Lambda Logs

```bash
# AI Analysis Function
aws logs tail /aws/lambda/CareCircle-AIAnalysis --follow

# Task Assignment Function
aws logs tail /aws/lambda/CareCircle-TaskAssignment --follow

# API Handler Function
aws logs tail /aws/lambda/CareCircle-APIHandler --follow
```

### View CloudWatch Metrics

In AWS Console:
1. Go to CloudWatch → Dashboards
2. Create a dashboard for CareCircle
3. Add widgets for Lambda invocations, errors, duration

## Cost Optimization

### Free Tier Usage

CareCircle is designed to stay within AWS Free Tier:

- **Lambda**: 1M requests/month (400k GB-seconds)
- **DynamoDB**: 25 GB storage, 25 RCU/WCU
- **API Gateway**: 1M requests/month
- **Cognito**: 50k MAU
- **Transcribe**: 60 minutes/month
- **Comprehend**: 50k units/month
- **Translate**: 2M characters/month
- **Bedrock**: Pay per token (use Haiku for cost efficiency)

### Monitor Costs

```bash
# Check current month costs
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY \
  --metrics "UnblendedCost"
```

Set up billing alerts in AWS Console:
1. Go to Billing → Billing Preferences
2. Enable "Receive Billing Alerts"
3. Create CloudWatch alarm for $10 threshold

## Troubleshooting

### Issue: Amplify publish fails

**Solution:**
```bash
# Clear cache
rm -rf node_modules
npm install
npm run build
amplify publish
```

### Issue: API returns 401 Unauthorized

**Solution:**
- Verify Cognito user is confirmed
- Check token expiration
- Ensure API Gateway authorizer is configured correctly

### Issue: Lambda timeout

**Solution:**
- Increase timeout in CDK stack
- Optimize Lambda code
- Check CloudWatch logs for specific errors

### Issue: Bedrock InvokeModel fails

**Solution:**
- Verify model access is granted
- Check region (Bedrock available in us-east-1, us-west-2)
- Ensure IAM permissions are correct

## Updating the Application

### Update Backend

```bash
cd infrastructure
cdk deploy
```

### Update Frontend

```bash
cd frontend
npm run build
amplify publish
```

### Update Lambda Functions Only

```bash
cd infrastructure
cdk deploy --hotswap  # For Lambda code updates only
```

## Cleanup and Removal

To delete all resources:

```bash
# Delete Amplify hosting
cd frontend
amplify delete

# Delete CDK stack
cd ../infrastructure
cdk destroy

# Note: DynamoDB table is retained by default (RETAIN policy)
# Delete manually if needed via AWS Console
```

## Security Considerations

1. **Secrets Management**: Never commit AWS credentials or API keys
2. **HTTPS Only**: Amplify hosting uses HTTPS by default
3. **CORS**: Configure appropriate origins in production
4. **API Rate Limiting**: Default throttling is set to 100 req/sec
5. **Data Encryption**: DynamoDB encryption at rest is enabled
6. **IAM Least Privilege**: Lambda roles have minimal permissions

## Next Steps

- Set up custom domain name
- Configure CI/CD pipeline with GitHub Actions
- Enable AWS X-Ray for distributed tracing
- Set up automated backups for DynamoDB
- Configure multi-region deployment for HA

## Support

For issues or questions:
- Check CloudWatch Logs
- Review AWS documentation
- Contact the development team

---

**Last Updated:** December 2025
**Version:** 1.0.0

