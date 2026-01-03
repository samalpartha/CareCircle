/**
 * Property-Based Tests for Outcome Capture Service
 * Feature: care-operations-console, Property 8: Outcome Capture Enforcement
 * Validates: Requirements 2.6, 5.1, 6.5
 */

import {
  OutcomeCaptureService,
  getOutcomeTemplate,
  captureOutcome,
  generateFollowUpTasks,
  createTimelineEntry
} from '../outcome-capture';
import { TriageOutcome, Evidence } from '../../types/care-operations';

// Simple property-based testing helpers
const generateRandomString = (length: number = 10): string =>
  Math.random().toString(36).substring(2, length + 2);

const generateRandomTaskId = (): string =>
  `TASK#${Date.now()}-${generateRandomString(8)}`;

const generateRandomFamilyId = (): string =>
  `FAMILY#${generateRandomString(8)}`;

const generateRandomElderName = (): string => {
  const names = ['John', 'Mary', 'Robert', 'Patricia', 'Michael', 'Jennifer'];
  return names[Math.floor(Math.random() * names.length)];
};

const generateRandomTemplateType = (): 'medication' | 'safety' | 'appointment' | 'general' => {
  const types: ('medication' | 'safety' | 'appointment' | 'general')[] = [
    'medication',
    'safety',
    'appointment',
    'general'
  ];
  return types[Math.floor(Math.random() * types.length)];
};

const generateRandomOutcome = (templateType: string): string => {
  const outcomeMap: Record<string, string[]> = {
    medication: [
      'All doses verified and taken',
      'Some doses missed',
      'Doses refused',
      'Unable to verify',
      'Medication not available'
    ],
    safety: [
      'All safety checks passed',
      'Minor safety issues found',
      'Major safety concerns identified',
      'Immediate intervention required'
    ],
    appointment: [
      'Appointment completed successfully',
      'Appointment rescheduled',
      'Appointment cancelled',
      'Elder refused to attend',
      'Transportation issue'
    ],
    general: [
      'Completed successfully',
      'Partially completed',
      'Not completed',
      'Escalated'
    ]
  };

  const outcomes = outcomeMap[templateType] || outcomeMap.general;
  return outcomes[Math.floor(Math.random() * outcomes.length)];
};

const generateRandomNotes = (): string => {
  const notes = [
    'Task completed without issues',
    'Some challenges encountered',
    'Requires follow-up',
    'Elder was cooperative',
    'Additional support needed'
  ];
  return notes[Math.floor(Math.random() * notes.length)];
};

const generateRandomEvidence = (): Evidence[] => {
  const types: ('photo' | 'audio' | 'note' | 'measurement')[] = ['photo', 'audio', 'note', 'measurement'];
  const count = Math.floor(Math.random() * 3);
  const evidence: Evidence[] = [];

  for (let i = 0; i < count; i++) {
    evidence.push({
      type: types[Math.floor(Math.random() * types.length)],
      url: `https://example.com/evidence/${generateRandomString(8)}`,
      timestamp: new Date().toISOString(),
      uploadedBy: `USER#${generateRandomString(8)}`
    });
  }

  return evidence;
};

