/**
 * Timeline and Outcome Management
 * Creates immutable audit trails for all care events
 * Implements outcome capture and follow-up task automation
 */

import {
  TimelineEntry,
  Outcome,
  Task,
  TaskTemplate,
  Evidence
} from '../types/care-operations';

// =============================================
// Timeline Entry Types
// =============================================

export type TimelineEventType = 
  | 'alert_created'
  | 'task_completed'
  | 'task_assigned'
  | 'triage_performed'
  | 'medication_taken'
  | 'medication_missed'
  | 'escalation_triggered'
  | 'outcome_captured'
  | 'call_completed'
  | 'wellness_checkin'
  | 'emergency_response'
  | 'note_added';

// =============================================
// Outcome Templates
// =============================================

export interface OutcomeTemplate {
  id: string;
  templateType: 'medication' | 'safety' | 'appointment' | 'general' | 'triage' | 'wellness';
  title: string;
  description: string;
  outcomeOptions: string[];
  followUpRules: FollowUpRule[];
  evidenceTypes: ('photo' | 'audio' | 'note' | 'measurement')[];
}

export interface FollowUpRule {
  outcomeCondition: string; // e.g., 'failed', 'partial', 'requires_attention'
  followUpTaskTemplate: TaskTemplate;
  dueInHours: number;
}

/**
 * Pre-defined outcome templates for common scenarios
 */
