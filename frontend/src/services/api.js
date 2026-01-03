import { get, post, put, del } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';

const API_NAME = 'CareCircleAPI';

// Note: With Amplify v6, the API name must match exactly what's in aws-exports.js
// API.REST.CareCircleAPI

// Helper function to get auth token
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

const MOCK_MODE = false; // ✅ CONNECTED TO REAL AWS BACKEND

/**
 * Standard utility for making API requests with optional mock fallback
 * @param {Function} apiMethod - Amplify API method (get, post, put, del)
 * @param {string} path - API path
 * @param {object} options - request options (body, params)
 * @param {boolean} useMock - whether to prioritize mock data
 * @param {string} mockKey - localStorage key for mock data
 * @param {any} mockDefault - default value for mock data
 */
async function makeRequest({ method, path, options = {}, useMock = false, mockKey, mockDefault }) {
  if (MOCK_MODE || useMock) {
    if (mockKey) {
      const stored = localStorage.getItem(mockKey);
      const localData = stored ? JSON.parse(stored) : [];
      if (localData.length > 0 || Array.isArray(localData)) return localData;
    }
    return mockDefault;
  }

  try {
    const authHeaders = await getAuthHeaders();
    const restOperation = method({
      apiName: API_NAME,
      path,
      options: {
        ...options,
        headers: {
          ...authHeaders,
          ...(options.headers || {}),
        },
      },
    });
    const response = await restOperation.response;
    return await response.body.json();
  } catch (error) {
    let message = error.message || String(error);
    console.error(`API Error [${path}]:`, error);

    // Provide more specific feedback for common Amplify v6 configuration errors
    if (message.includes('API name is invalid')) {
      message = `API name "${API_NAME}" not found in Amplify configuration. Please ensure Amplify.configure() is called correctly in index.js.`;
    }

    // Silent return for main dashboard operations to prevent UI crashes
    if (path.includes('/alerts') || path.includes('/tasks') || path.includes('/analytics')) {
      return mockDefault;
    }

    // Create a more user-friendly error if possible
    const detailedError = new Error(message);
    detailedError.originalError = error;
    throw detailedError;
  }
}

