/**
 * Assignment and Escalation Engine
 * Intelligently assigns tasks and manages escalation workflows
 * 
 * Assignment Factors:
 * - Proximity: ZIP code distance calculation
 * - Skills: Medical training, transportation access, language
 * - Availability: Calendar integration, on-call schedule, workload
 * - Relationship: Primary caregiver, medical POA, emergency contact
 * - Historical Performance: Response time, completion rate, quality
 */

import {
  FamilyMember,
  Task,
  AssignmentRecommendation,
  EscalationPlan,
  EscalationReason
} from '../types/care-operations';

// =============================================
// Assignment Scoring Weights
// =============================================

export const ASSIGNMENT_WEIGHTS = {
  proximity: 0.30,
  skillMatch: 0.25,
  availability: 0.25,
  relationship: 0.15,
  performance: 0.05
};

// =============================================
// Skill Requirements by Task Type
// =============================================

export const TASK_SKILL_REQUIREMENTS: Record<string, string[]> = {
  medication: ['medication_management', 'medical_knowledge'],
  medical_appointment: ['transportation', 'medical_knowledge'],
  fall_response: ['first_aid', 'physical_assistance'],
  cognitive_assessment: ['dementia_care', 'patience'],
  emotional_support: ['empathy', 'communication'],
  safety_check: ['home_safety', 'observation'],
  nutrition: ['meal_preparation', 'dietary_knowledge'],
  transportation: ['transportation', 'driving'],
  general: []
};

// =============================================
// Relationship Priority Scores
// =============================================

export const RELATIONSHIP_SCORES: Record<string, number> = {
  primary: 100,
  medical_poa: 90,
  emergency: 80,
  secondary: 60,
  extended: 40
};

// =============================================
// Proximity Calculation
// =============================================

/**
 * Calculate proximity score based on ZIP code distance
 * Higher score = closer (better)
 */
export function calculateProximityScore(
  memberZip: string,
  elderZip: string
): number {
  if (!memberZip || !elderZip) {
    return 50; // Default if ZIP not available
  }
  
  // Simple distance approximation based on ZIP code prefix matching
  // In production, this would use actual geo-distance calculation
  const memberPrefix = memberZip.substring(0, 3);
  const elderPrefix = elderZip.substring(0, 3);
  
  if (memberZip === elderZip) {
    return 100; // Same ZIP
  } else if (memberPrefix === elderPrefix) {
    return 85; // Same region
  } else if (memberZip.substring(0, 2) === elderZip.substring(0, 2)) {
    return 70; // Same area
  } else if (memberZip.substring(0, 1) === elderZip.substring(0, 1)) {
    return 50; // Same state region
  } else {
    return 20; // Different region
  }
}

// =============================================
// Skill Matching
// =============================================

/**
 * Calculate skill match score for a task
 */
export function calculateSkillMatchScore(
  memberSkills: string[],
  requiredSkills: string[]
): number {
  if (requiredSkills.length === 0) {
    return 100; // No specific skills required
  }
  
  if (!memberSkills || memberSkills.length === 0) {
    return 30; // Has no skills but can still try
  }
  
  const matchedSkills = requiredSkills.filter(skill => 
    memberSkills.some(ms => ms.toLowerCase().includes(skill.toLowerCase()))
  );
  
  const matchPercentage = (matchedSkills.length / requiredSkills.length) * 100;
  
  // Bonus for having extra relevant skills
  const extraSkillBonus = Math.min(memberSkills.length * 2, 10);
  
  return Math.min(matchPercentage + extraSkillBonus, 100);
}

/**
 * Get required skills for a task type
 */
export function getRequiredSkillsForTask(taskTitle: string): string[] {
  // Determine task type from title keywords
  const lowerTitle = taskTitle.toLowerCase();
  
  if (lowerTitle.includes('medication') || lowerTitle.includes('dose') || lowerTitle.includes('pill')) {
    return TASK_SKILL_REQUIREMENTS.medication;
  }
  if (lowerTitle.includes('appointment') || lowerTitle.includes('doctor') || lowerTitle.includes('hospital')) {
    return TASK_SKILL_REQUIREMENTS.medical_appointment;
  }
  if (lowerTitle.includes('fall') || lowerTitle.includes('injury')) {
    return TASK_SKILL_REQUIREMENTS.fall_response;
  }
  if (lowerTitle.includes('cognitive') || lowerTitle.includes('memory') || lowerTitle.includes('confusion')) {
    return TASK_SKILL_REQUIREMENTS.cognitive_assessment;
  }
  if (lowerTitle.includes('emotional') || lowerTitle.includes('mood') || lowerTitle.includes('lonely')) {
    return TASK_SKILL_REQUIREMENTS.emotional_support;
  }
  if (lowerTitle.includes('safety') || lowerTitle.includes('home check')) {
    return TASK_SKILL_REQUIREMENTS.safety_check;
  }
  if (lowerTitle.includes('meal') || lowerTitle.includes('food') || lowerTitle.includes('nutrition')) {
    return TASK_SKILL_REQUIREMENTS.nutrition;
  }
  if (lowerTitle.includes('transport') || lowerTitle.includes('drive') || lowerTitle.includes('pick up')) {
    return TASK_SKILL_REQUIREMENTS.transportation;
  }
  
  return TASK_SKILL_REQUIREMENTS.general;
}

