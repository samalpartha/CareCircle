# CareCircle Architecture Documentation

## System Overview

CareCircle is a serverless, event-driven application built entirely on AWS services. It leverages AI/ML capabilities to provide intelligent family care coordination.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │   React SPA (AWS Amplify Hosting)                        │  │
│  │   - Dashboard, Tasks, Analytics, Call Interface          │  │
│  │   - Multilingual UI (6 languages)                        │  │
│  │   - Real-time updates via WebSocket                      │  │
│  └───────────────────┬──────────────────────────────────────┘  │
│                      │                                          │
└──────────────────────┼──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Authentication Layer                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │   Amazon Cognito                                          │  │
│  │   - User authentication & authorization                   │  │
│  │   - Custom attributes (language, ZIP code)               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway Layer                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │   Amazon API Gateway (REST API)                          │  │
│  │   - /alerts, /tasks, /analytics, /profile               │  │
│  │   - Cognito authorizer                                   │  │
│  │   - CORS enabled, rate limiting                          │  │
│  └───────────────┬──────────────────────────────────────────┘  │
└─────────────────┼────────────────────────────────────────────────┘
                  │
      ┌───────────┼───────────┐
      ▼           ▼           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Lambda:    │  │   Lambda:    │  │   Lambda:    │         │
│  │ AI Analysis  │  │  Task Assign │  │ API Handlers │         │
│  │              │  │              │  │              │         │
│  │ - Transcribe │  │ - Multi-agent│  │ - CRUD ops   │         │
│  │ - Comprehend │  │ - Bedrock LLM│  │ - Query data │         │
│  │ - Translate  │  │ - Scoring    │  │ - Analytics  │         │
│  │ - Bedrock    │  │ - Assignment │  │              │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                 │                  │
│         └─────────┬───────┴─────────────────┘                  │
└───────────────────┼────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Event Bus Layer                            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │   Amazon EventBridge                                      │  │
│  │   - Alert events routing                                  │  │
│  │   - Decoupled event processing                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Data Layer                                │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │   Amazon DynamoDB                                         │  │
│  │   - Single Table Design                                   │  │
│  │   - Global Secondary Index (GSI1)                        │  │
│  │   - Encrypted at rest                                    │  │
│  │                                                          │  │
│  │   Entities:                                              │  │
│  │   - Users, Family Members, Tasks, Alerts, Profiles      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Notification Layer                           │
│                                                                 │
│  ┌─────────────────┐  ┌──────────────────┐                    │
│  │  Amazon SNS     │  │  Amazon SES      │                    │
│  │  - SMS alerts   │  │  - Email alerts  │                    │
│  └─────────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘

```

## Components Deep Dive

### Frontend (React + Amplify)

**Technology Stack:**
- React 18 with functional components and hooks
- AWS Amplify for hosting and backend integration
- React Router for navigation
- i18next for internationalization
- Recharts for analytics visualizations

**Key Features:**
- Responsive design (mobile-first)
- Real-time task updates
- Offline-capable with DataStore
- Accessibility compliant (WCAG 2.1)

**Pages:**
1. **Dashboard**: Overview of alerts and active tasks
2. **Tasks**: Full task management interface
3. **Analytics**: Care insights and trends
4. **Profile**: User settings and preferences
5. **Call Interface**: Voice call with AI monitoring

### Backend (Lambda Functions)

#### 1. AI Analysis Function (`ai-analysis/app.py`)

**Purpose**: Analyze call transcripts for behavioral and cognitive concerns

**Process Flow:**
```
1. Receive transcript text
2. Detect language (Comprehend)
3. Analyze sentiment (Comprehend)
4. Extract key phrases (Comprehend)
5. Deep analysis with Bedrock (Claude 3 Haiku)
6. Generate structured insights
7. Publish alert events if concerns detected
```

**AWS Services Used:**
- Amazon Comprehend: NLP and sentiment analysis
- Amazon Translate: Cross-language support
- Amazon Bedrock: LLM reasoning (Claude 3 Haiku)
- Amazon EventBridge: Event publishing

**Key Algorithms:**
- Language detection with confidence scoring
- Multi-dimensional sentiment analysis
- Cognitive pattern recognition via LLM
- Alert threshold determination

#### 2. Task Assignment Function (`task-assignment/app.py`)

**Purpose**: Intelligently assign care tasks using multi-agent system

**Multi-Agent Architecture:**

```
┌─────────────────────────────────────────────┐
│        Task Assignment Orchestrator          │
└───────────────┬─────────────────────────────┘
                │
        ┌───────┴────────┬────────┬────────┐
        ▼                ▼        ▼        ▼
