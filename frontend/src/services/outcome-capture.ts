/**
 * Outcome Capture Service
 * Handles outcome documentation, follow-up task generation, and timeline entry creation
 */

import {
  TriageOutcome,
  TaskTemplate,
  TimelineEntry,
  OutcomeTemplate,
  Evidence
} from '../types/care-operations';

// =============================================
// Outcome Templates
// =============================================

export interface OutcomeTemplateDefinition {
  templateType: 'medication' | 'safety' | 'appointment' | 'general';
  title: string;
  description: string;
  outcomeOptions: string[];
  followUpRules: FollowUpRule[];
  evidenceTypes: string[];
}

export interface FollowUpRule {
  outcomeCondition: string;
  followUpTaskTemplate: TaskTemplate;
  dueInHours: number;
}

// Medication Verification Outcome Template
const MEDICATION_OUTCOME_TEMPLATE: OutcomeTemplateDefinition = {
  templateType: 'medication',
  title: 'Medication Verification Outcome',
  description: 'Document the outcome of medication verification task',
  outcomeOptions: [
    'All doses verified and taken',
    'Some doses missed',
    'Doses refused',
    'Unable to verify',
    'Medication not available'
  ],
  followUpRules: [
    {
      outcomeCondition: 'Some doses missed',
      followUpTaskTemplate: {
        title: 'Follow up on missed medication doses',
        description: 'Contact elder to understand why doses were missed and reschedule',
        priority: 'high',
        estimatedMinutes: 15,
        checklist: [
          { text: 'Contact elder about missed doses', required: true },
          { text: 'Understand reason for missing doses', required: true },
          { text: 'Reschedule missed doses if appropriate', required: true },
          { text: 'Document reason in notes', required: false }
        ],
        dueInHours: 4
      },
      dueInHours: 4
    },
    {
      outcomeCondition: 'Doses refused',
      followUpTaskTemplate: {
        title: 'Investigate medication refusal',
        description: 'Understand why elder is refusing medication and escalate if needed',
        priority: 'high',
        estimatedMinutes: 20,
        checklist: [
          { text: 'Ask about side effects or concerns', required: true },
          { text: 'Contact primary care physician if needed', required: true },
          { text: 'Document refusal reason', required: true }
        ],
        dueInHours: 2
      },
      dueInHours: 2
    },
    {
      outcomeCondition: 'Unable to verify',
      followUpTaskTemplate: {
        title: 'Escalate medication verification issue',
        description: 'Unable to verify medication status - escalate to primary caregiver',
        priority: 'urgent',
        estimatedMinutes: 10,
        checklist: [
          { text: 'Contact primary caregiver', required: true },
          { text: 'Provide context about verification issue', required: true }
        ],
        dueInHours: 1
      },
      dueInHours: 1
    }
  ],
  evidenceTypes: ['photo', 'notes', 'timestamp']
};

// Safety Check Outcome Template
const SAFETY_OUTCOME_TEMPLATE: OutcomeTemplateDefinition = {
  templateType: 'safety',
  title: 'Safety Check Outcome',
  description: 'Document the outcome of safety check task',
  outcomeOptions: [
    'All safety checks passed',
    'Minor safety issues found',
    'Major safety concerns identified',
    'Immediate intervention required'
  ],
  followUpRules: [
    {
      outcomeCondition: 'Minor safety issues found',
      followUpTaskTemplate: {
        title: 'Address minor safety issues',
        description: 'Implement solutions for identified minor safety concerns',
        priority: 'medium',
        estimatedMinutes: 30,
        checklist: [
          { text: 'Identify specific safety issues', required: true },
          { text: 'Implement corrective measures', required: true },
          { text: 'Verify improvements', required: true }
        ],
        dueInHours: 24
      },
      dueInHours: 24
    },
    {
      outcomeCondition: 'Major safety concerns identified',
      followUpTaskTemplate: {
        title: 'Address major safety concerns',
        description: 'Urgent action needed to address major safety concerns',
        priority: 'urgent',
        estimatedMinutes: 60,
        checklist: [
          { text: 'Document all safety concerns', required: true },
          { text: 'Contact family members', required: true },
          { text: 'Implement immediate safety measures', required: true },
          { text: 'Consider professional assessment', required: true }
        ],
        dueInHours: 2
      },
      dueInHours: 2
    },
    {
      outcomeCondition: 'Immediate intervention required',
      followUpTaskTemplate: {
        title: 'Emergency safety intervention',
        description: 'Immediate action required for critical safety issue',
        priority: 'urgent',
        estimatedMinutes: 15,
        checklist: [
          { text: 'Ensure elder safety immediately', required: true },
          { text: 'Contact emergency services if needed', required: true },
          { text: 'Notify all family members', required: true }
        ],
        dueInHours: 0.5
      },
      dueInHours: 0.5
    }
  ],
  evidenceTypes: ['photo', 'video', 'notes', 'timestamp']
};