// =============================================
// Availability Scoring
// =============================================

/**
 * Calculate availability score
 */
export function calculateAvailabilityScore(
  member: FamilyMember,
  taskDueDate?: Date
): number {
  let score = 0;
  
  // Availability status (most important)
  if (member.availability === 'available') {
    score += 50;
  } else if (member.availability === 'busy') {
    score += 20;
  } else { // offline
    score += 0;
  }
  
  // On-call status (bonus)
  if (member.onCall) {
    score += 30;
  }
  
  // Workload factor (lower workload = higher score)
  const workloadPenalty = Math.min(member.currentWorkload * 5, 30);
  score += (30 - workloadPenalty);
  
  return Math.min(score, 100);
}

// =============================================
// Relationship Scoring
// =============================================

/**
 * Calculate relationship priority score
 */
export function calculateRelationshipScore(member: FamilyMember): number {
  const role = member.role?.toLowerCase() || 'secondary';
  return RELATIONSHIP_SCORES[role] || RELATIONSHIP_SCORES.secondary;
}

// =============================================
// Performance Scoring
// =============================================

export interface PerformanceHistory {
  memberId: string;
  completedTasks: number;
  averageResponseTimeHours: number;
  completionRate: number; // 0-1
  qualityScore: number; // 0-100
}

/**
 * Calculate performance score from history
 */
export function calculatePerformanceScore(
  history?: PerformanceHistory
): number {
  if (!history || history.completedTasks === 0) {
    return 70; // Neutral score for new members
  }
  
  let score = 0;
  
  // Completion rate (0-40 points)
  score += history.completionRate * 40;
  
  // Response time (0-30 points) - faster is better
  if (history.averageResponseTimeHours < 1) {
    score += 30;
  } else if (history.averageResponseTimeHours < 4) {
    score += 20;
  } else if (history.averageResponseTimeHours < 12) {
    score += 10;
  } else {
    score += 5;
  }
  
  // Quality score (0-30 points)
  score += (history.qualityScore / 100) * 30;
  
  return Math.min(score, 100);
}

// =============================================
// Main Assignment Algorithm
// =============================================

export interface AssignmentContext {
  task: Task;
  elderZip: string;
  performanceHistories?: Map<string, PerformanceHistory>;
}

/**
 * Calculate overall assignment score for a family member
 */
export function calculateAssignmentScore(
  member: FamilyMember,
  context: AssignmentContext
): { score: number; breakdown: Record<string, number> } {
  const requiredSkills = getRequiredSkillsForTask(context.task.title);
  const taskDueDate = context.task.dueAt ? new Date(context.task.dueAt) : undefined;
  const performanceHistory = context.performanceHistories?.get(member.id);
  
  // Calculate individual scores
  const proximityScore = calculateProximityScore(member.zipcode, context.elderZip);
  const skillScore = calculateSkillMatchScore(member.skills, requiredSkills);
  const availabilityScore = calculateAvailabilityScore(member, taskDueDate);
  const relationshipScore = calculateRelationshipScore(member);
  const performanceScore = calculatePerformanceScore(performanceHistory);
  
  // Calculate weighted total
  const totalScore = 
    proximityScore * ASSIGNMENT_WEIGHTS.proximity +
    skillScore * ASSIGNMENT_WEIGHTS.skillMatch +
    availabilityScore * ASSIGNMENT_WEIGHTS.availability +
    relationshipScore * ASSIGNMENT_WEIGHTS.relationship +
    performanceScore * ASSIGNMENT_WEIGHTS.performance;
  
  return {
    score: Math.round(totalScore),
    breakdown: {
      proximity: proximityScore,
      skillMatch: skillScore,
      availability: availabilityScore,
      relationship: relationshipScore,
      performance: performanceScore
    }
  };
}

/**
 * Calculate best assignee for a task
 */
