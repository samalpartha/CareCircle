/**
 * Care Operations Console Domain Models
 * TypeScript interfaces for the new care operations system
 */

// =============================================
// Core Domain Entities
// =============================================

export interface Person {
  id: string;
  type: 'elder' | 'caregiver';
  name: string;
  zipcode: string;
  skills: string[];
  availability: {
    schedule: 'flexible' | 'morning' | 'evening' | 'weekends';
    timezone: string;
    onCall: boolean;
  };
  role: 'primary' | 'secondary' | 'emergency' | 'medical_poa';
  contactInfo: {
    phone: string;
    email: string;
    preferredMethod: 'phone' | 'email' | 'sms';
  };
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  id: string;
  severity: 'urgent' | 'high' | 'medium' | 'low';
  type: 'fall' | 'medication' | 'cognitive' | 'emotional' | 'safety';
  elderId: string;
  elderName: string;
  aiAnalysis: {
    summary: string;
    confidence: number;
    riskScores: {
      cognitive: number;
      medicationAdherence: number;
      overallHealth: number;
    };
    concerns: string[];
    recommendation: string;
  };
  createdAt: string;
  status: 'new' | 'triaging' | 'resolved';
  assignedTo?: string;
}

export interface Plan {
  id: string;
  alertId: string;
  protocolType: 'urgent_triage' | 'medication_review' | 'safety_check';
  steps: TriageStep[];
  currentStep: number;
  outcomes: Record<string, any>;
  startedAt: string;
  completedAt?: string;
  completedBy?: string;
}

