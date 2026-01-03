/**
 * Enhanced Task Management
 * Implements task schema with due dates, estimated times, checklists, and completion workflows
 */

import {
  Task,
  TaskTemplate,
  ChecklistItem,
  Outcome
} from '../types/care-operations';

// =============================================
// Task Templates for Common Care Activities
// =============================================

export interface ExtendedTaskTemplate extends TaskTemplate {
  id: string;
  category: 'medication' | 'safety' | 'appointment' | 'wellness' | 'daily_care' | 'emergency';
  requiresOutcome: boolean;
  suggestedAssigneeRole?: 'primary' | 'secondary' | 'medical_poa' | 'any';
}

export const TASK_TEMPLATES: Record<string, ExtendedTaskTemplate> = {
  medication_verification: {
    id: 'medication_verification',
    title: 'Verify Medication Taken',
    description: 'Confirm all scheduled medications have been taken correctly',
    priority: 'high',
    estimatedMinutes: 10,
    category: 'medication',
    requiresOutcome: true,
    suggestedAssigneeRole: 'any',
    checklist: [
      { text: 'Check medication organizer', required: true },
      { text: 'Verify correct dosages', required: true },
      { text: 'Note any side effects reported', required: false },
      { text: 'Refill if running low', required: false }
    ],
    dueInHours: 4
  },
  
  daily_wellness_call: {
    id: 'daily_wellness_call',
    title: 'Daily Wellness Check-in Call',
    description: 'Make a wellness check-in call to assess mood and any needs',
    priority: 'medium',
    estimatedMinutes: 10,
    category: 'wellness',
    requiresOutcome: true,
    suggestedAssigneeRole: 'any',
    checklist: [
      { text: 'Ask about sleep quality', required: true },
      { text: 'Ask about pain or discomfort', required: true },
      { text: 'Ask about meals and hydration', required: true },
      { text: 'Ask about mood and social interaction', required: false },
      { text: 'Discuss any concerns', required: false }
    ],
    dueInHours: 24
  },
  
  safety_walkthrough: {
    id: 'safety_walkthrough',
    title: 'Home Safety Walkthrough',
    description: 'Complete a safety check of the living environment',
    priority: 'medium',
    estimatedMinutes: 30,
    category: 'safety',
    requiresOutcome: true,
    suggestedAssigneeRole: 'primary',
    checklist: [
      { text: 'Check for loose rugs or tripping hazards', required: true },
      { text: 'Verify grab bars are secure', required: true },
      { text: 'Check lighting in hallways and stairs', required: true },
      { text: 'Test smoke and CO detectors', required: true },
      { text: 'Check medication storage is secure', required: false },
      { text: 'Verify emergency numbers are posted', required: false }
    ],
    dueInHours: 168 // Weekly
  },
  
  doctor_appointment: {
    id: 'doctor_appointment',
    title: 'Accompany to Doctor Appointment',
    description: 'Provide transportation and support for medical appointment',
    priority: 'high',
    estimatedMinutes: 120,
    category: 'appointment',
    requiresOutcome: true,
    suggestedAssigneeRole: 'primary',
    checklist: [
      { text: 'Confirm appointment time and location', required: true },
      { text: 'Gather insurance cards and ID', required: true },
      { text: 'Prepare list of current medications', required: true },
      { text: 'Write down questions to ask doctor', required: false },
      { text: 'Arrange transportation', required: true },
      { text: 'Document doctor instructions after visit', required: true }
    ],
    dueInHours: 24
  },
  
  meal_preparation: {
    id: 'meal_preparation',
    title: 'Prepare Nutritious Meal',
    description: 'Prepare a healthy meal considering dietary restrictions',
    priority: 'medium',
    estimatedMinutes: 45,
    category: 'daily_care',
    requiresOutcome: true,
    suggestedAssigneeRole: 'any',
    checklist: [
      { text: 'Check dietary restrictions', required: true },
      { text: 'Ensure adequate protein', required: true },
      { text: 'Include vegetables/fruits', required: true },
      { text: 'Provide adequate fluids', required: true },
      { text: 'Assist with eating if needed', required: false }
    ],
    dueInHours: 4
  },
  
  fall_response: {
    id: 'fall_response',
    title: 'Respond to Fall Alert',
    description: 'Assess and respond to reported fall incident',
    priority: 'urgent',
    estimatedMinutes: 30,
    category: 'emergency',
    requiresOutcome: true,
    suggestedAssigneeRole: 'primary',
    checklist: [
      { text: 'Call to check consciousness and pain', required: true },
      { text: 'Assess if able to get up safely', required: true },
      { text: 'Check for visible injuries', required: true },
      { text: 'Determine if emergency services needed', required: true },
      { text: 'Document incident details', required: true },
      { text: 'Notify other family members', required: true }
    ],
    dueInHours: 0.5 // 30 minutes
  },
  
  grocery_shopping: {
    id: 'grocery_shopping',
    title: 'Grocery Shopping',
    description: 'Purchase groceries and household essentials',
    priority: 'medium',
    estimatedMinutes: 60,
    category: 'daily_care',
    requiresOutcome: true,
    suggestedAssigneeRole: 'any',
    checklist: [
      { text: 'Check what is needed', required: true },
      { text: 'Review dietary restrictions', required: true },
      { text: 'Check medication/supply needs', required: false },
      { text: 'Purchase items', required: true },
      { text: 'Put away groceries', required: true }
    ],
    dueInHours: 48
  },
  
  exercise_assistance: {
    id: 'exercise_assistance',
    title: 'Physical Exercise Support',
    description: 'Assist with prescribed physical therapy or exercises',
    priority: 'medium',
    estimatedMinutes: 30,
    category: 'wellness',
    requiresOutcome: true,
    suggestedAssigneeRole: 'any',
    checklist: [
      { text: 'Review prescribed exercises', required: true },
      { text: 'Ensure safe exercise environment', required: true },
      { text: 'Guide through exercises', required: true },
      { text: 'Note any pain or difficulty', required: true },
      { text: 'Provide encouragement', required: false }
    ],
    dueInHours: 24
  }
};