export function calculateBestAssignee(
  task: Task,
  familyCircle: FamilyMember[],
  elderZip: string,
  performanceHistories?: Map<string, PerformanceHistory>
): AssignmentRecommendation {
  if (familyCircle.length === 0) {
    throw new Error('No family members available for assignment');
  }
  
  const context: AssignmentContext = {
    task,
    elderZip,
    performanceHistories
  };
  
  // Calculate scores for all members
  const scoredMembers = familyCircle.map(member => ({
    member,
    ...calculateAssignmentScore(member, context)
  })).sort((a, b) => b.score - a.score);
  
  const best = scoredMembers[0];
  const alternatives = scoredMembers.slice(1, 4).map(s => s.member);
  
  // Generate reasoning
  const reasoning: string[] = [];
  
  if (best.breakdown.proximity >= 85) {
    reasoning.push('Located closest to the elder');
  }
  if (best.breakdown.skillMatch >= 80) {
    reasoning.push('Has required skills for this task');
  }
  if (best.breakdown.availability >= 80) {
    reasoning.push('Currently available');
  }
  if (best.member.onCall) {
    reasoning.push('Currently on-call');
  }
  if (best.breakdown.relationship >= 80) {
    reasoning.push(`${best.member.role} caregiver`);
  }
  
  if (reasoning.length === 0) {
    reasoning.push('Best available option based on overall scoring');
  }
  
  // Estimate response time based on availability
  const estimatedResponseTime = best.member.availability === 'available' ? 15 :
    best.member.availability === 'busy' ? 60 : 240;
  
  return {
    recommendedAssignee: best.member,
    confidence: Math.min(best.score, 100),
    reasoning,
    alternativeOptions: alternatives,
    estimatedResponseTime
  };
}

// =============================================
// Escalation Logic
// =============================================

/**
 * Default escalation timeout thresholds (in minutes)
 */
export const ESCALATION_TIMEOUTS: Record<string, number> = {
  urgent: 15,
  high: 60,
  medium: 240,
  low: 1440 // 24 hours
};

/**
 * Determine if task should be escalated
 */
export function shouldEscalate(
  task: Task,
  assignedAt: Date,
  now: Date = new Date()
): boolean {
  const timeoutMinutes = ESCALATION_TIMEOUTS[task.priority] || ESCALATION_TIMEOUTS.medium;
  const elapsedMinutes = (now.getTime() - assignedAt.getTime()) / (1000 * 60);
  
  return elapsedMinutes > timeoutMinutes;
}

/**
 * Create an escalation plan for a task
 */
export function createEscalationPlan(
  task: Task,
  currentAssignee: FamilyMember,
  familyCircle: FamilyMember[],
  reason: EscalationReason,
  elderZip: string
): EscalationPlan {
  // Get alternative assignees (excluding current)
  const availableMembers = familyCircle.filter(m => m.id !== currentAssignee.id);
  
  if (availableMembers.length === 0) {
    // No alternatives - escalate to professional care
    return {
      escalateTo: [],
      escalationMessage: `CRITICAL: No family members available. ${task.title} requires immediate professional attention.`,
      timeoutThreshold: 15
    };
  }
  
  // Get best alternatives
  const recommendation = calculateBestAssignee(task, availableMembers, elderZip);
  const escalateTo = [recommendation.recommendedAssignee, ...recommendation.alternativeOptions.slice(0, 2)];
  
  // Create escalation message
  const reasonMessages: Record<string, string> = {
    overdue: 'Task is overdue and requires immediate attention',
    unavailable: 'Assigned caregiver is unavailable',
    complexity: 'Task complexity exceeds current assignee capabilities',
    deterioration: 'Elder condition has changed, requiring urgent response'
  };
  
  const escalationMessage = `${reasonMessages[reason.type] || reason.description}. ` +
    `Task: ${task.title}. ` +
    `Previous assignee: ${currentAssignee.name}. ` +
    `Please respond urgently.`;
  
  // Determine timeout based on urgency
  const timeoutThreshold = reason.urgency === 'immediate' ? 15 :
    reason.urgency === 'within_hour' ? 60 : 240;
  
  // Create next-level escalation plan if needed
  let nextLevelEscalation: EscalationPlan | undefined;
  
  if (escalateTo.length > 1) {
    const remainingMembers = escalateTo.slice(1);
    if (remainingMembers.length > 0) {
      nextLevelEscalation = {
        escalateTo: remainingMembers,
        escalationMessage: `URGENT: ${task.title} still unassigned. Escalating to additional family members.`,
        timeoutThreshold: Math.max(timeoutThreshold / 2, 10)
      };
    }
  }
  
  return {
    escalateTo,
    escalationMessage,
    timeoutThreshold,
    nextLevelEscalation
  };
}

/**
 * Get suggested escalation for overdue task
 */
