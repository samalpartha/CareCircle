/**
 * Emergency Safety Escalation Service
 * Handles one-tap 911 dialing, emergency contact integration, and call script generation
 */

import { ApiResponse } from '../types/care-operations';
import { callEmergencyServices, getEmergencyContacts } from './care-operations-api';

// =============================================
// Types and Interfaces
// =============================================

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  priority: number;
  isAvailable?: boolean;
  lastContactedAt?: string;
}

export interface EmergencyCallRequest {
  alertId: string;
  location?: string;
  elderName: string;
  scenario: 'fall' | 'injury' | 'chest_pain' | 'confusion' | 'general';
  urgencyLevel: number;
  triageResponses?: Record<string, any>;
}

export interface EmergencyCallResult {
  callId: string;
  status: 'initiated' | 'connected' | 'failed';
  timestamp: string;
  emergencyServicesCalled: boolean;
  contactsNotified: string[];
  callScript: string;
}

export interface CallScript {
  scenario: string;
  primaryScript: string;
  keyInformation: string[];
  medicalHistory?: string;
  currentCondition: string;
  location: string;
  callbackNumber: string;
}

// =============================================
// Emergency Escalation Service
// =============================================

export class EmergencyEscalationService {
  private emergencyContacts: EmergencyContact[] = [];
  private lastContactsUpdate: Date | null = null;

  constructor() {
    this.loadEmergencyContacts();
  }

  /**
   * Initiate emergency services call with one-tap functionality
   */
  async callEmergencyServices(request: EmergencyCallRequest): Promise<EmergencyCallResult> {
    try {
      // Generate call script based on scenario
      const callScript = this.generateCallScript(request);
      
      // Initiate emergency services call
      const emergencyResponse = await callEmergencyServices(request.alertId, request.location);
      
      // Notify emergency contacts
      const contactsNotified = await this.notifyEmergencyContacts(request);
      
      // Log the emergency call
      const result: EmergencyCallResult = {
        callId: emergencyResponse.data?.callId || `EMERGENCY_${Date.now()}`,
        status: emergencyResponse.success ? 'initiated' : 'failed',
        timestamp: new Date().toISOString(),
        emergencyServicesCalled: emergencyResponse.success,
        contactsNotified,
        callScript: callScript.primaryScript
      };

      // Store call result for audit trail
      this.logEmergencyCall(result, request);

      return result;
    } catch (error) {
      console.error('Error calling emergency services:', error);
      
      // Return failed result but still try to notify contacts
      const contactsNotified = await this.notifyEmergencyContacts(request);
      
      return {
        callId: `EMERGENCY_FAILED_${Date.now()}`,
        status: 'failed',
        timestamp: new Date().toISOString(),
        emergencyServicesCalled: false,
        contactsNotified,
        callScript: this.generateCallScript(request).primaryScript
      };
    }
  }

  /**
   * Generate call script based on scenario and triage responses
   */
  generateCallScript(request: EmergencyCallRequest): CallScript {
    const baseLocation = request.location || 'Location to be determined';
    const elderName = request.elderName;
    const scenario = request.scenario;
    const responses = request.triageResponses || {};

    // Scenario-specific scripts
    const scenarioScripts = {
      fall: this.generateFallCallScript(elderName, baseLocation, responses),
      injury: this.generateInjuryCallScript(elderName, baseLocation, responses),
      chest_pain: this.generateChestPainCallScript(elderName, baseLocation, responses),
      confusion: this.generateConfusionCallScript(elderName, baseLocation, responses),
      general: this.generateGeneralCallScript(elderName, baseLocation, responses)
    };

    return scenarioScripts[scenario] || scenarioScripts.general;
  }

