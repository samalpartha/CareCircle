/**
 * Care Operations Console API Service
 * Handles all API calls for the new care operations system
 */

import { get, post, put, del } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
  Alert,
  Task,
  Plan,
  Outcome,
  TimelineEntry,
  QueueItem,
  RiskCard,
  TriageProtocol,
  AssignmentRecommendation,
  EscalationPlan,
  ApiResponse,
  PaginatedResponse,
  UrgentItem,
  FamilyMember,
  OperationalMetrics,
  CareQualityMetrics,
  CaregiverBurdenMetrics
} from '../types/care-operations';

const API_NAME = 'CareCircleAPI';

// Helper function to get auth headers
async function getAuthHeaders() {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    
    if (!token) {
      console.warn('No auth token found in session');
      return {};
    }
    
    return {
      Authorization: `Bearer ${token}`,
    };
  } catch (error) {
    console.error('Error getting auth session:', error);
    return {};
  }
}

// =============================================
// Care Queue API
// =============================================

export async function getCareQueue(filters?: {
  urgent?: boolean;
  dueToday?: boolean;
  assignedToMe?: boolean;
  medication?: boolean;
  cognitive?: boolean;
  safety?: boolean;
}): Promise<QueueItem[]> {
  try {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, 'true');
      });
    }

    const restOperation = get({
      apiName: API_NAME,
      path: `/care-queue?${queryParams.toString()}`,
      options: {
        headers: await getAuthHeaders(),
      },
    });
    
    const response = await restOperation.response;
    return await response.body.json();
  } catch (error) {
    console.error('Error fetching care queue:', error);
    return [];
  }
}

export async function getUrgentItems(): Promise<UrgentItem[]> {
  try {
    const restOperation = get({
      apiName: API_NAME,
      path: '/care-queue/urgent',
      options: {
        headers: await getAuthHeaders(),
      },
    });
    
    const response = await restOperation.response;
    return await response.body.json();
  } catch (error) {
    console.error('Error fetching urgent items:', error);
    return [];
  }
}

export async function updateQueueItemStatus(
  itemId: string, 
  status: 'new' | 'in_progress' | 'completed' | 'snoozed' | 'escalated',
  outcome?: Partial<Outcome>
): Promise<ApiResponse<QueueItem>> {
  try {
    const restOperation = put({
      apiName: API_NAME,
      path: `/care-queue/${encodeURIComponent(itemId)}/status`,
      options: {
        headers: await getAuthHeaders(),
        body: { status, outcome },
      },
    });
    
    const response = await restOperation.response;
    return await response.body.json();
  } catch (error) {
    console.error('Error updating queue item status:', error);
    throw error;
  }
}

// =============================================
// Triage Protocol API
// =============================================

export async function startTriageProtocol(alertId: string): Promise<ApiResponse<TriageProtocol>> {
  try {
    const restOperation = post({
      apiName: API_NAME,
      path: '/triage/start',
      options: {
        headers: await getAuthHeaders(),
        body: { alertId },
      },
    });
    
    const response = await restOperation.response;
    return await response.body.json();
  } catch (error) {
    console.error('Error starting triage protocol:', error);
    throw error;
  }
}

export async function recordTriageResponse(
  protocolId: string,
  questionId: string,
  response: any
): Promise<ApiResponse<TriageProtocol>> {
  try {
    const restOperation = put({
      apiName: API_NAME,
      path: `/triage/${encodeURIComponent(protocolId)}/response`,
      options: {
        headers: await getAuthHeaders(),
        body: { questionId, response },
      },
    });
    
    const apiResponse = await restOperation.response;
    return await apiResponse.body.json();
  } catch (error) {
    console.error('Error recording triage response:', error);
    throw error;
  }
}

export async function completeTriageProtocol(
  protocolId: string,
  outcome: {
    actionTaken: string;
    emergencyServicesCalled: boolean;
    notes: string;
    evidence?: any[];
  }
): Promise<ApiResponse<Plan>> {
  try {
    const restOperation = put({
      apiName: API_NAME,
      path: `/triage/${encodeURIComponent(protocolId)}/complete`,
      options: {
        headers: await getAuthHeaders(),
        body: outcome,
      },
    });
    
    const response = await restOperation.response;
    return await response.body.json();
  } catch (error) {
    console.error('Error completing triage protocol:', error);
    throw error;
  }
}

// =============================================
// Risk Cards API
// =============================================

