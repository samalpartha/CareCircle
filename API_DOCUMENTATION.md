# 🌐 CareCircle API Documentation

**Base URL**: `https://gb1jhkkzl2.execute-api.us-east-1.amazonaws.com/prod`  
**Region**: `us-east-1`  
**Authentication**: AWS Cognito (Bearer Token)  
**Status**: ✅ **LIVE & RUNNING**

---

## 📋 **Quick Reference**

| Service | Endpoint | Method | Auth Required |
|---------|----------|--------|---------------|
| AI Analysis | `/analyze/transcript` | POST | ✅ Yes |
| Alerts | `/alerts` | GET | ✅ Yes |
| Tasks | `/tasks` | GET, POST | ✅ Yes |
| Analytics | `/analytics` | GET | ✅ Yes |
| Profile | `/profile` | GET, PUT | ✅ Yes |
| RAG Explainability | `/rag/explain` | POST | ✅ Yes |

---

## 🔐 **Authentication**

All endpoints require a Cognito JWT token in the Authorization header:

```bash
Authorization: Bearer <YOUR_COGNITO_ID_TOKEN>
```

### **How to Get Your Token** (For Testing):

1. **Sign in to the app** (localhost:3001)
2. **Open Browser Console** (F12)
3. **Run this command**:
```javascript
import { fetchAuthSession } from 'aws-amplify/auth';
const session = await fetchAuthSession();
console.log(session.tokens.idToken.toString());
```
4. **Copy the token** and use it in your API calls

---

## 🤖 **AI Analysis Endpoint**

### **POST `/analyze/transcript`**

Analyzes call transcripts using Amazon Bedrock Claude, Comprehend, and Comprehend Medical.

**Request:**
```json
{
  "transcript": "I feel dizzy and forgot to take my Metformin this morning.",
  "duration": 45,
  "language": "en"
}
```

**Response:**
```json
{
  "summary": "Memory confusion and medication adherence concerns detected",
  "sentiment": {
    "sentiment": "MIXED",
    "positive": 0.2,
    "negative": 0.3,
    "neutral": 0.3,
    "mixed": 0.2
  },
  "key_phrases": [
    "feel dizzy",
    "forgot medication",
    "Metformin"
  ],
  "medical_entities": [
    {
      "text": "dizzy",
      "category": "SYMPTOM",
      "score": 0.98
    },
    {
      "text": "Metformin",
      "category": "MEDICATION",
      "score": 0.99
    }
  ],
  "cognitive_assessment": {
    "memory_concerns": [
      "Temporal disorientation",
      "Medication recall issues"
    ],
    "risk_level": "moderate",
    "recommended_actions": [
      "Set up medication reminders",
      "Schedule follow-up call"
    ]
  },
  "alerts": [
    {
      "type": "medicationConcern",
      "severity": "high",
      "message": "Possible missed medication dose detected"
    }
  ],
  "timestamp": "2025-12-27T21:19:00Z"
}
```

**cURL Example:**
```bash
curl -X POST \
  "https://gb1jhkkzl2.execute-api.us-east-1.amazonaws.com/prod/analyze/transcript" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "I feel dizzy and forgot my medication",
    "duration": 30,
    "language": "en"
  }'
```

---

## 🔔 **Alerts Endpoints**

### **GET `/alerts`**

Retrieves all alerts for the authenticated user.

**Response:**
```json
[
  {
    "PK": "USER#user123",
    "SK": "ALERT#2025-12-27T20:00:00Z",
    "alert_id": "alert-001",
    "type": "medicationConcern",
    "severity": "high",
    "message": "Missed medication dose detected",
    "timestamp": "2025-12-27T20:00:00Z",
    "status": "active"
  }
]
```