  /**
   * Get emergency contacts with availability status
   */
  async getEmergencyContacts(): Promise<EmergencyContact[]> {
    // Refresh contacts if they're stale (older than 5 minutes)
    const now = new Date();
    if (!this.lastContactsUpdate || 
        (now.getTime() - this.lastContactsUpdate.getTime()) > 5 * 60 * 1000) {
      await this.loadEmergencyContacts();
    }

    return this.emergencyContacts.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Add or update emergency contact
   */
  async updateEmergencyContact(contact: Omit<EmergencyContact, 'id'>): Promise<EmergencyContact> {
    const newContact: EmergencyContact = {
      ...contact,
      id: `CONTACT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // Add to local cache
    this.emergencyContacts.push(newContact);
    this.emergencyContacts.sort((a, b) => a.priority - b.priority);

    // TODO: Persist to backend
    console.log('Emergency contact added:', newContact);

    return newContact;
  }

  /**
   * Test emergency contact availability
   */
  async testContactAvailability(contactId: string): Promise<boolean> {
    const contact = this.emergencyContacts.find(c => c.id === contactId);
    if (!contact) {
      return false;
    }

    try {
      // Simulate availability check (in real implementation, this might ping the contact)
      const isAvailable = Math.random() > 0.3; // 70% availability simulation
      
      // Update contact availability
      contact.isAvailable = isAvailable;
      contact.lastContactedAt = new Date().toISOString();

      return isAvailable;
    } catch (error) {
      console.error('Error testing contact availability:', error);
      return false;
    }
  }

  /**
   * Get call script for display to user
   */
  getCallScriptForDisplay(request: EmergencyCallRequest): string {
    const script = this.generateCallScript(request);
    return this.formatCallScriptForDisplay(script);
  }

  // =============================================
  // Private Helper Methods
  // =============================================

  private async loadEmergencyContacts(): Promise<void> {
    try {
      const contacts = await getEmergencyContacts();
      this.emergencyContacts = contacts.map(contact => ({
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        relationship: contact.relationship,
        priority: contact.priority,
        isAvailable: undefined,
        lastContactedAt: undefined
      }));
      this.lastContactsUpdate = new Date();
    } catch (error) {
      console.error('Error loading emergency contacts:', error);
      // Use default emergency contacts if API fails
      this.emergencyContacts = this.getDefaultEmergencyContacts();
    }
  }

  private getDefaultEmergencyContacts(): EmergencyContact[] {
    return [
      {
        id: 'DEFAULT_911',
        name: 'Emergency Services (911)',
        phone: '911',
        relationship: 'Emergency Services',
        priority: 1,
        isAvailable: true
      },
      {
        id: 'DEFAULT_POISON',
        name: 'Poison Control',
        phone: '1-800-222-1222',
        relationship: 'Poison Control',
        priority: 2,
        isAvailable: true
      }
    ];
  }

  private async notifyEmergencyContacts(request: EmergencyCallRequest): Promise<string[]> {
    const notifiedContacts: string[] = [];
    
    try {
      const contacts = await this.getEmergencyContacts();
      
      // Notify top 3 priority contacts
      const contactsToNotify = contacts.slice(0, 3);
      
      for (const contact of contactsToNotify) {
        try {
          // Skip 911 for notifications (they're already being called)
          if (contact.phone === '911') {
            continue;
          }

          // Simulate notification (SMS, call, push notification, etc.)
          const notificationMessage = this.generateNotificationMessage(request, contact);
          
          // TODO: Implement actual notification sending
          console.log(`Notifying ${contact.name} (${contact.phone}): ${notificationMessage}`);
          
          notifiedContacts.push(contact.id);
        } catch (error) {
          console.error(`Error notifying contact ${contact.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Error notifying emergency contacts:', error);
    }

    return notifiedContacts;
  }

  private generateNotificationMessage(request: EmergencyCallRequest, contact: EmergencyContact): string {
    const elderName = request.elderName;
    const scenario = request.scenario;
    const timestamp = new Date().toLocaleString();

    return `EMERGENCY ALERT: ${elderName} needs immediate assistance due to ${scenario}. Emergency services have been contacted. Please respond if available. Time: ${timestamp}`;
  }

  private generateFallCallScript(elderName: string, location: string, responses: Record<string, any>): CallScript {
    const consciousness = responses.consciousness;
    const severeInjury = responses.severe_injury;
    const painLevel = responses.pain_level_initial || 'unknown';
    const headInjury = responses.head_injury_check;
    const mobility = responses.mobility_status;

    const keyInfo = [
      `Patient: ${elderName}`,
      `Incident: Fall`,
      `Conscious: ${consciousness ? 'Yes' : 'No'}`,
      `Severe injury: ${severeInjury ? 'Yes' : 'No'}`,
      `Pain level: ${painLevel}/10`,
      `Head injury: ${headInjury ? 'Yes' : 'No'}`,
      `Can move: ${mobility ? 'Yes' : 'No'}`
    ];

    const primaryScript = `This is a medical emergency. An elderly person named ${elderName} has fallen. ` +
      `${!consciousness ? 'The person is unconscious. ' : ''}` +
      `${severeInjury ? 'There are signs of severe injury. ' : ''}` +
      `${headInjury ? 'There may be a head injury. ' : ''}` +
      `${!mobility ? 'The person cannot move. ' : ''}` +
      `Please send an ambulance immediately to ${location}.`;

    return {
      scenario: 'fall',
      primaryScript,
      keyInformation: keyInfo,
      currentCondition: this.assessFallCondition(responses),
      location,
      callbackNumber: 'Callback number to be provided'
    };
  }

  private generateInjuryCallScript(elderName: string, location: string, responses: Record<string, any>): CallScript {
    const consciousness = responses.consciousness;
    const bleeding = responses.bleeding_severity || 'unknown';
    const breathing = responses.breathing_status;
    const painLevel = responses.pain_scale || 'unknown';
    const injuryLocation = responses.injury_location || 'unknown';

    const keyInfo = [
      `Patient: ${elderName}`,
      `Incident: Injury`,
      `Conscious: ${consciousness ? 'Yes' : 'No'}`,
      `Bleeding: ${bleeding}`,
      `Breathing normal: ${breathing ? 'Yes' : 'No'}`,
      `Pain level: ${painLevel}/10`,
      `Injury location: ${injuryLocation}`
    ];

    const primaryScript = `This is a medical emergency. An elderly person named ${elderName} has sustained an injury. ` +
      `${!consciousness ? 'The person is unconscious. ' : ''}` +
      `${bleeding === 'Severe bleeding' ? 'There is severe bleeding. ' : ''}` +
      `${!breathing ? 'The person is having difficulty breathing. ' : ''}` +
      `The injury is located at ${injuryLocation}. ` +
      `Please send an ambulance immediately to ${location}.`;

    return {
      scenario: 'injury',
      primaryScript,
      keyInformation: keyInfo,
      currentCondition: this.assessInjuryCondition(responses),
      location,
      callbackNumber: 'Callback number to be provided'
    };
  }

  private generateChestPainCallScript(elderName: string, location: string, responses: Record<string, any>): CallScript {
    const consciousness = responses.consciousness;
    const painSeverity = responses.chest_pain_severity || 'unknown';
    const breathingDifficulty = responses.breathing_difficulty;
    const sweatingNausea = responses.sweating_nausea;
    const painRadiation = responses.pain_radiation;
    const cardiacHistory = responses.cardiac_history;

    const keyInfo = [
      `Patient: ${elderName}`,
      `Incident: Chest Pain`,
      `Conscious: ${consciousness ? 'Yes' : 'No'}`,
      `Pain severity: ${painSeverity}/10`,
      `Breathing difficulty: ${breathingDifficulty ? 'Yes' : 'No'}`,
      `Sweating/nausea: ${sweatingNausea ? 'Yes' : 'No'}`,
      `Pain radiating: ${painRadiation ? 'Yes' : 'No'}`,
      `Cardiac history: ${cardiacHistory ? 'Yes' : 'No'}`
    ];

    const primaryScript = `This is a medical emergency. An elderly person named ${elderName} is experiencing severe chest pain. ` +
      `${!consciousness ? 'The person is unconscious. ' : ''}` +
      `${breathingDifficulty ? 'There is difficulty breathing. ' : ''}` +
      `${sweatingNausea ? 'The person is sweating and nauseous. ' : ''}` +
      `${painRadiation ? 'The pain is radiating to arm, jaw, or back. ' : ''}` +
      `${cardiacHistory ? 'The person has a history of heart problems. ' : ''}` +
      `This may be a heart attack. Please send an ambulance immediately to ${location}.`;

    return {
      scenario: 'chest_pain',
      primaryScript,
      keyInformation: keyInfo,
      medicalHistory: cardiacHistory ? 'History of cardiac problems' : 'No known cardiac history',
      currentCondition: this.assessChestPainCondition(responses),
      location,
      callbackNumber: 'Callback number to be provided'
    };
  }

  private generateConfusionCallScript(elderName: string, location: string, responses: Record<string, any>): CallScript {
    const responsiveness = responses.responsiveness;
    const orientation = responses.orientation_check || 'unknown';
    const physicalSymptoms = responses.physical_symptoms;
    const confusionOnset = responses.confusion_onset || 'unknown';
    const safetyConserns = responses.safety_concerns;

    const keyInfo = [
      `Patient: ${elderName}`,
      `Incident: Confusion/Altered Mental State`,
      `Responsive: ${responsiveness ? 'Yes' : 'No'}`,
      `Orientation: ${orientation}`,
      `Physical symptoms: ${physicalSymptoms ? 'Yes' : 'No'}`,
      `Onset: ${confusionOnset}`,
      `Safety concerns: ${safetyConserns ? 'Yes' : 'No'}`
    ];

    const primaryScript = `This is a medical emergency. An elderly person named ${elderName} is experiencing severe confusion or altered mental state. ` +
      `${!responsiveness ? 'The person is not responsive to voice or touch. ' : ''}` +
      `${physicalSymptoms ? 'There are physical symptoms present. ' : ''}` +
      `${safetyConserns ? 'There are immediate safety concerns. ' : ''}` +
      `The confusion started ${confusionOnset}. ` +
      `Please send an ambulance immediately to ${location}.`;

    return {
      scenario: 'confusion',
      primaryScript,
      keyInformation: keyInfo,
      currentCondition: this.assessConfusionCondition(responses),
      location,
      callbackNumber: 'Callback number to be provided'
    };
  }

  private generateGeneralCallScript(elderName: string, location: string, responses: Record<string, any>): CallScript {
    const keyInfo = [
      `Patient: ${elderName}`,
      `Incident: Medical Emergency`,
      `Location: ${location}`
    ];

    const primaryScript = `This is a medical emergency involving an elderly person named ${elderName}. ` +
      `Please send an ambulance immediately to ${location}.`;

    return {
      scenario: 'general',
      primaryScript,
      keyInformation: keyInfo,
      currentCondition: 'Medical emergency requiring immediate attention',
      location,
      callbackNumber: 'Callback number to be provided'
    };
  }

  private assessFallCondition(responses: Record<string, any>): string {
    const consciousness = responses.consciousness;
    const severeInjury = responses.severe_injury;
    const headInjury = responses.head_injury_check;
    const mobility = responses.mobility_status;

    if (!consciousness) return 'Critical - Unconscious';
    if (severeInjury || headInjury) return 'Serious - Potential major injury';
    if (!mobility) return 'Moderate - Cannot move';
    return 'Stable - Conscious and mobile';
  }

  private assessInjuryCondition(responses: Record<string, any>): string {
    const consciousness = responses.consciousness;
    const bleeding = responses.bleeding_severity;
    const breathing = responses.breathing_status;

    if (!consciousness) return 'Critical - Unconscious';
    if (bleeding === 'Severe bleeding' || !breathing) return 'Critical - Life threatening';
    if (bleeding === 'Moderate bleeding') return 'Serious - Significant injury';
    return 'Stable - Minor injury';
  }

  private assessChestPainCondition(responses: Record<string, any>): string {
    const consciousness = responses.consciousness;
    const painSeverity = responses.chest_pain_severity || 0;
    const breathingDifficulty = responses.breathing_difficulty;
    const painRadiation = responses.pain_radiation;

    if (!consciousness) return 'Critical - Unconscious';
    if (painSeverity >= 8 || breathingDifficulty || painRadiation) return 'Critical - Possible heart attack';
    if (painSeverity >= 6) return 'Serious - Significant chest pain';
    return 'Moderate - Chest discomfort';
  }

  private assessConfusionCondition(responses: Record<string, any>): string {
    const responsiveness = responses.responsiveness;
    const physicalSymptoms = responses.physical_symptoms;
    const safetyConserns = responses.safety_concerns;

    if (!responsiveness) return 'Critical - Unresponsive';
    if (physicalSymptoms || safetyConserns) return 'Serious - Altered mental state with complications';
    return 'Moderate - Confusion requiring evaluation';
  }

  private formatCallScriptForDisplay(script: CallScript): string {
    return `
EMERGENCY CALL SCRIPT - ${script.scenario.toUpperCase()}

PRIMARY MESSAGE:
${script.primaryScript}

KEY INFORMATION TO PROVIDE:
${script.keyInformation.map(info => `• ${info}`).join('\n')}

CURRENT CONDITION: ${script.currentCondition}
LOCATION: ${script.location}
${script.medicalHistory ? `MEDICAL HISTORY: ${script.medicalHistory}` : ''}

Remember to:
• Stay calm and speak clearly
• Provide your callback number when asked
• Follow dispatcher instructions
• Stay on the line until help arrives
    `.trim();
  }

  private logEmergencyCall(result: EmergencyCallResult, request: EmergencyCallRequest): void {
    const logEntry = {
      timestamp: result.timestamp,
      callId: result.callId,
      alertId: request.alertId,
      elderName: request.elderName,
      scenario: request.scenario,
      status: result.status,
      emergencyServicesCalled: result.emergencyServicesCalled,
      contactsNotified: result.contactsNotified.length,
      urgencyLevel: request.urgencyLevel
    };

    // TODO: Send to backend for audit trail
    console.log('Emergency call logged:', logEntry);
  }
}

// =============================================
// Singleton Instance and Utility Functions
// =============================================

// Create singleton instance
const emergencyEscalationService = new EmergencyEscalationService();

/**
 * One-tap emergency services call
 */
export async function callEmergencyServicesOneTouch(request: EmergencyCallRequest): Promise<EmergencyCallResult> {
  return emergencyEscalationService.callEmergencyServices(request);
}

/**
 * Get formatted call script for display
 */
export function getEmergencyCallScript(request: EmergencyCallRequest): string {
  return emergencyEscalationService.getCallScriptForDisplay(request);
}

/**
 * Get emergency contacts
 */
export async function getEmergencyContactsList(): Promise<EmergencyContact[]> {
  return emergencyEscalationService.getEmergencyContacts();
}

/**
 * Add emergency contact
 */
export async function addEmergencyContact(contact: Omit<EmergencyContact, 'id'>): Promise<EmergencyContact> {
  return emergencyEscalationService.updateEmergencyContact(contact);
}

/**
 * Test contact availability
 */
export async function testEmergencyContactAvailability(contactId: string): Promise<boolean> {
  return emergencyEscalationService.testContactAvailability(contactId);
}

/**
 * Generate call script for specific scenario
 */
export function generateScenarioCallScript(
  scenario: 'fall' | 'injury' | 'chest_pain' | 'confusion' | 'general',
  elderName: string,
  location: string,
  triageResponses: Record<string, any> = {}
): CallScript {
  const request: EmergencyCallRequest = {
    alertId: `TEMP_${Date.now()}`,
    elderName,
    location,
    scenario,
    urgencyLevel: 10,
    triageResponses
  };

  return emergencyEscalationService.generateCallScript(request);
}

export default emergencyEscalationService;