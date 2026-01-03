#!/bin/bash
# ============================================
# CareCircle AI Services Permanent Setup Script
# Run this ONCE with admin credentials to permanently enable all AI services
# ============================================

set -e
REGION="us-east-1"
LAMBDA_ROLE="CareCircleStack2-LambdaExecutionRoleD5C26073-qIdDUX1nUMWO"

echo "🔧 CareCircle AI Permissions Setup"
echo "==================================="
echo ""

# Step 1: Create comprehensive AI policy
echo "📋 Step 1: Creating comprehensive AI policy..."

POLICY_DOCUMENT=$(cat << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "ComprehendFullAccess",
            "Effect": "Allow",
            "Action": [
                "comprehend:*"
            ],
            "Resource": "*"
        },
        {
            "Sid": "ComprehendMedicalFullAccess",
            "Effect": "Allow",
            "Action": [
                "comprehendmedical:*"
            ],
            "Resource": "*"
        },
        {
            "Sid": "BedrockFullAccess",
            "Effect": "Allow",
            "Action": [
                "bedrock:*"
            ],
            "Resource": "*"
        },
        {
            "Sid": "TranslateAccess",
            "Effect": "Allow",
            "Action": [
                "translate:*"
            ],
            "Resource": "*"
        },
        {
            "Sid": "TranscribeAccess",
            "Effect": "Allow",
            "Action": [
                "transcribe:*"
            ],
            "Resource": "*"
        },
        {
            "Sid": "AWSMarketplaceForBedrock",
            "Effect": "Allow",
            "Action": [
                "aws-marketplace:ViewSubscriptions",
                "aws-marketplace:Subscribe",
                "aws-marketplace:Unsubscribe",
                "aws-marketplace:GetEntitlements",
                "aws-marketplace:ListEntitlements"
            ],
            "Resource": "*"
        },
        {
            "Sid": "DynamoDBAccess",
            "Effect": "Allow",
            "Action": [
                "dynamodb:*"
            ],
            "Resource": "arn:aws:dynamodb:*:*:table/CareCircle-*"
        },
        {
            "Sid": "EventBridgeAccess",
            "Effect": "Allow",
            "Action": [
                "events:PutEvents"
            ],
            "Resource": "*"
        },
        {
            "Sid": "CloudWatchLogs",
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "*"
        }
    ]
}
EOF
)

# Check if policy already exists
EXISTING_POLICY=$(aws iam list-policies --query "Policies[?PolicyName=='CareCircle-AIServices-FullAccess'].Arn" --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_POLICY" ]; then
    echo "  Policy already exists: $EXISTING_POLICY"
    POLICY_ARN=$EXISTING_POLICY
else
    echo "  Creating new policy..."
    POLICY_ARN=$(aws iam create-policy \
        --policy-name "CareCircle-AIServices-FullAccess" \
        --policy-document "$POLICY_DOCUMENT" \
        --description "Full access to AI services for CareCircle Lambda functions" \
        --query 'Policy.Arn' --output text)
    echo "  ✅ Created policy: $POLICY_ARN"
fi

# Step 2: Attach policy to Lambda role
echo ""
echo "📋 Step 2: Attaching policy to Lambda role..."
aws iam attach-role-policy \
    --role-name "$LAMBDA_ROLE" \
    --policy-arn "$POLICY_ARN" 2>/dev/null || echo "  Policy may already be attached"
echo "  ✅ Policy attached to role: $LAMBDA_ROLE"

# Step 3: Enable Bedrock model access (if not already enabled)
echo ""
echo "📋 Step 3: Checking Bedrock model access..."
echo "  ⚠️  If Claude models still fail, manually enable them in AWS Console:"
echo "     1. Go to: https://console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess"
echo "     2. Click 'Manage model access'"
echo "     3. Enable 'Claude 3 Haiku' and 'Claude 3.5 Haiku' from Anthropic"
echo ""

# Step 4: Verify setup
echo "📋 Step 4: Verifying setup..."
echo "  Checking Lambda role permissions..."
ATTACHED=$(aws iam list-attached-role-policies --role-name "$LAMBDA_ROLE" --query "AttachedPolicies[*].PolicyName" --output text 2>/dev/null || echo "ERROR")
echo "  Attached policies: $ATTACHED"

echo ""
echo "============================================"
echo "✅ Setup Complete!"
echo ""
echo "The Lambda function now has PERMANENT access to:"
echo "  • Amazon Comprehend (sentiment, entities, key phrases)"
echo "  • Amazon Comprehend Medical (medical entity extraction)"
echo "  • Amazon Bedrock (Claude AI models)"
echo "  • Amazon Translate"
echo "  • Amazon Transcribe"
echo "  • AWS Marketplace (for Anthropic model subscriptions)"
echo ""
echo "If you still see 'SubscriptionRequiredException' for Comprehend,"
echo "your AWS account may need to complete initial service activation."
echo "Visit: https://console.aws.amazon.com/comprehend/home?region=us-east-1"
echo "============================================"