**cURL Example:**
```bash
curl -X GET \
  "https://gb1jhkkzl2.execute-api.us-east-1.amazonaws.com/prod/alerts" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📝 **Tasks Endpoints**

### **GET `/tasks`**

Retrieves all tasks for the authenticated user.

**Response:**
```json
[
  {
    "PK": "USER#user123",
    "SK": "TASK#task-001",
    "task_id": "task-001",
    "title": "Call Mom about medication",
    "description": "Follow up on missed Metformin dose",
    "priority": "high",
    "status": "pending",
    "assigned_to": "user123",
    "created_at": "2025-12-27T20:00:00Z"
  }
]
```

### **POST `/tasks`**

Creates a new task.

**Request:**
```json
{
  "title": "Call Mom about medication",
  "description": "Follow up on missed Metformin dose",
  "priority": "high",
  "elderName": "Mom"
}
```

**Response:**
```json
{
  "task_id": "task-001",
  "message": "Task created successfully",
  "task": {
    "task_id": "task-001",
    "title": "Call Mom about medication",
    "status": "pending",
    "created_at": "2025-12-27T20:00:00Z"
  }
}
```

**cURL Example:**
```bash
curl -X POST \
  "https://gb1jhkkzl2.execute-api.us-east-1.amazonaws.com/prod/tasks" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Call Mom",
    "description": "Check on medication",
    "priority": "high",
    "elderName": "Mom"
  }'
```

---

## 📊 **Analytics Endpoint**

### **GET `/analytics`**

Retrieves analytics data for the authenticated user.

**Query Parameters:**
- `timeRange`: `week` | `month` | `year` (default: `month`)

**Response:**
```json
{
  "timeRange": "month",
  "summary": {
    "totalTasks": 42,
    "completedTasks": 35,
    "activeTasks": 7,
    "totalAlerts": 8,
    "criticalAlerts": 2
  },
  "trends": {
    "taskCompletion": [
      { "date": "2025-12-01", "completed": 5, "created": 6 },
      { "date": "2025-12-02", "completed": 3, "created": 4 }
    ],
    "alertFrequency": [
      { "date": "2025-12-01", "count": 2, "severity": "high" }
    ]
  },
  "insights": [
    "Task completion rate improved 15% this week",
    "Medication alerts decreased by 20%"
  ]
}
```

**cURL Example:**
```bash
curl -X GET \
  "https://gb1jhkkzl2.execute-api.us-east-1.amazonaws.com/prod/analytics?timeRange=week" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 👤 **Profile Endpoints**

### **GET `/profile`**

Retrieves user profile.

**Response:**
```json
{
  "user_id": "user123",
  "email": "user@example.com",
  "name": "John Doe",
  "language": "en",
  "zipcode": "12345",
  "skills": ["Medical", "Transportation"],
  "availability": "weekends",
  "notification_preferences": {
    "email": true,
    "sms": false
  }
}
```

### **PUT `/profile`**

Updates user profile.

**Request:**
```json
{
  "name": "John Doe",
  "language": "es",
  "zipcode": "12345",
  "skills": ["Medical", "Transportation"],
  "availability": "weekdays"
}
```

---

## 🧠 **RAG Explainability Endpoint**

### **POST `/rag/explain`**

Gets AI-powered explanations with citations using RAG (Retrieval-Augmented Generation).

**Request:**
```json
{
  "alert_id": "alert-001",
  "alert_type": "memoryIssue",
  "transcript": "I forgot what day it is...",
  "context": {
    "user_age": 75,
    "medical_history": ["dementia risk"]
  }
}
```

**Response:**
```json
{
  "explanation": "Memory confusion detected based on temporal disorientation...",
  "confidence": 0.87,
  "sources": [
    {
      "title": "Memory Assessment Guidelines",
      "excerpt": "Temporal disorientation is an early indicator...",
      "source": "s3://care-knowledge/guidelines/memory-assessment.pdf",
      "relevance": 0.92
    }
  ],
  "recommendations": [
    "Schedule cognitive assessment",
    "Increase check-in frequency"
  ]
}
```

---

## 🔧 **Testing the API**

### **Method 1: Using Browser Console** (Easiest)

1. **Open your app** (localhost:3001)
2. **Open Console** (F12)
3. **Run:**