export const OUTCOME_TEMPLATES: Record<string, OutcomeTemplate> = {
  medication_verification: {
    id: 'medication_verification',
    templateType: 'medication',
    title: 'Medication Verification',
    description: 'Verify medications have been taken as scheduled',
    outcomeOptions: [
      'All medications taken correctly',
      'Some medications missed',
      'Confusion about medications',
      'Side effects observed',
      'Refill needed'
    ],
    followUpRules: [
      {
        outcomeCondition: 'Some medications missed',
        followUpTaskTemplate: {
          title: 'Follow-up on missed medications',
          description: 'Check in about missed doses and help establish reminder system',
          priority: 'high',
          estimatedMinutes: 15,
          checklist: [
            { text: 'Identify which medications were missed', required: true },
            { text: 'Discuss barriers to taking medication', required: true },
            { text: 'Set up reminder system if needed', required: false }
          ],
          dueInHours: 4
        },
        dueInHours: 4
      },
      {
        outcomeCondition: 'Side effects observed',
        followUpTaskTemplate: {
          title: 'Report medication side effects to doctor',
          description: 'Contact healthcare provider about observed side effects',
          priority: 'high',
          estimatedMinutes: 20,
          checklist: [
            { text: 'Document specific side effects', required: true },
            { text: 'Call doctor or nurse line', required: true },
            { text: 'Note any medication changes recommended', required: true }
          ],
          dueInHours: 24
        },
        dueInHours: 24
      }
    ],
    evidenceTypes: ['photo', 'note']
  },
  
  safety_check: {
    id: 'safety_check',
    templateType: 'safety',
    title: 'Safety Check',
    description: 'Complete home safety assessment',
    outcomeOptions: [
      'All safety items verified',
      'Fall hazards identified',
      'Equipment needs attention',
      'Emergency contacts verified',
      'Concerns observed'
    ],
    followUpRules: [
      {
        outcomeCondition: 'Fall hazards identified',
        followUpTaskTemplate: {
          title: 'Address fall hazards',
          description: 'Remove or mitigate identified fall hazards',
          priority: 'urgent',
          estimatedMinutes: 30,
          checklist: [
            { text: 'Remove loose rugs or secure them', required: true },
            { text: 'Ensure adequate lighting', required: true },
            { text: 'Clear walkways of obstacles', required: true },
            { text: 'Check grab bars are secure', required: false }
          ],
          dueInHours: 24
        },
        dueInHours: 24
      }
    ],
    evidenceTypes: ['photo', 'note']
  },
  
  medical_appointment: {
    id: 'medical_appointment',
    templateType: 'appointment',
    title: 'Medical Appointment',
    description: 'Accompany to or follow up on medical appointment',
    outcomeOptions: [
      'Appointment completed successfully',
      'Appointment rescheduled',
      'New medications prescribed',
      'Referral given',
      'Follow-up needed'
    ],
    followUpRules: [
      {
        outcomeCondition: 'New medications prescribed',
        followUpTaskTemplate: {
          title: 'Set up new medication',
          description: 'Pick up prescription and integrate into medication routine',
          priority: 'high',
          estimatedMinutes: 30,
          checklist: [
            { text: 'Pick up prescription from pharmacy', required: true },
            { text: 'Add to medication tracker', required: true },
            { text: 'Review side effects and interactions', required: true },
            { text: 'Set up reminder for new medication', required: true }
          ],
          dueInHours: 24
        },
        dueInHours: 24
      },
      {
        outcomeCondition: 'Referral given',
        followUpTaskTemplate: {
          title: 'Schedule referral appointment',
          description: 'Contact referred specialist and schedule appointment',
          priority: 'medium',
          estimatedMinutes: 20,
          checklist: [
            { text: 'Call specialist office', required: true },
            { text: 'Schedule appointment', required: true },
            { text: 'Request records transfer', required: false }
          ],
          dueInHours: 72
        },
        dueInHours: 72
      }
    ],
    evidenceTypes: ['note', 'photo']
  },
  
  wellness_checkin: {
    id: 'wellness_checkin',
    templateType: 'wellness',
    title: 'Wellness Check-in',
    description: 'Regular wellness and emotional check-in call',
    outcomeOptions: [
      'Elder in good spirits',
      'Mild concerns noted',
      'Significant concerns',
      'Needs social interaction',
      'Requesting assistance'
    ],
    followUpRules: [
      {
        outcomeCondition: 'Significant concerns',
        followUpTaskTemplate: {
          title: 'Follow up on wellness concerns',
          description: 'Address significant concerns identified during check-in',
          priority: 'high',
          estimatedMinutes: 30,
          checklist: [
            { text: 'Document specific concerns', required: true },
            { text: 'Discuss with family members', required: true },
            { text: 'Determine if professional help needed', required: true }
          ],
          dueInHours: 24
        },
        dueInHours: 24
      },
      {
        outcomeCondition: 'Needs social interaction',
        followUpTaskTemplate: {
          title: 'Arrange social activity',
          description: 'Schedule visit or social activity to address isolation',
          priority: 'medium',
          estimatedMinutes: 15,
          checklist: [
            { text: 'Plan visit or video call', required: true },
            { text: 'Consider group activities', required: false }
          ],
          dueInHours: 48
        },
        dueInHours: 48
      }
    ],
    evidenceTypes: ['note', 'audio']
  },
  
  triage_outcome: {
    id: 'triage_outcome',
    templateType: 'triage',
    title: 'Triage Outcome',
    description: 'Document outcome of urgent triage protocol',
    outcomeOptions: [
      'Emergency services called',
      'Urgent care visit',
      'Condition stabilized',
      'Monitoring at home',
      'False alarm'
    ],
    followUpRules: [
      {
        outcomeCondition: 'Emergency services called',
        followUpTaskTemplate: {
          title: 'Follow up on emergency response',
          description: 'Track emergency response outcome and hospital status',
          priority: 'urgent',
          estimatedMinutes: 30,
          checklist: [
            { text: 'Confirm ambulance arrival', required: true },
            { text: 'Notify all family members', required: true },
            { text: 'Get hospital information', required: true },
            { text: 'Arrange for someone to be at hospital', required: true }
          ],
          dueInHours: 1
        },
        dueInHours: 1
      },
      {
        outcomeCondition: 'Monitoring at home',
        followUpTaskTemplate: {
          title: 'Follow-up monitoring check',
          description: 'Check on condition after monitoring period',
          priority: 'high',
          estimatedMinutes: 15,
          checklist: [
            { text: 'Call to check current status', required: true },
            { text: 'Ask about symptom changes', required: true },
            { text: 'Determine if escalation needed', required: true }
          ],
          dueInHours: 4
        },
        dueInHours: 4
      }
    ],
    evidenceTypes: ['note', 'photo', 'audio']
  }
};

