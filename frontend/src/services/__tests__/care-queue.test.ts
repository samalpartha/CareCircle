/**
 * Property-Based Tests for Unified Care Queue Manager
 * Feature: care-operations-console
 * 
 * Property 3: Care Queue Unified Display - Requirements 2.1, 2.2, 2.5
 * Property 4: Queue State Machine Integrity - Requirements 2.4, 2.7
 * Property 8: Outcome Capture Enforcement - Requirements 2.6, 5.1, 6.5
 */

import {
  CareQueueManager,
  getCareQueue,
  resetCareQueue,
  calculatePriority,
  isValidTransition,
  transitionStatus,
  filterQueueItems,
  sortQueueItems,
  alertToQueueItem,
  taskToQueueItem,
  createMedicationQueueItem,
  createCheckinQueueItem,
  DEFAULT_FILTERS,
  QueueItemStatus
} from '../care-queue';

import { QueueItem, Alert, Task } from '../../types/care-operations';

// =============================================
// Test Helpers
// =============================================

const generateRandomId = (): string => 
  `TEST#${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

const generateRandomSeverity = (): 'urgent' | 'high' | 'medium' | 'low' => {
  const severities: ('urgent' | 'high' | 'medium' | 'low')[] = ['urgent', 'high', 'medium', 'low'];
  return severities[Math.floor(Math.random() * severities.length)];
};

const generateRandomStatus = (): QueueItemStatus => {
  const statuses: QueueItemStatus[] = ['new', 'in_progress', 'completed', 'snoozed', 'escalated'];
  return statuses[Math.floor(Math.random() * statuses.length)];
};

const generateRandomQueueItem = (overrides: Partial<QueueItem> = {}): QueueItem => {
  const types: ('alert' | 'task' | 'medication' | 'checkin' | 'followup')[] = 
    ['alert', 'task', 'medication', 'checkin', 'followup'];
  
  return {
    id: generateRandomId(),
    type: types[Math.floor(Math.random() * types.length)],
    severity: generateRandomSeverity(),
    title: `Test Item ${Math.random().toString(36).substring(2, 8)}`,
    elderName: 'Test Elder',
    dueAt: new Date(Date.now() + Math.random() * 86400000 * 7), // Random within next week
    estimatedMinutes: Math.floor(Math.random() * 60) + 5,
    status: 'new',
    suggestedAction: 'Test action',
    priority: Math.floor(Math.random() * 100),
    ...overrides
  };
};

const generateRandomAlert = (): Alert => ({
  id: generateRandomId(),
  severity: generateRandomSeverity(),
  type: ['fall', 'medication', 'cognitive', 'emotional', 'safety'][Math.floor(Math.random() * 5)] as Alert['type'],
  elderId: generateRandomId(),
  elderName: 'Test Elder',
  aiAnalysis: {
    summary: 'Test alert summary',
    confidence: Math.random(),
    riskScores: {
      cognitive: Math.random() * 100,
      medicationAdherence: Math.random() * 100,
      overallHealth: Math.random() * 100
    },
    concerns: ['Test concern'],
    recommendation: 'Test recommendation'
  },
  createdAt: new Date().toISOString(),
  status: 'new'
});

const generateRandomTask = (): Task => ({
  id: generateRandomId(),
  title: `Test Task ${Math.random().toString(36).substring(2, 8)}`,
  description: 'Test description',
  priority: generateRandomSeverity(),
  dueAt: new Date(Date.now() + Math.random() * 86400000 * 7).toISOString(),
  estimatedMinutes: Math.floor(Math.random() * 60) + 5,
  checklist: [],
  status: 'new',
  elderName: 'Test Elder',
  createdBy: 'TestUser',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

// =============================================
// Property 3: Care Queue Unified Display
// =============================================

describe('Property 3: Care Queue Unified Display', () => {
  beforeEach(() => {
    resetCareQueue();
  });

  /**
   * Property 3.1: All care items appear in unified queue
   * For any care-related item (alert, task, medication event, check-in),
   * it should appear in the unified Care Queue
   */
  test('Property 3.1: All item types appear in unified queue', () => {
    for (let i = 0; i < 50; i++) {
      const queue = getCareQueue();
      queue.clear();
      
      // Add different types of items
      const alert = generateRandomAlert();
      const task = generateRandomTask();
      const medicationItem = createMedicationQueueItem(
        generateRandomId(),
        'Test Medication',
        'Test Elder',
        new Date()
      );
      const checkinItem = createCheckinQueueItem(
        generateRandomId(),
        'Test Elder',
        new Date()
      );
      
      queue.mergeAlerts([alert]);
      queue.mergeTasks([task]);
      queue.addItem(medicationItem);
      queue.addItem(checkinItem);
      
      const allItems = queue.getAllItems();
      
      // All types should be present
      const types = new Set(allItems.map(item => item.type));
      expect(types.has('alert')).toBe(true);
      expect(types.has('task') || types.has('followup')).toBe(true);
      expect(types.has('medication')).toBe(true);
      expect(types.has('checkin')).toBe(true);
      
      // Total should be 4 items
      expect(allItems.length).toBe(4);
    }
  });

  /**
   * Property 3.2: Each queue item displays required fields
   * Each item should show severity, due time, owner, and suggested next step
   */
  test('Property 3.2: Queue items have consistent display fields', () => {
    for (let i = 0; i < 100; i++) {
      const item = generateRandomQueueItem();
      
      // Required fields must be present
      expect(item.id).toBeTruthy();
      expect(['urgent', 'high', 'medium', 'low']).toContain(item.severity);
      expect(item.dueAt).toBeInstanceOf(Date);
      expect(item.suggestedAction).toBeTruthy();
      expect(typeof item.estimatedMinutes).toBe('number');
      expect(item.elderName).toBeTruthy();
      expect(['alert', 'task', 'medication', 'checkin', 'followup']).toContain(item.type);
      expect(typeof item.priority).toBe('number');
    }
  });

  /**
   * Property 3.3: Queue is sorted by severity first, then due time
   * Urgent items should always appear at the top
   */
  test('Property 3.3: Queue maintains correct sort order', () => {
    for (let i = 0; i < 30; i++) {
      const items: QueueItem[] = [];
      
      // Generate items with various severities and due times
      for (let j = 0; j < 20; j++) {
        items.push(generateRandomQueueItem({
          priority: Math.floor(Math.random() * 100)
        }));
      }
      
      const sorted = sortQueueItems(items);
      
      // Verify sorting: higher priority items come first
      for (let k = 1; k < sorted.length; k++) {
        const prev = sorted[k - 1];
        const curr = sorted[k];
        
        // Priority should be descending (higher = more urgent)
        expect(prev.priority).toBeGreaterThanOrEqual(curr.priority);
      }
    }
  });

  /**
   * Property 3.4: Alert to QueueItem conversion preserves data
   */
  test('Property 3.4: Alert conversion preserves essential data', () => {
    for (let i = 0; i < 50; i++) {
      const alert = generateRandomAlert();
      const queueItem = alertToQueueItem(alert);
      
      expect(queueItem.id).toBe(alert.id);
      expect(queueItem.severity).toBe(alert.severity);
      expect(queueItem.elderName).toBe(alert.elderName);
      expect(queueItem.type).toBe('alert');
      // Title contains capitalized alert type (e.g., "Fall Alert: ...")
      expect(queueItem.title.toLowerCase()).toContain(alert.type.toLowerCase());
      expect(typeof queueItem.priority).toBe('number');
      expect(queueItem.priority).toBeGreaterThanOrEqual(0);
      expect(queueItem.priority).toBeLessThanOrEqual(100);
    }
  });

  /**
   * Property 3.5: Task to QueueItem conversion preserves data
   */
  test('Property 3.5: Task conversion preserves essential data', () => {
    for (let i = 0; i < 50; i++) {
      const task = generateRandomTask();
      const queueItem = taskToQueueItem(task);
      
      expect(queueItem.id).toBe(task.id);
      expect(queueItem.severity).toBe(task.priority);
      expect(queueItem.elderName).toBe(task.elderName);
      expect(queueItem.title).toBe(task.title);
      expect(queueItem.estimatedMinutes).toBe(task.estimatedMinutes);
      expect(typeof queueItem.priority).toBe('number');
    }
  });
});

// =============================================
// Property 4: Queue State Machine Integrity
// =============================================

describe('Property 4: Queue State Machine Integrity', () => {
  beforeEach(() => {
    resetCareQueue();
  });

  /**
   * Property 4.1: Valid state transitions are allowed
   * New → In Progress → (Completed | Snoozed | Escalated)
   */
  test('Property 4.1: Valid transitions succeed', () => {
    const validTransitions: [QueueItemStatus, QueueItemStatus][] = [
      ['new', 'in_progress'],
      ['new', 'snoozed'],
      ['new', 'escalated'],
      ['in_progress', 'completed'],
      ['in_progress', 'snoozed'],
      ['in_progress', 'escalated'],
      ['snoozed', 'new'],
      ['snoozed', 'in_progress'],
      ['snoozed', 'escalated'],
      ['escalated', 'in_progress'],
      ['escalated', 'completed']
    ];
    
    validTransitions.forEach(([from, to]) => {
      expect(isValidTransition(from, to)).toBe(true);
      
      const item = generateRandomQueueItem({ status: from });
      const result = transitionStatus(item, to);
      expect(result.success).toBe(true);
      expect(result.item?.status).toBe(to);
    });
  });

  /**
   * Property 4.2: Invalid state transitions are rejected
   */
  test('Property 4.2: Invalid transitions fail', () => {
    const invalidTransitions: [QueueItemStatus, QueueItemStatus][] = [
      ['completed', 'new'],
      ['completed', 'in_progress'],
      ['completed', 'snoozed'],
      ['completed', 'escalated'],
      ['new', 'completed'], // Can't complete without going through in_progress
    ];
    
    invalidTransitions.forEach(([from, to]) => {
      expect(isValidTransition(from, to)).toBe(false);
      
      const item = generateRandomQueueItem({ status: from });
      const result = transitionStatus(item, to);
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  /**
   * Property 4.3: Completed is a terminal state
   */
  test('Property 4.3: Completed items cannot transition', () => {
    for (let i = 0; i < 20; i++) {
      const item = generateRandomQueueItem({ status: 'completed' });
      const allStatuses: QueueItemStatus[] = ['new', 'in_progress', 'completed', 'snoozed', 'escalated'];
      
      allStatuses.forEach(targetStatus => {
        const result = transitionStatus(item, targetStatus);
        expect(result.success).toBe(false);
      });
    }
  });

  /**
   * Property 4.4: State transitions through queue manager are validated
   */
  test('Property 4.4: Queue manager validates transitions', () => {
    for (let i = 0; i < 30; i++) {
      const queue = getCareQueue();
      queue.clear();
      
      const item = generateRandomQueueItem({ status: 'new' });
      queue.addItem(item);
      
      // Valid: new -> in_progress
      let result = queue.updateStatus(item.id, 'in_progress');
      expect(result.success).toBe(true);
      
      // Valid: in_progress -> completed
      result = queue.updateStatus(item.id, 'completed');
      expect(result.success).toBe(true);
      
      // Invalid: completed -> new
      result = queue.updateStatus(item.id, 'new');
      expect(result.success).toBe(false);
    }
  });

  /**
   * Property 4.5: Escalation is tracked across state changes
   */
  test('Property 4.5: Escalation history is maintained', () => {
    for (let i = 0; i < 20; i++) {
      const queue = getCareQueue();
      queue.clear();
      
      const item = generateRandomQueueItem({ status: 'new' });
      queue.addItem(item);
      
      // Escalate the item
      queue.updateStatus(item.id, 'escalated');
      
      // Move back to in_progress
      queue.updateStatus(item.id, 'in_progress');
      
      // Escalate again
      queue.updateStatus(item.id, 'escalated');
      
      // The queue should track this (internal state)
      const stats = queue.getStats();
      expect(stats.byStatus.escalated).toBeGreaterThanOrEqual(1);
    }
  });
});

// =============================================
// Priority Calculation Tests
// =============================================

describe('Priority Calculation Tests', () => {
  /**
   * Property: Urgent items have highest priority
   */
  test('Urgent severity results in higher priority', () => {
    for (let i = 0; i < 50; i++) {
      const baseItem = {
        id: generateRandomId(),
        type: 'task' as const,
        title: 'Test',
        elderName: 'Test Elder',
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        estimatedMinutes: 30,
        status: 'new' as const,
        suggestedAction: 'Test'
      };
      
      const urgentPriority = calculatePriority({ ...baseItem, severity: 'urgent' });
      const highPriority = calculatePriority({ ...baseItem, severity: 'high' });
      const mediumPriority = calculatePriority({ ...baseItem, severity: 'medium' });
      const lowPriority = calculatePriority({ ...baseItem, severity: 'low' });
      
      expect(urgentPriority).toBeGreaterThan(highPriority);
      expect(highPriority).toBeGreaterThan(mediumPriority);
      expect(mediumPriority).toBeGreaterThan(lowPriority);
    }
  });

  /**
   * Property: Overdue items get priority boost
   */
  test('Overdue items have higher priority', () => {
    for (let i = 0; i < 50; i++) {
      const baseItem = {
        id: generateRandomId(),
        type: 'task' as const,
        severity: 'medium' as const,
        title: 'Test',
        elderName: 'Test Elder',
        estimatedMinutes: 30,
        status: 'new' as const,
        suggestedAction: 'Test'
      };
      
      const overduePriority = calculatePriority({
        ...baseItem,
        dueAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      });
      
      const futurePriority = calculatePriority({
        ...baseItem,
        dueAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // 2 days from now
      });
      
      expect(overduePriority).toBeGreaterThan(futurePriority);
    }
  });

  /**
   * Property: Unassigned items get priority boost
   */
  test('Unassigned items have higher priority than assigned', () => {
    for (let i = 0; i < 50; i++) {
      const baseItem = {
        id: generateRandomId(),
        type: 'task' as const,
        severity: 'medium' as const,
        title: 'Test',
        elderName: 'Test Elder',
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        estimatedMinutes: 30,
        status: 'new' as const,
        suggestedAction: 'Test'
      };
      
      const unassignedPriority = calculatePriority({ ...baseItem });
      const assignedPriority = calculatePriority({ ...baseItem, assignedTo: 'user123' });
      
      expect(unassignedPriority).toBeGreaterThan(assignedPriority);
    }
  });

  /**
   * Property: Priority is always 0-100
   */
  test('Priority is bounded between 0 and 100', () => {
    for (let i = 0; i < 100; i++) {
      const item = {
        id: generateRandomId(),
        type: ['alert', 'task', 'medication', 'checkin', 'followup'][Math.floor(Math.random() * 5)] as any,
        severity: generateRandomSeverity(),
        title: 'Test',
        elderName: 'Test Elder',
        dueAt: new Date(Date.now() + (Math.random() - 0.5) * 7 * 24 * 60 * 60 * 1000),
        estimatedMinutes: 30,
        status: 'new' as const,
        suggestedAction: 'Test'
      };
      
      const priority = calculatePriority(
        item,
        ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as any,
        Math.floor(Math.random() * 5)
      );
      
      expect(priority).toBeGreaterThanOrEqual(0);
      expect(priority).toBeLessThanOrEqual(100);
    }
  });
});

// =============================================
// Filtering Tests
// =============================================

describe('Queue Filtering Tests', () => {
  /**
   * Property: No filters returns all items
   */
  test('No active filters returns all items', () => {
    for (let i = 0; i < 30; i++) {
      const items: QueueItem[] = [];
      const itemCount = Math.floor(Math.random() * 20) + 5;
      
      for (let j = 0; j < itemCount; j++) {
        items.push(generateRandomQueueItem());
      }
      
      const filtered = filterQueueItems(items, DEFAULT_FILTERS);
      expect(filtered.length).toBe(items.length);
    }
  });

  /**
   * Property: Urgent filter only shows urgent items
   */
  test('Urgent filter shows only urgent items', () => {
    for (let i = 0; i < 30; i++) {
      const items: QueueItem[] = [];
      
      // Add mix of severities
      for (let j = 0; j < 10; j++) {
        items.push(generateRandomQueueItem({ severity: 'urgent' }));
        items.push(generateRandomQueueItem({ severity: 'high' }));
        items.push(generateRandomQueueItem({ severity: 'medium' }));
        items.push(generateRandomQueueItem({ severity: 'low' }));
      }
      
      const filtered = filterQueueItems(items, { ...DEFAULT_FILTERS, urgent: true });
      
      expect(filtered.length).toBe(10); // Only urgent items
      filtered.forEach(item => {
        expect(item.severity).toBe('urgent');
      });
    }
  });

  /**
   * Property: Medication filter only shows medication items
   */
  test('Medication filter shows only medication items', () => {
    for (let i = 0; i < 30; i++) {
      const items: QueueItem[] = [];
      
      // Add mix of types
      for (let j = 0; j < 5; j++) {
        items.push(generateRandomQueueItem({ type: 'alert' }));
        items.push(generateRandomQueueItem({ type: 'medication' }));
        items.push(generateRandomQueueItem({ type: 'task' }));
        items.push(generateRandomQueueItem({ type: 'checkin' }));
      }
      
      const filtered = filterQueueItems(items, { ...DEFAULT_FILTERS, medication: true });
      
      expect(filtered.length).toBe(5); // Only medication items
      filtered.forEach(item => {
        expect(item.type).toBe('medication');
      });
    }
  });

  /**
   * Property: AssignedToMe filter respects user ID
   */
  test('AssignedToMe filter shows only items assigned to current user', () => {
    const currentUserId = 'user123';
    
    for (let i = 0; i < 30; i++) {
      const items: QueueItem[] = [];
      
      // Add items with different assignments
      for (let j = 0; j < 10; j++) {
        items.push(generateRandomQueueItem({ assignedTo: currentUserId }));
        items.push(generateRandomQueueItem({ assignedTo: 'otherUser' }));
        items.push(generateRandomQueueItem({ assignedTo: undefined }));
      }
      
      const filtered = filterQueueItems(
        items, 
        { ...DEFAULT_FILTERS, assignedToMe: true },
        currentUserId
      );
      
      expect(filtered.length).toBe(10); // Only items assigned to current user
      filtered.forEach(item => {
        expect(item.assignedTo).toBe(currentUserId);
      });
    }
  });
});

// =============================================
// Queue Statistics Tests
// =============================================

describe('Queue Statistics Tests', () => {
  beforeEach(() => {
    resetCareQueue();
  });

  /**
   * Property: Stats accurately reflect queue contents
   */
  test('Stats accurately count items by status and severity', () => {
    for (let i = 0; i < 20; i++) {
      const queue = getCareQueue();
      queue.clear();
      
      // Add known quantities
      const urgentCount = Math.floor(Math.random() * 5) + 1;
      const highCount = Math.floor(Math.random() * 5) + 1;
      const mediumCount = Math.floor(Math.random() * 5) + 1;
      
      for (let j = 0; j < urgentCount; j++) {
        queue.addItem(generateRandomQueueItem({ severity: 'urgent', status: 'new' }));
      }
      for (let j = 0; j < highCount; j++) {
        queue.addItem(generateRandomQueueItem({ severity: 'high', status: 'in_progress' }));
      }
      for (let j = 0; j < mediumCount; j++) {
        queue.addItem(generateRandomQueueItem({ severity: 'medium', status: 'completed' }));
      }
      
      const stats = queue.getStats();
      
      expect(stats.total).toBe(urgentCount + highCount + mediumCount);
      expect(stats.bySeverity.urgent).toBe(urgentCount);
      expect(stats.bySeverity.high).toBe(highCount);
      expect(stats.bySeverity.medium).toBe(mediumCount);
      expect(stats.byStatus.new).toBe(urgentCount);
      expect(stats.byStatus.in_progress).toBe(highCount);
      expect(stats.byStatus.completed).toBe(mediumCount);
      expect(stats.urgent).toBe(urgentCount);
    }
  });

  /**
   * Property: Overdue count is accurate
   */
  test('Overdue count accurately reflects past-due items', () => {
    for (let i = 0; i < 20; i++) {
      const queue = getCareQueue();
      queue.clear();
      
      const overdueCount = Math.floor(Math.random() * 5) + 1;
      const futureCount = Math.floor(Math.random() * 5) + 1;
      
      // Add overdue items
      for (let j = 0; j < overdueCount; j++) {
        queue.addItem(generateRandomQueueItem({
          dueAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          status: 'new'
        }));
      }
      
      // Add future items
      for (let j = 0; j < futureCount; j++) {
        queue.addItem(generateRandomQueueItem({
          dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          status: 'new'
        }));
      }
      
      const stats = queue.getStats();
      expect(stats.overdue).toBe(overdueCount);
    }
  });
});