// Alerts API
export async function getAlerts() {
  return makeRequest({
    method: get,
    path: '/alerts',
    useMock: false,
    mockKey: 'carecircle_alerts',
    mockDefault: [
      {
        id: '1',
        type: 'memoryIssue',
        severity: 'urgent',
        message: 'Mom seemed confused about her medication during today\'s call',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
    ]
  });
}

// Tasks API
export async function getTasks(params = {}) {
  const data = await makeRequest({
    method: get,
    path: `/tasks?${new URLSearchParams(params).toString()}`,
    useMock: false,
    mockKey: 'carecircle_tasks',
    mockDefault: [
      {
        id: '1',
        title: 'Check medication schedule',
        description: 'Verify if Mom is taking her morning pills correctly',
        priority: 'urgent',
        status: 'pending',
        elderName: 'Mom',
        assignedTo: null,
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: '2',
        title: 'Schedule doctor appointment',
        description: 'Book follow-up appointment with cardiologist',
        priority: 'high',
        status: 'pending',
        elderName: 'Mom',
        assignedTo: 'Carlos',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ]
  });

  // Normalize snake_case from backend to camelCase for frontend consistency
  const tasks = Array.isArray(data) ? data : [];
  return tasks.map(task => ({
    ...task,
    id: task.task_id || task.id,
    createdAt: task.created_at || task.createdAt,
    updatedAt: task.updated_at || task.updatedAt,
    assignedTo: task.assigned_to_name || task.assigned_to || task.assignedTo,
    elderName: task.elder_name || task.elderName,
    createdBy: task.created_by || task.createdBy,
  }));
}

export async function acceptTask(taskId) {
  return makeRequest({
    method: put,
    path: `/tasks/${encodeURIComponent(taskId)}/accept`,
    mockDefault: { success: true }
  });
}

export async function completeTask(taskId, notes = '') {
  return makeRequest({
    method: put,
    path: `/tasks/${encodeURIComponent(taskId)}/complete`,
    options: { body: { notes } },
    mockDefault: { success: true }
  });
}

export async function createTask(taskData) {
  const result = await makeRequest({
    method: post,
    path: '/tasks',
    options: { body: taskData },
    useMock: false,
    mockKey: 'carecircle_tasks',
    mockDefault: { success: true, taskId: 'task-' + Date.now() }
  });

  // Normalize the response if it contains a task object
  if (result.task) {
    result.task = {
      ...result.task,
      id: result.task.task_id || result.task.id,
      createdAt: result.task.created_at || result.task.createdAt,
      updatedAt: result.task.updated_at || result.task.updatedAt,
      assignedTo: result.task.assigned_to || result.task.assignedTo,
      elderName: result.task.elder_name || result.task.elderName,
      createdBy: result.task.created_by || result.task.createdBy,
    };
  }
  return result;
}

// Analytics API
export async function getAnalytics(params = {}) {
  return makeRequest({
    method: get,
    path: `/analytics?${new URLSearchParams(params).toString()}`,
    mockDefault: {
      taskCompletion: 0,
      avgResponseTime: 0,
      activeMembers: 0,
      totalTasks: 0,
      tasksByMember: [],
      trendsData: [],
      effectivenessData: [],
      insights: [],
    }
  });
}

// User Profile API
export async function getUserProfile(userId) {
  const data = await makeRequest({
    method: get,
    path: `/users/${userId}/profile`,
    mockDefault: {}
  });

  // Return default values if profile doesn't exist yet
  return {
    language: data.language || 'en',
    zipCode: data.zipcode || data.zipCode || '',
    skills: data.skills || [],
    availability: data.availability || 'flexible',
    notifications: data.notifications || {
      sms: true,
      email: true,
      push: true,
    },
  };
}

export async function updateUserProfile(profileData) {
  return makeRequest({
    method: put,
    path: '/users/profile',
    options: { body: profileData },
    mockDefault: { success: true }
  });
}

// Call/Transcription API
export async function startTranscription() {
  return makeRequest({
    method: post,
    path: '/transcribe/start',
    mockDefault: { sessionId: 'mock-session-' + Date.now() }
  });
}

export async function stopTranscription() {
  return makeRequest({
    method: post,
    path: '/transcribe/stop',
    mockDefault: { success: true }
  });
}

export async function analyzeTranscript(audioData) {
  return makeRequest({
    method: post,
    path: '/analyze/transcript',
    options: {
      headers: { 'Content-Type': 'application/json' },
      body: audioData,
    },
    useMock: false,
    mockDefault: {
      transcript: audioData.transcript || 'Sample transcript for mock analysis.',
      analysis: {
        summary: 'Mock analysis summary.',
        sentiment: 'neutral',
        urgency: 'low',
        concerns: [],
        medicalEntities: [],
        keyPhrases: [],
        recommendation: 'No immediate action required.',
        riskScores: { cognitive: 0, medicationAdherence: 0, overallHealth: 0 },
        aiProvider: 'Mock Mode',
      },
    }
  });
}

// Elder Management API
export async function getElders() {
  return makeRequest({
    method: get,
    path: '/elders',
    useMock: false,
    mockKey: 'carecircle_elders',
    mockDefault: []
  });
}

export async function createElder(elderData) {
  return makeRequest({
    method: post,
    path: '/elders',
    options: { body: elderData },
    useMock: false,
    mockKey: 'carecircle_elders',
    mockDefault: { success: true, id: 'elder-' + Date.now() }
  });
}

export async function updateElder(elderId, elderData) {
  return makeRequest({
    method: put,
    path: `/elders/${encodeURIComponent(elderId)}`,
    options: { body: elderData },
    useMock: false,
    mockKey: 'carecircle_elders',
    mockDefault: { success: true }
  });
}

export async function deleteElder(elderId) {
  return makeRequest({
    method: del,
    path: `/elders/${encodeURIComponent(elderId)}`,
    useMock: false,
    mockKey: 'carecircle_elders',
    mockDefault: { success: true }
  });
}

// Caregiver Management API
export async function getCaregivers() {
  return makeRequest({
    method: get,
    path: '/caregivers',
    useMock: false,
    mockKey: 'carecircle_caregivers',
    mockDefault: []
  });
}

export async function createCaregiver(caregiverData) {
  return makeRequest({
    method: post,
    path: '/caregivers',
    options: { body: caregiverData },
    useMock: false,
    mockKey: 'carecircle_caregivers',
    mockDefault: { success: true }
  });
}

export async function updateCaregiver(caregiverId, caregiverData) {
  return makeRequest({
    method: put,
    path: `/caregivers/${encodeURIComponent(caregiverId)}`,
    options: { body: caregiverData },
    useMock: false,
    mockKey: 'carecircle_caregivers',
    mockDefault: { success: true }
  });
}

export async function deleteCaregiver(caregiverId) {
  return makeRequest({
    method: del,
    path: `/caregivers/${encodeURIComponent(caregiverId)}`,
    useMock: false,
    mockKey: 'carecircle_caregivers',
    mockDefault: { success: true }
  });
}

export async function deleteTask(taskId) {
  return makeRequest({
    method: del,
    path: `/tasks/${encodeURIComponent(taskId)}`,
    useMock: false,
    mockKey: 'carecircle_tasks',
    mockDefault: { success: true }
  });
}

export async function deleteAlert(alertId) {
  return makeRequest({
    method: del,
    path: `/alerts/${encodeURIComponent(alertId)}`,
    useMock: false,
    mockKey: 'carecircle_alerts',
    mockDefault: { success: true }
  });
}

// =============================================
// CALL RECORDS API
// =============================================

export async function getCalls() {
  return makeRequest({
    method: get,
    path: '/calls',
    mockDefault: []
  });
}

export async function createCall(callData) {
  return makeRequest({
    method: post,
    path: '/calls',
    options: { body: callData },
    mockDefault: { success: true, call_id: `CALL#${Date.now()}` }
  });
}

export async function getCall(callId) {
  return makeRequest({
    method: get,
    path: `/calls/${encodeURIComponent(callId)}`,
    mockDefault: null
  });
}

export async function deleteCall(callId) {
  return makeRequest({
    method: del,
    path: `/calls/${encodeURIComponent(callId)}`,
    mockDefault: { success: true }
  });
}

// =============================================
// MEDICATIONS API
// =============================================

export async function getMedications() {
  return makeRequest({
    method: get,
    path: '/medications',
    mockDefault: []
  });
}

export async function createMedication(medication) {
  return makeRequest({
    method: post,
    path: '/medications',
    options: { body: medication },
    mockDefault: { success: true, medication_id: `MED#${Date.now()}` }
  });
}

export async function updateMedication(medicationId, medication) {
  return makeRequest({
    method: put,
    path: `/medications/${encodeURIComponent(medicationId)}`,
    options: { body: medication },
    mockDefault: { success: true }
  });
}

export async function deleteMedication(medicationId) {
  return makeRequest({
    method: del,
    path: `/medications/${encodeURIComponent(medicationId)}`,
    mockDefault: { success: true }
  });
}

export async function logMedicationTaken(medicationId, logData) {
  return makeRequest({
    method: post,
    path: `/medications/${encodeURIComponent(medicationId)}/log`,
    options: { body: logData },
    mockDefault: { success: true }
  });
}

// =============================================
// EMERGENCY CONTACTS API
// =============================================

export async function getEmergencyContacts() {
  return makeRequest({
    method: get,
    path: '/emergency-contacts',
    mockDefault: []
  });
}

export async function createEmergencyContact(contact) {
  return makeRequest({
    method: post,
    path: '/emergency-contacts',
    options: { body: contact },
    mockDefault: { success: true, contact_id: `CONTACT#${Date.now()}` }
  });
}

export async function updateEmergencyContact(contactId, contact) {
  return makeRequest({
    method: put,
    path: `/emergency-contacts/${encodeURIComponent(contactId)}`,
    options: { body: contact },
    mockDefault: { success: true }
  });
}

export async function deleteEmergencyContact(contactId) {
  return makeRequest({
    method: del,
    path: `/emergency-contacts/${encodeURIComponent(contactId)}`,
    mockDefault: { success: true }
  });
}

export async function getMedicalId() {
  return makeRequest({
    method: get,
    path: '/medical-id',
    mockDefault: {
      name: 'Unknown',
      conditions: [],
      allergies: [],
      medications: [],
      emergency_contacts: [],
    }
  });
}

// =============================================
// HEALTH CONDITIONS & ALLERGIES API
// =============================================

export async function getHealthConditions() {
  return makeRequest({
    method: get,
    path: '/health-conditions',
    mockDefault: []
  });
}

export async function createHealthCondition(condition) {
  return makeRequest({
    method: post,
    path: '/health-conditions',
    options: { body: condition },
    mockDefault: { success: true }
  });
}

export async function deleteHealthCondition(conditionId) {
  return makeRequest({
    method: del,
    path: `/health-conditions/${encodeURIComponent(conditionId)}`,
    mockDefault: { success: true }
  });
}

export async function getAllergies() {
  return makeRequest({
    method: get,
    path: '/allergies',
    mockDefault: []
  });
}

export async function createAllergy(allergy) {
  return makeRequest({
    method: post,
    path: '/allergies',
    options: { body: allergy },
    mockDefault: { success: true }
  });
}

export async function deleteAllergy(allergyId) {
  return makeRequest({
    method: del,
    path: `/allergies/${encodeURIComponent(allergyId)}`,
    mockDefault: { success: true }
  });
}

// =============================================
// WELLNESS API
// =============================================

export async function getWellness() {
  return makeRequest({
    method: get,
    path: '/wellness',
    mockDefault: []
  });
}

export async function logWellness(wellnessData) {
  return makeRequest({
    method: post,
    path: '/wellness',
    options: { body: wellnessData },
    mockDefault: { success: true }
  });
}

// =============================================
// ACTION HISTORY API
// =============================================

export async function getActions(params = {}) {
  return makeRequest({
    method: get,
    path: `/actions?${new URLSearchParams(params).toString()}`,
    mockDefault: []
  });
}

export async function createAction(actionData) {
  return makeRequest({
    method: post,
    path: '/actions',
    options: { body: actionData },
    mockDefault: { success: true, action_id: `ACTION#${Date.now()}` }
  });
}

// Export all API functions as an object
export const api = {
  // Existing
  getAlerts,
  getTasks,
  createTask,
  acceptTask,
  completeTask,
  deleteTask,
  getAnalytics,
  getUserProfile,
  updateUserProfile,
  startTranscription,
  stopTranscription,
  analyzeTranscript,
  getElders,
  createElder,
  updateElder,
  deleteElder,
  getCaregivers,
  createCaregiver,
  updateCaregiver,
  deleteCaregiver,
  deleteAlert,
  // New: Call Records
  getCalls,
  createCall,
  getCall,
  deleteCall,
  // New: Medications
  getMedications,
  createMedication,
  updateMedication,
  deleteMedication,
  logMedicationTaken,
  // New: Emergency Contacts
  getEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  getMedicalId,
  // New: Health Conditions & Allergies
  getHealthConditions,
  createHealthCondition,
  deleteHealthCondition,
  getAllergies,
  createAllergy,
  deleteAllergy,
  // New: Wellness
  getWellness,
  logWellness,
  // New: Action History
  getActions,
  createAction,
};