// =============================================
// Timeline Entry Creation
// =============================================

/**
 * Create a new timeline entry
 * Timeline entries are immutable once created
 */
export function createTimelineEntry(
  familyId: string,
  elderId: string,
  eventType: TimelineEventType,
  title: string,
  description: string,
  caregiverId: string,
  caregiverName: string,
  details: Record<string, any> = {},
  evidence: Evidence[] = [],
  relatedItems: string[] = []
): TimelineEntry {
  const now = new Date().toISOString();
  
  return {
    id: `TIMELINE#${familyId}#${Date.now()}#${Math.random().toString(36).substring(2, 8)}`,
    familyId,
    elderId,
    timestamp: now,
    eventType,
    title,
    description,
    details,
    caregiver: {
      id: caregiverId,
      name: caregiverName
    },
    immutable: true,
    createdAt: now,
    updatedAt: now,
    participants: [caregiverId],
    evidence,
    relatedItems
  };
}

/**
 * Create timeline entry for task completion
 */
export function createTaskCompletedEntry(
  familyId: string,
  elderId: string,
  task: Task,
  outcome: Outcome,
  caregiverId: string,
  caregiverName: string
): TimelineEntry {
  return createTimelineEntry(
    familyId,
    elderId,
    'task_completed',
    `Task Completed: ${task.title}`,
    `${caregiverName} completed "${task.title}" with result: ${outcome.result}`,
    caregiverId,
    caregiverName,
    {
      taskId: task.id,
      taskTitle: task.title,
      taskPriority: task.priority,
      outcomeResult: outcome.result,
      outcomeNotes: outcome.notes,
      estimatedMinutes: task.estimatedMinutes,
      checklistItems: task.checklist?.length || 0
    },
    outcome.evidenceUrls.map(url => ({
      type: 'photo' as const,
      url,
      timestamp: new Date().toISOString(),
      uploadedBy: caregiverId
    })),
    [task.id, outcome.id]
  );
}

/**
 * Create timeline entry for alert
 */
export function createAlertEntry(
  familyId: string,
  elderId: string,
  alertId: string,
  alertType: string,
  alertSeverity: string,
  summary: string,
  caregiverId: string,
  caregiverName: string
): TimelineEntry {
  return createTimelineEntry(
    familyId,
    elderId,
    'alert_created',
    `Alert: ${alertType}`,
    `${alertSeverity.toUpperCase()} alert created - ${summary}`,
    caregiverId,
    caregiverName,
    {
      alertId,
      alertType,
      alertSeverity,
      summary
    },
    [],
    [alertId]
  );
}

/**
 * Create timeline entry for escalation
 */
export function createEscalationEntry(
  familyId: string,
  elderId: string,
  taskId: string,
  taskTitle: string,
  fromAssignee: string,
  toAssignee: string,
  reason: string,
  caregiverId: string,
  caregiverName: string
): TimelineEntry {
  return createTimelineEntry(
    familyId,
    elderId,
    'escalation_triggered',
    `Escalation: ${taskTitle}`,
    `Task escalated from ${fromAssignee} to ${toAssignee}. Reason: ${reason}`,
    caregiverId,
    caregiverName,
    {
      taskId,
      taskTitle,
      fromAssignee,
      toAssignee,
      escalationReason: reason
    },
    [],
    [taskId]
  );
}

// =============================================
// Outcome Processing
// =============================================

/**
 * Process an outcome and generate follow-up tasks
 */