┌─────────────┐  ┌─────────┐  ┌────────┐  ┌──────────┐
│ Proximity   │  │ Skill   │  │ Avail. │  │ Workload │
│   Agent     │  │ Agent   │  │ Agent  │  │  Agent   │
│             │  │         │  │        │  │          │
│ Scores by   │  │ Matches │  │ Checks │  │ Balances │
│ ZIP code    │  │ skills  │  │ time   │  │ tasks    │
└─────┬───────┘  └────┬────┘  └───┬────┘  └────┬─────┘
      │               │           │           │
      └───────────────┴───────────┴───────────┘
                      │
              ┌───────▼────────┐
              │ Composite Score│
              │    Calculation │
              └───────┬────────┘
                      │
              ┌───────▼────────┐
              │  Bedrock LLM   │
              │  Recommender   │
              └───────┬────────┘
                      │
              ┌───────▼────────┐
              │ Final Decision │
              │ & Notification │
              └────────────────┘
```

**Scoring System:**
- **Proximity Score** (30% weight): Distance-based scoring
- **Skill Match Score** (30% weight): Expertise alignment
- **Availability Score** (20% weight): Time availability
- **Workload Score** (20% weight): Current task load

**AWS Services Used:**
- Amazon Bedrock: LLM for final recommendation
- Amazon DynamoDB: Read family member data
- Amazon SNS: Send notifications
- Amazon EventBridge: Triggered by alert events

#### 3. API Handlers Function (`api-handlers/app.py`)

**Purpose**: CRUD operations for frontend

**Endpoints:**
- `GET /alerts`: Retrieve family alerts
- `GET /tasks`: List tasks with filters
- `PUT /tasks/{id}/accept`: Accept task assignment
- `PUT /tasks/{id}/complete`: Mark task complete
- `GET /analytics`: Get care metrics
- `GET /users/{id}/profile`: User profile
- `PUT /users/profile`: Update profile

**Data Access Patterns:**
- Query by family ID (partition key)
- Query by assigned member (GSI1)
- Time-series queries for analytics
- Filtering by status, priority, date range

#### 4. Notification Handler (`notification-handler/app.py`)

**Purpose**: Multi-channel notification delivery

**Channels:**
- SMS via Amazon SNS
- Email via Amazon SES
- Push notifications (future: SNS Mobile Push)

**Personalization:**
- Respects user preferences (opt-in/opt-out)
- Sends in user's preferred language
- Customizes message based on urgency

#### 5. Transcribe Handler (`transcribe-handler/app.py`)

**Purpose**: Manage audio transcription sessions

**Capabilities:**
- Real-time streaming transcription
- Asynchronous file transcription
- Multi-language support
- Speaker diarization

### Data Model (DynamoDB)

**Single Table Design:**

```
Primary Key Structure:
- PK (Partition Key): Entity type + ID
- SK (Sort Key): Sub-entity or metadata

GSI1 (Global Secondary Index):
- GSI1PK: Alternate access pattern
- GSI1SK: Alternate sort

Example Records:

1. User Profile:
   PK: USER#user-123
   SK: PROFILE
   Attributes: name, email, language, zipcode, skills, etc.

2. Family:
   PK: FAMILY#family-456
   SK: METADATA
   Attributes: family_name, elder_info, etc.

3. Family Member:
   PK: FAMILY#family-456
   SK: MEMBER#user-123
   GSI1PK: MEMBER#user-123
   GSI1SK: FAMILY#family-456
   Attributes: role, relationship, etc.

4. Task:
   PK: FAMILY#family-456
   SK: TASK#task-789
   GSI1PK: MEMBER#user-123 (assigned member)
   GSI1SK: TASK#task-789
   Attributes: title, description, status, priority, etc.

5. Alert:
   PK: FAMILY#family-456
   SK: ALERT#alert-101
   Attributes: type, severity, timestamp, message, etc.
```

**Access Patterns:**
1. Get user profile: Query by `PK = USER#id`
2. Get family tasks: Query by `PK = FAMILY#id AND SK begins_with TASK#`
3. Get member tasks: Query GSI1 by `GSI1PK = MEMBER#id`
4. Get recent alerts: Query by `PK = FAMILY#id AND SK begins_with ALERT#` (reverse order)

### AI/ML Services Integration

#### Amazon Transcribe
- **Use Case**: Convert speech to text from voice calls
- **Configuration**: 
  - Sample rate: 16kHz
  - Language: Auto-detect or specified
  - Speaker labels: Enabled (distinguish elder vs family)
- **Free Tier**: 60 minutes/month

#### Amazon Comprehend
- **Use Case**: NLP analysis (sentiment, entities, key phrases)
- **Languages Supported**: English, Spanish, French, German, Italian, Portuguese, Arabic, Hindi, Japanese, Korean, Chinese
- **Free Tier**: 50,000 units/month

#### Amazon Translate
- **Use Case**: Translate transcripts and UI content
- **Languages**: All 6 supported languages (en, es, hi, ar, zh, pt)
- **Free Tier**: 2M characters/month

