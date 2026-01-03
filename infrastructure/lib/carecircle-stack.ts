import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as scheduler from 'aws-cdk-lib/aws-scheduler';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';

export class CareCircleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
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
    // Import existing bucket (created in previous deployment)
    const mediaBucket = s3.Bucket.fromBucketName(
      this,
      'CareCircleMediaBucket',
      `carecircle-media-${this.account}-${this.region}`
    );

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
    const aiServicesPolicy = iam.ManagedPolicy.fromManagedPolicyArn(
      this,
      'CareCircleAIServicesPolicy',
      `arn:aws:iam::${this.account}:policy/CareCircle-AIServices-FullAccess`
    );
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

    // Create IAM role for API Gateway to invoke Lambdas (avoids 20KB policy limit)
    const apiGatewayRole = new iam.Role(this, 'APIGatewayRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    });

    // =============================================
    // PHASE 1: Call Records Lambda (Separate to avoid policy limit)
    // =============================================
    const callsHandlerFunction = new lambda.Function(this, 'CallsHandlerFunction', {
      functionName: 'CareCircle-CallsHandler',
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset('../backend/functions/calls-handler'),
      handler: 'app.lambda_handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: lambdaEnvironment,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    table.grantReadWriteData(callsHandlerFunction);

    // Grant S3 access for call audio storage
    callsHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        's3:GetObject',
        's3:PutObject',
        's3:DeleteObject',
      ],
      resources: [`arn:aws:s3:::${mediaBucket.bucketName}/*`],
    }));

    // =============================================
    // PHASE 2: Medications Lambda
    // =============================================
    const medicationsHandlerFunction = new lambda.Function(this, 'MedicationsHandlerFunction', {
      functionName: 'CareCircle-MedicationsHandler',
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset('../backend/functions/medications-handler'),
      handler: 'app.lambda_handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: lambdaEnvironment,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    table.grantReadWriteData(medicationsHandlerFunction);

    // =============================================
    // PHASE 3: Emergency Handler Lambda
    // =============================================
    const emergencyHandlerFunction = new lambda.Function(this, 'EmergencyHandlerFunction', {
      functionName: 'CareCircle-EmergencyHandler',
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset('../backend/functions/emergency-handler'),
      handler: 'app.lambda_handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: lambdaEnvironment,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    table.grantReadWriteData(emergencyHandlerFunction);

    // =============================================
    // PHASE 4: Health Conditions + Allergies Lambda
    // =============================================
    const healthHandlerFunction = new lambda.Function(this, 'HealthHandlerFunction', {
      functionName: 'CareCircle-HealthHandler',
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset('../backend/functions/health-handler'),
      handler: 'app.lambda_handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: lambdaEnvironment,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    table.grantReadWriteData(healthHandlerFunction);

    // =============================================
    // PHASE 5: Wellness Dashboard Lambda
    // =============================================
    const wellnessHandlerFunction = new lambda.Function(this, 'WellnessHandlerFunction', {
      functionName: 'CareCircle-WellnessHandler',
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset('../backend/functions/wellness-handler'),
      handler: 'app.lambda_handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: lambdaEnvironment,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    table.grantReadWriteData(wellnessHandlerFunction);

    // Grant the role permission to invoke all our Lambdas
    apiHandlerFunction.grantInvoke(apiGatewayRole);
    aiAnalysisFunction.grantInvoke(apiGatewayRole);
    ragServiceFunction.grantInvoke(apiGatewayRole);
    callsHandlerFunction.grantInvoke(apiGatewayRole);
    medicationsHandlerFunction.grantInvoke(apiGatewayRole);
    emergencyHandlerFunction.grantInvoke(apiGatewayRole);
    healthHandlerFunction.grantInvoke(apiGatewayRole);
    wellnessHandlerFunction.grantInvoke(apiGatewayRole);

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

    // ✅ FIX: Use credentialsRole to avoid per-method Lambda permissions (fixes 20KB policy limit)
    const apiIntegration = new apigateway.LambdaIntegration(apiHandlerFunction, {
      proxy: true,
      allowTestInvoke: false,
      credentialsRole: apiGatewayRole,
    });

    const aiIntegration = new apigateway.LambdaIntegration(aiAnalysisFunction, {
      proxy: true,
      allowTestInvoke: false,
      credentialsRole: apiGatewayRole,
    });

    const ragIntegration = new apigateway.LambdaIntegration(ragServiceFunction, {
      proxy: true,
      allowTestInvoke: false,
      credentialsRole: apiGatewayRole,
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
    task.addMethod('DELETE', apiIntegration, { authorizer });  // Delete task

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
    // PHASE 1: Call Records API
    // =============================================
    const callsIntegration = new apigateway.LambdaIntegration(callsHandlerFunction, {
      proxy: true,
      allowTestInvoke: false,
      credentialsRole: apiGatewayRole,
    });

    const calls = api.root.addResource('calls');
    calls.addMethod('GET', callsIntegration, { authorizer });
    calls.addMethod('POST', callsIntegration, { authorizer });

    const call = calls.addResource('{callId}');
    call.addMethod('GET', callsIntegration, { authorizer });
    call.addMethod('DELETE', callsIntegration, { authorizer });

    const callAudio = call.addResource('audio-url');
    callAudio.addMethod('GET', callsIntegration, { authorizer });

    // =============================================
    // PHASE 2: Medications API
    // =============================================
    const medicationsIntegration = new apigateway.LambdaIntegration(medicationsHandlerFunction, {
      proxy: true,
      allowTestInvoke: false,
      credentialsRole: apiGatewayRole,
    });

    const medications = api.root.addResource('medications');
    medications.addMethod('GET', medicationsIntegration, { authorizer });
    medications.addMethod('POST', medicationsIntegration, { authorizer });

    const medication = medications.addResource('{medicationId}');
    medication.addMethod('GET', medicationsIntegration, { authorizer });
    medication.addMethod('PUT', medicationsIntegration, { authorizer });
    medication.addMethod('DELETE', medicationsIntegration, { authorizer });

    const medLog = medication.addResource('log');
    medLog.addMethod('POST', medicationsIntegration, { authorizer });

    // =============================================
    // PHASE 3: Emergency Contacts + Medical ID API
    // =============================================
    const emergencyIntegration = new apigateway.LambdaIntegration(emergencyHandlerFunction, {
      proxy: true,
      allowTestInvoke: false,
      credentialsRole: apiGatewayRole,
    });

    const emergencyContacts = api.root.addResource('emergency-contacts');
    emergencyContacts.addMethod('GET', emergencyIntegration, { authorizer });
    emergencyContacts.addMethod('POST', emergencyIntegration, { authorizer });

    const emergencyContact = emergencyContacts.addResource('{contactId}');
    emergencyContact.addMethod('PUT', emergencyIntegration, { authorizer });
    emergencyContact.addMethod('DELETE', emergencyIntegration, { authorizer });

    const medicalId = api.root.addResource('medical-id');
    medicalId.addMethod('GET', emergencyIntegration, { authorizer });

    // =============================================
    // PHASE 4: Health Conditions + Allergies API
    // =============================================
    const healthIntegration = new apigateway.LambdaIntegration(healthHandlerFunction, {
      proxy: true,
      allowTestInvoke: false,
      credentialsRole: apiGatewayRole,
    });

    const healthConditions = api.root.addResource('health-conditions');
    healthConditions.addMethod('GET', healthIntegration, { authorizer });
    healthConditions.addMethod('POST', healthIntegration, { authorizer });

    const healthCondition = healthConditions.addResource('{conditionId}');
    healthCondition.addMethod('DELETE', healthIntegration, { authorizer });

    const allergies = api.root.addResource('allergies');
    allergies.addMethod('GET', healthIntegration, { authorizer });
    allergies.addMethod('POST', healthIntegration, { authorizer });

    const allergy = allergies.addResource('{allergyId}');
    allergy.addMethod('DELETE', healthIntegration, { authorizer });

    // =============================================
    // PHASE 5: Wellness Dashboard API
    // =============================================
    const wellnessIntegration = new apigateway.LambdaIntegration(wellnessHandlerFunction, {
      proxy: true,
      allowTestInvoke: false,
      credentialsRole: apiGatewayRole,
    });

    const wellness = api.root.addResource('wellness');
    wellness.addMethod('GET', wellnessIntegration, { authorizer });
    wellness.addMethod('POST', wellnessIntegration, { authorizer });

    // =============================================
    // PHASE 6: SAFETY ESCALATION ENGINE (SLA)
    // =============================================

    // 1. Escalation Worker Lambda
    const escalationHandlerFunction = new lambda.Function(this, 'EscalationHandlerFunction', {
      functionName: 'CareCircle-EscalationHandler',
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset('../backend/functions/escalation-handler'),
      handler: 'app.lambda_handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: lambdaEnvironment,
      role: lambdaRole, // Uses AI role for Connect/SNS access
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    table.grantReadWriteData(escalationHandlerFunction);

    // 2. Step Function Definition for SLA Workflow

    // Task: Check Initial Status
    const checkStatusTask = new LambdaInvoke(this, 'Check Alert Status', {
      lambdaFunction: escalationHandlerFunction,
      payload: sfn.TaskInput.fromObject({
        'action': 'CHECK_STATUS',
        'alert_id.$': '$.detail.alert_id' // From EventBridge payload
      }),
      outputPath: '$.Payload'
    });

    // Task: Escalate to Primary
    const escalatePrimaryTask = new LambdaInvoke(this, 'Escalate to Primary', {
      lambdaFunction: escalationHandlerFunction,
      payload: sfn.TaskInput.fromObject({
        'action': 'ESCALATE_PRIMARY',
        'alert_id.$': '$.alert_id'
      }),
      outputPath: '$.Payload'
    });

    // Task: Escalate Broadcast
    const escalateBroadcastTask = new LambdaInvoke(this, 'Escalate Broadcast', {
      lambdaFunction: escalationHandlerFunction,
      payload: sfn.TaskInput.fromObject({
        'action': 'ESCALATE_BROADCAST',
        'alert_id.$': '$.alert_id'
      }),
      outputPath: '$.Payload'
    });

    // Wait States
    const wait15Minutes = new sfn.Wait(this, 'Wait 15 Minutes', {
      time: sfn.WaitTime.duration(cdk.Duration.minutes(15))
    });

    const wait45Minutes = new sfn.Wait(this, 'Wait 45 Minutes', {
      time: sfn.WaitTime.duration(cdk.Duration.minutes(45))
    });

    // Workflow Logic
    const definition = wait15Minutes
      .next(checkStatusTask)
      .next(new sfn.Choice(this, 'Is Still Unassigned?')
        .when(sfn.Condition.stringEquals('$.status', 'unassigned'),
          escalatePrimaryTask
            .next(wait45Minutes)
            .next(new LambdaInvoke(this, 'Check Status Again', {
              lambdaFunction: escalationHandlerFunction,
              payload: sfn.TaskInput.fromObject({
                'action': 'CHECK_STATUS',
                'alert_id.$': '$.alert_id'
              }),
              outputPath: '$.Payload'
            })
              .next(new sfn.Choice(this, 'Still Unassigned After 1 Hour?')
                .when(sfn.Condition.stringEquals('$.status', 'unassigned'), escalateBroadcastTask)
                .otherwise(new sfn.Succeed(this, 'Resolved After Primary'))
              )
            )
        )
        .otherwise(new sfn.Succeed(this, 'Alert Auto-Resolved'))
      );

    const escalationStateMachine = new sfn.StateMachine(this, 'EscalationSLAEngine', {
      stateMachineName: 'CareCircle-Safety-SLA',
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      timeout: cdk.Duration.hours(2),
    });

    // 3. EventBridge Trigger for Urgent Alerts
    const urgentAlertRule = new events.Rule(this, 'UrgentAlertSLARule', {
      eventBus: eventBus,
      ruleName: 'CareCircle-UrgentAlertSLA',
      description: 'Trigger SLA Engine for Urgent Alerts',
      eventPattern: {
        source: ['carecircle.alerts'],
        detailType: ['Alert Created'],
        detail: {
          'urgency': ['urgent', 'high']
        }
      },
      enabled: true,
    });

    urgentAlertRule.addTarget(new targets.SfnStateMachine(escalationStateMachine));

    // =============================================
    // ALL PHASES DEPLOYED ✅
    // =============================================

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