export function processOutcome(
  outcome: Outcome,
  template: OutcomeTemplate,
  elderId: string,
  elderName: string
): TaskTemplate[] {
  const followUpTasks: TaskTemplate[] = [];
  
  // Check each follow-up rule
  template.followUpRules.forEach(rule => {
    // Check if outcome matches the condition
    const outcomeText = outcome.result === 'failed' ? outcome.notes : outcome.result;
    
    if (outcomeText.toLowerCase().includes(rule.outcomeCondition.toLowerCase()) ||
        outcome.result === 'failed' ||
        outcome.result === 'partial') {
      
      // Create follow-up task from template
      const followUpTask: TaskTemplate = {
        ...rule.followUpTaskTemplate,
        title: `${rule.followUpTaskTemplate.title} - ${elderName}`,
        dueInHours: rule.dueInHours
      };
      
      followUpTasks.push(followUpTask);
    }
  });
  
  return followUpTasks;
}

/**
 * Create outcome from task completion
 */
export function createOutcome(
  taskId: string,
  result: 'success' | 'partial' | 'failed',
  notes: string,
  evidenceUrls: string[],
  recordedBy: string,
  followUpRequired: boolean = false
): Outcome {
  return {
    id: `OUTCOME#${taskId}#${Date.now()}`,
    taskId,
    result,
    notes,
    evidenceUrls,
    recordedAt: new Date().toISOString(),
    recordedBy,
    followUpTasks: []
  };
}

// =============================================
// Timeline Manager Class
// =============================================

export class TimelineManager {
  private entries: Map<string, TimelineEntry> = new Map();
  
  /**
   * Add a timeline entry
   * Once added, entries cannot be modified (immutable)
   */
  addEntry(entry: TimelineEntry): void {
    if (this.entries.has(entry.id)) {
      throw new Error(`Timeline entry ${entry.id} already exists and cannot be modified`);
    }
    this.entries.set(entry.id, { ...entry, immutable: true });
  }
  
  /**
   * Get entry by ID (read-only)
   */
  getEntry(id: string): TimelineEntry | undefined {
    const entry = this.entries.get(id);
    return entry ? { ...entry } : undefined;
  }
  
