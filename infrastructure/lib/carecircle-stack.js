"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CareCircleStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const events = __importStar(require("aws-cdk-lib/aws-events"));
const targets = __importStar(require("aws-cdk-lib/aws-events-targets"));
const sns = __importStar(require("aws-cdk-lib/aws-sns"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
class CareCircleStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // DynamoDB Table
        const table = new dynamodb.Table(this, 'CareCircleTable', {
            tableName: 'CareCircle-Data-v2',
            partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            pointInTimeRecovery: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Global Secondary Index
        table.addGlobalSecondaryIndex({
            indexName: 'GSI1',
            partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        // =============================================
        // S3 BUCKET FOR MEDIA & DOCUMENTS
        // =============================================
        const mediaBucket = new s3.Bucket(this, 'CareCircleMediaBucket', {
            bucketName: `carecircle-media-${this.account}-${this.region}`,
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            versioned: true,
            lifecycleRules: [
                {
                    id: 'DeleteOldRecordings',
                    prefix: 'call-recordings/',
                    expiration: cdk.Duration.days(365), // Keep call recordings for 1 year
                },
            ],
            cors: [
                {
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
                    allowedOrigins: ['*'],
                    allowedHeaders: ['*'],
                    maxAge: 3000,
                },
            ],
            removalPolicy: cdk.RemovalPolicy.RETAIN, // Don't delete user data
        });
        // Cognito User Pool (v2 with custom attributes)
        const userPool = new cognito.UserPool(this, 'CareCircleUserPoolV2', {
            userPoolName: 'CareCircle-Users-v2',
            selfSignUpEnabled: true,
            signInAliases: {
                email: true,
                username: true,
            },
            autoVerify: {
                email: true,
            },
            standardAttributes: {
                email: {
                    required: true,
                    mutable: true,
                },
                preferredUsername: {
                    required: true,
                    mutable: true,
                },
            },
            customAttributes: {
                language: new cognito.StringAttribute({ minLen: 2, maxLen: 50, mutable: true }),
                zipcode: new cognito.StringAttribute({ minLen: 5, maxLen: 10, mutable: true }),
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: false,
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // User Pool Client
        const userPoolClient = new cognito.UserPoolClient(this, 'CareCircleUserPoolClient', {
            userPool,
            userPoolClientName: 'CareCircle-Web-Client',
            authFlows: {
                userSrp: true,
                userPassword: false,
            },
            generateSecret: false,
        });
        // EventBridge Bus
        const eventBus = new events.EventBus(this, 'CareCircleEventBus', {
            eventBusName: 'CareCircle-Events',
        });
        // SNS Topic for Notifications
        const notificationTopic = new sns.Topic(this, 'NotificationTopic', {
            topicName: 'CareCircle-Notifications',
            displayName: 'CareCircle Notifications',
        });
        // Lambda Execution Role with AWS AI Services permissions
        const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
            ],
        });
        // Attach the custom CareCircle AI Services policy (created via SETUP_AI_PERMISSIONS.sh)
        // This provides comprehensive and permanent access to all AI services
        const aiServicesPolicy = iam.ManagedPolicy.fromManagedPolicyArn(this, 'CareCircleAIServicesPolicy', `arn:aws:iam::${this.account}:policy/CareCircle-AIServices-FullAccess`);
        lambdaRole.addManagedPolicy(aiServicesPolicy);
        // Add fallback inline permissions for AI services (in case managed policy doesn't exist)
        lambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                // Comprehend - Full access
                'comprehend:*',
                'comprehendmedical:*',
                // Bedrock - Full access
                'bedrock:*',
                // Translation & Transcription
                'translate:*',
                'transcribe:*',
                // AWS Marketplace for Anthropic model subscriptions
                'aws-marketplace:ViewSubscriptions',
                'aws-marketplace:Subscribe',
                'aws-marketplace:Unsubscribe',
                'aws-marketplace:GetEntitlements',
                'aws-marketplace:ListEntitlements',
            ],
            resources: ['*'],
        }));
        // Lambda environment variables
        const lambdaEnvironment = {
            DYNAMODB_TABLE: table.tableName,
            EVENT_BUS_NAME: eventBus.eventBusName,
            MEDIA_BUCKET: mediaBucket.bucketName,
            POWERTOOLS_SERVICE_NAME: 'CareCircle',
            LOG_LEVEL: 'INFO',
        };
        // AI Analysis Lambda
        const aiAnalysisFunction = new lambda.Function(this, 'AIAnalysisFunction', {
            functionName: 'CareCircle-AIAnalysis',
            runtime: lambda.Runtime.PYTHON_3_11,
            code: lambda.Code.fromAsset('../backend/functions/ai-analysis'),
            handler: 'app.lambda_handler',
            timeout: cdk.Duration.seconds(60),
            memorySize: 512,
            environment: lambdaEnvironment,
            role: lambdaRole,
            logRetention: logs.RetentionDays.ONE_WEEK,
        });
        table.grantReadWriteData(aiAnalysisFunction);
        eventBus.grantPutEventsTo(aiAnalysisFunction);
        // Task Assignment Lambda
        const taskAssignmentFunction = new lambda.Function(this, 'TaskAssignmentFunction', {
            functionName: 'CareCircle-TaskAssignment',
            runtime: lambda.Runtime.PYTHON_3_11,
            code: lambda.Code.fromAsset('../backend/functions/task-assignment'),
            handler: 'app.lambda_handler',
            timeout: cdk.Duration.seconds(30),
            memorySize: 512,
            environment: lambdaEnvironment,
            role: lambdaRole,
            logRetention: logs.RetentionDays.ONE_WEEK,
        });
        table.grantReadWriteData(taskAssignmentFunction);
        notificationTopic.grantPublish(taskAssignmentFunction);
        // EventBridge Rule for Alert Events
        new events.Rule(this, 'AlertEventRule', {
            eventBus: eventBus,
            eventPattern: {
                source: ['carecircle.alerts'],
                detailType: ['Alert Created'],
            },
            targets: [new targets.LambdaFunction(taskAssignmentFunction)],
        });
        // API Handler Lambda
        const apiHandlerFunction = new lambda.Function(this, 'APIHandlerFunction', {
            functionName: 'CareCircle-APIHandler',
            runtime: lambda.Runtime.PYTHON_3_11,
            code: lambda.Code.fromAsset('../backend/functions/api-handlers'),
            handler: 'app.lambda_handler',
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            environment: lambdaEnvironment,
            logRetention: logs.RetentionDays.ONE_WEEK,
        });
        table.grantReadWriteData(apiHandlerFunction);
        mediaBucket.grantReadWrite(apiHandlerFunction); // S3 access for call recordings & docs
        // Notification Handler Lambda
        const notificationFunction = new lambda.Function(this, 'NotificationFunction', {
            functionName: 'CareCircle-Notification',
            runtime: lambda.Runtime.PYTHON_3_11,
            code: lambda.Code.fromAsset('../backend/functions/notification-handler'),
            handler: 'app.lambda_handler',
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            environment: lambdaEnvironment,
            logRetention: logs.RetentionDays.ONE_WEEK,
        });
        table.grantReadData(notificationFunction);
        notificationTopic.grantPublish(notificationFunction);
        notificationFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ['ses:SendEmail', 'ses:SendRawEmail'],
            resources: ['*'],
        }));
        // Notification Workflow Lambda (EventBridge-triggered)
        const notificationWorkflowFunction = new lambda.Function(this, 'NotificationWorkflowFunction', {
            functionName: 'CareCircle-NotificationWorkflow',
            runtime: lambda.Runtime.PYTHON_3_11,
            code: lambda.Code.fromAsset('../backend/functions/notification-workflow'),
            handler: 'app.lambda_handler',
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            environment: {
                ...lambdaEnvironment,
                EVENT_BUS_NAME: eventBus.eventBusName,
                SENDER_EMAIL: 'noreply@carecircle.com',
            },
            logRetention: logs.RetentionDays.ONE_WEEK,
        });
        // Grant permissions to notification workflow
        table.grantReadData(notificationWorkflowFunction);
        notificationWorkflowFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ['ses:SendEmail', 'ses:SendRawEmail'],
            resources: ['*'],
        }));
        notificationWorkflowFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ['sns:Publish'],
            resources: ['*'],
        }));
        // EventBridge Rule: Alert Created → Notification Workflow
        const alertCreatedRule = new events.Rule(this, 'AlertCreatedRule', {
            eventBus: eventBus,
            ruleName: 'CareCircle-AlertCreated',
            description: 'Trigger notifications when alerts are created',
            eventPattern: {
                source: ['carecircle.alerts'],
                detailType: ['Alert Created'],
            },
            enabled: true,
        });
        alertCreatedRule.addTarget(new targets.LambdaFunction(notificationWorkflowFunction));
        // EventBridge Rule: Task Overdue → Notification Workflow
        const taskOverdueRule = new events.Rule(this, 'TaskOverdueRule', {
            eventBus: eventBus,
            ruleName: 'CareCircle-TaskOverdue',
            description: 'Send reminders for overdue tasks',
            eventPattern: {
                source: ['carecircle.tasks'],
                detailType: ['Task Overdue'],
            },
            enabled: true,
        });
        taskOverdueRule.addTarget(new targets.LambdaFunction(notificationWorkflowFunction));
        // Grant AI Analysis Function permission to publish events
        aiAnalysisFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ['events:PutEvents'],
            resources: [eventBus.eventBusArn],
        }));
        // RAG Service Lambda (Retrieval-Augmented Generation)
        const ragServiceFunction = new lambda.Function(this, 'RAGServiceFunction', {
            functionName: 'CareCircle-RAGService',
            runtime: lambda.Runtime.PYTHON_3_11,
            code: lambda.Code.fromAsset('../backend/functions/rag-service'),
            handler: 'app.lambda_handler',
            timeout: cdk.Duration.seconds(60),
            memorySize: 512,
            environment: {
                ...lambdaEnvironment,
                KNOWLEDGE_BASE_ID: 'default-kb-id',
            },
            logRetention: logs.RetentionDays.ONE_WEEK,
        });
        // Grant RAG Service permissions
        ragServiceFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                'bedrock:Retrieve',
                'bedrock:InvokeModel',
            ],
            resources: ['*'],
        }));
        // ===========================================
        // API Gateway with PROPER Lambda Proxy Integration
        // ===========================================
        const api = new apigateway.RestApi(this, 'CareCircleAPI', {
            restApiName: 'CareCircle-API',
            description: 'CareCircle Backend API',
            deployOptions: {
                stageName: 'prod',
                throttlingRateLimit: 100,
                throttlingBurstLimit: 200,
                loggingLevel: apigateway.MethodLoggingLevel.OFF,
            },
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: [
                    'Content-Type',
                    'Authorization',
                    'X-Amz-Date',
                    'X-Api-Key',
                    'X-Amz-Security-Token',
                ],
            },
            cloudWatchRole: false,
        });
        const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
            cognitoUserPools: [userPool],
            authorizerName: 'CognitoAuthorizer',
        });
        // ✅ FIX: Use Lambda Proxy Integration - This passes through headers!
        const apiIntegration = new apigateway.LambdaIntegration(apiHandlerFunction, {
            proxy: true,
            allowTestInvoke: true,
        });
        const aiIntegration = new apigateway.LambdaIntegration(aiAnalysisFunction, {
            proxy: true,
            allowTestInvoke: true,
        });
        const ragIntegration = new apigateway.LambdaIntegration(ragServiceFunction, {
            proxy: true,
            allowTestInvoke: true,
        });
        // API Routes - Simplified (CORS handled by Lambda Proxy + defaultCorsPreflightOptions)
        const alerts = api.root.addResource('alerts');
        alerts.addMethod('GET', apiIntegration, { authorizer });
        // Alert by ID (for DELETE)
        const alert = alerts.addResource('{alertId}');
        alert.addMethod('DELETE', apiIntegration, { authorizer });
        const tasks = api.root.addResource('tasks');
        tasks.addMethod('GET', apiIntegration, { authorizer });
        tasks.addMethod('POST', apiIntegration, { authorizer });
        const task = tasks.addResource('{taskId}');
        task.addMethod('DELETE', apiIntegration, { authorizer }); // Delete task
        const acceptTask = task.addResource('accept');
        acceptTask.addMethod('PUT', apiIntegration, { authorizer });
        const completeTask = task.addResource('complete');
        completeTask.addMethod('PUT', apiIntegration, { authorizer });
        const analytics = api.root.addResource('analytics');
        analytics.addMethod('GET', apiIntegration, { authorizer });
        // Elder management routes
        const elders = api.root.addResource('elders');
        elders.addMethod('GET', apiIntegration, { authorizer });
        elders.addMethod('POST', apiIntegration, { authorizer });
        const elder = elders.addResource('{elderId}');
        elder.addMethod('PUT', apiIntegration, { authorizer });
        elder.addMethod('DELETE', apiIntegration, { authorizer });
        // Caregiver management routes
        const caregivers = api.root.addResource('caregivers');
        caregivers.addMethod('GET', apiIntegration, { authorizer });
        caregivers.addMethod('POST', apiIntegration, { authorizer });
        const caregiver = caregivers.addResource('{caregiverId}');
        caregiver.addMethod('PUT', apiIntegration, { authorizer });
        caregiver.addMethod('DELETE', apiIntegration, { authorizer });
        const users = api.root.addResource('users');
        const userProfile = users.addResource('{userId}').addResource('profile');
        userProfile.addMethod('GET', apiIntegration, { authorizer });
        const profile = users.addResource('profile');
        profile.addMethod('PUT', apiIntegration, { authorizer });
        // Analyze endpoint (for call analysis)
        const analyze = api.root.addResource('analyze');
        const transcript = analyze.addResource('transcript');
        transcript.addMethod('POST', aiIntegration, { authorizer });
        // RAG endpoints (Retrieval-Augmented Generation)
        const rag = api.root.addResource('rag');
        const ragQuery = rag.addResource('query');
        ragQuery.addMethod('POST', ragIntegration, { authorizer });
        const explainAlert = rag.addResource('explain-alert');
        explainAlert.addMethod('POST', ragIntegration, { authorizer });
        // =============================================
        // PHASE 1: CALL RECORDS
        // =============================================
        const calls = api.root.addResource('calls');
        calls.addMethod('GET', apiIntegration, { authorizer }); // Get call history
        calls.addMethod('POST', apiIntegration, { authorizer }); // Save call record
        const call = calls.addResource('{callId}');
        call.addMethod('GET', apiIntegration, { authorizer }); // Get single call
        call.addMethod('DELETE', apiIntegration, { authorizer }); // Delete call
        // Presigned URL for audio upload/download
        const callAudio = call.addResource('audio-url');
        callAudio.addMethod('GET', apiIntegration, { authorizer });
        // =============================================
        // PHASE 2: MEDICATIONS
        // =============================================
        const medications = api.root.addResource('medications');
        medications.addMethod('GET', apiIntegration, { authorizer });
        medications.addMethod('POST', apiIntegration, { authorizer });
        const medication = medications.addResource('{medicationId}');
        medication.addMethod('GET', apiIntegration, { authorizer });
        medication.addMethod('PUT', apiIntegration, { authorizer });
        medication.addMethod('DELETE', apiIntegration, { authorizer });
        // Log medication taken
        const medLog = medication.addResource('log');
        medLog.addMethod('POST', apiIntegration, { authorizer });
        // =============================================
        // PHASE 3: EMERGENCY CONTACTS
        // =============================================
        const emergencyContacts = api.root.addResource('emergency-contacts');
        emergencyContacts.addMethod('GET', apiIntegration, { authorizer });
        emergencyContacts.addMethod('POST', apiIntegration, { authorizer });
        const emergencyContact = emergencyContacts.addResource('{contactId}');
        emergencyContact.addMethod('PUT', apiIntegration, { authorizer });
        emergencyContact.addMethod('DELETE', apiIntegration, { authorizer });
        // Medical ID generation
        const medicalId = api.root.addResource('medical-id');
        medicalId.addMethod('GET', apiIntegration, { authorizer });
        // =============================================
        // PHASE 4: HEALTH CONDITIONS & ALLERGIES
        // =============================================
        const conditions = api.root.addResource('health-conditions');
        conditions.addMethod('GET', apiIntegration, { authorizer });
        conditions.addMethod('POST', apiIntegration, { authorizer });
        const condition = conditions.addResource('{conditionId}');
        condition.addMethod('DELETE', apiIntegration, { authorizer });
        const allergies = api.root.addResource('allergies');
        allergies.addMethod('GET', apiIntegration, { authorizer });
        allergies.addMethod('POST', apiIntegration, { authorizer });
        const allergy = allergies.addResource('{allergyId}');
        allergy.addMethod('DELETE', apiIntegration, { authorizer });
        // =============================================
        // PHASE 5: WELLNESS & ANALYTICS
        // =============================================
        const wellness = api.root.addResource('wellness');
        wellness.addMethod('GET', apiIntegration, { authorizer }); // Get wellness scores
        wellness.addMethod('POST', apiIntegration, { authorizer }); // Log daily wellness
        // Outputs
        new cdk.CfnOutput(this, 'UserPoolId', {
            value: userPool.userPoolId,
            description: 'Cognito User Pool ID',
        });
        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: userPoolClient.userPoolClientId,
            description: 'Cognito User Pool Client ID',
        });
        new cdk.CfnOutput(this, 'APIEndpoint', {
            value: api.url,
            description: 'API Gateway Endpoint',
        });
        new cdk.CfnOutput(this, 'DynamoDBTableName', {
            value: table.tableName,
            description: 'DynamoDB Table Name',
        });
        new cdk.CfnOutput(this, 'Region', {
            value: this.region,
            description: 'AWS Region',
        });
        new cdk.CfnOutput(this, 'MediaBucketName', {
            value: mediaBucket.bucketName,
            description: 'S3 Bucket for media and documents',
        });
    }
}
exports.CareCircleStack = CareCircleStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FyZWNpcmNsZS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNhcmVjaXJjbGUtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBRW5DLG1FQUFxRDtBQUNyRCwrREFBaUQ7QUFDakQsdUVBQXlEO0FBQ3pELGlFQUFtRDtBQUNuRCwrREFBaUQ7QUFDakQsd0VBQTBEO0FBQzFELHlEQUEyQztBQUMzQyx5REFBMkM7QUFDM0MsMkRBQTZDO0FBQzdDLHVEQUF5QztBQUd6QyxNQUFhLGVBQWdCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDNUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixpQkFBaUI7UUFDakIsTUFBTSxLQUFLLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUN4RCxTQUFTLEVBQUUsb0JBQW9CO1lBQy9CLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ2pFLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQzVELFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWU7WUFDakQsVUFBVSxFQUFFLFFBQVEsQ0FBQyxlQUFlLENBQUMsV0FBVztZQUNoRCxtQkFBbUIsRUFBRSxJQUFJO1lBQ3pCLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87U0FDekMsQ0FBQyxDQUFDO1FBRUgseUJBQXlCO1FBQ3pCLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQztZQUM1QixTQUFTLEVBQUUsTUFBTTtZQUNqQixZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUNyRSxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUNoRSxjQUFjLEVBQUUsUUFBUSxDQUFDLGNBQWMsQ0FBQyxHQUFHO1NBQzVDLENBQUMsQ0FBQztRQUVILGdEQUFnRDtRQUNoRCxrQ0FBa0M7UUFDbEMsZ0RBQWdEO1FBQ2hELE1BQU0sV0FBVyxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLEVBQUU7WUFDL0QsVUFBVSxFQUFFLG9CQUFvQixJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDN0QsVUFBVSxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVO1lBQzFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELFNBQVMsRUFBRSxJQUFJO1lBQ2YsY0FBYyxFQUFFO2dCQUNkO29CQUNFLEVBQUUsRUFBRSxxQkFBcUI7b0JBQ3pCLE1BQU0sRUFBRSxrQkFBa0I7b0JBQzFCLFVBQVUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxrQ0FBa0M7aUJBQ3ZFO2FBQ0Y7WUFDRCxJQUFJLEVBQUU7Z0JBQ0o7b0JBQ0UsY0FBYyxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7b0JBQzdFLGNBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQztvQkFDckIsY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFDO29CQUNyQixNQUFNLEVBQUUsSUFBSTtpQkFDYjthQUNGO1lBQ0QsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLHlCQUF5QjtTQUNuRSxDQUFDLENBQUM7UUFFSCxnREFBZ0Q7UUFDaEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRTtZQUNsRSxZQUFZLEVBQUUscUJBQXFCO1lBQ25DLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsYUFBYSxFQUFFO2dCQUNiLEtBQUssRUFBRSxJQUFJO2dCQUNYLFFBQVEsRUFBRSxJQUFJO2FBQ2Y7WUFDRCxVQUFVLEVBQUU7Z0JBQ1YsS0FBSyxFQUFFLElBQUk7YUFDWjtZQUNELGtCQUFrQixFQUFFO2dCQUNsQixLQUFLLEVBQUU7b0JBQ0wsUUFBUSxFQUFFLElBQUk7b0JBQ2QsT0FBTyxFQUFFLElBQUk7aUJBQ2Q7Z0JBQ0QsaUJBQWlCLEVBQUU7b0JBQ2pCLFFBQVEsRUFBRSxJQUFJO29CQUNkLE9BQU8sRUFBRSxJQUFJO2lCQUNkO2FBQ0Y7WUFDRCxnQkFBZ0IsRUFBRTtnQkFDaEIsUUFBUSxFQUFFLElBQUksT0FBTyxDQUFDLGVBQWUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUM7Z0JBQy9FLE9BQU8sRUFBRSxJQUFJLE9BQU8sQ0FBQyxlQUFlLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDO2FBQy9FO1lBQ0QsY0FBYyxFQUFFO2dCQUNkLFNBQVMsRUFBRSxDQUFDO2dCQUNaLGdCQUFnQixFQUFFLElBQUk7Z0JBQ3RCLGdCQUFnQixFQUFFLElBQUk7Z0JBQ3RCLGFBQWEsRUFBRSxJQUFJO2dCQUNuQixjQUFjLEVBQUUsS0FBSzthQUN0QjtZQUNELGVBQWUsRUFBRSxPQUFPLENBQUMsZUFBZSxDQUFDLFVBQVU7WUFDbkQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN6QyxDQUFDLENBQUM7UUFFSCxtQkFBbUI7UUFDbkIsTUFBTSxjQUFjLEdBQUcsSUFBSSxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSwwQkFBMEIsRUFBRTtZQUNsRixRQUFRO1lBQ1Isa0JBQWtCLEVBQUUsdUJBQXVCO1lBQzNDLFNBQVMsRUFBRTtnQkFDVCxPQUFPLEVBQUUsSUFBSTtnQkFDYixZQUFZLEVBQUUsS0FBSzthQUNwQjtZQUNELGNBQWMsRUFBRSxLQUFLO1NBQ3RCLENBQUMsQ0FBQztRQUVILGtCQUFrQjtRQUNsQixNQUFNLFFBQVEsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQy9ELFlBQVksRUFBRSxtQkFBbUI7U0FDbEMsQ0FBQyxDQUFDO1FBRUgsOEJBQThCO1FBQzlCLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUNqRSxTQUFTLEVBQUUsMEJBQTBCO1lBQ3JDLFdBQVcsRUFBRSwwQkFBMEI7U0FDeEMsQ0FBQyxDQUFDO1FBRUgseURBQXlEO1FBQ3pELE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUU7WUFDM0QsU0FBUyxFQUFFLElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLHNCQUFzQixDQUFDO1lBQzNELGVBQWUsRUFBRTtnQkFDZixHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLDBDQUEwQyxDQUFDO2FBQ3ZGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsd0ZBQXdGO1FBQ3hGLHNFQUFzRTtRQUN0RSxNQUFNLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsb0JBQW9CLENBQzdELElBQUksRUFDSiw0QkFBNEIsRUFDNUIsZ0JBQWdCLElBQUksQ0FBQyxPQUFPLDBDQUEwQyxDQUN2RSxDQUFDO1FBQ0YsVUFBVSxDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFOUMseUZBQXlGO1FBQ3pGLFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQzdDLE9BQU8sRUFBRTtnQkFDUCwyQkFBMkI7Z0JBQzNCLGNBQWM7Z0JBQ2QscUJBQXFCO2dCQUNyQix3QkFBd0I7Z0JBQ3hCLFdBQVc7Z0JBQ1gsOEJBQThCO2dCQUM5QixhQUFhO2dCQUNiLGNBQWM7Z0JBQ2Qsb0RBQW9EO2dCQUNwRCxtQ0FBbUM7Z0JBQ25DLDJCQUEyQjtnQkFDM0IsNkJBQTZCO2dCQUM3QixpQ0FBaUM7Z0JBQ2pDLGtDQUFrQzthQUNuQztZQUNELFNBQVMsRUFBRSxDQUFDLEdBQUcsQ0FBQztTQUNqQixDQUFDLENBQUMsQ0FBQztRQUVKLCtCQUErQjtRQUMvQixNQUFNLGlCQUFpQixHQUFHO1lBQ3hCLGNBQWMsRUFBRSxLQUFLLENBQUMsU0FBUztZQUMvQixjQUFjLEVBQUUsUUFBUSxDQUFDLFlBQVk7WUFDckMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxVQUFVO1lBQ3BDLHVCQUF1QixFQUFFLFlBQVk7WUFDckMsU0FBUyxFQUFFLE1BQU07U0FDbEIsQ0FBQztRQUVGLHFCQUFxQjtRQUNyQixNQUFNLGtCQUFrQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDekUsWUFBWSxFQUFFLHVCQUF1QjtZQUNyQyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxrQ0FBa0MsQ0FBQztZQUMvRCxPQUFPLEVBQUUsb0JBQW9CO1lBQzdCLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZixXQUFXLEVBQUUsaUJBQWlCO1lBQzlCLElBQUksRUFBRSxVQUFVO1lBQ2hCLFlBQVksRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVE7U0FDMUMsQ0FBQyxDQUFDO1FBRUgsS0FBSyxDQUFDLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDN0MsUUFBUSxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFFOUMseUJBQXlCO1FBQ3pCLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSx3QkFBd0IsRUFBRTtZQUNqRixZQUFZLEVBQUUsMkJBQTJCO1lBQ3pDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLHNDQUFzQyxDQUFDO1lBQ25FLE9BQU8sRUFBRSxvQkFBb0I7WUFDN0IsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxVQUFVLEVBQUUsR0FBRztZQUNmLFdBQVcsRUFBRSxpQkFBaUI7WUFDOUIsSUFBSSxFQUFFLFVBQVU7WUFDaEIsWUFBWSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUTtTQUMxQyxDQUFDLENBQUM7UUFFSCxLQUFLLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUNqRCxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUV2RCxvQ0FBb0M7UUFDcEMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN0QyxRQUFRLEVBQUUsUUFBUTtZQUNsQixZQUFZLEVBQUU7Z0JBQ1osTUFBTSxFQUFFLENBQUMsbUJBQW1CLENBQUM7Z0JBQzdCLFVBQVUsRUFBRSxDQUFDLGVBQWUsQ0FBQzthQUM5QjtZQUNELE9BQU8sRUFBRSxDQUFDLElBQUksT0FBTyxDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1NBQzlELENBQUMsQ0FBQztRQUVILHFCQUFxQjtRQUNyQixNQUFNLGtCQUFrQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDekUsWUFBWSxFQUFFLHVCQUF1QjtZQUNyQyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQ0FBbUMsQ0FBQztZQUNoRSxPQUFPLEVBQUUsb0JBQW9CO1lBQzdCLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZixXQUFXLEVBQUUsaUJBQWlCO1lBQzlCLFlBQVksRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVE7U0FDMUMsQ0FBQyxDQUFDO1FBRUgsS0FBSyxDQUFDLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDN0MsV0FBVyxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsdUNBQXVDO1FBRXZGLDhCQUE4QjtRQUM5QixNQUFNLG9CQUFvQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDN0UsWUFBWSxFQUFFLHlCQUF5QjtZQUN2QyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQywyQ0FBMkMsQ0FBQztZQUN4RSxPQUFPLEVBQUUsb0JBQW9CO1lBQzdCLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZixXQUFXLEVBQUUsaUJBQWlCO1lBQzlCLFlBQVksRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVE7U0FDMUMsQ0FBQyxDQUFDO1FBRUgsS0FBSyxDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQzFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBRXJELG9CQUFvQixDQUFDLGVBQWUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDM0QsT0FBTyxFQUFFLENBQUMsZUFBZSxFQUFFLGtCQUFrQixDQUFDO1lBQzlDLFNBQVMsRUFBRSxDQUFDLEdBQUcsQ0FBQztTQUNqQixDQUFDLENBQUMsQ0FBQztRQUVKLHVEQUF1RDtRQUN2RCxNQUFNLDRCQUE0QixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsOEJBQThCLEVBQUU7WUFDN0YsWUFBWSxFQUFFLGlDQUFpQztZQUMvQyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyw0Q0FBNEMsQ0FBQztZQUN6RSxPQUFPLEVBQUUsb0JBQW9CO1lBQzdCLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZixXQUFXLEVBQUU7Z0JBQ1gsR0FBRyxpQkFBaUI7Z0JBQ3BCLGNBQWMsRUFBRSxRQUFRLENBQUMsWUFBWTtnQkFDckMsWUFBWSxFQUFFLHdCQUF3QjthQUN2QztZQUNELFlBQVksRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVE7U0FDMUMsQ0FBQyxDQUFDO1FBRUgsNkNBQTZDO1FBQzdDLEtBQUssQ0FBQyxhQUFhLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUNsRCw0QkFBNEIsQ0FBQyxlQUFlLENBQUMsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQ25FLE9BQU8sRUFBRSxDQUFDLGVBQWUsRUFBRSxrQkFBa0IsQ0FBQztZQUM5QyxTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUM7U0FDakIsQ0FBQyxDQUFDLENBQUM7UUFDSiw0QkFBNEIsQ0FBQyxlQUFlLENBQUMsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQ25FLE9BQU8sRUFBRSxDQUFDLGFBQWEsQ0FBQztZQUN4QixTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUM7U0FDakIsQ0FBQyxDQUFDLENBQUM7UUFFSiwwREFBMEQ7UUFDMUQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQ2pFLFFBQVEsRUFBRSxRQUFRO1lBQ2xCLFFBQVEsRUFBRSx5QkFBeUI7WUFDbkMsV0FBVyxFQUFFLCtDQUErQztZQUM1RCxZQUFZLEVBQUU7Z0JBQ1osTUFBTSxFQUFFLENBQUMsbUJBQW1CLENBQUM7Z0JBQzdCLFVBQVUsRUFBRSxDQUFDLGVBQWUsQ0FBQzthQUM5QjtZQUNELE9BQU8sRUFBRSxJQUFJO1NBQ2QsQ0FBQyxDQUFDO1FBQ0gsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxDQUFDLGNBQWMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUM7UUFFckYseURBQXlEO1FBQ3pELE1BQU0sZUFBZSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDL0QsUUFBUSxFQUFFLFFBQVE7WUFDbEIsUUFBUSxFQUFFLHdCQUF3QjtZQUNsQyxXQUFXLEVBQUUsa0NBQWtDO1lBQy9DLFlBQVksRUFBRTtnQkFDWixNQUFNLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQztnQkFDNUIsVUFBVSxFQUFFLENBQUMsY0FBYyxDQUFDO2FBQzdCO1lBQ0QsT0FBTyxFQUFFLElBQUk7U0FDZCxDQUFDLENBQUM7UUFDSCxlQUFlLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxDQUFDLGNBQWMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUM7UUFFcEYsMERBQTBEO1FBQzFELGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDekQsT0FBTyxFQUFFLENBQUMsa0JBQWtCLENBQUM7WUFDN0IsU0FBUyxFQUFFLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQztTQUNsQyxDQUFDLENBQUMsQ0FBQztRQUVKLHNEQUFzRDtRQUN0RCxNQUFNLGtCQUFrQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDekUsWUFBWSxFQUFFLHVCQUF1QjtZQUNyQyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxrQ0FBa0MsQ0FBQztZQUMvRCxPQUFPLEVBQUUsb0JBQW9CO1lBQzdCLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZixXQUFXLEVBQUU7Z0JBQ1gsR0FBRyxpQkFBaUI7Z0JBQ3BCLGlCQUFpQixFQUFFLGVBQWU7YUFDbkM7WUFDRCxZQUFZLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRO1NBQzFDLENBQUMsQ0FBQztRQUVILGdDQUFnQztRQUNoQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQ3pELE9BQU8sRUFBRTtnQkFDUCxrQkFBa0I7Z0JBQ2xCLHFCQUFxQjthQUN0QjtZQUNELFNBQVMsRUFBRSxDQUFDLEdBQUcsQ0FBQztTQUNqQixDQUFDLENBQUMsQ0FBQztRQUVKLDhDQUE4QztRQUM5QyxtREFBbUQ7UUFDbkQsOENBQThDO1FBRTlDLE1BQU0sR0FBRyxHQUFHLElBQUksVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3hELFdBQVcsRUFBRSxnQkFBZ0I7WUFDN0IsV0FBVyxFQUFFLHdCQUF3QjtZQUNyQyxhQUFhLEVBQUU7Z0JBQ2IsU0FBUyxFQUFFLE1BQU07Z0JBQ2pCLG1CQUFtQixFQUFFLEdBQUc7Z0JBQ3hCLG9CQUFvQixFQUFFLEdBQUc7Z0JBQ3pCLFlBQVksRUFBRSxVQUFVLENBQUMsa0JBQWtCLENBQUMsR0FBRzthQUNoRDtZQUNELDJCQUEyQixFQUFFO2dCQUMzQixZQUFZLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXO2dCQUN6QyxZQUFZLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXO2dCQUN6QyxZQUFZLEVBQUU7b0JBQ1osY0FBYztvQkFDZCxlQUFlO29CQUNmLFlBQVk7b0JBQ1osV0FBVztvQkFDWCxzQkFBc0I7aUJBQ3ZCO2FBQ0Y7WUFDRCxjQUFjLEVBQUUsS0FBSztTQUN0QixDQUFDLENBQUM7UUFFSCxNQUFNLFVBQVUsR0FBRyxJQUFJLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDdEYsZ0JBQWdCLEVBQUUsQ0FBQyxRQUFRLENBQUM7WUFDNUIsY0FBYyxFQUFFLG1CQUFtQjtTQUNwQyxDQUFDLENBQUM7UUFFSCxxRUFBcUU7UUFDckUsTUFBTSxjQUFjLEdBQUcsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLEVBQUU7WUFDMUUsS0FBSyxFQUFFLElBQUk7WUFDWCxlQUFlLEVBQUUsSUFBSTtTQUN0QixDQUFDLENBQUM7UUFFSCxNQUFNLGFBQWEsR0FBRyxJQUFJLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsRUFBRTtZQUN6RSxLQUFLLEVBQUUsSUFBSTtZQUNYLGVBQWUsRUFBRSxJQUFJO1NBQ3RCLENBQUMsQ0FBQztRQUVILE1BQU0sY0FBYyxHQUFHLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixFQUFFO1lBQzFFLEtBQUssRUFBRSxJQUFJO1lBQ1gsZUFBZSxFQUFFLElBQUk7U0FDdEIsQ0FBQyxDQUFDO1FBRUgsdUZBQXVGO1FBQ3ZGLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLGNBQWMsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFFeEQsMkJBQTJCO1FBQzNCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDOUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsY0FBYyxFQUFFLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUUxRCxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM1QyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxjQUFjLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZELEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLGNBQWMsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFFeEQsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxjQUFjLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUUsY0FBYztRQUV6RSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzlDLFVBQVUsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLGNBQWMsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFFNUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNsRCxZQUFZLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxjQUFjLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBRTlELE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3BELFNBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLGNBQWMsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFFM0QsMEJBQTBCO1FBQzFCLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FB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QUFDLHFCQUFxQjtRQUVqRixVQUFVO1FBQ1YsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDcEMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxVQUFVO1lBQzFCLFdBQVcsRUFBRSxzQkFBc0I7U0FDcEMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsY0FBYyxDQUFDLGdCQUFnQjtZQUN0QyxXQUFXLEVBQUUsNkJBQTZCO1NBQzNDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3JDLEtBQUssRUFBRSxHQUFHLENBQUMsR0FBRztZQUNkLFdBQVcsRUFBRSxzQkFBc0I7U0FDcEMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUMzQyxLQUFLLEVBQUUsS0FBSyxDQUFDLFNBQVM7WUFDdEIsV0FBVyxFQUFFLHFCQUFxQjtTQUNuQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRTtZQUNoQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU07WUFDbEIsV0FBVyxFQUFFLFlBQVk7U0FDMUIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUN6QyxLQUFLLEVBQUUsV0FBVyxDQUFDLFVBQVU7WUFDN0IsV0FBVyxFQUFFLG1DQUFtQztTQUNqRCxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUE3Z0JELDBDQTZnQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJztcbmltcG9ydCAqIGFzIGV2ZW50cyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzJztcbmltcG9ydCAqIGFzIHRhcmdldHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWV2ZW50cy10YXJnZXRzJztcbmltcG9ydCAqIGFzIHNucyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc25zJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCAqIGFzIHNjaGVkdWxlciBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc2NoZWR1bGVyJztcblxuZXhwb3J0IGNsYXNzIENhcmVDaXJjbGVTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIER5bmFtb0RCIFRhYmxlXG4gICAgY29uc3QgdGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ0NhcmVDaXJjbGVUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogJ0NhcmVDaXJjbGUtRGF0YS12MicsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ1BLJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ1NLJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiB0cnVlLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vIEdsb2JhbCBTZWNvbmRhcnkgSW5kZXhcbiAgICB0YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdHU0kxJyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnR1NJMVBLJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ0dTSTFTSycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxuICAgIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUzMgQlVDS0VUIEZPUiBNRURJQSAmIERPQ1VNRU5UU1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIGNvbnN0IG1lZGlhQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnQ2FyZUNpcmNsZU1lZGlhQnVja2V0Jywge1xuICAgICAgYnVja2V0TmFtZTogYGNhcmVjaXJjbGUtbWVkaWEtJHt0aGlzLmFjY291bnR9LSR7dGhpcy5yZWdpb259YCxcbiAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICB2ZXJzaW9uZWQ6IHRydWUsXG4gICAgICBsaWZlY3ljbGVSdWxlczogW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdEZWxldGVPbGRSZWNvcmRpbmdzJyxcbiAgICAgICAgICBwcmVmaXg6ICdjYWxsLXJlY29yZGluZ3MvJyxcbiAgICAgICAgICBleHBpcmF0aW9uOiBjZGsuRHVyYXRpb24uZGF5cygzNjUpLCAvLyBLZWVwIGNhbGwgcmVjb3JkaW5ncyBmb3IgMSB5ZWFyXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgY29yczogW1xuICAgICAgICB7XG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtzMy5IdHRwTWV0aG9kcy5HRVQsIHMzLkh0dHBNZXRob2RzLlBVVCwgczMuSHR0cE1ldGhvZHMuUE9TVF0sXG4gICAgICAgICAgYWxsb3dlZE9yaWdpbnM6IFsnKiddLFxuICAgICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbJyonXSxcbiAgICAgICAgICBtYXhBZ2U6IDMwMDAsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLCAvLyBEb24ndCBkZWxldGUgdXNlciBkYXRhXG4gICAgfSk7XG5cbiAgICAvLyBDb2duaXRvIFVzZXIgUG9vbCAodjIgd2l0aCBjdXN0b20gYXR0cmlidXRlcylcbiAgICBjb25zdCB1c2VyUG9vbCA9IG5ldyBjb2duaXRvLlVzZXJQb29sKHRoaXMsICdDYXJlQ2lyY2xlVXNlclBvb2xWMicsIHtcbiAgICAgIHVzZXJQb29sTmFtZTogJ0NhcmVDaXJjbGUtVXNlcnMtdjInLFxuICAgICAgc2VsZlNpZ25VcEVuYWJsZWQ6IHRydWUsXG4gICAgICBzaWduSW5BbGlhc2VzOiB7XG4gICAgICAgIGVtYWlsOiB0cnVlLFxuICAgICAgICB1c2VybmFtZTogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBhdXRvVmVyaWZ5OiB7XG4gICAgICAgIGVtYWlsOiB0cnVlLFxuICAgICAgfSxcbiAgICAgIHN0YW5kYXJkQXR0cmlidXRlczoge1xuICAgICAgICBlbWFpbDoge1xuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgICAgIG11dGFibGU6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICAgIHByZWZlcnJlZFVzZXJuYW1lOiB7XG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBjdXN0b21BdHRyaWJ1dGVzOiB7XG4gICAgICAgIGxhbmd1YWdlOiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoeyBtaW5MZW46IDIsIG1heExlbjogNTAsIG11dGFibGU6IHRydWUgfSksXG4gICAgICAgIHppcGNvZGU6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7IG1pbkxlbjogNSwgbWF4TGVuOiAxMCwgbXV0YWJsZTogdHJ1ZSB9KSxcbiAgICAgIH0sXG4gICAgICBwYXNzd29yZFBvbGljeToge1xuICAgICAgICBtaW5MZW5ndGg6IDgsXG4gICAgICAgIHJlcXVpcmVMb3dlcmNhc2U6IHRydWUsXG4gICAgICAgIHJlcXVpcmVVcHBlcmNhc2U6IHRydWUsXG4gICAgICAgIHJlcXVpcmVEaWdpdHM6IHRydWUsXG4gICAgICAgIHJlcXVpcmVTeW1ib2xzOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgICBhY2NvdW50UmVjb3Zlcnk6IGNvZ25pdG8uQWNjb3VudFJlY292ZXJ5LkVNQUlMX09OTFksXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8gVXNlciBQb29sIENsaWVudFxuICAgIGNvbnN0IHVzZXJQb29sQ2xpZW50ID0gbmV3IGNvZ25pdG8uVXNlclBvb2xDbGllbnQodGhpcywgJ0NhcmVDaXJjbGVVc2VyUG9vbENsaWVudCcsIHtcbiAgICAgIHVzZXJQb29sLFxuICAgICAgdXNlclBvb2xDbGllbnROYW1lOiAnQ2FyZUNpcmNsZS1XZWItQ2xpZW50JyxcbiAgICAgIGF1dGhGbG93czoge1xuICAgICAgICB1c2VyU3JwOiB0cnVlLFxuICAgICAgICB1c2VyUGFzc3dvcmQ6IGZhbHNlLFxuICAgICAgfSxcbiAgICAgIGdlbmVyYXRlU2VjcmV0OiBmYWxzZSxcbiAgICB9KTtcblxuICAgIC8vIEV2ZW50QnJpZGdlIEJ1c1xuICAgIGNvbnN0IGV2ZW50QnVzID0gbmV3IGV2ZW50cy5FdmVudEJ1cyh0aGlzLCAnQ2FyZUNpcmNsZUV2ZW50QnVzJywge1xuICAgICAgZXZlbnRCdXNOYW1lOiAnQ2FyZUNpcmNsZS1FdmVudHMnLFxuICAgIH0pO1xuXG4gICAgLy8gU05TIFRvcGljIGZvciBOb3RpZmljYXRpb25zXG4gICAgY29uc3Qgbm90aWZpY2F0aW9uVG9waWMgPSBuZXcgc25zLlRvcGljKHRoaXMsICdOb3RpZmljYXRpb25Ub3BpYycsIHtcbiAgICAgIHRvcGljTmFtZTogJ0NhcmVDaXJjbGUtTm90aWZpY2F0aW9ucycsXG4gICAgICBkaXNwbGF5TmFtZTogJ0NhcmVDaXJjbGUgTm90aWZpY2F0aW9ucycsXG4gICAgfSk7XG5cbiAgICAvLyBMYW1iZGEgRXhlY3V0aW9uIFJvbGUgd2l0aCBBV1MgQUkgU2VydmljZXMgcGVybWlzc2lvbnNcbiAgICBjb25zdCBsYW1iZGFSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdMYW1iZGFFeGVjdXRpb25Sb2xlJywge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2xhbWJkYS5hbWF6b25hd3MuY29tJyksXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdzZXJ2aWNlLXJvbGUvQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlJyksXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgLy8gQXR0YWNoIHRoZSBjdXN0b20gQ2FyZUNpcmNsZSBBSSBTZXJ2aWNlcyBwb2xpY3kgKGNyZWF0ZWQgdmlhIFNFVFVQX0FJX1BFUk1JU1NJT05TLnNoKVxuICAgIC8vIFRoaXMgcHJvdmlkZXMgY29tcHJlaGVuc2l2ZSBhbmQgcGVybWFuZW50IGFjY2VzcyB0byBhbGwgQUkgc2VydmljZXNcbiAgICBjb25zdCBhaVNlcnZpY2VzUG9saWN5ID0gaWFtLk1hbmFnZWRQb2xpY3kuZnJvbU1hbmFnZWRQb2xpY3lBcm4oXG4gICAgICB0aGlzLCBcbiAgICAgICdDYXJlQ2lyY2xlQUlTZXJ2aWNlc1BvbGljeScsXG4gICAgICBgYXJuOmF3czppYW06OiR7dGhpcy5hY2NvdW50fTpwb2xpY3kvQ2FyZUNpcmNsZS1BSVNlcnZpY2VzLUZ1bGxBY2Nlc3NgXG4gICAgKTtcbiAgICBsYW1iZGFSb2xlLmFkZE1hbmFnZWRQb2xpY3koYWlTZXJ2aWNlc1BvbGljeSk7XG5cbiAgICAvLyBBZGQgZmFsbGJhY2sgaW5saW5lIHBlcm1pc3Npb25zIGZvciBBSSBzZXJ2aWNlcyAoaW4gY2FzZSBtYW5hZ2VkIHBvbGljeSBkb2Vzbid0IGV4aXN0KVxuICAgIGxhbWJkYVJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogW1xuICAgICAgICAvLyBDb21wcmVoZW5kIC0gRnVsbCBhY2Nlc3NcbiAgICAgICAgJ2NvbXByZWhlbmQ6KicsXG4gICAgICAgICdjb21wcmVoZW5kbWVkaWNhbDoqJyxcbiAgICAgICAgLy8gQmVkcm9jayAtIEZ1bGwgYWNjZXNzXG4gICAgICAgICdiZWRyb2NrOionLFxuICAgICAgICAvLyBUcmFuc2xhdGlvbiAmIFRyYW5zY3JpcHRpb25cbiAgICAgICAgJ3RyYW5zbGF0ZToqJyxcbiAgICAgICAgJ3RyYW5zY3JpYmU6KicsXG4gICAgICAgIC8vIEFXUyBNYXJrZXRwbGFjZSBmb3IgQW50aHJvcGljIG1vZGVsIHN1YnNjcmlwdGlvbnNcbiAgICAgICAgJ2F3cy1tYXJrZXRwbGFjZTpWaWV3U3Vic2NyaXB0aW9ucycsXG4gICAgICAgICdhd3MtbWFya2V0cGxhY2U6U3Vic2NyaWJlJyxcbiAgICAgICAgJ2F3cy1tYXJrZXRwbGFjZTpVbnN1YnNjcmliZScsXG4gICAgICAgICdhd3MtbWFya2V0cGxhY2U6R2V0RW50aXRsZW1lbnRzJyxcbiAgICAgICAgJ2F3cy1tYXJrZXRwbGFjZTpMaXN0RW50aXRsZW1lbnRzJyxcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgIH0pKTtcblxuICAgIC8vIExhbWJkYSBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAgICBjb25zdCBsYW1iZGFFbnZpcm9ubWVudCA9IHtcbiAgICAgIERZTkFNT0RCX1RBQkxFOiB0YWJsZS50YWJsZU5hbWUsXG4gICAgICBFVkVOVF9CVVNfTkFNRTogZXZlbnRCdXMuZXZlbnRCdXNOYW1lLFxuICAgICAgTUVESUFfQlVDS0VUOiBtZWRpYUJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgUE9XRVJUT09MU19TRVJWSUNFX05BTUU6ICdDYXJlQ2lyY2xlJyxcbiAgICAgIExPR19MRVZFTDogJ0lORk8nLFxuICAgIH07XG5cbiAgICAvLyBBSSBBbmFseXNpcyBMYW1iZGFcbiAgICBjb25zdCBhaUFuYWx5c2lzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBSUFuYWx5c2lzRnVuY3Rpb24nLCB7XG4gICAgICBmdW5jdGlvbk5hbWU6ICdDYXJlQ2lyY2xlLUFJQW5hbHlzaXMnLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTEsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZnVuY3Rpb25zL2FpLWFuYWx5c2lzJyksXG4gICAgICBoYW5kbGVyOiAnYXBwLmxhbWJkYV9oYW5kbGVyJyxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDYwKSxcbiAgICAgIG1lbW9yeVNpemU6IDUxMixcbiAgICAgIGVudmlyb25tZW50OiBsYW1iZGFFbnZpcm9ubWVudCxcbiAgICAgIHJvbGU6IGxhbWJkYVJvbGUsXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcbiAgICB9KTtcblxuICAgIHRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhaUFuYWx5c2lzRnVuY3Rpb24pO1xuICAgIGV2ZW50QnVzLmdyYW50UHV0RXZlbnRzVG8oYWlBbmFseXNpc0Z1bmN0aW9uKTtcblxuICAgIC8vIFRhc2sgQXNzaWdubWVudCBMYW1iZGFcbiAgICBjb25zdCB0YXNrQXNzaWdubWVudEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVGFza0Fzc2lnbm1lbnRGdW5jdGlvbicsIHtcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ0NhcmVDaXJjbGUtVGFza0Fzc2lnbm1lbnQnLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTEsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZnVuY3Rpb25zL3Rhc2stYXNzaWdubWVudCcpLFxuICAgICAgaGFuZGxlcjogJ2FwcC5sYW1iZGFfaGFuZGxlcicsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICBtZW1vcnlTaXplOiA1MTIsXG4gICAgICBlbnZpcm9ubWVudDogbGFtYmRhRW52aXJvbm1lbnQsXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXG4gICAgfSk7XG5cbiAgICB0YWJsZS5ncmFudFJlYWRXcml0ZURhdGEodGFza0Fzc2lnbm1lbnRGdW5jdGlvbik7XG4gICAgbm90aWZpY2F0aW9uVG9waWMuZ3JhbnRQdWJsaXNoKHRhc2tBc3NpZ25tZW50RnVuY3Rpb24pO1xuXG4gICAgLy8gRXZlbnRCcmlkZ2UgUnVsZSBmb3IgQWxlcnQgRXZlbnRzXG4gICAgbmV3IGV2ZW50cy5SdWxlKHRoaXMsICdBbGVydEV2ZW50UnVsZScsIHtcbiAgICAgIGV2ZW50QnVzOiBldmVudEJ1cyxcbiAgICAgIGV2ZW50UGF0dGVybjoge1xuICAgICAgICBzb3VyY2U6IFsnY2FyZWNpcmNsZS5hbGVydHMnXSxcbiAgICAgICAgZGV0YWlsVHlwZTogWydBbGVydCBDcmVhdGVkJ10sXG4gICAgICB9LFxuICAgICAgdGFyZ2V0czogW25ldyB0YXJnZXRzLkxhbWJkYUZ1bmN0aW9uKHRhc2tBc3NpZ25tZW50RnVuY3Rpb24pXSxcbiAgICB9KTtcblxuICAgIC8vIEFQSSBIYW5kbGVyIExhbWJkYVxuICAgIGNvbnN0IGFwaUhhbmRsZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FQSUhhbmRsZXJGdW5jdGlvbicsIHtcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ0NhcmVDaXJjbGUtQVBJSGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMSxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9mdW5jdGlvbnMvYXBpLWhhbmRsZXJzJyksXG4gICAgICBoYW5kbGVyOiAnYXBwLmxhbWJkYV9oYW5kbGVyJyxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICAgIGVudmlyb25tZW50OiBsYW1iZGFFbnZpcm9ubWVudCxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxuICAgIH0pO1xuXG4gICAgdGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFwaUhhbmRsZXJGdW5jdGlvbik7XG4gICAgbWVkaWFCdWNrZXQuZ3JhbnRSZWFkV3JpdGUoYXBpSGFuZGxlckZ1bmN0aW9uKTsgLy8gUzMgYWNjZXNzIGZvciBjYWxsIHJlY29yZGluZ3MgJiBkb2NzXG5cbiAgICAvLyBOb3RpZmljYXRpb24gSGFuZGxlciBMYW1iZGFcbiAgICBjb25zdCBub3RpZmljYXRpb25GdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ05vdGlmaWNhdGlvbkZ1bmN0aW9uJywge1xuICAgICAgZnVuY3Rpb25OYW1lOiAnQ2FyZUNpcmNsZS1Ob3RpZmljYXRpb24nLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTEsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQvZnVuY3Rpb25zL25vdGlmaWNhdGlvbi1oYW5kbGVyJyksXG4gICAgICBoYW5kbGVyOiAnYXBwLmxhbWJkYV9oYW5kbGVyJyxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICAgIGVudmlyb25tZW50OiBsYW1iZGFFbnZpcm9ubWVudCxcbiAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxuICAgIH0pO1xuXG4gICAgdGFibGUuZ3JhbnRSZWFkRGF0YShub3RpZmljYXRpb25GdW5jdGlvbik7XG4gICAgbm90aWZpY2F0aW9uVG9waWMuZ3JhbnRQdWJsaXNoKG5vdGlmaWNhdGlvbkZ1bmN0aW9uKTtcbiAgICBcbiAgICBub3RpZmljYXRpb25GdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogWydzZXM6U2VuZEVtYWlsJywgJ3NlczpTZW5kUmF3RW1haWwnXSxcbiAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgfSkpO1xuXG4gICAgLy8gTm90aWZpY2F0aW9uIFdvcmtmbG93IExhbWJkYSAoRXZlbnRCcmlkZ2UtdHJpZ2dlcmVkKVxuICAgIGNvbnN0IG5vdGlmaWNhdGlvbldvcmtmbG93RnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdOb3RpZmljYXRpb25Xb3JrZmxvd0Z1bmN0aW9uJywge1xuICAgICAgZnVuY3Rpb25OYW1lOiAnQ2FyZUNpcmNsZS1Ob3RpZmljYXRpb25Xb3JrZmxvdycsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMSxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZC9mdW5jdGlvbnMvbm90aWZpY2F0aW9uLXdvcmtmbG93JyksXG4gICAgICBoYW5kbGVyOiAnYXBwLmxhbWJkYV9oYW5kbGVyJyxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIC4uLmxhbWJkYUVudmlyb25tZW50LFxuICAgICAgICBFVkVOVF9CVVNfTkFNRTogZXZlbnRCdXMuZXZlbnRCdXNOYW1lLFxuICAgICAgICBTRU5ERVJfRU1BSUw6ICdub3JlcGx5QGNhcmVjaXJjbGUuY29tJyxcbiAgICAgIH0sXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcbiAgICB9KTtcblxuICAgIC8vIEdyYW50IHBlcm1pc3Npb25zIHRvIG5vdGlmaWNhdGlvbiB3b3JrZmxvd1xuICAgIHRhYmxlLmdyYW50UmVhZERhdGEobm90aWZpY2F0aW9uV29ya2Zsb3dGdW5jdGlvbik7XG4gICAgbm90aWZpY2F0aW9uV29ya2Zsb3dGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogWydzZXM6U2VuZEVtYWlsJywgJ3NlczpTZW5kUmF3RW1haWwnXSxcbiAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgfSkpO1xuICAgIG5vdGlmaWNhdGlvbldvcmtmbG93RnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFsnc25zOlB1Ymxpc2gnXSxcbiAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgfSkpO1xuXG4gICAgLy8gRXZlbnRCcmlkZ2UgUnVsZTogQWxlcnQgQ3JlYXRlZCDihpIgTm90aWZpY2F0aW9uIFdvcmtmbG93XG4gICAgY29uc3QgYWxlcnRDcmVhdGVkUnVsZSA9IG5ldyBldmVudHMuUnVsZSh0aGlzLCAnQWxlcnRDcmVhdGVkUnVsZScsIHtcbiAgICAgIGV2ZW50QnVzOiBldmVudEJ1cyxcbiAgICAgIHJ1bGVOYW1lOiAnQ2FyZUNpcmNsZS1BbGVydENyZWF0ZWQnLFxuICAgICAgZGVzY3JpcHRpb246ICdUcmlnZ2VyIG5vdGlmaWNhdGlvbnMgd2hlbiBhbGVydHMgYXJlIGNyZWF0ZWQnLFxuICAgICAgZXZlbnRQYXR0ZXJuOiB7XG4gICAgICAgIHNvdXJjZTogWydjYXJlY2lyY2xlLmFsZXJ0cyddLFxuICAgICAgICBkZXRhaWxUeXBlOiBbJ0FsZXJ0IENyZWF0ZWQnXSxcbiAgICAgIH0sXG4gICAgICBlbmFibGVkOiB0cnVlLFxuICAgIH0pO1xuICAgIGFsZXJ0Q3JlYXRlZFJ1bGUuYWRkVGFyZ2V0KG5ldyB0YXJnZXRzLkxhbWJkYUZ1bmN0aW9uKG5vdGlmaWNhdGlvbldvcmtmbG93RnVuY3Rpb24pKTtcblxuICAgIC8vIEV2ZW50QnJpZGdlIFJ1bGU6IFRhc2sgT3ZlcmR1ZSDihpIgTm90aWZpY2F0aW9uIFdvcmtmbG93XG4gICAgY29uc3QgdGFza092ZXJkdWVSdWxlID0gbmV3IGV2ZW50cy5SdWxlKHRoaXMsICdUYXNrT3ZlcmR1ZVJ1bGUnLCB7XG4gICAgICBldmVudEJ1czogZXZlbnRCdXMsXG4gICAgICBydWxlTmFtZTogJ0NhcmVDaXJjbGUtVGFza092ZXJkdWUnLFxuICAgICAgZGVzY3JpcHRpb246ICdTZW5kIHJlbWluZGVycyBmb3Igb3ZlcmR1ZSB0YXNrcycsXG4gICAgICBldmVudFBhdHRlcm46IHtcbiAgICAgICAgc291cmNlOiBbJ2NhcmVjaXJjbGUudGFza3MnXSxcbiAgICAgICAgZGV0YWlsVHlwZTogWydUYXNrIE92ZXJkdWUnXSxcbiAgICAgIH0sXG4gICAgICBlbmFibGVkOiB0cnVlLFxuICAgIH0pO1xuICAgIHRhc2tPdmVyZHVlUnVsZS5hZGRUYXJnZXQobmV3IHRhcmdldHMuTGFtYmRhRnVuY3Rpb24obm90aWZpY2F0aW9uV29ya2Zsb3dGdW5jdGlvbikpO1xuXG4gICAgLy8gR3JhbnQgQUkgQW5hbHlzaXMgRnVuY3Rpb24gcGVybWlzc2lvbiB0byBwdWJsaXNoIGV2ZW50c1xuICAgIGFpQW5hbHlzaXNGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogWydldmVudHM6UHV0RXZlbnRzJ10sXG4gICAgICByZXNvdXJjZXM6IFtldmVudEJ1cy5ldmVudEJ1c0Fybl0sXG4gICAgfSkpO1xuXG4gICAgLy8gUkFHIFNlcnZpY2UgTGFtYmRhIChSZXRyaWV2YWwtQXVnbWVudGVkIEdlbmVyYXRpb24pXG4gICAgY29uc3QgcmFnU2VydmljZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUkFHU2VydmljZUZ1bmN0aW9uJywge1xuICAgICAgZnVuY3Rpb25OYW1lOiAnQ2FyZUNpcmNsZS1SQUdTZXJ2aWNlJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzExLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kL2Z1bmN0aW9ucy9yYWctc2VydmljZScpLFxuICAgICAgaGFuZGxlcjogJ2FwcC5sYW1iZGFfaGFuZGxlcicsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCksXG4gICAgICBtZW1vcnlTaXplOiA1MTIsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAuLi5sYW1iZGFFbnZpcm9ubWVudCxcbiAgICAgICAgS05PV0xFREdFX0JBU0VfSUQ6ICdkZWZhdWx0LWtiLWlkJyxcbiAgICAgIH0sXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcbiAgICB9KTtcblxuICAgIC8vIEdyYW50IFJBRyBTZXJ2aWNlIHBlcm1pc3Npb25zXG4gICAgcmFnU2VydmljZUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdiZWRyb2NrOlJldHJpZXZlJyxcbiAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWwnLFxuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgfSkpO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIEFQSSBHYXRld2F5IHdpdGggUFJPUEVSIExhbWJkYSBQcm94eSBJbnRlZ3JhdGlvblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBcbiAgICBjb25zdCBhcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdDYXJlQ2lyY2xlQVBJJywge1xuICAgICAgcmVzdEFwaU5hbWU6ICdDYXJlQ2lyY2xlLUFQSScsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NhcmVDaXJjbGUgQmFja2VuZCBBUEknLFxuICAgICAgZGVwbG95T3B0aW9uczoge1xuICAgICAgICBzdGFnZU5hbWU6ICdwcm9kJyxcbiAgICAgICAgdGhyb3R0bGluZ1JhdGVMaW1pdDogMTAwLFxuICAgICAgICB0aHJvdHRsaW5nQnVyc3RMaW1pdDogMjAwLFxuICAgICAgICBsb2dnaW5nTGV2ZWw6IGFwaWdhdGV3YXkuTWV0aG9kTG9nZ2luZ0xldmVsLk9GRixcbiAgICAgIH0sXG4gICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBhcGlnYXRld2F5LkNvcnMuQUxMX09SSUdJTlMsXG4gICAgICAgIGFsbG93TWV0aG9kczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9NRVRIT0RTLFxuICAgICAgICBhbGxvd0hlYWRlcnM6IFtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJyxcbiAgICAgICAgICAnQXV0aG9yaXphdGlvbicsXG4gICAgICAgICAgJ1gtQW16LURhdGUnLFxuICAgICAgICAgICdYLUFwaS1LZXknLFxuICAgICAgICAgICdYLUFtei1TZWN1cml0eS1Ub2tlbicsXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAgY2xvdWRXYXRjaFJvbGU6IGZhbHNlLFxuICAgIH0pO1xuXG4gICAgY29uc3QgYXV0aG9yaXplciA9IG5ldyBhcGlnYXRld2F5LkNvZ25pdG9Vc2VyUG9vbHNBdXRob3JpemVyKHRoaXMsICdDb2duaXRvQXV0aG9yaXplcicsIHtcbiAgICAgIGNvZ25pdG9Vc2VyUG9vbHM6IFt1c2VyUG9vbF0sXG4gICAgICBhdXRob3JpemVyTmFtZTogJ0NvZ25pdG9BdXRob3JpemVyJyxcbiAgICB9KTtcblxuICAgIC8vIOKchSBGSVg6IFVzZSBMYW1iZGEgUHJveHkgSW50ZWdyYXRpb24gLSBUaGlzIHBhc3NlcyB0aHJvdWdoIGhlYWRlcnMhXG4gICAgY29uc3QgYXBpSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhcGlIYW5kbGVyRnVuY3Rpb24sIHtcbiAgICAgIHByb3h5OiB0cnVlLFxuICAgICAgYWxsb3dUZXN0SW52b2tlOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgY29uc3QgYWlJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGFpQW5hbHlzaXNGdW5jdGlvbiwge1xuICAgICAgcHJveHk6IHRydWUsXG4gICAgICBhbGxvd1Rlc3RJbnZva2U6IHRydWUsXG4gICAgfSk7XG5cbiAgICBjb25zdCByYWdJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHJhZ1NlcnZpY2VGdW5jdGlvbiwge1xuICAgICAgcHJveHk6IHRydWUsXG4gICAgICBhbGxvd1Rlc3RJbnZva2U6IHRydWUsXG4gICAgfSk7XG5cbiAgICAvLyBBUEkgUm91dGVzIC0gU2ltcGxpZmllZCAoQ09SUyBoYW5kbGVkIGJ5IExhbWJkYSBQcm94eSArIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9ucylcbiAgICBjb25zdCBhbGVydHMgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnYWxlcnRzJyk7XG4gICAgYWxlcnRzLmFkZE1ldGhvZCgnR0VUJywgYXBpSW50ZWdyYXRpb24sIHsgYXV0aG9yaXplciB9KTtcbiAgICBcbiAgICAvLyBBbGVydCBieSBJRCAoZm9yIERFTEVURSlcbiAgICBjb25zdCBhbGVydCA9IGFsZXJ0cy5hZGRSZXNvdXJjZSgne2FsZXJ0SWR9Jyk7XG4gICAgYWxlcnQuYWRkTWV0aG9kKCdERUxFVEUnLCBhcGlJbnRlZ3JhdGlvbiwgeyBhdXRob3JpemVyIH0pO1xuXG4gICAgY29uc3QgdGFza3MgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgndGFza3MnKTtcbiAgICB0YXNrcy5hZGRNZXRob2QoJ0dFVCcsIGFwaUludGVncmF0aW9uLCB7IGF1dGhvcml6ZXIgfSk7XG4gICAgdGFza3MuYWRkTWV0aG9kKCdQT1NUJywgYXBpSW50ZWdyYXRpb24sIHsgYXV0aG9yaXplciB9KTtcbiAgICBcbiAgICBjb25zdCB0YXNrID0gdGFza3MuYWRkUmVzb3VyY2UoJ3t0YXNrSWR9Jyk7XG4gICAgdGFzay5hZGRNZXRob2QoJ0RFTEVURScsIGFwaUludGVncmF0aW9uLCB7IGF1dGhvcml6ZXIgfSk7ICAvLyBEZWxldGUgdGFza1xuICAgIFxuICAgIGNvbnN0IGFjY2VwdFRhc2sgPSB0YXNrLmFkZFJlc291cmNlKCdhY2NlcHQnKTtcbiAgICBhY2NlcHRUYXNrLmFkZE1ldGhvZCgnUFVUJywgYXBpSW50ZWdyYXRpb24sIHsgYXV0aG9yaXplciB9KTtcbiAgICBcbiAgICBjb25zdCBjb21wbGV0ZVRhc2sgPSB0YXNrLmFkZFJlc291cmNlKCdjb21wbGV0ZScpO1xuICAgIGNvbXBsZXRlVGFzay5hZGRNZXRob2QoJ1BVVCcsIGFwaUludGVncmF0aW9uLCB7IGF1dGhvcml6ZXIgfSk7XG5cbiAgICBjb25zdCBhbmFseXRpY3MgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnYW5hbHl0aWNzJyk7XG4gICAgYW5hbHl0aWNzLmFkZE1ldGhvZCgnR0VUJywgYXBpSW50ZWdyYXRpb24sIHsgYXV0aG9yaXplciB9KTtcbiAgICBcbiAgICAvLyBFbGRlciBtYW5hZ2VtZW50IHJvdXRlc1xuICAgIGNvbnN0IGVsZGVycyA9IGFwaS5yb290LmFkZFJlc291cmNlKCdlbGRlcnMnKTtcbiAgICBlbGRlcnMuYWRkTWV0aG9kKCdHRVQnLCBhcGlJbnRlZ3JhdGlvbiwgeyBhdXRob3JpemVyIH0pO1xuICAgIGVsZGVycy5hZGRNZXRob2QoJ1BPU1QnLCBhcGlJbnRlZ3JhdGlvbiwgeyBhdXRob3JpemVyIH0pO1xuICAgIFxuICAgIGNvbnN0IGVsZGVyID0gZWxkZXJzLmFkZFJlc291cmNlKCd7ZWxkZXJJZH0nKTtcbiAgICBlbGRlci5hZGRNZXRob2QoJ1BVVCcsIGFwaUludGVncmF0aW9uLCB7IGF1dGhvcml6ZXIgfSk7XG4gICAgZWxkZXIuYWRkTWV0aG9kKCdERUxFVEUnLCBhcGlJbnRlZ3JhdGlvbiwgeyBhdXRob3JpemVyIH0pO1xuICAgIFxuICAgIC8vIENhcmVnaXZlciBtYW5hZ2VtZW50IHJvdXRlc1xuICAgIGNvbnN0IGNhcmVnaXZlcnMgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnY2FyZWdpdmVycycpO1xuICAgIGNhcmVnaXZlcnMuYWRkTWV0aG9kKCdHRVQnLCBhcGlJbnRlZ3JhdGlvbiwgeyBhdXRob3JpemVyIH0pO1xuICAgIGNhcmVnaXZlcnMuYWRkTWV0aG9kKCdQT1NUJywgYXBpSW50ZWdyYXRpb24sIHsgYXV0aG9yaXplciB9KTtcbiAgICBcbiAgICBjb25zdCBjYXJlZ2l2ZXIgPSBjYXJlZ2l2ZXJzLmFkZFJlc291cmNlKCd7Y2FyZWdpdmVySWR9Jyk7XG4gICAgY2FyZWdpdmVyLmFkZE1ldGhvZCgnUFVUJywgYXBpSW50ZWdyYXRpb24sIHsgYXV0aG9yaXplciB9KTtcbiAgICBjYXJlZ2l2ZXIuYWRkTWV0aG9kKCdERUxFVEUnLCBhcGlJbnRlZ3JhdGlvbiwgeyBhdXRob3JpemVyIH0pO1xuXG4gICAgY29uc3QgdXNlcnMgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgndXNlcnMnKTtcbiAgICBjb25zdCB1c2VyUHJvZmlsZSA9IHVzZXJzLmFkZFJlc291cmNlKCd7dXNlcklkfScpLmFkZFJlc291cmNlKCdwcm9maWxlJyk7XG4gICAgdXNlclByb2ZpbGUuYWRkTWV0aG9kKCdHRVQnLCBhcGlJbnRlZ3JhdGlvbiwgeyBhdXRob3JpemVyIH0pO1xuICAgIFxuICAgIGNvbnN0IHByb2ZpbGUgPSB1c2Vycy5hZGRSZXNvdXJjZSgncHJvZmlsZScpO1xuICAgIHByb2ZpbGUuYWRkTWV0aG9kKCdQVVQnLCBhcGlJbnRlZ3JhdGlvbiwgeyBhdXRob3JpemVyIH0pO1xuXG4gICAgLy8gQW5hbHl6ZSBlbmRwb2ludCAoZm9yIGNhbGwgYW5hbHlzaXMpXG4gICAgY29uc3QgYW5hbHl6ZSA9IGFwaS5yb290LmFkZFJlc291cmNlKCdhbmFseXplJyk7XG4gICAgY29uc3QgdHJhbnNjcmlwdCA9IGFuYWx5emUuYWRkUmVzb3VyY2UoJ3RyYW5zY3JpcHQnKTtcbiAgICB0cmFuc2NyaXB0LmFkZE1ldGhvZCgnUE9TVCcsIGFpSW50ZWdyYXRpb24sIHsgYXV0aG9yaXplciB9KTtcblxuICAgIC8vIFJBRyBlbmRwb2ludHMgKFJldHJpZXZhbC1BdWdtZW50ZWQgR2VuZXJhdGlvbilcbiAgICBjb25zdCByYWcgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgncmFnJyk7XG4gICAgY29uc3QgcmFnUXVlcnkgPSByYWcuYWRkUmVzb3VyY2UoJ3F1ZXJ5Jyk7XG4gICAgcmFnUXVlcnkuYWRkTWV0aG9kKCdQT1NUJywgcmFnSW50ZWdyYXRpb24sIHsgYXV0aG9yaXplciB9KTtcbiAgICBcbiAgICBjb25zdCBleHBsYWluQWxlcnQgPSByYWcuYWRkUmVzb3VyY2UoJ2V4cGxhaW4tYWxlcnQnKTtcbiAgICBleHBsYWluQWxlcnQuYWRkTWV0aG9kKCdQT1NUJywgcmFnSW50ZWdyYXRpb24sIHsgYXV0aG9yaXplciB9KTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFBIQVNFIDE6IENBTEwgUkVDT1JEU1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIGNvbnN0IGNhbGxzID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2NhbGxzJyk7XG4gICAgY2FsbHMuYWRkTWV0aG9kKCdHRVQnLCBhcGlJbnRlZ3JhdGlvbiwgeyBhdXRob3JpemVyIH0pOyAgICAvLyBHZXQgY2FsbCBoaXN0b3J5XG4gICAgY2FsbHMuYWRkTWV0aG9kKCdQT1NUJywgYXBpSW50ZWdyYXRpb24sIHsgYXV0aG9yaXplciB9KTsgICAvLyBTYXZlIGNhbGwgcmVjb3JkXG4gICAgXG4gICAgY29uc3QgY2FsbCA9IGNhbGxzLmFkZFJlc291cmNlKCd7Y2FsbElkfScpO1xuICAgIGNhbGwuYWRkTWV0aG9kKCdHRVQnLCBhcGlJbnRlZ3JhdGlvbiwgeyBhdXRob3JpemVyIH0pOyAgICAgLy8gR2V0IHNpbmdsZSBjYWxsXG4gICAgY2FsbC5hZGRNZXRob2QoJ0RFTEVURScsIGFwaUludGVncmF0aW9uLCB7IGF1dGhvcml6ZXIgfSk7ICAvLyBEZWxldGUgY2FsbFxuICAgIFxuICAgIC8vIFByZXNpZ25lZCBVUkwgZm9yIGF1ZGlvIHVwbG9hZC9kb3dubG9hZFxuICAgIGNvbnN0IGNhbGxBdWRpbyA9IGNhbGwuYWRkUmVzb3VyY2UoJ2F1ZGlvLXVybCcpO1xuICAgIGNhbGxBdWRpby5hZGRNZXRob2QoJ0dFVCcsIGFwaUludGVncmF0aW9uLCB7IGF1dGhvcml6ZXIgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBQSEFTRSAyOiBNRURJQ0FUSU9OU1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIGNvbnN0IG1lZGljYXRpb25zID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ21lZGljYXRpb25zJyk7XG4gICAgbWVkaWNhdGlvbnMuYWRkTWV0aG9kKCdHRVQnLCBhcGlJbnRlZ3JhdGlvbiwgeyBhdXRob3JpemVyIH0pO1xuICAgIG1lZGljYXRpb25zLmFkZE1ldGhvZCgnUE9TVCcsIGFwaUludGVncmF0aW9uLCB7IGF1dGhvcml6ZXIgfSk7XG4gICAgXG4gICAgY29uc3QgbWVkaWNhdGlvbiA9IG1lZGljYXRpb25zLmFkZFJlc291cmNlKCd7bWVkaWNhdGlvbklkfScpO1xuICAgIG1lZGljYXRpb24uYWRkTWV0aG9kKCdHRVQnLCBhcGlJbnRlZ3JhdGlvbiwgeyBhdXRob3JpemVyIH0pO1xuICAgIG1lZGljYXRpb24uYWRkTWV0aG9kKCdQVVQnLCBhcGlJbnRlZ3JhdGlvbiwgeyBhdXRob3JpemVyIH0pO1xuICAgIG1lZGljYXRpb24uYWRkTWV0aG9kKCdERUxFVEUnLCBhcGlJbnRlZ3JhdGlvbiwgeyBhdXRob3JpemVyIH0pO1xuICAgIFxuICAgIC8vIExvZyBtZWRpY2F0aW9uIHRha2VuXG4gICAgY29uc3QgbWVkTG9nID0gbWVkaWNhdGlvbi5hZGRSZXNvdXJjZSgnbG9nJyk7XG4gICAgbWVkTG9nLmFkZE1ldGhvZCgnUE9TVCcsIGFwaUludGVncmF0aW9uLCB7IGF1dGhvcml6ZXIgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBQSEFTRSAzOiBFTUVSR0VOQ1kgQ09OVEFDVFNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBjb25zdCBlbWVyZ2VuY3lDb250YWN0cyA9IGFwaS5yb290LmFkZFJlc291cmNlKCdlbWVyZ2VuY3ktY29udGFjdHMnKTtcbiAgICBlbWVyZ2VuY3lDb250YWN0cy5hZGRNZXRob2QoJ0dFVCcsIGFwaUludGVncmF0aW9uLCB7IGF1dGhvcml6ZXIgfSk7XG4gICAgZW1lcmdlbmN5Q29udGFjdHMuYWRkTWV0aG9kKCdQT1NUJywgYXBpSW50ZWdyYXRpb24sIHsgYXV0aG9yaXplciB9KTtcbiAgICBcbiAgICBjb25zdCBlbWVyZ2VuY3lDb250YWN0ID0gZW1lcmdlbmN5Q29udGFjdHMuYWRkUmVzb3VyY2UoJ3tjb250YWN0SWR9Jyk7XG4gICAgZW1lcmdlbmN5Q29udGFjdC5hZGRNZXRob2QoJ1BVVCcsIGFwaUludGVncmF0aW9uLCB7IGF1dGhvcml6ZXIgfSk7XG4gICAgZW1lcmdlbmN5Q29udGFjdC5hZGRNZXRob2QoJ0RFTEVURScsIGFwaUludGVncmF0aW9uLCB7IGF1dGhvcml6ZXIgfSk7XG4gICAgXG4gICAgLy8gTWVkaWNhbCBJRCBnZW5lcmF0aW9uXG4gICAgY29uc3QgbWVkaWNhbElkID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ21lZGljYWwtaWQnKTtcbiAgICBtZWRpY2FsSWQuYWRkTWV0aG9kKCdHRVQnLCBhcGlJbnRlZ3JhdGlvbiwgeyBhdXRob3JpemVyIH0pO1xuXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUEhBU0UgNDogSEVBTFRIIENPTkRJVElPTlMgJiBBTExFUkdJRVNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBjb25zdCBjb25kaXRpb25zID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2hlYWx0aC1jb25kaXRpb25zJyk7XG4gICAgY29uZGl0aW9ucy5hZGRNZXRob2QoJ0dFVCcsIGFwaUludGVncmF0aW9uLCB7IGF1dGhvcml6ZXIgfSk7XG4gICAgY29uZGl0aW9ucy5hZGRNZXRob2QoJ1BPU1QnLCBhcGlJbnRlZ3JhdGlvbiwgeyBhdXRob3JpemVyIH0pO1xuICAgIFxuICAgIGNvbnN0IGNvbmRpdGlvbiA9IGNvbmRpdGlvbnMuYWRkUmVzb3VyY2UoJ3tjb25kaXRpb25JZH0nKTtcbiAgICBjb25kaXRpb24uYWRkTWV0aG9kKCdERUxFVEUnLCBhcGlJbnRlZ3JhdGlvbiwgeyBhdXRob3JpemVyIH0pO1xuICAgIFxuICAgIGNvbnN0IGFsbGVyZ2llcyA9IGFwaS5yb290LmFkZFJlc291cmNlKCdhbGxlcmdpZXMnKTtcbiAgICBhbGxlcmdpZXMuYWRkTWV0aG9kKCdHRVQnLCBhcGlJbnRlZ3JhdGlvbiwgeyBhdXRob3JpemVyIH0pO1xuICAgIGFsbGVyZ2llcy5hZGRNZXRob2QoJ1BPU1QnLCBhcGlJbnRlZ3JhdGlvbiwgeyBhdXRob3JpemVyIH0pO1xuICAgIFxuICAgIGNvbnN0IGFsbGVyZ3kgPSBhbGxlcmdpZXMuYWRkUmVzb3VyY2UoJ3thbGxlcmd5SWR9Jyk7XG4gICAgYWxsZXJneS5hZGRNZXRob2QoJ0RFTEVURScsIGFwaUludGVncmF0aW9uLCB7IGF1dGhvcml6ZXIgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBQSEFTRSA1OiBXRUxMTkVTUyAmIEFOQUxZVElDU1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIGNvbnN0IHdlbGxuZXNzID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3dlbGxuZXNzJyk7XG4gICAgd2VsbG5lc3MuYWRkTWV0aG9kKCdHRVQnLCBhcGlJbnRlZ3JhdGlvbiwgeyBhdXRob3JpemVyIH0pOyAgLy8gR2V0IHdlbGxuZXNzIHNjb3Jlc1xuICAgIHdlbGxuZXNzLmFkZE1ldGhvZCgnUE9TVCcsIGFwaUludGVncmF0aW9uLCB7IGF1dGhvcml6ZXIgfSk7IC8vIExvZyBkYWlseSB3ZWxsbmVzc1xuXG4gICAgLy8gT3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbElkJywge1xuICAgICAgdmFsdWU6IHVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIElEJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbENsaWVudElkJywge1xuICAgICAgdmFsdWU6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIENsaWVudCBJRCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQVBJRW5kcG9pbnQnLCB7XG4gICAgICB2YWx1ZTogYXBpLnVybCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgRW5kcG9pbnQnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0R5bmFtb0RCVGFibGVOYW1lJywge1xuICAgICAgdmFsdWU6IHRhYmxlLnRhYmxlTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRHluYW1vREIgVGFibGUgTmFtZScsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUmVnaW9uJywge1xuICAgICAgdmFsdWU6IHRoaXMucmVnaW9uLFxuICAgICAgZGVzY3JpcHRpb246ICdBV1MgUmVnaW9uJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdNZWRpYUJ1Y2tldE5hbWUnLCB7XG4gICAgICB2YWx1ZTogbWVkaWFCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgQnVja2V0IGZvciBtZWRpYSBhbmQgZG9jdW1lbnRzJyxcbiAgICB9KTtcbiAgfVxufVxuIl19