export async function getRiskCards(elderId?: string): Promise<RiskCard[]> {
  try {
    const queryParams = elderId ? `?elderId=${encodeURIComponent(elderId)}` : '';
    
    const restOperation = get({
      apiName: API_NAME,
      path: `/risk-cards${queryParams}`,
      options: {
        headers: await getAuthHeaders(),
      },
    });
    
    const response = await restOperation.response;
    return await response.body.json();
  } catch (error) {
    console.error('Error fetching risk cards:', error);
    return [];
  }
}

export async function executeRiskCardAction(
  cardId: string,
  actionType: string
): Promise<ApiResponse<Task>> {
  try {
    const restOperation = post({
      apiName: API_NAME,
      path: `/risk-cards/${encodeURIComponent(cardId)}/action`,
      options: {
        headers: await getAuthHeaders(),
        body: { actionType },
      },
    });
    
    const response = await restOperation.response;
    return await response.body.json();
  } catch (error) {
    console.error('Error executing risk card action:', error);
    throw error;
  }
}

// =============================================
// Assignment and Escalation API
// =============================================

export async function getAssignmentRecommendation(
  taskId: string
): Promise<AssignmentRecommendation> {
  try {
    const restOperation = get({
      apiName: API_NAME,
      path: `/assignment/recommend/${encodeURIComponent(taskId)}`,
      options: {
        headers: await getAuthHeaders(),
      },
    });
    
    const response = await restOperation.response;
    return await response.body.json();
  } catch (error) {
    console.error('Error getting assignment recommendation:', error);
    throw error;
  }
}

export async function assignTask(
  taskId: string,
  assigneeId: string,
  reason?: string
): Promise<ApiResponse<Task>> {
  try {
    const restOperation = put({
      apiName: API_NAME,
      path: `/tasks/${encodeURIComponent(taskId)}/assign`,
      options: {
        headers: await getAuthHeaders(),
        body: { assigneeId, reason },
      },
    });
    
    const response = await restOperation.response;
    return await response.body.json();
  } catch (error) {
    console.error('Error assigning task:', error);
    throw error;
  }
}

export async function escalateTask(
  taskId: string,
  escalateTo: string,
  reason: string
): Promise<ApiResponse<EscalationPlan>> {
  try {
    const restOperation = post({
      apiName: API_NAME,
      path: `/tasks/${encodeURIComponent(taskId)}/escalate`,
      options: {
        headers: await getAuthHeaders(),
        body: { escalateTo, reason },
      },
    });
    
    const response = await restOperation.response;
    return await response.body.json();
  } catch (error) {
    console.error('Error escalating task:', error);
    throw error;
  }
}

export async function getFamilyMembers(): Promise<FamilyMember[]> {
  try {
    const restOperation = get({
      apiName: API_NAME,
      path: '/family/members',
      options: {
        headers: await getAuthHeaders(),
      },
    });
    
    const response = await restOperation.response;
    return await response.body.json();
  } catch (error) {
    console.error('Error fetching family members:', error);
    return [];
  }
}

// =============================================
// Timeline and Outcome API
// =============================================

export async function getTimeline(
  elderId?: string,
  limit?: number,
  nextToken?: string
): Promise<PaginatedResponse<TimelineEntry>> {
  try {
    const queryParams = new URLSearchParams();
    if (elderId) queryParams.append('elderId', elderId);
    if (limit) queryParams.append('limit', limit.toString());
    if (nextToken) queryParams.append('nextToken', nextToken);

    const restOperation = get({
      apiName: API_NAME,
      path: `/timeline?${queryParams.toString()}`,
      options: {
        headers: await getAuthHeaders(),
      },
    });
    
    const response = await restOperation.response;
    return await response.body.json();
  } catch (error) {
    console.error('Error fetching timeline:', error);
    return { items: [] };
  }
}

export async function createOutcome(outcome: Omit<Outcome, 'id' | 'recordedAt' | 'recordedBy'>): Promise<ApiResponse<Outcome>> {
  try {
    const restOperation = post({
      apiName: API_NAME,
      path: '/outcomes',
      options: {
        headers: await getAuthHeaders(),
        body: outcome,
      },
    });
    
    const response = await restOperation.response;
    return await response.body.json();
  } catch (error) {
    console.error('Error creating outcome:', error);
    throw error;
  }
}

// =============================================
// Enhanced Task Management API
// =============================================

export async function createTaskWithTemplate(
  template: {
    title: string;
    description: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    elderName: string;
    dueAt: string;
    estimatedMinutes: number;
    checklist: Array<{ text: string; required: boolean }>;
  }
): Promise<ApiResponse<Task>> {
  try {
    const restOperation = post({
      apiName: API_NAME,
      path: '/tasks/enhanced',
      options: {
        headers: await getAuthHeaders(),
        body: template,
      },
    });
    
    const response = await restOperation.response;
    return await response.body.json();
  } catch (error) {
    console.error('Error creating enhanced task:', error);
    throw error;
  }
}