export interface Task {
  id: string;
  parentId?: string; // Reference to Alert or Plan
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  assignedTo?: string;
  assignedToName?: string;
  dueAt: string;
  estimatedMinutes: number;
  checklist: ChecklistItem[];
  status: 'new' | 'in_progress' | 'completed' | 'snoozed' | 'escalated';
  elderName: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Outcome {
  id: string;
  taskId: string;
  result: 'success' | 'partial' | 'failed';
  notes: string;
  evidenceUrls: string[];
  recordedAt: string;
  recordedBy: string;
  followUpTasks: TaskTemplate[];
}

export interface TimelineEntry {
  id: string;
  familyId: string;
  elderId: string;
  timestamp: string;
  eventType: 'alert_created' | 'task_completed' | 'triage_performed' | 'medication_taken' | 'escalation_triggered' | 'outcome_captured';
  title: string;
  description: string;
  details: Record<string, any>;
  caregiver: {
    id: string;
    name: string;
  };
  immutable: true; // cannot be edited after creation
  createdAt: string;
  updatedAt: string;
  participants?: string[]; // family member IDs
  evidence?: Evidence[];
  relatedItems?: string[]; // IDs of related alerts, tasks, etc.
}

// =============================================
// Care Operations Console Interfaces
// =============================================

export interface CareOperationsConsole {
  urgentItems: UrgentItem[];
  careQueue: QueueItem[];
  riskCards: RiskCard[];
  familyStatus: FamilyMember[];
  stressModeEnabled: boolean;
}

export interface UrgentItem {
  id: string;
  type: 'fall' | 'injury' | 'medical_emergency' | 'medication_crisis';
  severity: 'urgent' | 'high';
  elderName: string;
  timeElapsed: number; // minutes since alert
  suggestedAction: string;
  triageStatus: 'pending' | 'in_progress' | 'completed';
}

export interface QueueItem {
  id: string;
  type: 'alert' | 'task' | 'medication' | 'checkin' | 'followup';
  severity: 'urgent' | 'high' | 'medium' | 'low';
  title: string;
  elderName: string;
  assignedTo?: string;
  dueAt: Date;
  estimatedMinutes: number;
  status: 'new' | 'in_progress' | 'completed' | 'snoozed' | 'escalated';
  suggestedAction: string;
  priority: number; // calculated score
}

export interface RiskCard {
  type: RiskType;
  score: number; // 0-100 normalized
  trend: TrendIndicator;
  confidence: 'high' | 'medium' | 'low';
  dataCoverage: DataCoverage;
  primaryCTA: ActionCTA;
  factors: ContributingFactor[];
  safetyDisclaimer: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: string;
  availability: 'available' | 'busy' | 'offline';
  currentWorkload: number;
  skills: string[];
  zipcode: string;
  onCall: boolean;
}

// =============================================
// Triage Protocol Interfaces
// =============================================

export interface TriageProtocol {
  alertId: string;
  protocolType: 'fall' | 'injury' | 'chest_pain' | 'confusion';
  currentStep: TriageStep;
  responses: Record<string, any>;
}

export interface TriageStep {
  stepNumber: number;
  title: string;
  questions: TriageQuestion[];
  criticalFlags: string[];
  nextStepLogic: StepTransition[];
}

export interface TriageQuestion {
  id: string;
  text: string;
  type: 'yes_no' | 'scale' | 'multiple_choice' | 'text';
  options?: string[];
  required: boolean;
  criticalFlag?: boolean; // If true, certain answers trigger emergency escalation
}

export interface StepTransition {
  condition: string;
  nextStep: number | 'emergency' | 'complete';
}

export interface ActionPlan {
  recommendation: 'call_911' | 'urgent_care' | 'nurse_line' | 'monitor';
  callScript: string;
  urgencyLevel: number;
  estimatedTimeframe: string;
  followUpTasks: TaskTemplate[];
}

export interface TriageOutcome {
  actionTaken: string;
  emergencyServicesCalled: boolean;
  notes: string;
  evidence: Evidence[];
  followUpRequired: boolean;
  nextCheckIn?: Date;
}

// =============================================
// Assignment and Escalation Interfaces
// =============================================

export interface AssignmentRecommendation {
  recommendedAssignee: FamilyMember;
  confidence: number;
  reasoning: string[];
  alternativeOptions: FamilyMember[];
  estimatedResponseTime: number;
}

export interface EscalationPlan {
  escalateTo: FamilyMember[];
  escalationMessage: string;
  timeoutThreshold: number;
  nextLevelEscalation?: EscalationPlan;
}

export interface EscalationReason {
  type: 'overdue' | 'unavailable' | 'complexity' | 'deterioration';
  description: string;
  urgency: 'immediate' | 'within_hour' | 'within_day';
}

// =============================================
// Supporting Types
// =============================================

export type RiskType = 'cognitive' | 'medication' | 'emotional' | 'physical' | 'nutrition';

export interface TrendIndicator {
  direction: 'improving' | 'stable' | 'declining';
  magnitude: number; // percentage change
  timeframe: string; // "since last week"
  significance: 'significant' | 'moderate' | 'minimal';
}

export interface DataCoverage {
  confidence: 'high' | 'medium' | 'low';
  dataPoints: number;
  timespan: string;
  lastUpdate: string;
}

export interface ActionCTA {
  label: string; // "Run 2-min Check-in Call"
  estimatedTime: number; // minutes
  urgency: 'immediate' | 'today' | 'this_week';
  action: () => void;
}

export interface ContributingFactor {
  factor: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  required: boolean;
}

export interface TaskTemplate {
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  estimatedMinutes: number;
  checklist: Omit<ChecklistItem, 'id' | 'completed'>[];
  dueInHours: number;
}

export interface Evidence {
  type: 'photo' | 'audio' | 'note' | 'measurement';
  url?: string;
  content?: string;
  timestamp: string;
  uploadedBy: string;
}

// =============================================
// Outcome Capture Interfaces
// =============================================

export interface OutcomeTemplate {
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

// =============================================
// Queue Management Interfaces
// =============================================

export interface QueuePrioritization {
  calculatePriority(item: QueueItem): number;
}

export interface QueueFilters {
  urgent: boolean;
  dueToday: boolean;
  assignedToMe: boolean;
  medication: boolean;
  cognitive: boolean;
  safety: boolean;
}

// =============================================
// Analytics and Metrics Interfaces
// =============================================

export interface OperationalMetrics {
  timeToTriage: number; // average minutes
  alertsWithOutcomes: number; // percentage
  taskCompletionRate: number; // percentage
  averageResponseTime: number; // hours
}

export interface CareQualityMetrics {
  missedMedicationEvents: number; // per week
  repeatFalls: number;
  safetyChecklistCompletion: number; // percentage
}

export interface CaregiverBurdenMetrics {
  tasksPerWeek: Record<string, number>; // by family member
  nightAlerts: number;
  workloadDistribution: Record<string, number>;
}

// =============================================
// Error Handling Types
// =============================================

export interface CareOperationsError {
  type: 'critical_safety' | 'triage_protocol' | 'assignment_engine' | 'data_integrity' | 'user_interface';
  message: string;
  context: Record<string, any>;
  recoveryOptions: string[];
  timestamp: string;
}

// =============================================
// API Response Types
// =============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextToken?: string;
  totalCount?: number;
}

// =============================================
// DynamoDB Access Patterns
// =============================================

export interface DynamoDBItem {
  PK: string; // Partition Key
  SK: string; // Sort Key
  GSI1PK?: string; // Global Secondary Index 1 PK
  GSI1SK?: string; // Global Secondary Index 1 SK
  GSI2PK?: string; // Global Secondary Index 2 PK
  GSI2SK?: string; // Global Secondary Index 2 SK
  GSI3PK?: string; // Global Secondary Index 3 PK
  GSI3SK?: string; // Global Secondary Index 3 SK
  [key: string]: any;
}

// Key patterns for DynamoDB single table design
export type EntityPrefix = 'ELDER' | 'TASK' | 'ALERT' | 'PLAN' | 'OUTCOME' | 'TIMELINE' | 'FAMILY' | 'MEMBER';
export type SortKeyPrefix = 'TIMELINE' | 'ASSIGNMENT' | 'PRIORITY' | 'DUE_DATE';