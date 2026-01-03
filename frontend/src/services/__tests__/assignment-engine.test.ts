/**
 * Property-Based Tests for Assignment and Escalation Engine
 * Feature: care-operations-console
 * 
 * Property 6: Assignment Intelligence - Requirements 4.2, 4.6
 * Property 7: Escalation Workflow Completeness - Requirements 4.3, 4.4, 4.7
 */

import {
  calculateProximityScore,
  calculateSkillMatchScore,
  calculateAvailabilityScore,
  calculateRelationshipScore,
  calculatePerformanceScore,
  calculateAssignmentScore,
  calculateBestAssignee,
  getRequiredSkillsForTask,
  shouldEscalate,
  createEscalationPlan,
  suggestEscalation,
  analyzeWorkloadDistribution,
  validateAssignmentRecommendation,
  validateEscalationPlan,
  ASSIGNMENT_WEIGHTS,
  ESCALATION_TIMEOUTS,
  TASK_SKILL_REQUIREMENTS,
  PerformanceHistory,
  AssignmentContext
} from '../assignment-engine';

import { FamilyMember, Task, EscalationReason } from '../../types/care-operations';

// =============================================
// Test Helpers
// =============================================

const generateRandomId = (): string => 
  `TEST#${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

const generateRandomZip = (): string => 
  String(Math.floor(10000 + Math.random() * 90000));

const generateRandomSkills = (): string[] => {
  const allSkills = ['medication_management', 'first_aid', 'driving', 'meal_preparation', 
    'empathy', 'medical_knowledge', 'patience', 'home_safety'];
  const count = Math.floor(Math.random() * 5) + 1;
  return allSkills.slice(0, count);
};

const generateRandomFamilyMember = (overrides: Partial<FamilyMember> = {}): FamilyMember => ({
  id: generateRandomId(),
  name: `Member ${Math.random().toString(36).substring(2, 6)}`,
  role: ['primary', 'secondary', 'emergency', 'medical_poa'][Math.floor(Math.random() * 4)],
  availability: ['available', 'busy', 'offline'][Math.floor(Math.random() * 3)] as FamilyMember['availability'],
  currentWorkload: Math.floor(Math.random() * 10),
  skills: generateRandomSkills(),
  zipcode: generateRandomZip(),
  onCall: Math.random() > 0.7,
  ...overrides
});

const generateRandomTask = (overrides: Partial<Task> = {}): Task => ({
  id: generateRandomId(),
  title: ['Medication verification', 'Doctor appointment', 'Safety check', 'Meal preparation'][Math.floor(Math.random() * 4)],
  description: 'Test task description',
  priority: ['urgent', 'high', 'medium', 'low'][Math.floor(Math.random() * 4)] as Task['priority'],
  dueAt: new Date(Date.now() + Math.random() * 86400000).toISOString(),
  estimatedMinutes: Math.floor(Math.random() * 60) + 10,
  checklist: [],
  status: 'new',
  elderName: 'Test Elder',
  createdBy: 'System',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

const generateFamilyCircle = (count: number = 5): FamilyMember[] => {
  const members: FamilyMember[] = [];
  const roles = ['primary', 'secondary', 'emergency', 'medical_poa', 'extended'];
  
  for (let i = 0; i < count; i++) {
    members.push(generateRandomFamilyMember({
      role: roles[Math.min(i, roles.length - 1)]
    }));
  }
  
  return members;
};

// =============================================
// Property 6: Assignment Intelligence
// =============================================

describe('Property 6: Assignment Intelligence', () => {
  
  /**
   * Property 6.1: Proximity scoring is consistent
   */
  test('Property 6.1: Proximity scoring follows distance rules', () => {
    // Same ZIP = highest score
    const sameZip = calculateProximityScore('12345', '12345');
    expect(sameZip).toBe(100);
    
    // Same prefix = high score
    const samePrefix = calculateProximityScore('12345', '12399');
    expect(samePrefix).toBe(85);
    
    // Same 2-digit prefix = medium score
    const sameArea = calculateProximityScore('12345', '12999');
    expect(sameArea).toBe(70);
    
    // Same first digit = low-medium score
    const sameRegion = calculateProximityScore('12345', '19999');
    expect(sameRegion).toBe(50);
    
    // Different regions = low score
    const differentRegion = calculateProximityScore('12345', '99999');
    expect(differentRegion).toBe(20);
    
    // Missing ZIP = default score
    const missingZip = calculateProximityScore('', '12345');
    expect(missingZip).toBe(50);
  });

  /**
   * Property 6.2: Skill matching works correctly
   */
  test('Property 6.2: Skill matching calculates correctly', () => {
    // Perfect match
    const perfectMatch = calculateSkillMatchScore(
      ['medication_management', 'medical_knowledge'],
      ['medication_management', 'medical_knowledge']
    );
    expect(perfectMatch).toBeGreaterThanOrEqual(100);
    
    // Partial match
    const partialMatch = calculateSkillMatchScore(
      ['medication_management'],
      ['medication_management', 'medical_knowledge']
    );
    expect(partialMatch).toBeLessThan(100);
    expect(partialMatch).toBeGreaterThan(0);
    
    // No required skills = 100
    const noRequirements = calculateSkillMatchScore(['driving'], []);
    expect(noRequirements).toBe(100);
    
    // No member skills = low score
    const noSkills = calculateSkillMatchScore([], ['medication_management']);
    expect(noSkills).toBe(30);
  });

  /**
   * Property 6.3: Availability scoring is consistent
   */
  test('Property 6.3: Availability scoring reflects status', () => {
    const availableMember = generateRandomFamilyMember({
      availability: 'available',
      onCall: true,
      currentWorkload: 0
    });
    const availableScore = calculateAvailabilityScore(availableMember);
    expect(availableScore).toBeGreaterThanOrEqual(80);
    
    const busyMember = generateRandomFamilyMember({
      availability: 'busy',
      onCall: false,
      currentWorkload: 5
    });
    const busyScore = calculateAvailabilityScore(busyMember);
    expect(busyScore).toBeLessThan(availableScore);
    
    const offlineMember = generateRandomFamilyMember({
      availability: 'offline',
      onCall: false,
      currentWorkload: 10
    });
    const offlineScore = calculateAvailabilityScore(offlineMember);
    expect(offlineScore).toBeLessThan(busyScore);
  });

  /**
   * Property 6.4: Relationship priority is respected
   */
  test('Property 6.4: Relationship scoring follows priority', () => {
    const primary = generateRandomFamilyMember({ role: 'primary' });
    const secondary = generateRandomFamilyMember({ role: 'secondary' });
    const emergency = generateRandomFamilyMember({ role: 'emergency' });
    const medicalPoa = generateRandomFamilyMember({ role: 'medical_poa' });
    
    const primaryScore = calculateRelationshipScore(primary);
    const secondaryScore = calculateRelationshipScore(secondary);
    const emergencyScore = calculateRelationshipScore(emergency);
    const poaScore = calculateRelationshipScore(medicalPoa);
    
    expect(primaryScore).toBeGreaterThan(poaScore);
    expect(poaScore).toBeGreaterThan(emergencyScore);
    expect(emergencyScore).toBeGreaterThan(secondaryScore);
  });

  /**
   * Property 6.5: Performance history affects scoring
   */
  test('Property 6.5: Performance scoring reflects history', () => {
    // Excellent performer
    const excellentHistory: PerformanceHistory = {
      memberId: 'test',
      completedTasks: 50,
      averageResponseTimeHours: 0.5,
      completionRate: 0.98,
      qualityScore: 95
    };
    const excellentScore = calculatePerformanceScore(excellentHistory);
    expect(excellentScore).toBeGreaterThan(80);
    
    // Poor performer
    const poorHistory: PerformanceHistory = {
      memberId: 'test',
      completedTasks: 10,
      averageResponseTimeHours: 24,
      completionRate: 0.5,
      qualityScore: 40
    };
    const poorScore = calculatePerformanceScore(poorHistory);
    expect(poorScore).toBeLessThan(excellentScore);
    
    // New member (no history)
    const newMemberScore = calculatePerformanceScore(undefined);
    expect(newMemberScore).toBe(70); // Neutral score
  });

  /**
   * Property 6.6: Best assignee selection uses all factors
   */
  test('Property 6.6: Best assignee considers all factors', () => {
    for (let i = 0; i < 20; i++) {
      const familyCircle = generateFamilyCircle(5);
      const task = generateRandomTask();
      const elderZip = generateRandomZip();
      
      const recommendation = calculateBestAssignee(task, familyCircle, elderZip);
      
      // Validation
      const validation = validateAssignmentRecommendation(recommendation);
      expect(validation.valid).toBe(true);
      
      // Recommended assignee should be from family circle
      expect(familyCircle.some(m => m.id === recommendation.recommendedAssignee.id)).toBe(true);
      
      // Confidence should be 0-100
      expect(recommendation.confidence).toBeGreaterThanOrEqual(0);
      expect(recommendation.confidence).toBeLessThanOrEqual(100);
      
      // Should have reasoning
      expect(recommendation.reasoning.length).toBeGreaterThan(0);
      
      // Should have alternatives (if family has enough members)
      if (familyCircle.length > 1) {
        expect(recommendation.alternativeOptions.length).toBeGreaterThan(0);
      }
      
      // Response time should be positive
      expect(recommendation.estimatedResponseTime).toBeGreaterThan(0);
    }
  });

  /**
   * Property 6.7: Assignment weights sum correctly
   */
  test('Property 6.7: Assignment weights are properly balanced', () => {
    const totalWeight = Object.values(ASSIGNMENT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(totalWeight).toBeCloseTo(1.0, 2);
    
    // All weights should be positive
    Object.values(ASSIGNMENT_WEIGHTS).forEach(weight => {
      expect(weight).toBeGreaterThan(0);
    });
  });

  /**
   * Property 6.8: Task skill requirements are defined
   */
  test('Property 6.8: Task skill requirements exist for all types', () => {
    const taskTypes = ['medication', 'medical_appointment', 'fall_response', 
      'cognitive_assessment', 'emotional_support', 'safety_check', 'nutrition', 
      'transportation', 'general'];
    
    taskTypes.forEach(type => {
      const skills = TASK_SKILL_REQUIREMENTS[type];
      expect(Array.isArray(skills)).toBe(true);
    });
    
    // Test skill inference from task titles
    expect(getRequiredSkillsForTask('Medication verification').length).toBeGreaterThan(0);
    expect(getRequiredSkillsForTask('Doctor appointment').length).toBeGreaterThan(0);
    expect(getRequiredSkillsForTask('Fall response').length).toBeGreaterThan(0);
  });
});

// =============================================
// Property 7: Escalation Workflow Completeness
// =============================================

describe('Property 7: Escalation Workflow Completeness', () => {
  
  /**
   * Property 7.1: Escalation triggers based on timeout
   */
  test('Property 7.1: Escalation triggers after timeout', () => {
    const priorities: Array<'urgent' | 'high' | 'medium' | 'low'> = ['urgent', 'high', 'medium', 'low'];
    
    priorities.forEach(priority => {
      const task = generateRandomTask({ priority });
      const timeout = ESCALATION_TIMEOUTS[priority];
      
      // Just before timeout - should not escalate
      const beforeTimeout = new Date(Date.now() - (timeout - 1) * 60 * 1000);
      expect(shouldEscalate(task, beforeTimeout)).toBe(false);
      
      // After timeout - should escalate
      const afterTimeout = new Date(Date.now() - (timeout + 1) * 60 * 1000);
      expect(shouldEscalate(task, afterTimeout)).toBe(true);
    });
  });

  /**
   * Property 7.2: Escalation timeouts are ordered by priority
   */
  test('Property 7.2: Urgent tasks escalate faster than low priority', () => {
    expect(ESCALATION_TIMEOUTS.urgent).toBeLessThan(ESCALATION_TIMEOUTS.high);
    expect(ESCALATION_TIMEOUTS.high).toBeLessThan(ESCALATION_TIMEOUTS.medium);
    expect(ESCALATION_TIMEOUTS.medium).toBeLessThan(ESCALATION_TIMEOUTS.low);
  });

  /**
   * Property 7.3: Escalation plan includes full context
   */
  test('Property 7.3: Escalation plan contains required context', () => {
    for (let i = 0; i < 20; i++) {
      const task = generateRandomTask();
      const currentAssignee = generateRandomFamilyMember();
      const familyCircle = generateFamilyCircle(5);
      const elderZip = generateRandomZip();
      
      const reason: EscalationReason = {
        type: 'overdue',
        description: 'Task is overdue',
        urgency: 'immediate'
      };
      
      const plan = createEscalationPlan(task, currentAssignee, familyCircle, reason, elderZip);
      
      // Validation
      const validation = validateEscalationPlan(plan);
      expect(validation.valid).toBe(true);
      
      // Message should contain task info
      expect(plan.escalationMessage).toContain(task.title);
      
      // Message should mention previous assignee
      expect(plan.escalationMessage).toContain(currentAssignee.name);
      
      // Timeout should be positive
      expect(plan.timeoutThreshold).toBeGreaterThan(0);
    }
  });

  /**
   * Property 7.4: Escalation excludes current assignee
   */
  test('Property 7.4: Escalation targets do not include current assignee', () => {
    for (let i = 0; i < 20; i++) {
      const task = generateRandomTask();
      const familyCircle = generateFamilyCircle(5);
      const currentAssignee = familyCircle[0];
      const elderZip = generateRandomZip();
      
      const reason: EscalationReason = {
        type: 'unavailable',
        description: 'Assignee unavailable',
        urgency: 'within_hour'
      };
      
      const plan = createEscalationPlan(task, currentAssignee, familyCircle, reason, elderZip);
      
      // Current assignee should not be in escalation targets
      plan.escalateTo.forEach(target => {
        expect(target.id).not.toBe(currentAssignee.id);
      });
    }
  });

  /**
   * Property 7.5: Nested escalation is available
   */
  test('Property 7.5: Multi-level escalation is supported', () => {
    const task = generateRandomTask({ priority: 'urgent' });
    const familyCircle = generateFamilyCircle(6);
    const currentAssignee = familyCircle[0];
    const elderZip = generateRandomZip();
    
    const reason: EscalationReason = {
      type: 'overdue',
      description: 'Urgent task overdue',
      urgency: 'immediate'
    };
    
    const plan = createEscalationPlan(task, currentAssignee, familyCircle, reason, elderZip);
    
    // Should have nested escalation if enough members
    if (plan.escalateTo.length > 1) {
      expect(plan.nextLevelEscalation).toBeDefined();
      expect(plan.nextLevelEscalation?.timeoutThreshold).toBeLessThan(plan.timeoutThreshold);
    }
  });

  /**
   * Property 7.6: Escalation urgency affects timeout
   */
  test('Property 7.6: Urgency level determines timeout', () => {
    const task = generateRandomTask();
    const familyCircle = generateFamilyCircle(5);
    const currentAssignee = familyCircle[0];
    const elderZip = generateRandomZip();
    
    const immediateReason: EscalationReason = {
      type: 'overdue',
      description: 'Immediate attention needed',
      urgency: 'immediate'
    };
    
    const hourReason: EscalationReason = {
      type: 'overdue',
      description: 'Within hour',
      urgency: 'within_hour'
    };
    
    const dayReason: EscalationReason = {
      type: 'overdue',
      description: 'Within day',
      urgency: 'within_day'
    };
    
    const immediatePlan = createEscalationPlan(task, currentAssignee, familyCircle, immediateReason, elderZip);
    const hourPlan = createEscalationPlan(task, currentAssignee, familyCircle, hourReason, elderZip);
    const dayPlan = createEscalationPlan(task, currentAssignee, familyCircle, dayReason, elderZip);
    
    expect(immediatePlan.timeoutThreshold).toBeLessThanOrEqual(hourPlan.timeoutThreshold);
    expect(hourPlan.timeoutThreshold).toBeLessThanOrEqual(dayPlan.timeoutThreshold);
  });

  /**
   * Property 7.7: Suggestion function works for overdue tasks
   */
  test('Property 7.7: Escalation suggestion works for overdue tasks', () => {
    for (let i = 0; i < 20; i++) {
      const task = generateRandomTask();
      const familyCircle = generateFamilyCircle(5);
      const currentAssignee = familyCircle[0];
      const elderZip = generateRandomZip();
      
      const suggestion = suggestEscalation(task, currentAssignee, familyCircle.slice(1), elderZip);
      
      if (suggestion) {
        const validation = validateEscalationPlan(suggestion);
        expect(validation.valid).toBe(true);
      }
    }
  });
});

// =============================================
// Workload Distribution Tests
// =============================================

describe('Workload Distribution Tests', () => {
  
  /**
   * Property: Workload analysis is accurate
   */
  test('Workload analysis calculates burden correctly', () => {
    const members = generateFamilyCircle(4);
    
    const tasksByMember = new Map<string, number>();
    const completedByMember = new Map<string, number>();
    const nightAlertsByMember = new Map<string, number>();
    
    // Set up uneven workload
    tasksByMember.set(members[0].id, 10); // Heavy
    tasksByMember.set(members[1].id, 5);  // Medium
    tasksByMember.set(members[2].id, 2);  // Light
    tasksByMember.set(members[3].id, 0);  // None
    
    completedByMember.set(members[0].id, 15);
    completedByMember.set(members[1].id, 5);
    completedByMember.set(members[2].id, 2);
    completedByMember.set(members[3].id, 0);
    
    nightAlertsByMember.set(members[0].id, 3);
    nightAlertsByMember.set(members[1].id, 1);
    nightAlertsByMember.set(members[2].id, 0);
    nightAlertsByMember.set(members[3].id, 0);
    
    const analysis = analyzeWorkloadDistribution(
      members, tasksByMember, completedByMember, nightAlertsByMember
    );
    
    expect(analysis.length).toBe(4);
    
    // First member should have highest workload score
    expect(analysis[0].workloadScore).toBeGreaterThan(analysis[3].workloadScore);
    
    // Recommendations should reflect burden
    const heavyMember = analysis.find(a => a.memberId === members[0].id);
    expect(heavyMember?.recommendation).toBe('reduce');
    
    const lightMember = analysis.find(a => a.memberId === members[3].id);
    expect(lightMember?.recommendation).toBe('can_take_more');
  });

  /**
   * Property: Workload scores are bounded
   */
  test('Workload scores are within bounds', () => {
    for (let i = 0; i < 20; i++) {
      const members = generateFamilyCircle(Math.floor(Math.random() * 5) + 2);
      
      const tasksByMember = new Map<string, number>();
      const completedByMember = new Map<string, number>();
      const nightAlertsByMember = new Map<string, number>();
      
      members.forEach(m => {
        tasksByMember.set(m.id, Math.floor(Math.random() * 20));
        completedByMember.set(m.id, Math.floor(Math.random() * 20));
        nightAlertsByMember.set(m.id, Math.floor(Math.random() * 5));
      });
      
      const analysis = analyzeWorkloadDistribution(
        members, tasksByMember, completedByMember, nightAlertsByMember
      );
      
      analysis.forEach(a => {
        expect(a.workloadScore).toBeGreaterThanOrEqual(0);
        expect(a.workloadScore).toBeLessThanOrEqual(100);
        expect(['reduce', 'balanced', 'can_take_more']).toContain(a.recommendation);
      });
    }
  });
});

// =============================================
// Validation Tests
// =============================================

describe('Validation Tests', () => {
  
  /**
   * Property: Valid recommendations pass validation
   */
  test('Valid assignment recommendations pass validation', () => {
    for (let i = 0; i < 20; i++) {
      const familyCircle = generateFamilyCircle(5);
      const task = generateRandomTask();
      const elderZip = generateRandomZip();
      
      const recommendation = calculateBestAssignee(task, familyCircle, elderZip);
      const validation = validateAssignmentRecommendation(recommendation);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    }
  });

  /**
   * Property: Valid escalation plans pass validation
   */
  test('Valid escalation plans pass validation', () => {
    for (let i = 0; i < 20; i++) {
      const task = generateRandomTask();
      const familyCircle = generateFamilyCircle(5);
      const currentAssignee = familyCircle[0];
      const elderZip = generateRandomZip();
      
      const reason: EscalationReason = {
        type: ['overdue', 'unavailable', 'complexity', 'deterioration'][Math.floor(Math.random() * 4)] as EscalationReason['type'],
        description: 'Test reason',
        urgency: ['immediate', 'within_hour', 'within_day'][Math.floor(Math.random() * 3)] as EscalationReason['urgency']
      };
      
      const plan = createEscalationPlan(task, currentAssignee, familyCircle, reason, elderZip);
      const validation = validateEscalationPlan(plan);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    }
  });

  /**
   * Property: Empty family throws error
   */
  test('Empty family circle throws error', () => {
    const task = generateRandomTask();
    
    expect(() => {
      calculateBestAssignee(task, [], '12345');
    }).toThrow('No family members available for assignment');
  });
});


