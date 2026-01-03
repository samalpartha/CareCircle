/**
 * CareCircle - Demo Data Seeder
 * 
 * This script populates the application with realistic demo data
 * for testing and demonstration purposes.
 * 
 * Usage:
 *   node seed-data.js
 * 
 * Requirements:
 *   - AWS credentials configured
 *   - DynamoDB table exists (CareCircle-Data-v2)
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configure AWS
AWS.config.update({ region: 'us-east-1' });
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = 'CareCircle-Data-v2';

// Demo user IDs (replace with actual Cognito user IDs after signup)
const DEMO_USERS = {
  john: 'user-john-123',  // Family member in NYC
  maria: 'user-maria-456', // Family member in LA
  sarah: 'user-sarah-789', // Family member in Chicago
  elder: 'elder-mom-001',  // Elder person
};

// Demo data templates
const DEMO_TASKS = [
  {
    title: 'Morning Medication Check',
    description: 'Ensure Mom takes her blood pressure medication with breakfast',
    elderName: 'Mary Johnson',
    priority: 'high',
    status: 'active',
    category: 'medication',
    dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    assignedTo: DEMO_USERS.john,
    createdBy: DEMO_USERS.sarah,
    zipcode: '10001',
  },
  {
    title: 'Doctor Appointment - Cardiology',
    description: 'Annual cardiology checkup at NYC Medical Center. Remember to bring insurance card and previous test results.',
    elderName: 'Mary Johnson',
    priority: 'high',
    status: 'active',
    category: 'appointment',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    assignedTo: DEMO_USERS.john,
    createdBy: DEMO_USERS.maria,
    zipcode: '10001',
  },
  {
    title: 'Grocery Shopping',
    description: 'Pick up groceries for the week. List: fresh vegetables, whole grain bread, chicken, milk, fruits, and prescribed supplements.',
    elderName: 'Mary Johnson',
    priority: 'medium',
    status: 'active',
    category: 'daily_care',
    dueDate: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
    assignedTo: DEMO_USERS.maria,
    createdBy: DEMO_USERS.john,
    zipcode: '90001',
  },
  {
    title: 'Evening Check-in Call',
    description: 'Daily video call to check on Mom\'s well-being and mood',
    elderName: 'Mary Johnson',
    priority: 'medium',
    status: 'completed',
    category: 'check_in',
    completedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    assignedTo: DEMO_USERS.sarah,
    createdBy: DEMO_USERS.john,
    zipcode: '60601',
  },
  {
    title: 'Physical Therapy Session',
    description: 'Accompany Mom to her weekly physical therapy session for knee rehabilitation',
    elderName: 'Mary Johnson',
    priority: 'high',
    status: 'active',
    category: 'health',
    dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 2 days from now
    assignedTo: DEMO_USERS.john,
    createdBy: DEMO_USERS.sarah,
    zipcode: '10001',
  },
  {
    title: 'Hydration Reminder',
    description: 'Remind Mom to drink water throughout the day (8 glasses)',
    elderName: 'Mary Johnson',
    priority: 'low',
    status: 'active',
    category: 'daily_care',
    recurring: 'daily',
    assignedTo: DEMO_USERS.maria,
    createdBy: DEMO_USERS.john,
    zipcode: '90001',
  },
];

const DEMO_ALERTS = [
  {
    type: 'medication_missed',
    severity: 'high',
    elderName: 'Mary Johnson',
    message: 'Mom missed her evening blood pressure medication',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    status: 'unresolved',
    relatedUserId: DEMO_USERS.elder,
  },
  {
    type: 'behavioral_change',
    severity: 'medium',
    elderName: 'Mary Johnson',
    message: 'Detected unusual sleep pattern - woke up 3 times last night',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
    status: 'acknowledged',
    relatedUserId: DEMO_USERS.elder,
    aiInsight: 'Pattern observed over 3 consecutive nights. Consider consulting with physician.',
  },
  {
    type: 'cognitive_concern',
    severity: 'high',
    elderName: 'Mary Johnson',
    message: 'Mom forgot the date during morning check-in call',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    status: 'unresolved',
    relatedUserId: DEMO_USERS.elder,
    aiInsight: 'Short-term memory concerns detected. Recommend cognitive assessment.',
  },
  {
    type: 'fall_risk',
    severity: 'high',
    elderName: 'Mary Johnson',
    message: 'Mom reported feeling dizzy after standing up',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    status: 'escalated',
    relatedUserId: DEMO_USERS.elder,
    aiInsight: 'Possible orthostatic hypotension. Monitor blood pressure and consult doctor.',
  },
];

const DEMO_CALL_TRANSCRIPTS = [
  {
    elderName: 'Mary Johnson',
    duration: 420, // 7 minutes
    transcript: "Hi Mom, how are you feeling today? I'm doing well, thank you dear. Did you take your morning medication? Oh yes, I took all my pills with breakfast. That's good! How's your knee feeling after the physical therapy? Much better, the exercises are really helping. Are you having any pain? Just a little stiffness in the morning, but it goes away. That's great to hear. Don't forget to drink plenty of water today. I will, thank you for reminding me.",
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    language: 'en',
    sentiment: 'positive',
    concerns: [],
    aiAnalysis: {
      overallHealth: 'good',
      cognitiveState: 'normal',
      emotionalState: 'positive',
      actionItems: [
        'Continue physical therapy exercises',
        'Monitor morning stiffness',
        'Ensure adequate hydration',
      ],
    },
  },
  {
    elderName: 'Mary Johnson',
    duration: 180, // 3 minutes
    transcript: "Hi Mom, it's Sarah. How are you today? I'm... I'm not sure what day it is. It's Tuesday, Mom. Did you have lunch? I don't remember. I think I forgot to take my medication this morning. Don't worry, let's check together. Where did you put your pill organizer?",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    language: 'en',
    sentiment: 'concerning',
    concerns: ['cognitive', 'medication'],
    aiAnalysis: {
      overallHealth: 'concerning',
      cognitiveState: 'impaired',
      emotionalState: 'confused',
      actionItems: [
        'URGENT: Check medication adherence',
        'Schedule cognitive assessment',
        'Consider medication reminder system',
        'Increase check-in frequency',
      ],
      riskLevel: 'high',
    },
  },
];

const DEMO_ANALYTICS_EVENTS = [
  // Task completion events
  { eventType: 'task_created', timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString() },
  { eventType: 'task_completed', timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() },
  { eventType: 'task_completed', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
  { eventType: 'task_created', timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
  { eventType: 'alert_triggered', timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() },
  { eventType: 'alert_triggered', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
  { eventType: 'call_completed', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
];

const DEMO_FAMILY_MEMBERS = [
  {
    userId: DEMO_USERS.john,
    name: 'John Smith',
    relationship: 'son',
    zipcode: '10001',
    city: 'New York',
    state: 'NY',
    phone: '+1-555-0101',
    email: 'john@example.com',
    skills: ['medical', 'transportation'],
    availability: 'weekdays',
    preferredLanguage: 'en',
  },
  {
    userId: DEMO_USERS.maria,
    name: 'Maria Garcia',
    relationship: 'daughter',
    zipcode: '90001',
    city: 'Los Angeles',
    state: 'CA',
    phone: '+1-555-0102',
    email: 'maria@example.com',
    skills: ['cooking', 'companionship'],
    availability: 'weekends',
    preferredLanguage: 'es',
  },
  {
    userId: DEMO_USERS.sarah,
    name: 'Sarah Johnson',
    relationship: 'daughter',
    zipcode: '60601',
    city: 'Chicago',
    state: 'IL',
    phone: '+1-555-0103',
    email: 'sarah@example.com',
    skills: ['financial', 'technology'],
    availability: 'evenings',
    preferredLanguage: 'en',
  },
];

// Seeding functions
async function seedTasks() {
  console.log('Seeding tasks...');
  for (const task of DEMO_TASKS) {
    const item = {
      PK: `TASK#${uuidv4()}`,
      SK: `TASK#${Date.now()}`,
      GSI1PK: `USER#${task.assignedTo}`,
      GSI1SK: `TASK#${task.status}#${task.priority}`,
      ...task,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    try {
      await dynamodb.put({ TableName: TABLE_NAME, Item: item }).promise();
      console.log(`✓ Created task: ${task.title}`);
    } catch (error) {
      console.error(`✗ Failed to create task: ${task.title}`, error.message);
    }
  }
}

async function seedAlerts() {
  console.log('\nSeeding alerts...');
  for (const alert of DEMO_ALERTS) {
    const item = {
      PK: `ALERT#${uuidv4()}`,
      SK: `ALERT#${Date.now()}`,
      GSI1PK: `USER#${alert.relatedUserId}`,
      GSI1SK: `ALERT#${alert.severity}#${alert.status}`,
      ...alert,
      createdAt: new Date().toISOString(),
    };
    
    try {
      await dynamodb.put({ TableName: TABLE_NAME, Item: item }).promise();
      console.log(`✓ Created alert: ${alert.type} - ${alert.severity}`);
    } catch (error) {
      console.error(`✗ Failed to create alert: ${alert.type}`, error.message);
    }
  }
}

async function seedCallTranscripts() {
  console.log('\nSeeding call transcripts...');
  for (const call of DEMO_CALL_TRANSCRIPTS) {
    const item = {
      PK: `CALL#${uuidv4()}`,
      SK: `CALL#${Date.now()}`,
      GSI1PK: `ELDER#${call.elderName}`,
      GSI1SK: `CALL#${call.timestamp}`,
      ...call,
      createdAt: new Date().toISOString(),
    };
    
    try {
      await dynamodb.put({ TableName: TABLE_NAME, Item: item }).promise();
      console.log(`✓ Created call transcript: ${call.duration}s - ${call.sentiment}`);
    } catch (error) {
      console.error(`✗ Failed to create call transcript`, error.message);
    }
  }
}

async function seedFamilyMembers() {
  console.log('\nSeeding family members...');
  for (const member of DEMO_FAMILY_MEMBERS) {
    const item = {
      PK: `USER#${member.userId}`,
      SK: 'PROFILE',
      ...member,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    try {
      await dynamodb.put({ TableName: TABLE_NAME, Item: item }).promise();
      console.log(`✓ Created family member: ${member.name} (${member.relationship})`);
    } catch (error) {
      console.error(`✗ Failed to create family member: ${member.name}`, error.message);
    }
  }
}

async function seedAnalyticsEvents() {
  console.log('\nSeeding analytics events...');
  for (const event of DEMO_ANALYTICS_EVENTS) {
    const item = {
      PK: `EVENT#${uuidv4()}`,
      SK: `EVENT#${event.timestamp}`,
      ...event,
      createdAt: new Date().toISOString(),
    };
    
    try {
      await dynamodb.put({ TableName: TABLE_NAME, Item: item }).promise();
      console.log(`✓ Created event: ${event.eventType}`);
    } catch (error) {
      console.error(`✗ Failed to create event: ${event.eventType}`, error.message);
    }
  }
}

async function clearDemoData() {
  console.log('Clearing existing demo data...\n');
  
  const prefixes = ['TASK#', 'ALERT#', 'CALL#', 'EVENT#'];
  
  for (const prefix of prefixes) {
    try {
      const result = await dynamodb.scan({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :prefix)',
        ExpressionAttributeValues: { ':prefix': prefix },
      }).promise();
      
      if (result.Items && result.Items.length > 0) {
        for (const item of result.Items) {
          await dynamodb.delete({
            TableName: TABLE_NAME,
            Key: { PK: item.PK, SK: item.SK },
          }).promise();
        }
        console.log(`Deleted ${result.Items.length} items with prefix ${prefix}`);
      }
    } catch (error) {
      console.error(`Error clearing ${prefix} items:`, error.message);
    }
  }
}

// Main execution
async function main() {
  console.log('========================================');
  console.log('CareCircle Demo Data Seeder');
  console.log('========================================\n');
  
  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear');
  
  try {
    if (shouldClear) {
      await clearDemoData();
    }
    
    await seedTasks();
    await seedAlerts();
    await seedCallTranscripts();
    await seedFamilyMembers();
    await seedAnalyticsEvents();
    
    console.log('\n========================================');
    console.log('✅ Demo data seeding complete!');
    console.log('========================================\n');
    console.log('Next steps:');
    console.log('1. Sign in to the application');
    console.log('2. Navigate to Dashboard to see demo data');
    console.log('3. Explore Tasks, Alerts, and Analytics');
    console.log('\nNote: Update DEMO_USERS constants with');
    console.log('actual Cognito user IDs for full functionality.\n');
  } catch (error) {
    console.error('\n❌ Error seeding data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { seedTasks, seedAlerts, seedCallTranscripts, seedFamilyMembers, seedAnalyticsEvents };

