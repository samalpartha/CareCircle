/**
 * Property-Based Tests for Enhanced Task Management
 * Feature: care-operations-console
 * 
 * Property 11: Task Workflow Integrity - Requirements 6.1, 6.2, 6.3
 * Property 12: Checklist Completeness - Requirements 6.4, 6.5
 */

import {
  TASK_TEMPLATES,
  createTaskFromTemplate,
  createManualTask,
  toggleChecklistItem,
  areRequiredItemsCompleted,
  getChecklistProgress,
  addChecklistItem,
  removeChecklistItem,
  isValidTaskTransition,
  transitionTaskStatus,
  startTask,
  completeTask,
  snoozeTask,
  calculateTaskAnalytics,
  getTasksRequiringAttention,
  getSuggestedEscalations,
  validateTask,
  validateTaskTemplate,
  ExtendedTaskTemplate
} from '../task-management';

import { Task } from '../../types/care-operations';

// =============================================
// Test Helpers
// =============================================

const generateRandomId = (): string => 
  `TEST#${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

const createTestTask = (overrides: Partial<Task> = {}): Task => ({
  id: generateRandomId(),
  title: 'Test Task',
  description: 'Test description',
  priority: 'medium',
  dueAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
  estimatedMinutes: 30,
  checklist: [
    { id: 'check_0', text: 'Item 1', completed: false, required: true },
    { id: 'check_1', text: 'Item 2', completed: false, required: false }
  ],
  status: 'new',
  elderName: 'Test Elder',
  createdBy: 'Test User',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

// =============================================
// Property 11: Task Workflow Integrity
// =============================================

describe('Property 11: Task Workflow Integrity', () => {
  
  /**
   * Property 11.1: Valid task transitions are enforced
   */
  test('Property 11.1: Valid task transitions are correctly identified', () => {
    // Valid transitions
    expect(isValidTaskTransition('new', 'in_progress')).toBe(true);
    expect(isValidTaskTransition('new', 'snoozed')).toBe(true);
    expect(isValidTaskTransition('new', 'escalated')).toBe(true);
    expect(isValidTaskTransition('in_progress', 'completed')).toBe(true);
    expect(isValidTaskTransition('in_progress', 'escalated')).toBe(true);
    expect(isValidTaskTransition('snoozed', 'in_progress')).toBe(true);
    expect(isValidTaskTransition('escalated', 'completed')).toBe(true);
    
    // Invalid transitions
    expect(isValidTaskTransition('new', 'completed')).toBe(false);
    expect(isValidTaskTransition('completed', 'new')).toBe(false);
    expect(isValidTaskTransition('completed', 'in_progress')).toBe(false);
  });

  /**
   * Property 11.2: Status transitions update timestamp
   */
  test('Property 11.2: Status transitions update updatedAt', () => {
    const task = createTestTask({ status: 'new' });
    const originalUpdatedAt = task.updatedAt;
    
    // Small delay to ensure timestamp difference
    const result = startTask(task);
    
    expect(result.success).toBe(true);
    expect(result.task?.updatedAt).toBeDefined();
    expect(new Date(result.task!.updatedAt).getTime())
      .toBeGreaterThanOrEqual(new Date(originalUpdatedAt).getTime());
  });

  /**
   * Property 11.3: Cannot complete task without required checklist items
   */
  test('Property 11.3: Task completion requires all required items', () => {
    const task = createTestTask({
      status: 'in_progress',
      checklist: [
        { id: 'check_0', text: 'Required', completed: false, required: true },
        { id: 'check_1', text: 'Optional', completed: true, required: false }
      ]
    });
    
    const result = completeTask(task);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('required');
  });

  /**
   * Property 11.4: Task completion succeeds with all required items done
   */
  test('Property 11.4: Task can complete when requirements met', () => {
    const task = createTestTask({
      status: 'in_progress',
      checklist: [
        { id: 'check_0', text: 'Required', completed: true, required: true },
        { id: 'check_1', text: 'Optional', completed: false, required: false }
      ]
    });
    
    const result = completeTask(task);
    
    expect(result.success).toBe(true);
    expect(result.task?.status).toBe('completed');
  });

  /**
   * Property 11.5: Snooze updates due date
   */
  test('Property 11.5: Snooze updates due date correctly', () => {
    const task = createTestTask({ status: 'new' });
    const snoozeUntil = new Date(Date.now() + 7200000); // 2 hours from now
    
    const result = snoozeTask(task, snoozeUntil);
    
    expect(result.success).toBe(true);
    expect(result.task?.status).toBe('snoozed');
    expect(new Date(result.task!.dueAt).getTime()).toBe(snoozeUntil.getTime());
  });
});

// =============================================
// Property 12: Checklist Completeness
// =============================================

describe('Property 12: Checklist Completeness', () => {
  
  /**
   * Property 12.1: Checklist toggle works correctly
   */
  test('Property 12.1: Checklist items can be toggled', () => {
    const task = createTestTask();
    const itemId = task.checklist[0].id;
    
    // Toggle on
    const toggled = toggleChecklistItem(task, itemId);
    expect(toggled.checklist.find(i => i.id === itemId)?.completed).toBe(true);
    
    // Toggle off
    const toggledBack = toggleChecklistItem(toggled, itemId);
    expect(toggledBack.checklist.find(i => i.id === itemId)?.completed).toBe(false);
  });

  /**
   * Property 12.2: Required item detection is accurate
   */
  test('Property 12.2: Required items correctly detected', () => {
    // Not all required completed
    const task1 = createTestTask({
      checklist: [
        { id: 'check_0', text: 'Req 1', completed: true, required: true },
        { id: 'check_1', text: 'Req 2', completed: false, required: true }
      ]
    });
    expect(areRequiredItemsCompleted(task1)).toBe(false);
    
    // All required completed
    const task2 = createTestTask({
      checklist: [
        { id: 'check_0', text: 'Req 1', completed: true, required: true },
        { id: 'check_1', text: 'Opt 1', completed: false, required: false }
      ]
    });
    expect(areRequiredItemsCompleted(task2)).toBe(true);
    
    // No required items
    const task3 = createTestTask({
      checklist: [
        { id: 'check_0', text: 'Opt 1', completed: false, required: false }
      ]
    });
    expect(areRequiredItemsCompleted(task3)).toBe(true);
  });

  /**
   * Property 12.3: Progress calculation is accurate
   */
  test('Property 12.3: Checklist progress is calculated correctly', () => {
    // Empty checklist = 100%
    const task1 = createTestTask({ checklist: [] });
    expect(getChecklistProgress(task1)).toBe(100);
    
    // Half complete
    const task2 = createTestTask({
      checklist: [
        { id: 'check_0', text: 'Item 1', completed: true, required: true },
        { id: 'check_1', text: 'Item 2', completed: false, required: true }
      ]
    });
    expect(getChecklistProgress(task2)).toBe(50);
    
    // All complete
    const task3 = createTestTask({
      checklist: [
        { id: 'check_0', text: 'Item 1', completed: true, required: true },
        { id: 'check_1', text: 'Item 2', completed: true, required: false }
      ]
    });
    expect(getChecklistProgress(task3)).toBe(100);
    
    // 1 of 4
    const task4 = createTestTask({
      checklist: [
        { id: 'check_0', text: 'Item 1', completed: true, required: true },
        { id: 'check_1', text: 'Item 2', completed: false, required: true },
        { id: 'check_2', text: 'Item 3', completed: false, required: true },
        { id: 'check_3', text: 'Item 4', completed: false, required: false }
      ]
    });
    expect(getChecklistProgress(task4)).toBe(25);
  });

  /**
   * Property 12.4: Adding and removing items works
   */
  test('Property 12.4: Checklist items can be added and removed', () => {
    const task = createTestTask({ checklist: [] });
    
    // Add items
    const withItem1 = addChecklistItem(task, 'New Item 1', true);
    expect(withItem1.checklist.length).toBe(1);
    expect(withItem1.checklist[0].required).toBe(true);
    
    const withItem2 = addChecklistItem(withItem1, 'New Item 2', false);
    expect(withItem2.checklist.length).toBe(2);
    
    // Remove item
    const itemToRemove = withItem2.checklist[0].id;
    const afterRemove = removeChecklistItem(withItem2, itemToRemove);
    expect(afterRemove.checklist.length).toBe(1);
    expect(afterRemove.checklist[0].text).toBe('New Item 2');
  });

  /**
   * Property 12.5: All templates have valid checklists
   */
  test('Property 12.5: All task templates have valid checklists', () => {
    Object.values(TASK_TEMPLATES).forEach(template => {
      expect(Array.isArray(template.checklist)).toBe(true);
      expect(template.checklist.length).toBeGreaterThan(0);
      
      template.checklist.forEach(item => {
        expect(item.text).toBeTruthy();
        expect(typeof item.required).toBe('boolean');
      });
      
      // At least one required item
      const hasRequired = template.checklist.some(i => i.required);
      expect(hasRequired).toBe(true);
    });
  });
});

// =============================================
// Task Template Tests
// =============================================

describe('Task Template Tests', () => {
  
  /**
   * Property: Templates create valid tasks
   */
  test('Templates create valid tasks with all required fields', () => {
    Object.values(TASK_TEMPLATES).forEach(template => {
      const task = createTaskFromTemplate(
        template,
        generateRandomId(),
        'Test Elder',
        'Test Creator'
      );
      
      const validation = validateTask(task);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      
      expect(task.title).toContain('Test Elder');
      expect(task.checklist.length).toBe(template.checklist.length);
      expect(task.estimatedMinutes).toBe(template.estimatedMinutes);
    });
  });

  /**
   * Property: Templates can be overridden
   */
  test('Template overrides are applied correctly', () => {
    const template = TASK_TEMPLATES.daily_wellness_call;
    const customDue = new Date(Date.now() + 86400000).toISOString();
    
    const task = createTaskFromTemplate(
      template,
      generateRandomId(),
      'Elder Name',
      'Creator',
      {
        priority: 'urgent',
        dueAt: customDue
      }
    );
    
    expect(task.priority).toBe('urgent');
    expect(task.dueAt).toBe(customDue);
  });

  /**
   * Property: Manual task creation works
   */
  test('Manual tasks are created correctly', () => {
    const due = new Date(Date.now() + 3600000);
    const task = createManualTask(
      'Custom Task',
      'Custom description',
      'high',
      'Elder Name',
      due,
      45,
      'Creator Name',
      ['Step 1', 'Step 2', 'Step 3']
    );
    
    const validation = validateTask(task);
    expect(validation.valid).toBe(true);
    expect(task.title).toBe('Custom Task');
    expect(task.checklist.length).toBe(3);
    expect(task.estimatedMinutes).toBe(45);
  });

  /**
   * Property: All templates pass validation
   */
  test('All templates are valid', () => {
    Object.values(TASK_TEMPLATES).forEach(template => {
      const validation = validateTaskTemplate(template);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
});

// =============================================
// Task Analytics Tests
// =============================================

describe('Task Analytics Tests', () => {
  
  /**
   * Property: Analytics calculate correctly
   */
  test('Task analytics are accurate', () => {
    const tasks: Task[] = [
      createTestTask({ status: 'completed', priority: 'urgent' }),
      createTestTask({ status: 'in_progress', priority: 'high' }),
      createTestTask({ status: 'new', priority: 'medium' }),
      createTestTask({ status: 'new', priority: 'low' }),
      createTestTask({ 
        status: 'new', 
        priority: 'high',
        dueAt: new Date(Date.now() - 3600000).toISOString() // Overdue
      })
    ];
    
    const analytics = calculateTaskAnalytics(tasks);
    
    expect(analytics.totalTasks).toBe(5);
    expect(analytics.byStatus.completed).toBe(1);
    expect(analytics.byStatus.in_progress).toBe(1);
    expect(analytics.byStatus.new).toBe(3);
    expect(analytics.byPriority.urgent).toBe(1);
    expect(analytics.byPriority.high).toBe(2);
    expect(analytics.overdueCount).toBe(1);
    expect(analytics.completionRate).toBe(20);
  });

  /**
   * Property: Attention-requiring tasks are identified
   */
  test('Tasks requiring attention are correctly identified', () => {
    const tasks: Task[] = [
      createTestTask({ status: 'completed', priority: 'urgent' }), // Not: completed
      createTestTask({ status: 'new', priority: 'urgent' }), // Yes: urgent
      createTestTask({ status: 'new', priority: 'medium' }), // Not: not urgent, not overdue
      createTestTask({ 
        status: 'new', 
        priority: 'low',
        dueAt: new Date(Date.now() - 3600000).toISOString() // Yes: overdue
      }),
      createTestTask({ status: 'escalated', priority: 'medium' }) // Yes: escalated
    ];
    
    const attentionTasks = getTasksRequiringAttention(tasks);
    
    expect(attentionTasks.length).toBe(3);
    // Should be sorted by priority
    expect(attentionTasks[0].priority).toBe('urgent');
  });

  /**
   * Property: Escalation suggestions are accurate
   */
  test('Escalation suggestions consider priority thresholds', () => {
    const now = Date.now();
    
    const tasks: Task[] = [
      // Overdue urgent by 30 min - should escalate (threshold 15 min)
      createTestTask({ 
        status: 'new', 
        priority: 'urgent',
        dueAt: new Date(now - 30 * 60 * 1000).toISOString()
      }),
      // Overdue high by 30 min - should NOT escalate yet (threshold 1 hour)
      createTestTask({ 
        status: 'new', 
        priority: 'high',
        dueAt: new Date(now - 30 * 60 * 1000).toISOString()
      }),
      // Overdue high by 2 hours - should escalate
      createTestTask({ 
        status: 'new', 
        priority: 'high',
        dueAt: new Date(now - 2 * 60 * 60 * 1000).toISOString()
      }),
      // Already escalated - should not appear
      createTestTask({ 
        status: 'escalated', 
        priority: 'urgent',
        dueAt: new Date(now - 60 * 60 * 1000).toISOString()
      })
    ];
    
    const escalationSuggestions = getSuggestedEscalations(tasks);
    
    expect(escalationSuggestions.length).toBe(2);
  });
});

// =============================================
// Validation Tests
// =============================================

describe('Validation Tests', () => {
  
  /**
   * Property: Valid tasks pass validation
   */
  test('Valid tasks pass validation', () => {
    for (let i = 0; i < 20; i++) {
      const task = createTestTask();
      const result = validateTask(task);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    }
  });

  /**
   * Property: Invalid tasks fail with specific errors
   */
  test('Invalid tasks fail with descriptive errors', () => {
    const invalidTask = {
      id: '',
      title: '',
      description: '',
      priority: 'invalid' as any,
      dueAt: '',
      estimatedMinutes: 0,
      checklist: 'not an array' as any,
      status: 'new' as const,
      elderName: '',
      createdBy: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const result = validateTask(invalidTask);
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});