// Medical Appointment Outcome Template
const APPOINTMENT_OUTCOME_TEMPLATE: OutcomeTemplateDefinition = {
  templateType: 'appointment',
  title: 'Medical Appointment Outcome',
  description: 'Document the outcome of medical appointment',
  outcomeOptions: [
    'Appointment completed successfully',
    'Appointment rescheduled',
    'Appointment cancelled',
    'Elder refused to attend',
    'Transportation issue'
  ],
  followUpRules: [
    {
      outcomeCondition: 'Appointment completed successfully',
      followUpTaskTemplate: {
        title: 'Document appointment results',
        description: 'Collect and document results from completed appointment',
        priority: 'medium',
        estimatedMinutes: 20,
        checklist: [
          { text: 'Collect appointment summary from elder', required: true },
          { text: 'Document any new medications or instructions', required: true },
          { text: 'Schedule any recommended follow-ups', required: true }
        ],
        dueInHours: 4
      },
      dueInHours: 4
    },
    {
      outcomeCondition: 'Appointment rescheduled',
      followUpTaskTemplate: {
        title: 'Confirm rescheduled appointment',
        description: 'Confirm new appointment date and time with elder',
        priority: 'medium',
        estimatedMinutes: 10,
        checklist: [
          { text: 'Confirm new appointment date/time', required: true },
          { text: 'Update calendar', required: true },
          { text: 'Arrange transportation if needed', required: true }
        ],
        dueInHours: 24
      },
      dueInHours: 24
    },
    {
      outcomeCondition: 'Elder refused to attend',
      followUpTaskTemplate: {
        title: 'Follow up on appointment refusal',
        description: 'Understand why elder refused appointment and escalate if needed',
        priority: 'high',
        estimatedMinutes: 20,
        checklist: [
          { text: 'Understand reason for refusal', required: true },
          { text: 'Contact physician if medically necessary', required: true },
          { text: 'Document refusal and reason', required: true }
        ],
        dueInHours: 4
      },
      dueInHours: 4
    }
  ],
  evidenceTypes: ['notes', 'documents', 'timestamp']
};

// General Outcome Template
const GENERAL_OUTCOME_TEMPLATE: OutcomeTemplateDefinition = {
  templateType: 'general',
  title: 'General Task Outcome',
  description: 'Document the outcome of a general care task',
  outcomeOptions: [
    'Completed successfully',
    'Partially completed',
    'Not completed',
    'Escalated'
  ],
  followUpRules: [
    {
      outcomeCondition: 'Partially completed',
      followUpTaskTemplate: {
        title: 'Complete remaining task items',
        description: 'Complete the remaining items from the original task',
        priority: 'medium',
        estimatedMinutes: 30,
        checklist: [
          { text: 'Review what was not completed', required: true },
          { text: 'Complete remaining items', required: true },
          { text: 'Verify completion', required: true }
        ],
        dueInHours: 24
      },
      dueInHours: 24
    },
    {
      outcomeCondition: 'Not completed',
      followUpTaskTemplate: {
        title: 'Retry incomplete task',
        description: 'Attempt to complete the task again',
        priority: 'high',
        estimatedMinutes: 30,
        checklist: [
          { text: 'Understand reason for non-completion', required: true },
          { text: 'Address any barriers', required: true },
          { text: 'Retry task completion', required: true }
        ],
        dueInHours: 12
      },
      dueInHours: 12
    },
    {
      outcomeCondition: 'Escalated',
      followUpTaskTemplate: {
        title: 'Handle escalated task',
        description: 'Task has been escalated and requires attention',
        priority: 'urgent',
        estimatedMinutes: 20,
        checklist: [
          { text: 'Review escalation reason', required: true },
          { text: 'Determine appropriate action', required: true },
          { text: 'Assign to appropriate person', required: true }
        ],
        dueInHours: 2
      },
      dueInHours: 2
    }
  ],
  evidenceTypes: ['notes', 'timestamp']
};

// =============================================
// Outcome Templates Registry
// =============================================

const OUTCOME_TEMPLATES: Record<string, OutcomeTemplateDefinition> = {
  medication: MEDICATION_OUTCOME_TEMPLATE,
  safety: SAFETY_OUTCOME_TEMPLATE,
  appointment: APPOINTMENT_OUTCOME_TEMPLATE,
  general: GENERAL_OUTCOME_TEMPLATE
};

// =============================================
// Outcome Capture Service
// =============================================

export class OutcomeCaptureService {
  /**
   * Get outcome template by type
   */
  static getOutcomeTemplate(templateType: string): OutcomeTemplateDefinition | null {
    return OUTCOME_TEMPLATES[templateType] || null;
  }

  /**
   * Get all available outcome templates
   */
  static getAvailableTemplates(): OutcomeTemplateDefinition[] {
    return Object.values(OUTCOME_TEMPLATES);
  }