#### Amazon Bedrock (Claude 3 Haiku)
- **Use Case**: Deep cognitive analysis and task assignment reasoning
- **Model**: `anthropic.claude-3-haiku-20240307-v1:0`
- **Why Haiku**: Fast, cost-effective, sufficient for our use case
- **Prompts**:
  - Cognitive assessment prompt (behavioral analysis)
  - Task assignment recommendation prompt
- **Cost**: ~$0.25 per 1M input tokens, ~$1.25 per 1M output tokens

### Event-Driven Architecture

**EventBridge Events:**

```javascript
// Alert Created Event
{
  "Source": "carecircle.alerts",
  "DetailType": "Alert Created",
  "Detail": {
    "alert_type": "memoryIssue",
    "urgency": "high",
    "concerns": ["Memory confusion", "Medication uncertainty"],
    "summary": "Mom seemed confused about medication",
    "recommended_actions": ["Verify pill schedule"],
    "user_id": "user-123",
    "family_id": "family-456"
  }
}
```

**Event Flow:**
1. AI Analysis detects concern → Publishes Alert Event
2. EventBridge routes to Task Assignment Lambda
3. Task Assignment creates task and assigns member
4. Notification sent to assigned member
5. Dashboard updates in real-time

### Security Architecture

**Authentication & Authorization:**
- Amazon Cognito for user authentication
- JWT tokens for API authorization
- API Gateway Cognito authorizer validates tokens
- Fine-grained IAM roles for Lambda functions

**Data Security:**
- DynamoDB encryption at rest (AWS managed keys)
- HTTPS/TLS for data in transit
- Secrets Manager for sensitive configuration (if needed)
- VPC endpoints (optional, for enhanced security)

**Access Control:**
- Family-level data isolation (partition keys)
- User can only access their family's data
- Lambda execution roles follow least privilege

**Privacy Considerations:**
- Call transcripts stored temporarily
- Option to delete transcripts after analysis
- HIPAA compliance considerations (BAA required for production)

## Scalability & Performance

**Horizontal Scaling:**
- Lambda: Auto-scales to thousands of concurrent executions
- DynamoDB: On-demand capacity (auto-scaling)
- API Gateway: Handles 10,000 requests/second default
- Amplify Hosting: CloudFront CDN for global distribution

**Performance Optimizations:**
- DynamoDB single-digit millisecond latency
- Lambda warm start optimization (keep functions warm)
- CloudFront edge caching for static assets
- Efficient DynamoDB access patterns (avoid scans)

**Estimated Capacity:**
- Support 10,000 families
- 100,000 active users
- 1M tasks per month
- 500K call analyses per month

**All within Free Tier limits for initial deployment!**

## Monitoring & Observability

**CloudWatch Metrics:**
- Lambda invocations, duration, errors
- API Gateway requests, latency, 4xx/5xx errors
- DynamoDB read/write capacity consumption

**CloudWatch Logs:**
- Structured logging with AWS Lambda Powertools
- Log groups per Lambda function
- Retention: 7 days (configurable)

**Tracing:**
- AWS X-Ray integration (optional)
- Distributed tracing across services
- Performance bottleneck identification

**Alarms:**
- Lambda errors > 5%
- API Gateway 5xx errors > 1%
- DynamoDB throttling events
- Cost threshold alerts

## Cost Estimation

### Within Free Tier (First 12 months):
- **Total**: ~$0/month for moderate usage

### After Free Tier (estimated for 1,000 families):
- **Lambda**: ~$5/month
- **DynamoDB**: ~$5/month (on-demand)
- **API Gateway**: ~$3/month
- **Cognito**: Free (under 50k MAU)
- **Transcribe**: ~$10/month (100 hours)
- **Bedrock**: ~$20/month (varies by usage)
- **Total**: ~$43/month

**Cost per family: ~$0.043/month** 🎉

## Disaster Recovery & Business Continuity

**Backup Strategy:**
- DynamoDB Point-in-Time Recovery (PITR) enabled
- DynamoDB table set to RETAIN on stack deletion
- Cognito User Pool retained
- Lambda function code in version control

**Recovery Time Objective (RTO):** < 1 hour
**Recovery Point Objective (RPO):** < 5 minutes

**Multi-Region Deployment:**
- Can be deployed to multiple regions
- DynamoDB Global Tables for replication
- Route53 health checks for failover

## Future Enhancements

1. **Video Call Integration**: Amazon Chime SDK for video
2. **Voice Interface**: Amazon Lex chatbot for elders
3. **Wearable Integration**: IoT Core for health devices
4. **Predictive Analytics**: SageMaker ML models
5. **Care Marketplace**: Connect with professional caregivers
6. **Mobile Apps**: React Native iOS/Android apps

---

**Last Updated:** December 2025
**Architecture Version:** 1.0.0