```javascript
// Test AI Analysis
const response = await fetch('https://gb1jhkkzl2.execute-api.us-east-1.amazonaws.com/prod/analyze/transcript', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + (await fetchAuthSession()).tokens.idToken.toString()
  },
  body: JSON.stringify({
    transcript: "I feel dizzy and forgot my medication",
    duration: 30,
    language: "en"
  })
});
console.log(await response.json());
```

### **Method 2: Using Postman/Insomnia**

1. **Create a new request**
2. **Set URL**: `https://gb1jhkkzl2.execute-api.us-east-1.amazonaws.com/prod/analyze/transcript`
3. **Set Method**: POST
4. **Add Header**: `Authorization: Bearer <YOUR_TOKEN>`
5. **Add Body** (JSON):
```json
{
  "transcript": "Test transcript",
  "duration": 30,
  "language": "en"
}
```

### **Method 3: Using cURL**

First, get your token from the browser console, then:

```bash
TOKEN="your_token_here"

curl -X POST \
  "https://gb1jhkkzl2.execute-api.us-east-1.amazonaws.com/prod/analyze/transcript" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "I feel dizzy and forgot my medication",
    "duration": 30,
    "language": "en"
  }'
```

---

## 🚨 **Common Errors**

### **403 Forbidden / Missing Authentication Token**
```json
{"message": "Missing Authentication Token"}
```
**Cause**: No Authorization header or invalid token  
**Solution**: Add valid Bearer token from Cognito

### **401 Unauthorized**
```json
{"message": "Unauthorized"}
```
**Cause**: Token expired (1 hour lifetime)  
**Solution**: Sign out and back in to get new token

### **500 Internal Server Error**
```json
{"error": "Internal server error"}
```
**Cause**: Lambda function error  
**Solution**: Check CloudWatch logs:
```bash
aws logs tail /aws/lambda/CareCircleStack2-AIAnalysisFunction --follow
```

---

## 📊 **Monitoring & Logs**

### **View Lambda Logs:**
```bash
# AI Analysis logs
aws logs tail /aws/lambda/CareCircleStack2-AIAnalysisFunction --follow

# API Handler logs
aws logs tail /aws/lambda/CareCircleStack2-APIHandlerFunction --follow
```

### **View API Gateway Metrics:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --dimensions Name=ApiName,Value=CareCircleAPI \
  --start-time 2025-12-27T00:00:00Z \
  --end-time 2025-12-27T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

---

## 🎯 **Quick Health Check**

Test if your backend is healthy:

```bash
# Get your token first from browser console:
# (await fetchAuthSession()).tokens.idToken.toString()

TOKEN="paste_your_token_here"

# Test Alerts endpoint (simplest)
curl -X GET \
  "https://gb1jhkkzl2.execute-api.us-east-1.amazonaws.com/prod/alerts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# If you get a 200 response → Backend is working! ✅
# If you get 403 → Token is invalid, sign in again
# If you get timeout → Lambda is cold starting, try again
```

---

## 🔗 **Useful Links**

- **API Gateway Console**: https://console.aws.amazon.com/apigateway/home?region=us-east-1
- **Lambda Console**: https://console.aws.amazon.com/lambda/home?region=us-east-1
- **CloudWatch Logs**: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups
- **DynamoDB Table**: https://console.aws.amazon.com/dynamodbv2/home?region=us-east-1#table?name=CareCircle-Data-v2
- **Cognito User Pool**: https://console.aws.amazon.com/cognito/v2/idp/user-pools/us-east-1_xQd1jw9nV/users?region=us-east-1

---

## 🚀 **Next Steps**

1. **Get your auth token** (see Authentication section)
2. **Test with cURL or Postman** to verify backend works
3. **Check browser console** when using the app
4. **View CloudWatch logs** if you see errors

---

*Last Updated: December 27, 2025, 4:19 PM*  
*Backend Status: ✅ LIVE*  
*API Version: v2*  