export function suggestEscalation(
  task: Task,
  currentAssignee: FamilyMember | undefined,
  availableMembers: FamilyMember[],
  elderZip: string
): EscalationPlan | null {
  if (!currentAssignee || availableMembers.length === 0) {
    return null;
  }
  
  const reason: EscalationReason = {
    type: 'overdue',
    description: `Task "${task.title}" is past its due date`,
    urgency: task.priority === 'urgent' ? 'immediate' : 
             task.priority === 'high' ? 'within_hour' : 'within_day'
  };
  
  return createEscalationPlan(task, currentAssignee, availableMembers, reason, elderZip);
}

// =============================================
// Workload Distribution Analysis
// =============================================

export interface WorkloadAnalysis {
  memberId: string;
  memberName: string;
  currentTasks: number;
  completedThisWeek: number;
  nightAlerts: number;
  workloadScore: number; // 0-100, higher = more burden
  recommendation: 'reduce' | 'balanced' | 'can_take_more';
}

/**
 * Analyze workload distribution across family circle
 */
export function analyzeWorkloadDistribution(
  members: FamilyMember[],
  tasksByMember: Map<string, number>,
  completedByMember: Map<string, number>,
  nightAlertsByMember: Map<string, number>
): WorkloadAnalysis[] {
  const analyses: WorkloadAnalysis[] = [];
  
  // Calculate average tasks
  const totalTasks = Array.from(tasksByMember.values()).reduce((a, b) => a + b, 0);
  const avgTasks = members.length > 0 ? totalTasks / members.length : 0;
  
  members.forEach(member => {
    const currentTasks = tasksByMember.get(member.id) || 0;
    const completedThisWeek = completedByMember.get(member.id) || 0;
    const nightAlerts = nightAlertsByMember.get(member.id) || 0;
    
    // Calculate workload score
    let workloadScore = 0;
    
    // Current tasks weight (0-40)
    const taskRatio = avgTasks > 0 ? currentTasks / avgTasks : 0;
    workloadScore += Math.min(taskRatio * 20, 40);
    
    // Completed this week (0-30)
    workloadScore += Math.min(completedThisWeek * 3, 30);
    
    // Night alerts are extra burden (0-30)
    workloadScore += Math.min(nightAlerts * 10, 30);
    
    // Determine recommendation
    let recommendation: 'reduce' | 'balanced' | 'can_take_more';
    if (workloadScore >= 70) {
      recommendation = 'reduce';
    } else if (workloadScore >= 40) {
      recommendation = 'balanced';
    } else {
      recommendation = 'can_take_more';
    }
    
    analyses.push({
      memberId: member.id,
      memberName: member.name,
      currentTasks,
      completedThisWeek,
      nightAlerts,
      workloadScore: Math.round(workloadScore),
      recommendation
    });
  });
  
  return analyses.sort((a, b) => b.workloadScore - a.workloadScore);
}

// =============================================
// Assignment Validation
// =============================================

/**
 * Validate an assignment recommendation
 */
export function validateAssignmentRecommendation(
  recommendation: AssignmentRecommendation
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!recommendation.recommendedAssignee) {
    errors.push('No recommended assignee');
  } else {
    if (!recommendation.recommendedAssignee.id) {
      errors.push('Assignee missing ID');
    }
    if (!recommendation.recommendedAssignee.name) {
      errors.push('Assignee missing name');
    }
  }
  
  if (typeof recommendation.confidence !== 'number' || 
      recommendation.confidence < 0 || 
      recommendation.confidence > 100) {
    errors.push('Confidence must be 0-100');
  }
  
  if (!Array.isArray(recommendation.reasoning) || recommendation.reasoning.length === 0) {
    errors.push('Reasoning must be provided');
  }
  
  if (!Array.isArray(recommendation.alternativeOptions)) {
    errors.push('Alternative options must be an array');
  }
  
  if (typeof recommendation.estimatedResponseTime !== 'number' || 
      recommendation.estimatedResponseTime <= 0) {
    errors.push('Estimated response time must be positive');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate an escalation plan
 */
export function validateEscalationPlan(
  plan: EscalationPlan
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!Array.isArray(plan.escalateTo)) {
    errors.push('escalateTo must be an array');
  }
  
  if (!plan.escalationMessage || plan.escalationMessage.length < 10) {
    errors.push('Escalation message must be descriptive');
  }
  
  if (typeof plan.timeoutThreshold !== 'number' || plan.timeoutThreshold <= 0) {
    errors.push('Timeout threshold must be positive');
  }
  
  // Validate nested escalation if present
  if (plan.nextLevelEscalation) {
    const nestedValidation = validateEscalationPlan(plan.nextLevelEscalation);
    if (!nestedValidation.valid) {
      errors.push(`Nested escalation: ${nestedValidation.errors.join(', ')}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}