describe('Outcome Capture Service Property Tests', () => {
  /**
   * Property 8: Outcome Capture Enforcement
   * For any completed task, the system should enforce outcome capture with:
   * - Valid outcome selection from predefined options
   * - Optional notes for documentation
   * - Automatic follow-up task generation based on outcome
   * - Immutable timeline entry creation
   * Validates: Requirements 2.6, 5.1, 6.5
   */
  test('Property 8: Outcome Capture Enforcement - Valid Outcomes', () => {
    // Test with 100 random iterations
    for (let i = 0; i < 100; i++) {
      const taskId = generateRandomTaskId();
      const templateType = generateRandomTemplateType();
      const outcome = generateRandomOutcome(templateType);
      const notes = generateRandomNotes();
      const evidence = generateRandomEvidence();

      // Capture outcome
      const result = captureOutcome(taskId, templateType, outcome, notes, evidence);

      // Should always succeed with valid outcome
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.outcome).toBeTruthy();

      // Captured outcome should have all required fields
      const capturedOutcome = result.outcome!;
      expect(capturedOutcome.actionTaken).toBe(outcome);
      expect(capturedOutcome.notes).toBe(notes);
      expect(capturedOutcome.evidence).toEqual(evidence);
      expect(typeof capturedOutcome.emergencyServicesCalled).toBe('boolean');
      expect(typeof capturedOutcome.followUpRequired).toBe('boolean');
    }
  });

  /**
   * Property 8.1: Invalid Outcome Rejection
   * For any invalid outcome selection, the system should reject with clear error
   */
  test('Property 8.1: Invalid Outcome Rejection', () => {
    for (let i = 0; i < 50; i++) {
      const taskId = generateRandomTaskId();
      const templateType = generateRandomTemplateType();
      const invalidOutcome = `INVALID_OUTCOME_${generateRandomString(8)}`;
      const notes = generateRandomNotes();

      // Attempt to capture with invalid outcome
      const result = captureOutcome(taskId, templateType, invalidOutcome, notes);

      // Should always fail with invalid outcome
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid outcome');
      expect(result.outcome).toBeUndefined();
    }
  });

  /**
   * Property 8.2: Follow-up Task Generation
   * For any outcome that requires follow-up, the system should automatically generate
   * appropriate follow-up tasks with correct priority and due dates
   */
  test('Property 8.2: Follow-up Task Generation', () => {
    for (let i = 0; i < 50; i++) {
      const templateType = generateRandomTemplateType();
      const outcome = generateRandomOutcome(templateType);

      // Generate follow-up tasks
      const followUpTasks = generateFollowUpTasks(templateType, outcome);

      // Should return array (may be empty for some outcomes)
      expect(Array.isArray(followUpTasks)).toBe(true);

      // Each follow-up task should have required fields
      for (const task of followUpTasks) {
        expect(task.title).toBeTruthy();
        expect(task.description).toBeTruthy();
        expect(['urgent', 'high', 'medium', 'low']).toContain(task.priority);
        expect(task.estimatedMinutes).toBeGreaterThan(0);
        expect(Array.isArray(task.checklist)).toBe(true);
        expect(task.dueInHours).toBeGreaterThan(0);

        // Each checklist item should have required fields
        for (const item of task.checklist) {
          expect(item.text).toBeTruthy();
          expect(typeof item.required).toBe('boolean');
        }
      }
    }
  });

  /**
   * Property 8.3: Timeline Entry Immutability
   * For any outcome capture, the system should create an immutable timeline entry
   * that cannot be edited after creation
   */
  test('Property 8.3: Timeline Entry Immutability', () => {
    for (let i = 0; i < 50; i++) {
      const familyId = generateRandomFamilyId();
      const elderId = `ELDER#${generateRandomString(8)}`;
      const taskId = generateRandomTaskId();
      const templateType = generateRandomTemplateType();
      const outcome = generateRandomOutcome(templateType);
      const notes = generateRandomNotes();

      // Capture outcome
      const captureResult = captureOutcome(taskId, templateType, outcome, notes);
      expect(captureResult.valid).toBe(true);

      // Create timeline entry
      const timelineEntry = createTimelineEntry(
        familyId,
        elderId,
        taskId,
        captureResult.outcome!,
        templateType,
        { id: `USER#${generateRandomString(8)}`, name: generateRandomElderName() }
      );

      // Timeline entry should be immutable
      expect(timelineEntry.immutable).toBe(true);
      expect(timelineEntry.id).toBeTruthy();
      expect(timelineEntry.familyId).toBe(familyId);
      expect(timelineEntry.elderId).toBe(elderId);
      expect(timelineEntry.eventType).toBe('outcome_captured');
      expect(timelineEntry.timestamp).toBeTruthy();
      expect(timelineEntry.createdAt).toBeTruthy();
      expect(timelineEntry.updatedAt).toBeTruthy();

      // Timeline entry should contain outcome details
      expect(timelineEntry.details.taskId).toBe(taskId);
      expect(timelineEntry.details.templateType).toBe(templateType);
      expect(timelineEntry.details.outcome).toBe(outcome);
    }
  });

  /**
   * Property 8.4: Outcome Template Consistency
   * For any template type, the system should provide consistent outcome options
   * and evidence requirements
   */
  test('Property 8.4: Outcome Template Consistency', () => {
    const templateTypes = ['medication', 'safety', 'appointment', 'general'];

    for (const templateType of templateTypes) {
      const template = getOutcomeTemplate(templateType);

      // Template should exist and have required fields
      expect(template).toBeTruthy();
      expect(template!.templateType).toBe(templateType);
      expect(template!.title).toBeTruthy();
      expect(template!.description).toBeTruthy();
      expect(Array.isArray(template!.outcomeOptions)).toBe(true);
      expect(template!.outcomeOptions.length).toBeGreaterThan(0);
      expect(Array.isArray(template!.evidenceTypes)).toBe(true);

      // All outcome options should be strings
      for (const option of template!.outcomeOptions) {
        expect(typeof option).toBe('string');
        expect(option.length).toBeGreaterThan(0);
      }

      // All evidence types should be valid
      const validEvidenceTypes = ['photo', 'video', 'notes', 'documents', 'timestamp'];
      for (const evidenceType of template!.evidenceTypes) {
        expect(validEvidenceTypes).toContain(evidenceType);
      }
    }
  });

  /**
   * Property 8.5: Outcome Completeness Validation
   * For any outcome, the system should validate completeness based on outcome type
   */
  test('Property 8.5: Outcome Completeness Validation', () => {
    for (let i = 0; i < 50; i++) {
      const templateType = generateRandomTemplateType();
      const outcome = generateRandomOutcome(templateType);
      const notes = generateRandomNotes();

      // Validate completeness
      const validation = OutcomeCaptureService.validateOutcomeCompleteness(
        templateType,
        outcome,
        notes
      );

      // Should return validation result
      expect(typeof validation.valid).toBe('boolean');
      expect(Array.isArray(validation.missingFields)).toBe(true);

      // If valid, no missing fields
      if (validation.valid) {
        expect(validation.missingFields).toHaveLength(0);
      }
    }
  });

  /**
   * Property 8.6: Evidence Requirements
   * For any template type, the system should provide consistent evidence requirements
   */
  test('Property 8.6: Evidence Requirements', () => {
    const templateTypes = ['medication', 'safety', 'appointment', 'general'];

    for (const templateType of templateTypes) {
      const requirements = OutcomeCaptureService.getEvidenceRequirements(templateType);

      // Should return array of evidence types
      expect(Array.isArray(requirements)).toBe(true);

      // All requirements should be valid evidence types
      const validTypes = ['photo', 'video', 'notes', 'documents', 'timestamp'];
      for (const req of requirements) {
        expect(validTypes).toContain(req);
      }
    }
  });

  /**
   * Property 8.7: Outcome Capture Idempotency
   * For the same task and outcome, capturing multiple times should produce
   * consistent results
   */
  test('Property 8.7: Outcome Capture Idempotency', () => {
    for (let i = 0; i < 30; i++) {
      const taskId = generateRandomTaskId();
      const templateType = generateRandomTemplateType();
      const outcome = generateRandomOutcome(templateType);
      const notes = generateRandomNotes();
      const evidence = generateRandomEvidence();

      // Capture outcome multiple times
      const result1 = captureOutcome(taskId, templateType, outcome, notes, evidence);
      const result2 = captureOutcome(taskId, templateType, outcome, notes, evidence);
      const result3 = captureOutcome(taskId, templateType, outcome, notes, evidence);

      // All results should be identical
      expect(result1.valid).toBe(result2.valid);
      expect(result2.valid).toBe(result3.valid);
      expect(result1.errors).toEqual(result2.errors);
      expect(result2.errors).toEqual(result3.errors);

      if (result1.outcome && result2.outcome && result3.outcome) {
        expect(result1.outcome.actionTaken).toBe(result2.outcome.actionTaken);
        expect(result2.outcome.actionTaken).toBe(result3.outcome.actionTaken);
        expect(result1.outcome.notes).toBe(result2.outcome.notes);
        expect(result2.outcome.notes).toBe(result3.outcome.notes);
      }
    }
  });
});