export async function getTaskTemplates(): Promise<Array<{
  id: string;
  name: string;
  category: 'medication' | 'safety' | 'appointment' | 'wellness';
  template: any;
}>> {
  try {
    const restOperation = get({
      apiName: API_NAME,
      path: '/tasks/templates',
      options: {
        headers: await getAuthHeaders(),
      },
    });
    
    const response = await restOperation.response;
    return await response.body.json();
  } catch (error) {
    console.error('Error fetching task templates:', error);
    return [];
  }
}

// =============================================
// Analytics API
// =============================================

export async function getOperationalMetrics(
  timeframe: 'day' | 'week' | 'month' = 'week'
): Promise<OperationalMetrics> {
  try {
    const restOperation = get({
      apiName: API_NAME,
      path: `/analytics/operational?timeframe=${timeframe}`,
      options: {
        headers: await getAuthHeaders(),
      },
    });
    
    const response = await restOperation.response;
    return await response.body.json();
  } catch (error) {
    console.error('Error fetching operational metrics:', error);
    return {
      timeToTriage: 0,
      alertsWithOutcomes: 0,
      taskCompletionRate: 0,
      averageResponseTime: 0,
    };
  }
}

export async function getCareQualityMetrics(
  timeframe: 'day' | 'week' | 'month' = 'week'
): Promise<CareQualityMetrics> {
  try {
    const restOperation = get({
      apiName: API_NAME,
      path: `/analytics/care-quality?timeframe=${timeframe}`,
      options: {
        headers: await getAuthHeaders(),
      },
    });
    
    const response = await restOperation.response;
    return await response.body.json();
  } catch (error) {
    console.error('Error fetching care quality metrics:', error);
    return {
      missedMedicationEvents: 0,
      repeatFalls: 0,
      safetyChecklistCompletion: 0,
    };
  }
}

export async function getCaregiverBurdenMetrics(
  timeframe: 'day' | 'week' | 'month' = 'week'
): Promise<CaregiverBurdenMetrics> {
  try {
    const restOperation = get({
      apiName: API_NAME,
      path: `/analytics/caregiver-burden?timeframe=${timeframe}`,
      options: {
        headers: await getAuthHeaders(),
      },
    });
    
    const response = await restOperation.response;
    return await response.body.json();
  } catch (error) {
    console.error('Error fetching caregiver burden metrics:', error);
    return {
      tasksPerWeek: {},
      nightAlerts: 0,
      workloadDistribution: {},
    };
  }
}

// =============================================
// Emergency Services API
// =============================================

export async function callEmergencyServices(
  alertId: string,
  location?: string
): Promise<ApiResponse<{ callId: string; status: string }>> {
  try {
    const restOperation = post({
      apiName: API_NAME,
      path: '/emergency/call',
      options: {
        headers: await getAuthHeaders(),
        body: { alertId, location },
      },
    });
    
    const response = await restOperation.response;
    return await response.body.json();
  } catch (error) {
    console.error('Error calling emergency services:', error);
    throw error;
  }
}

export async function getEmergencyContacts(): Promise<Array<{
  id: string;
  name: string;
  phone: string;
  relationship: string;
  priority: number;
}>> {
  try {
    const restOperation = get({
      apiName: API_NAME,
      path: '/emergency/contacts',
      options: {
        headers: await getAuthHeaders(),
      },
    });
    
    const response = await restOperation.response;
    return await response.body.json();
  } catch (error) {
    console.error('Error fetching emergency contacts:', error);
    return [];
  }
}

// =============================================
// Stress Mode API
// =============================================

export async function enableStressMode(): Promise<ApiResponse<{ enabled: boolean }>> {
  try {
    const restOperation = post({
      apiName: API_NAME,
      path: '/stress-mode/enable',
      options: {
        headers: await getAuthHeaders(),
      },
    });
    
    const response = await restOperation.response;
    return await response.body.json();
  } catch (error) {
    console.error('Error enabling stress mode:', error);
    throw error;
  }
}

export async function disableStressMode(): Promise<ApiResponse<{ enabled: boolean }>> {
  try {
    const restOperation = post({
      apiName: API_NAME,
      path: '/stress-mode/disable',
      options: {
        headers: await getAuthHeaders(),
      },
    });
    
    const response = await restOperation.response;
    return await response.body.json();
  } catch (error) {
    console.error('Error disabling stress mode:', error);
    throw error;
  }
}