  /**
   * Capture outcome with validation
   */
  static captureOutcome(
    taskId: string,
    templateType: string,
    outcome: string,
    notes: string,
    evidence: Evidence[] = []
  ): { valid: boolean; errors: string[]; outcome?: TriageOutcome } {
    const template = this.getOutcomeTemplate(templateType);
    if (!template) {
      return { valid: false, errors: ['Invalid outcome template type'] };
    }

    const errors: string[] = [];

    // Validate outcome selection
    if (!template.outcomeOptions.includes(outcome)) {
      errors.push(`Invalid outcome: ${outcome}`);
    }

    // Validate evidence if required
    if (evidence.length === 0 && template.evidenceTypes.length > 0) {
      // Evidence is optional but recommended
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    const capturedOutcome: TriageOutcome = {
      actionTaken: outcome,
      emergencyServicesCalled: false,
      notes,
      evidence,
      followUpRequired: this.shouldGenerateFollowUp(template, outcome),
      nextCheckIn: this.calculateNextCheckIn(template, outcome)
    };

    return { valid: true, errors: [], outcome: capturedOutcome };
  }

  /**
   * Generate follow-up tasks based on outcome
   */
  static generateFollowUpTasks(
    templateType: string,
    outcome: string
  ): TaskTemplate[] {
    const template = this.getOutcomeTemplate(templateType);
    if (!template) {
      return [];
    }

    const followUpTasks: TaskTemplate[] = [];

    for (const rule of template.followUpRules) {
      if (this.evaluateOutcomeCondition(rule.outcomeCondition, outcome)) {
        followUpTasks.push(rule.followUpTaskTemplate);
      }
    }

    return followUpTasks;
  }

  /**
   * Create timeline entry for outcome
   */
  static createTimelineEntry(
    familyId: string,
    elderId: string,
    taskId: string,
    outcome: TriageOutcome,
    templateType: string,
    caregiver: { id: string; name: string }
  ): TimelineEntry {
    const now = new Date();

    return {
      id: `TIMELINE#${taskId}#${now.getTime()}`,
      familyId,
      elderId,
      timestamp: now.toISOString(),
      eventType: 'outcome_captured',
      title: `Task Outcome: ${templateType}`,
      description: outcome.notes || outcome.actionTaken,
      details: {
        taskId,
        templateType,
        outcome: outcome.actionTaken,
        notes: outcome.notes,
        evidence: outcome.evidence,
        followUpRequired: outcome.followUpRequired
      },
      caregiver,
      immutable: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
  }

  /**
   * Validate outcome completeness
   */
  static validateOutcomeCompleteness(
    templateType: string,
    outcome: string,
    notes: string
  ): { valid: boolean; missingFields: string[] } {
    const template = this.getOutcomeTemplate(templateType);
    if (!template) {
      return { valid: false, missingFields: ['Invalid template type'] };
    }

    const missingFields: string[] = [];

    if (!outcome || !template.outcomeOptions.includes(outcome)) {
      missingFields.push('Outcome selection');
    }

    // Notes are optional but recommended for certain outcomes
    if (!notes && ['Partially completed', 'Not completed', 'Escalated'].includes(outcome)) {
      missingFields.push('Notes (recommended for this outcome)');
    }

    return {
      valid: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * Get evidence requirements for template
   */
  static getEvidenceRequirements(templateType: string): string[] {
    const template = this.getOutcomeTemplate(templateType);
    return template?.evidenceTypes || [];
  }

  // =============================================
  // Private Helper Methods
  // =============================================

  private static shouldGenerateFollowUp(template: OutcomeTemplateDefinition, outcome: string): boolean {
    return template.followUpRules.some(rule => this.evaluateOutcomeCondition(rule.outcomeCondition, outcome));
  }

  private static calculateNextCheckIn(template: OutcomeTemplateDefinition, outcome: string): string | undefined {
    for (const rule of template.followUpRules) {
      if (this.evaluateOutcomeCondition(rule.outcomeCondition, outcome)) {
        const nextCheckIn = new Date();
        nextCheckIn.setHours(nextCheckIn.getHours() + rule.dueInHours);
        return nextCheckIn.toISOString();
      }
    }
    return undefined;
  }

  private static evaluateOutcomeCondition(condition: string, outcome: string): boolean {
    // Simple exact match for now
    return condition === outcome;
  }
}

// =============================================
// Utility Functions
// =============================================

/**
 * Get outcome template by type
 */
export function getOutcomeTemplate(templateType: string): OutcomeTemplateDefinition | null {
  return OutcomeCaptureService.getOutcomeTemplate(templateType);
}

/**
 * Capture outcome with validation
 */
export function captureOutcome(
  taskId: string,
  templateType: string,
  outcome: string,
  notes: string,
  evidence?: Evidence[]
) {
  return OutcomeCaptureService.captureOutcome(taskId, templateType, outcome, notes, evidence);
}

/**
 * Generate follow-up tasks
 */
export function generateFollowUpTasks(templateType: string, outcome: string): TaskTemplate[] {
  return OutcomeCaptureService.generateFollowUpTasks(templateType, outcome);
}

/**
 * Create timeline entry
 */
export function createTimelineEntry(
  familyId: string,
  elderId: string,
  taskId: string,
  outcome: TriageOutcome,
  templateType: string,
  caregiver: { id: string; name: string }
): TimelineEntry {
  return OutcomeCaptureService.createTimelineEntry(familyId, elderId, taskId, outcome, templateType, caregiver);
}