// =============================================
// Task Creation and Management
// =============================================

/**
 * Create a task from a template
 */
export function createTaskFromTemplate(
  template: ExtendedTaskTemplate,
  elderId: string,
  elderName: string,
  createdBy: string,
  overrides: Partial<Task> = {}
): Task {
  const now = new Date();
  const dueAt = new Date(now.getTime() + template.dueInHours * 60 * 60 * 1000);
  
  return {
    id: `TASK#${Date.now()}#${Math.random().toString(36).substring(2, 8)}`,
    parentId: undefined,
    title: `${template.title} - ${elderName}`,
    description: template.description,
    priority: template.priority,
    dueAt: dueAt.toISOString(),
    estimatedMinutes: template.estimatedMinutes,
    checklist: template.checklist.map((item, index) => ({
      id: `check_${index}`,
      text: item.text,
      completed: false,
      required: item.required
    })),
    status: 'new',
    elderName,
    createdBy,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides
  };
}

/**
 * Create a manual task (not from template)
 */
export function createManualTask(
  title: string,
  description: string,
  priority: Task['priority'],
  elderName: string,
  dueAt: Date,
  estimatedMinutes: number,
  createdBy: string,
  checklistItems: string[] = []
): Task {
  const now = new Date();
  
  return {
    id: `TASK#${Date.now()}#${Math.random().toString(36).substring(2, 8)}`,
    title,
    description,
    priority,
    dueAt: dueAt.toISOString(),
    estimatedMinutes,
    checklist: checklistItems.map((text, index) => ({
      id: `check_${index}`,
      text,
      completed: false,
      required: true
    })),
    status: 'new',
    elderName,
    createdBy,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}

// =============================================
// Checklist Management
// =============================================

/**
 * Toggle a checklist item
 */
export function toggleChecklistItem(
  task: Task,
  itemId: string
): Task {
  const updatedChecklist = task.checklist.map(item =>
    item.id === itemId
      ? { ...item, completed: !item.completed }
      : item
  );
  
  return {
    ...task,
    checklist: updatedChecklist,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Check if all required checklist items are completed
 */
export function areRequiredItemsCompleted(task: Task): boolean {
  return task.checklist
    .filter(item => item.required)
    .every(item => item.completed);
}

/**
 * Get checklist completion percentage
 */
export function getChecklistProgress(task: Task): number {
  if (task.checklist.length === 0) return 100;
  
  const completed = task.checklist.filter(item => item.completed).length;
  return Math.round((completed / task.checklist.length) * 100);
}

/**
 * Add a checklist item to a task
 */
export function addChecklistItem(
  task: Task,
  text: string,
  required: boolean = false
): Task {
  const newItem: ChecklistItem = {
    id: `check_${task.checklist.length}_${Date.now()}`,
    text,
    completed: false,
    required
  };
  
  return {
    ...task,
    checklist: [...task.checklist, newItem],
    updatedAt: new Date().toISOString()
  };
}

/**
 * Remove a checklist item from a task
 */
export function removeChecklistItem(
  task: Task,
  itemId: string
): Task {
  return {
    ...task,
    checklist: task.checklist.filter(item => item.id !== itemId),
    updatedAt: new Date().toISOString()
  };
}

// =============================================
// Task Status Management
// =============================================

/**
 * Valid task status transitions
 */
const VALID_TASK_TRANSITIONS: Record<string, string[]> = {
  new: ['in_progress', 'snoozed', 'escalated'],
  in_progress: ['completed', 'snoozed', 'escalated'],
  snoozed: ['new', 'in_progress', 'escalated'],
  escalated: ['in_progress', 'completed'],
  completed: [] // Terminal state
};

/**
 * Check if a task status transition is valid
 */
export function isValidTaskTransition(
  from: Task['status'],
  to: Task['status']
): boolean {
  return VALID_TASK_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Transition task status with validation
 */
export function transitionTaskStatus(
  task: Task,
  newStatus: Task['status']
): { success: boolean; task?: Task; error?: string } {
  if (!isValidTaskTransition(task.status, newStatus)) {
    return {
      success: false,
      error: `Cannot transition from '${task.status}' to '${newStatus}'`
    };
  }
  
  // If completing, check required items
  if (newStatus === 'completed' && !areRequiredItemsCompleted(task)) {
    return {
      success: false,
      error: 'Cannot complete task: not all required checklist items are done'
    };
  }
  
  return {
    success: true,
    task: {
      ...task,
      status: newStatus,
      updatedAt: new Date().toISOString()
    }
  };
}

/**
 * Start a task (move to in_progress)
 */
export function startTask(task: Task): { success: boolean; task?: Task; error?: string } {
  return transitionTaskStatus(task, 'in_progress');
}

/**
 * Complete a task (requires all required checklist items)
 */
export function completeTask(task: Task): { success: boolean; task?: Task; error?: string } {
  return transitionTaskStatus(task, 'completed');
}

/**
 * Snooze a task
 */
export function snoozeTask(
  task: Task,
  snoozeUntil: Date
): { success: boolean; task?: Task; error?: string } {
  const result = transitionTaskStatus(task, 'snoozed');
  if (result.success && result.task) {
    return {
      success: true,
      task: {
        ...result.task,
        dueAt: snoozeUntil.toISOString()
      }
    };
  }
  return result;
}

// =============================================
// Task Analytics
// =============================================

export interface TaskAnalytics {
  totalTasks: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  averageCompletionTime: number; // minutes
  completionRate: number; // percentage
  overdueCount: number;
  averageChecklistCompletion: number; // percentage
}

/**
 * Calculate task analytics
 */
export function calculateTaskAnalytics(
  tasks: Task[],
  completionTimes?: Map<string, number> // task id -> minutes to complete
): TaskAnalytics {
  const byStatus: Record<string, number> = {
    new: 0,
    in_progress: 0,
    completed: 0,
    snoozed: 0,
    escalated: 0
  };
  
  const byPriority: Record<string, number> = {
    urgent: 0,
    high: 0,
    medium: 0,
    low: 0
  };
  
  let overdueCount = 0;
  let totalChecklistProgress = 0;
  const now = Date.now();
  
  tasks.forEach(task => {
    byStatus[task.status]++;
    byPriority[task.priority]++;
    
    if (new Date(task.dueAt).getTime() < now && task.status !== 'completed') {
      overdueCount++;
    }
    
    totalChecklistProgress += getChecklistProgress(task);
  });
  
  // Calculate average completion time from provided data
  let averageCompletionTime = 0;
  if (completionTimes && completionTimes.size > 0) {
    const times = Array.from(completionTimes.values());
    averageCompletionTime = times.reduce((a, b) => a + b, 0) / times.length;
  }
  
  const completedCount = byStatus.completed;
  const completionRate = tasks.length > 0 
    ? (completedCount / tasks.length) * 100 
    : 0;
  
  return {
    totalTasks: tasks.length,
    byStatus,
    byPriority,
    averageCompletionTime: Math.round(averageCompletionTime),
    completionRate: Math.round(completionRate),
    overdueCount,
    averageChecklistCompletion: tasks.length > 0 
      ? Math.round(totalChecklistProgress / tasks.length)
      : 0
  };
}

/**
 * Get tasks requiring attention (overdue or urgent)
 */
export function getTasksRequiringAttention(tasks: Task[]): Task[] {
  const now = Date.now();
  
  return tasks.filter(task => {
    if (task.status === 'completed') return false;
    
    // Urgent tasks always need attention
    if (task.priority === 'urgent') return true;
    
    // Overdue tasks need attention
    if (new Date(task.dueAt).getTime() < now) return true;
    
    // Escalated tasks need attention
    if (task.status === 'escalated') return true;
    
    return false;
  }).sort((a, b) => {
    // Sort by priority first
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then by due date
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });
}

/**
 * Get suggested escalation for overdue high-priority tasks
 */
export function getSuggestedEscalations(tasks: Task[]): Task[] {
  const now = Date.now();
  const ESCALATION_THRESHOLDS = {
    urgent: 15 * 60 * 1000,  // 15 minutes
    high: 60 * 60 * 1000,    // 1 hour
    medium: 4 * 60 * 60 * 1000, // 4 hours
    low: 24 * 60 * 60 * 1000 // 24 hours
  };
  
  return tasks.filter(task => {
    if (task.status === 'completed' || task.status === 'escalated') return false;
    
    const dueTime = new Date(task.dueAt).getTime();
    const threshold = ESCALATION_THRESHOLDS[task.priority];
    
    return (dueTime + threshold) < now;
  });
}

// =============================================
// Task Validation
// =============================================

/**
 * Validate a task has all required fields
 */
export function validateTask(task: Task): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!task.id) errors.push('Task ID is required');
  if (!task.title) errors.push('Title is required');
  if (!task.description) errors.push('Description is required');
  if (!['urgent', 'high', 'medium', 'low'].includes(task.priority)) {
    errors.push('Invalid priority');
  }
  if (!task.dueAt) errors.push('Due date is required');
  if (!task.estimatedMinutes || task.estimatedMinutes <= 0) {
    errors.push('Estimated time must be positive');
  }
  if (!Array.isArray(task.checklist)) {
    errors.push('Checklist must be an array');
  }
  if (!task.elderName) errors.push('Elder name is required');
  if (!task.createdBy) errors.push('Creator is required');
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate task template
 */
export function validateTaskTemplate(
  template: ExtendedTaskTemplate
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!template.id) errors.push('Template ID is required');
  if (!template.title) errors.push('Title is required');
  if (!template.description) errors.push('Description is required');
  if (!['urgent', 'high', 'medium', 'low'].includes(template.priority)) {
    errors.push('Invalid priority');
  }
  if (!template.estimatedMinutes || template.estimatedMinutes <= 0) {
    errors.push('Estimated time must be positive');
  }
  if (!template.dueInHours || template.dueInHours < 0) {
    errors.push('Due hours must be non-negative');
  }
  if (!Array.isArray(template.checklist)) {
    errors.push('Checklist must be an array');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}


