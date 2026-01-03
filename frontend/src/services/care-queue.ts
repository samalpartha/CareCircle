/**
 * Unified Care Queue Manager
 * Merges alerts, tasks, medications, and check-ins into a single prioritized queue
 * Implements priority calculation and state machine for queue items
 */

import {
  QueueItem,
  Alert,
  Task,
  QueueFilters,
  FamilyMember
} from '../types/care-operations';

// =============================================
// Queue Item Status State Machine
// =============================================

export type QueueItemStatus = 'new' | 'in_progress' | 'completed' | 'snoozed' | 'escalated';

/**
 * Valid state transitions for queue items
 * Follows: New → In Progress → (Completed | Snoozed | Escalated)
 */
const VALID_TRANSITIONS: Record<QueueItemStatus, QueueItemStatus[]> = {
  new: ['in_progress', 'snoozed', 'escalated'],
  in_progress: ['completed', 'snoozed', 'escalated'],
  completed: [], // Terminal state
  snoozed: ['new', 'in_progress', 'escalated'], // Can be reactivated
  escalated: ['in_progress', 'completed'] // Can be picked up after escalation
};

/**
 * Check if a state transition is valid
 */
export function isValidTransition(from: QueueItemStatus, to: QueueItemStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Transition a queue item to a new status with validation
 */
export function transitionStatus(
  item: QueueItem, 
  newStatus: QueueItemStatus
): { success: boolean; error?: string; item?: QueueItem } {
  if (!isValidTransition(item.status, newStatus)) {
    return {
      success: false,
      error: `Invalid transition from '${item.status}' to '${newStatus}'. Valid transitions: ${VALID_TRANSITIONS[item.status].join(', ') || 'none (terminal state)'}`
    };
  }
  
  return {
    success: true,
    item: { ...item, status: newStatus }
  };
}

// =============================================
// Priority Calculation Algorithm
// =============================================

/**
 * Priority factors with weights
 * Total weight sums to approximately 1.0 for normalization
 */
const PRIORITY_WEIGHTS = {
  severity: 0.35,      // Urgency of the item
  timeSensitivity: 0.25, // How close to/past due date
  elderRiskLevel: 0.15,  // Risk profile of the elder
  assignmentStatus: 0.10, // Unassigned items get priority
  escalationHistory: 0.10, // Previous escalations indicate importance
  itemType: 0.05       // Some types inherently more urgent
};

/**
 * Severity scores (0-100)
 */
const SEVERITY_SCORES: Record<string, number> = {
  urgent: 100,
  high: 75,
  medium: 50,
  low: 25
};

/**
 * Item type base scores (0-20)
 */
const TYPE_BASE_SCORES: Record<string, number> = {
  alert: 20,
  medication: 18,
  task: 10,
  checkin: 8,
  followup: 15
};

/**
 * Calculate priority score for a queue item
 * Returns a score from 0-100, higher = more urgent
 */
export function calculatePriority(
  item: Omit<QueueItem, 'priority'>,
  elderRiskLevel: 'high' | 'medium' | 'low' = 'medium',
  escalationCount: number = 0
): number {
  let score = 0;
  
  // 1. Severity component (0-35 points)
  const severityScore = SEVERITY_SCORES[item.severity] || 25;
  score += (severityScore / 100) * PRIORITY_WEIGHTS.severity * 100;
  
  // 2. Time sensitivity component (0-25 points)
  const now = new Date();
  const dueAt = new Date(item.dueAt);
  const hoursUntilDue = (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  let timeScore = 0;
  if (hoursUntilDue < 0) {
    // Overdue: max score + bonus based on how overdue
    timeScore = 100 + Math.min(Math.abs(hoursUntilDue) * 5, 50);
  } else if (hoursUntilDue < 1) {
    // Due within 1 hour
    timeScore = 90;
  } else if (hoursUntilDue < 4) {
    // Due within 4 hours
    timeScore = 70;
  } else if (hoursUntilDue < 24) {
    // Due today
    timeScore = 50;
  } else if (hoursUntilDue < 48) {
    // Due tomorrow
    timeScore = 30;
  } else {
    // Due later
    timeScore = 10;
  }
  score += (Math.min(timeScore, 100) / 100) * PRIORITY_WEIGHTS.timeSensitivity * 100;
  
  // 3. Elder risk level component (0-15 points)
  const riskScores = { high: 100, medium: 50, low: 20 };
  score += (riskScores[elderRiskLevel] / 100) * PRIORITY_WEIGHTS.elderRiskLevel * 100;
  
  // 4. Assignment status component (0-10 points)
  if (!item.assignedTo) {
    score += PRIORITY_WEIGHTS.assignmentStatus * 100;
  }
  
  // 5. Escalation history component (0-10 points)
  const escalationScore = Math.min(escalationCount * 33, 100);
  score += (escalationScore / 100) * PRIORITY_WEIGHTS.escalationHistory * 100;
  
  // 6. Item type component (0-5 points)
  const typeScore = TYPE_BASE_SCORES[item.type] || 10;
  score += (typeScore / 20) * PRIORITY_WEIGHTS.itemType * 100;
  
  return Math.round(Math.min(score, 100));
}

// =============================================
// Queue Filtering and Sorting
// =============================================

/**
 * Default filter state
 */
export const DEFAULT_FILTERS: QueueFilters = {
  urgent: false,
  dueToday: false,
  assignedToMe: false,
  medication: false,
  cognitive: false,
  safety: false
};

/**
 * Filter queue items based on active filters
 */
export function filterQueueItems(
  items: QueueItem[],
  filters: QueueFilters,
  currentUserId?: string
): QueueItem[] {
  // If no filters are active, return all items
  const hasActiveFilters = Object.values(filters).some(v => v);
  if (!hasActiveFilters) {
    return items;
  }
  
  return items.filter(item => {
    // Urgent filter
    if (filters.urgent && item.severity !== 'urgent') {
      return false;
    }
    
    // Due today filter
    if (filters.dueToday) {
      const today = new Date();
      const dueDate = new Date(item.dueAt);
      const isToday = 
        dueDate.getDate() === today.getDate() &&
        dueDate.getMonth() === today.getMonth() &&
        dueDate.getFullYear() === today.getFullYear();
      if (!isToday) {
        return false;
      }
    }
    
    // Assigned to me filter
    if (filters.assignedToMe && currentUserId) {
      if (item.assignedTo !== currentUserId) {
        return false;
      }
    }
    
    // Medication filter (check type)
    if (filters.medication && item.type !== 'medication') {
      return false;
    }
    
    // Note: cognitive and safety filters would need additional item metadata
    // For now, we'll check if the title contains relevant keywords
    if (filters.cognitive) {
      const cognitiveKeywords = ['cognitive', 'memory', 'confusion', 'orientation', 'mental'];
      const hasCognitive = cognitiveKeywords.some(kw => 
        item.title.toLowerCase().includes(kw)
      );
      if (!hasCognitive) {
        return false;
      }
    }
    
    if (filters.safety) {
      const safetyKeywords = ['safety', 'fall', 'injury', 'emergency', 'accident'];
      const hasSafety = safetyKeywords.some(kw => 
        item.title.toLowerCase().includes(kw)
      );
      if (!hasSafety) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Sort queue items by severity first, then due time
 * Urgent items always appear at the top
 */
export function sortQueueItems(items: QueueItem[]): QueueItem[] {
  return [...items].sort((a, b) => {
    // First, sort by priority score (higher = more urgent)
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    
    // Then by severity
    const severityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) {
      return severityDiff;
    }
    
    // Finally by due date (earlier = higher priority)
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });
}

// =============================================
// Queue Item Creation from Different Sources
// =============================================

/**
 * Convert an Alert to a QueueItem
 */
export function alertToQueueItem(
  alert: Alert,
  elderRiskLevel: 'high' | 'medium' | 'low' = 'medium'
): QueueItem {
  const baseItem: Omit<QueueItem, 'priority'> = {
    id: alert.id,
    type: 'alert',
    severity: alert.severity,
    title: `${alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} Alert: ${alert.aiAnalysis.summary}`,
    elderName: alert.elderName,
    assignedTo: alert.assignedTo,
    dueAt: new Date(), // Alerts are immediately due
    estimatedMinutes: alert.severity === 'urgent' ? 15 : 30,
    status: alert.status === 'new' ? 'new' : alert.status === 'triaging' ? 'in_progress' : 'completed',
    suggestedAction: alert.aiAnalysis.recommendation
  };
  
  return {
    ...baseItem,
    priority: calculatePriority(baseItem, elderRiskLevel)
  };
}

/**
 * Convert a Task to a QueueItem
 */
export function taskToQueueItem(
  task: Task,
  elderRiskLevel: 'high' | 'medium' | 'low' = 'medium',
  escalationCount: number = 0
): QueueItem {
  const baseItem: Omit<QueueItem, 'priority'> = {
    id: task.id,
    type: task.parentId ? 'followup' : 'task',
    severity: task.priority,
    title: task.title,
    elderName: task.elderName,
    assignedTo: task.assignedTo,
    dueAt: new Date(task.dueAt),
    estimatedMinutes: task.estimatedMinutes,
    status: task.status,
    suggestedAction: task.description
  };
  
  return {
    ...baseItem,
    priority: calculatePriority(baseItem, elderRiskLevel, escalationCount)
  };
}

/**
 * Create a medication queue item
 */
export function createMedicationQueueItem(
  id: string,
  medicationName: string,
  elderName: string,
  dueAt: Date,
  assignedTo?: string
): QueueItem {
  const baseItem: Omit<QueueItem, 'priority'> = {
    id,
    type: 'medication',
    severity: 'high', // Medications are important
    title: `Medication: ${medicationName}`,
    elderName,
    assignedTo,
    dueAt,
    estimatedMinutes: 5,
    status: 'new',
    suggestedAction: `Verify ${medicationName} has been taken`
  };
  
  return {
    ...baseItem,
    priority: calculatePriority(baseItem)
  };
}

/**
 * Create a check-in queue item
 */
export function createCheckinQueueItem(
  id: string,
  elderName: string,
  dueAt: Date,
  checkinType: 'call' | 'visit' = 'call',
  assignedTo?: string
): QueueItem {
  const baseItem: Omit<QueueItem, 'priority'> = {
    id,
    type: 'checkin',
    severity: 'medium',
    title: `Scheduled ${checkinType}: ${elderName}`,
    elderName,
    assignedTo,
    dueAt,
    estimatedMinutes: checkinType === 'call' ? 10 : 30,
    status: 'new',
    suggestedAction: checkinType === 'call' 
      ? 'Make wellness check-in call' 
      : 'Conduct in-person wellness visit'
  };
  
  return {
    ...baseItem,
    priority: calculatePriority(baseItem)
  };
}

// =============================================
// Unified Queue Manager Class
// =============================================

export class CareQueueManager {
  private items: Map<string, QueueItem> = new Map();
  private escalationCounts: Map<string, number> = new Map();
  
  /**
   * Add an item to the queue
   */
  addItem(item: QueueItem): void {
    this.items.set(item.id, item);
  }
  
  /**
   * Remove an item from the queue
   */
  removeItem(id: string): boolean {
    return this.items.delete(id);
  }
  
  /**
   * Get an item by ID
   */
  getItem(id: string): QueueItem | undefined {
    return this.items.get(id);
  }
  
  /**
   * Update item status with state machine validation
   */
  updateStatus(
    id: string, 
    newStatus: QueueItemStatus
  ): { success: boolean; error?: string } {
    const item = this.items.get(id);
    if (!item) {
      return { success: false, error: `Item ${id} not found` };
    }
    
    const result = transitionStatus(item, newStatus);
    if (result.success && result.item) {
      this.items.set(id, result.item);
      
      // Track escalations
      if (newStatus === 'escalated') {
        const count = this.escalationCounts.get(id) || 0;
        this.escalationCounts.set(id, count + 1);
      }
    }
    
    return { success: result.success, error: result.error };
  }
  
  /**
   * Get all items sorted by priority
   */
  getAllItems(): QueueItem[] {
    return sortQueueItems(Array.from(this.items.values()));
  }
  
  /**
   * Get filtered and sorted items
   */
  getFilteredItems(filters: QueueFilters, currentUserId?: string): QueueItem[] {
    const allItems = Array.from(this.items.values());
    const filtered = filterQueueItems(allItems, filters, currentUserId);
    return sortQueueItems(filtered);
  }
  
  /**
   * Get items by status
   */
  getItemsByStatus(status: QueueItemStatus): QueueItem[] {
    return sortQueueItems(
      Array.from(this.items.values()).filter(item => item.status === status)
    );
  }
  
  /**
   * Get urgent items that require immediate attention
   */
  getUrgentItems(): QueueItem[] {
    return sortQueueItems(
      Array.from(this.items.values()).filter(
        item => item.severity === 'urgent' || item.severity === 'high'
      )
    );
  }
  
  /**
   * Get overdue items
   */
  getOverdueItems(): QueueItem[] {
    const now = new Date();
    return sortQueueItems(
      Array.from(this.items.values()).filter(
        item => new Date(item.dueAt) < now && item.status !== 'completed'
      )
    );
  }
  
  /**
   * Get items assigned to a specific user
   */
  getItemsForUser(userId: string): QueueItem[] {
    return sortQueueItems(
      Array.from(this.items.values()).filter(item => item.assignedTo === userId)
    );
  }
  
  /**
   * Merge alerts into the queue
   */
  mergeAlerts(alerts: Alert[], elderRiskLevel: 'high' | 'medium' | 'low' = 'medium'): void {
    alerts.forEach(alert => {
      if (alert.status !== 'resolved') {
        const queueItem = alertToQueueItem(alert, elderRiskLevel);
        this.addItem(queueItem);
      }
    });
  }
  
  /**
   * Merge tasks into the queue
   */
  mergeTasks(tasks: Task[], elderRiskLevel: 'high' | 'medium' | 'low' = 'medium'): void {
    tasks.forEach(task => {
      if (task.status !== 'completed') {
        const escalationCount = this.escalationCounts.get(task.id) || 0;
        const queueItem = taskToQueueItem(task, elderRiskLevel, escalationCount);
        this.addItem(queueItem);
      }
    });
  }
  
  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    byStatus: Record<QueueItemStatus, number>;
    bySeverity: Record<string, number>;
    overdue: number;
    urgent: number;
  } {
    const items = Array.from(this.items.values());
    const now = new Date();
    
    const byStatus: Record<QueueItemStatus, number> = {
      new: 0,
      in_progress: 0,
      completed: 0,
      snoozed: 0,
      escalated: 0
    };
    
    const bySeverity: Record<string, number> = {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    
    let overdue = 0;
    let urgent = 0;
    
    items.forEach(item => {
      byStatus[item.status]++;
      bySeverity[item.severity]++;
      
      if (new Date(item.dueAt) < now && item.status !== 'completed') {
        overdue++;
      }
      if (item.severity === 'urgent') {
        urgent++;
      }
    });
    
    return {
      total: items.length,
      byStatus,
      bySeverity,
      overdue,
      urgent
    };
  }
  
  /**
   * Clear the queue
   */
  clear(): void {
    this.items.clear();
    this.escalationCounts.clear();
  }
}

// =============================================
// Singleton Queue Instance
// =============================================

let queueInstance: CareQueueManager | null = null;

export function getCareQueue(): CareQueueManager {
  if (!queueInstance) {
    queueInstance = new CareQueueManager();
  }
  return queueInstance;
}

export function resetCareQueue(): void {
  queueInstance = null;
}