  /**
   * Get all entries for an elder (chronological)
   */
  getEntriesForElder(elderId: string): TimelineEntry[] {
    return Array.from(this.entries.values())
      .filter(entry => entry.elderId === elderId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  
  /**
   * Get all entries for a family
   */
  getEntriesForFamily(familyId: string): TimelineEntry[] {
    return Array.from(this.entries.values())
      .filter(entry => entry.familyId === familyId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  
  /**
   * Get entries by event type
   */
  getEntriesByType(eventType: TimelineEventType): TimelineEntry[] {
    return Array.from(this.entries.values())
      .filter(entry => entry.eventType === eventType)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  
  /**
   * Get entries within date range
   */
  getEntriesInRange(startDate: Date, endDate: Date): TimelineEntry[] {
    return Array.from(this.entries.values())
      .filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= startDate && entryDate <= endDate;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  
  /**
   * Get entries by caregiver
   */
  getEntriesByCaregiver(caregiverId: string): TimelineEntry[] {
    return Array.from(this.entries.values())
      .filter(entry => entry.caregiver.id === caregiverId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  
  /**
   * Search entries by title or description
   */
  searchEntries(query: string): TimelineEntry[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.entries.values())
      .filter(entry => 
        entry.title.toLowerCase().includes(lowerQuery) ||
        entry.description.toLowerCase().includes(lowerQuery)
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  
  /**
   * Get timeline statistics
   */
  getStats(familyId?: string): {
    total: number;
    byEventType: Record<string, number>;
    byCaregiver: Record<string, number>;
    last24Hours: number;
    lastWeek: number;
  } {
    const entries = familyId 
      ? this.getEntriesForFamily(familyId)
      : Array.from(this.entries.values());
    
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    
    const byEventType: Record<string, number> = {};
    const byCaregiver: Record<string, number> = {};
    let last24Hours = 0;
    let lastWeek = 0;
    
    entries.forEach(entry => {
      // By event type
      byEventType[entry.eventType] = (byEventType[entry.eventType] || 0) + 1;
      
      // By caregiver
      byCaregiver[entry.caregiver.name] = (byCaregiver[entry.caregiver.name] || 0) + 1;
      
      // Time-based counts
      const entryTime = new Date(entry.timestamp).getTime();
      if (entryTime >= dayAgo) last24Hours++;
      if (entryTime >= weekAgo) lastWeek++;
    });
    
    return {
      total: entries.length,
      byEventType,
      byCaregiver,
      last24Hours,
      lastWeek
    };
  }
  
  /**
   * Verify entry immutability
   */
  verifyImmutability(entryId: string): boolean {
    const entry = this.entries.get(entryId);
    return entry?.immutable === true;
  }
  
  /**
   * Export entries for medical professional report
   */
  exportForMedicalReport(
    elderId: string,
    startDate: Date,
    endDate: Date
  ): {
    elder: string;
    period: string;
    entries: Array<{
      date: string;
      type: string;
      summary: string;
      caregiver: string;
    }>;
    summary: {
      totalEvents: number;
      completedTasks: number;
      alerts: number;
      medicationEvents: number;
    };
  } {
    const entries = this.getEntriesForElder(elderId)
      .filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= startDate && entryDate <= endDate;
      });
    
    let completedTasks = 0;
    let alerts = 0;
    let medicationEvents = 0;
    
    const exportedEntries = entries.map(entry => {
      if (entry.eventType === 'task_completed') completedTasks++;
      if (entry.eventType === 'alert_created') alerts++;
      if (entry.eventType.includes('medication')) medicationEvents++;
      
      return {
        date: new Date(entry.timestamp).toLocaleDateString(),
        type: entry.eventType.replace(/_/g, ' '),
        summary: entry.description,
        caregiver: entry.caregiver.name
      };
    });
    
    return {
      elder: elderId,
      period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      entries: exportedEntries,
      summary: {
        totalEvents: entries.length,
        completedTasks,
        alerts,
        medicationEvents
      }
    };
  }
}

// =============================================
// Singleton Instance
// =============================================

let timelineInstance: TimelineManager | null = null;

export function getTimelineManager(): TimelineManager {
  if (!timelineInstance) {
    timelineInstance = new TimelineManager();
  }
  return timelineInstance;
}

export function resetTimelineManager(): void {
  timelineInstance = null;
}

// =============================================
// Validation
// =============================================

/**
 * Validate a timeline entry
 */
export function validateTimelineEntry(entry: TimelineEntry): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!entry.id) errors.push('Entry ID is required');
  if (!entry.familyId) errors.push('Family ID is required');
  if (!entry.elderId) errors.push('Elder ID is required');
  if (!entry.eventType) errors.push('Event type is required');
  if (!entry.title) errors.push('Title is required');
  if (!entry.description) errors.push('Description is required');
  if (!entry.caregiver?.id || !entry.caregiver?.name) {
    errors.push('Caregiver information is required');
  }
  if (entry.immutable !== true) {
    errors.push('Timeline entries must be immutable');
  }
  if (!entry.timestamp) errors.push('Timestamp is required');
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate an outcome
 */
export function validateOutcome(outcome: Outcome): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!outcome.id) errors.push('Outcome ID is required');
  if (!outcome.taskId) errors.push('Task ID is required');
  if (!['success', 'partial', 'failed'].includes(outcome.result)) {
    errors.push('Invalid outcome result');
  }
  if (!outcome.recordedBy) errors.push('Recorder ID is required');
  if (!outcome.recordedAt) errors.push('Recording timestamp is required');
  
  return {
    valid: errors.length === 0,
    errors
  };
}


