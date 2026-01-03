/**
 * Property-Based Tests for Timeline and Outcome Management
 * Feature: care-operations-console
 * 
 * Property 9: Timeline Immutability - Requirements 1.7, 5.4, 10.6
 * Property 10: Follow-up Task Automation - Requirements 5.3, 6.6
 */

import {
  TimelineManager,
  getTimelineManager,
  resetTimelineManager,
  createTimelineEntry,
  createTaskCompletedEntry,
  createAlertEntry,
  createEscalationEntry,
  createOutcome,
  processOutcome,
  validateTimelineEntry,
  validateOutcome,
  OUTCOME_TEMPLATES,
  TimelineEventType
} from '../timeline-manager';

import { Task, Outcome, TimelineEntry } from '../../types/care-operations';

// =============================================
// Test Helpers
// =============================================

const generateRandomId = (): string => 
  `TEST#${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

const generateRandomTask = (): Task => ({
  id: generateRandomId(),
  title: 'Test Task',
  description: 'Test description',
  priority: 'medium',
  dueAt: new Date().toISOString(),
  estimatedMinutes: 30,
  checklist: [],
  status: 'completed',
  elderName: 'Test Elder',
  createdBy: 'System',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

const generateRandomOutcome = (taskId: string): Outcome => ({
  id: generateRandomId(),
  taskId,
  result: ['success', 'partial', 'failed'][Math.floor(Math.random() * 3)] as Outcome['result'],
  notes: 'Test outcome notes',
  evidenceUrls: [],
  recordedAt: new Date().toISOString(),
  recordedBy: generateRandomId(),
  followUpTasks: []
});

// =============================================
// Property 9: Timeline Immutability
// =============================================

describe('Property 9: Timeline Immutability', () => {
  beforeEach(() => {
    resetTimelineManager();
  });

  /**
   * Property 9.1: Timeline entries are created as immutable
   */
  test('Property 9.1: Timeline entries are marked immutable on creation', () => {
    for (let i = 0; i < 50; i++) {
      const entry = createTimelineEntry(
        generateRandomId(),
        generateRandomId(),
        'task_completed',
        'Test Entry',
        'Test description',
        generateRandomId(),
        'Test Caregiver'
      );
      
      expect(entry.immutable).toBe(true);
    }
  });

  /**
   * Property 9.2: Timeline entries cannot be modified after creation
   */
  test('Property 9.2: Timeline manager prevents duplicate entries', () => {
    const manager = getTimelineManager();
    
    const entry = createTimelineEntry(
      generateRandomId(),
      generateRandomId(),
      'task_completed',
      'Test Entry',
      'Test description',
      generateRandomId(),
      'Test Caregiver'
    );
    
    // First add should succeed
    manager.addEntry(entry);
    
    // Second add with same ID should throw
    expect(() => manager.addEntry(entry)).toThrow('already exists');
  });

  /**
   * Property 9.3: Retrieved entries maintain immutability flag
   */
  test('Property 9.3: Retrieved entries are immutable', () => {
    const manager = getTimelineManager();
    
    for (let i = 0; i < 20; i++) {
      const entry = createTimelineEntry(
        generateRandomId(),
        generateRandomId(),
        'task_completed',
        'Test Entry',
        'Test description',
        generateRandomId(),
        'Test Caregiver'
      );
      
      manager.addEntry(entry);
      
      const retrieved = manager.getEntry(entry.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.immutable).toBe(true);
    }
  });

  /**
   * Property 9.4: Immutability verification works
   */
  test('Property 9.4: Immutability can be verified', () => {
    const manager = getTimelineManager();
    
    const entry = createTimelineEntry(
      generateRandomId(),
      generateRandomId(),
      'alert_created',
      'Test Alert',
      'Test description',
      generateRandomId(),
      'Test Caregiver'
    );
    
    manager.addEntry(entry);
    
    expect(manager.verifyImmutability(entry.id)).toBe(true);
    expect(manager.verifyImmutability('nonexistent')).toBe(false);
  });

  /**
   * Property 9.5: All event types create immutable entries
   */
  test('Property 9.5: All event types are immutable', () => {
    const eventTypes: TimelineEventType[] = [
      'alert_created',
      'task_completed',
      'task_assigned',
      'triage_performed',
      'medication_taken',
      'medication_missed',
      'escalation_triggered',
      'outcome_captured',
      'call_completed',
      'wellness_checkin',
      'emergency_response',
      'note_added'
    ];
    
    eventTypes.forEach(eventType => {
      const entry = createTimelineEntry(
        generateRandomId(),
        generateRandomId(),
        eventType,
        `Test ${eventType}`,
        'Test description',
        generateRandomId(),
        'Test Caregiver'
      );
      
      expect(entry.immutable).toBe(true);
      expect(entry.eventType).toBe(eventType);
    });
  });
});

// =============================================
// Property 10: Follow-up Task Automation
// =============================================

describe('Property 10: Follow-up Task Automation', () => {
  
  /**
   * Property 10.1: Failed outcomes generate follow-up tasks
   */
  test('Property 10.1: Failed outcomes trigger follow-up tasks', () => {
    const template = OUTCOME_TEMPLATES.medication_verification;
    
    const outcome: Outcome = {
      id: generateRandomId(),
      taskId: generateRandomId(),
      result: 'failed',
      notes: 'Some medications missed',
      evidenceUrls: [],
      recordedAt: new Date().toISOString(),
      recordedBy: generateRandomId(),
      followUpTasks: []
    };
    
    const followUps = processOutcome(outcome, template, 'elder123', 'Test Elder');
    
    expect(followUps.length).toBeGreaterThan(0);
    followUps.forEach(task => {
      expect(task.title).toBeTruthy();
      expect(task.dueInHours).toBeGreaterThan(0);
      expect(task.priority).toBeTruthy();
    });
  });

  /**
   * Property 10.2: Partial outcomes may generate follow-up tasks
   */
  test('Property 10.2: Partial outcomes can trigger follow-ups', () => {
    const template = OUTCOME_TEMPLATES.safety_check;
    
    const outcome: Outcome = {
      id: generateRandomId(),
      taskId: generateRandomId(),
      result: 'partial',
      notes: 'Fall hazards identified in bathroom',
      evidenceUrls: [],
      recordedAt: new Date().toISOString(),
      recordedBy: generateRandomId(),
      followUpTasks: []
    };
    
    const followUps = processOutcome(outcome, template, 'elder123', 'Test Elder');
    
    // Partial results should generate follow-ups
    expect(followUps.length).toBeGreaterThan(0);
  });

  /**
   * Property 10.3: Follow-up tasks have correct structure
   */
  test('Property 10.3: Follow-up tasks have required fields', () => {
    Object.values(OUTCOME_TEMPLATES).forEach(template => {
      template.followUpRules.forEach(rule => {
        const task = rule.followUpTaskTemplate;
        
        expect(task.title).toBeTruthy();
        expect(task.description).toBeTruthy();
        expect(['urgent', 'high', 'medium', 'low']).toContain(task.priority);
        expect(task.estimatedMinutes).toBeGreaterThan(0);
        expect(task.dueInHours).toBeGreaterThan(0);
        expect(Array.isArray(task.checklist)).toBe(true);
      });
    });
  });

  /**
   * Property 10.4: Outcome templates exist for all common scenarios
   */
  test('Property 10.4: Outcome templates cover common scenarios', () => {
    const requiredTemplates = [
      'medication_verification',
      'safety_check',
      'medical_appointment',
      'wellness_checkin',
      'triage_outcome'
    ];
    
    requiredTemplates.forEach(templateId => {
      const template = OUTCOME_TEMPLATES[templateId];
      expect(template).toBeDefined();
      expect(template.title).toBeTruthy();
      expect(template.outcomeOptions.length).toBeGreaterThan(0);
      expect(Array.isArray(template.evidenceTypes)).toBe(true);
    });
  });

  /**
   * Property 10.5: Follow-up due times are appropriate
   */
  test('Property 10.5: Follow-up due times reflect urgency', () => {
    // Triage follow-ups should be urgent (short due time)
    const triageTemplate = OUTCOME_TEMPLATES.triage_outcome;
    const urgentRule = triageTemplate.followUpRules.find(
      r => r.outcomeCondition === 'Emergency services called'
    );
    expect(urgentRule?.dueInHours).toBeLessThanOrEqual(4);
    
    // Wellness follow-ups can be less urgent
    const wellnessTemplate = OUTCOME_TEMPLATES.wellness_checkin;
    const socialRule = wellnessTemplate.followUpRules.find(
      r => r.outcomeCondition === 'Needs social interaction'
    );
    expect(socialRule?.dueInHours).toBeGreaterThanOrEqual(24);
  });
});

// =============================================
// Timeline Entry Creation Tests
// =============================================

describe('Timeline Entry Creation Tests', () => {
  
  /**
   * Property: Task completed entries contain task info
   */
  test('Task completed entries contain full task information', () => {
    for (let i = 0; i < 20; i++) {
      const task = generateRandomTask();
      const outcome = generateRandomOutcome(task.id);
      
      const entry = createTaskCompletedEntry(
        generateRandomId(),
        generateRandomId(),
        task,
        outcome,
        generateRandomId(),
        'Test Caregiver'
      );
      
      expect(entry.eventType).toBe('task_completed');
      expect(entry.title).toContain('Task Completed');
      expect(entry.details.taskId).toBe(task.id);
      expect(entry.details.outcomeResult).toBe(outcome.result);
      expect(entry.relatedItems).toContain(task.id);
      expect(entry.immutable).toBe(true);
    }
  });

  /**
   * Property: Alert entries contain alert info
   */
  test('Alert entries contain full alert information', () => {
    const severities = ['urgent', 'high', 'medium', 'low'];
    const types = ['fall', 'medication', 'cognitive', 'emotional'];
    
    for (let i = 0; i < 20; i++) {
      const alertId = generateRandomId();
      const alertType = types[Math.floor(Math.random() * types.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      
      const entry = createAlertEntry(
        generateRandomId(),
        generateRandomId(),
        alertId,
        alertType,
        severity,
        'Test summary',
        generateRandomId(),
        'Test Caregiver'
      );
      
      expect(entry.eventType).toBe('alert_created');
      expect(entry.details.alertId).toBe(alertId);
      expect(entry.details.alertType).toBe(alertType);
      expect(entry.details.alertSeverity).toBe(severity);
      expect(entry.description).toContain(severity.toUpperCase());
      expect(entry.immutable).toBe(true);
    }
  });

  /**
   * Property: Escalation entries contain context
   */
  test('Escalation entries contain full context', () => {
    for (let i = 0; i < 20; i++) {
      const taskId = generateRandomId();
      const taskTitle = 'Test Task';
      const fromAssignee = 'Person A';
      const toAssignee = 'Person B';
      const reason = 'Task overdue';
      
      const entry = createEscalationEntry(
        generateRandomId(),
        generateRandomId(),
        taskId,
        taskTitle,
        fromAssignee,
        toAssignee,
        reason,
        generateRandomId(),
        'System'
      );
      
      expect(entry.eventType).toBe('escalation_triggered');
      expect(entry.details.taskId).toBe(taskId);
      expect(entry.details.fromAssignee).toBe(fromAssignee);
      expect(entry.details.toAssignee).toBe(toAssignee);
      expect(entry.description).toContain(fromAssignee);
      expect(entry.description).toContain(toAssignee);
      expect(entry.immutable).toBe(true);
    }
  });
});

// =============================================
// Timeline Manager Operations Tests
// =============================================

describe('Timeline Manager Operations Tests', () => {
  beforeEach(() => {
    resetTimelineManager();
  });

  /**
   * Property: Entries can be queried by elder
   */
  test('Entries can be filtered by elder', () => {
    const manager = getTimelineManager();
    const elderId = generateRandomId();
    const otherElderId = generateRandomId();
    
    // Add entries for specific elder
    for (let i = 0; i < 5; i++) {
      manager.addEntry(createTimelineEntry(
        generateRandomId(),
        elderId,
        'task_completed',
        'Test',
        'Test',
        generateRandomId(),
        'Caregiver'
      ));
    }
    
    // Add entries for other elder
    for (let i = 0; i < 3; i++) {
      manager.addEntry(createTimelineEntry(
        generateRandomId(),
        otherElderId,
        'task_completed',
        'Test',
        'Test',
        generateRandomId(),
        'Caregiver'
      ));
    }
    
    const elderEntries = manager.getEntriesForElder(elderId);
    expect(elderEntries.length).toBe(5);
    elderEntries.forEach(entry => {
      expect(entry.elderId).toBe(elderId);
    });
  });

  /**
   * Property: Entries are sorted chronologically
   */
  test('Entries are sorted by timestamp (newest first)', () => {
    const manager = getTimelineManager();
    const elderId = generateRandomId();
    
    // Add entries with different timestamps
    for (let i = 0; i < 10; i++) {
      const entry = createTimelineEntry(
        generateRandomId(),
        elderId,
        'task_completed',
        'Test',
        'Test',
        generateRandomId(),
        'Caregiver'
      );
      manager.addEntry(entry);
      // Small delay to ensure different timestamps
    }
    
    const entries = manager.getEntriesForElder(elderId);
    
    for (let i = 1; i < entries.length; i++) {
      const prevTime = new Date(entries[i - 1].timestamp).getTime();
      const currTime = new Date(entries[i].timestamp).getTime();
      expect(prevTime).toBeGreaterThanOrEqual(currTime);
    }
  });

  /**
   * Property: Statistics are accurate
   */
  test('Statistics accurately reflect entries', () => {
    const manager = getTimelineManager();
    const familyId = generateRandomId();
    
    // Add various entry types
    const eventTypes: TimelineEventType[] = [
      'task_completed', 'task_completed', 'task_completed',
      'alert_created', 'alert_created',
      'medication_taken'
    ];
    
    eventTypes.forEach(eventType => {
      manager.addEntry(createTimelineEntry(
        familyId,
        generateRandomId(),
        eventType,
        'Test',
        'Test',
        generateRandomId(),
        'Caregiver'
      ));
    });
    
    const stats = manager.getStats(familyId);
    
    expect(stats.total).toBe(6);
    expect(stats.byEventType['task_completed']).toBe(3);
    expect(stats.byEventType['alert_created']).toBe(2);
    expect(stats.byEventType['medication_taken']).toBe(1);
    expect(stats.last24Hours).toBe(6);
    expect(stats.lastWeek).toBe(6);
  });

  /**
   * Property: Search works correctly
   */
  test('Search finds entries by title and description', () => {
    const manager = getTimelineManager();
    
    manager.addEntry(createTimelineEntry(
      generateRandomId(),
      generateRandomId(),
      'medication_taken',
      'Morning Medication',
      'Took blood pressure pills',
      generateRandomId(),
      'Caregiver'
    ));
    
    manager.addEntry(createTimelineEntry(
      generateRandomId(),
      generateRandomId(),
      'task_completed',
      'Doctor Visit',
      'Annual checkup completed',
      generateRandomId(),
      'Caregiver'
    ));
    
    const medicationResults = manager.searchEntries('medication');
    expect(medicationResults.length).toBe(1);
    expect(medicationResults[0].title).toContain('Medication');
    
    const doctorResults = manager.searchEntries('doctor');
    expect(doctorResults.length).toBe(1);
  });
});

// =============================================
// Validation Tests
// =============================================

describe('Validation Tests', () => {
  
  /**
   * Property: Valid entries pass validation
   */
  test('Valid timeline entries pass validation', () => {
    for (let i = 0; i < 20; i++) {
      const entry = createTimelineEntry(
        generateRandomId(),
        generateRandomId(),
        'task_completed',
        'Test Entry',
        'Test description',
        generateRandomId(),
        'Test Caregiver'
      );
      
      const result = validateTimelineEntry(entry);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    }
  });

  /**
   * Property: Valid outcomes pass validation
   */
  test('Valid outcomes pass validation', () => {
    for (let i = 0; i < 20; i++) {
      const outcome = createOutcome(
        generateRandomId(),
        ['success', 'partial', 'failed'][Math.floor(Math.random() * 3)] as any,
        'Test notes',
        [],
        generateRandomId()
      );
      
      const result = validateOutcome(outcome);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    }
  });

  /**
   * Property: Invalid entries fail with descriptive errors
   */
  test('Invalid entries fail with specific errors', () => {
    const invalidEntry = {
      id: '',
      familyId: '',
      elderId: '',
      eventType: '',
      title: '',
      description: '',
      caregiver: {},
      immutable: false,
      timestamp: '',
      createdAt: '',
      updatedAt: '',
      details: {}
    } as TimelineEntry;
    
    const result = validateTimelineEntry(invalidEntry);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});


