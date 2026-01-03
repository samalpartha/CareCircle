/**
 * Triage Protocol State Machine
 * Implements 4-step workflow: Safety Check → Assessment → Action Plan → Outcome Capture
 */

import {
  TriageProtocol,
  TriageStep,
  TriageQuestion,
  StepTransition,
  ActionPlan,
  TriageOutcome,
  TaskTemplate,
  Evidence
} from '../types/care-operations';

// =============================================
// Protocol Templates
// =============================================

export interface TriageProtocolTemplate {
  protocolType: 'fall' | 'injury' | 'chest_pain' | 'confusion';
  steps: TriageStep[];
}

// Fall Protocol Template
const FALL_PROTOCOL: TriageProtocolTemplate = {
  protocolType: 'fall',
  steps: [
    {
      stepNumber: 1,
      title: 'Immediate Safety Check',
      questions: [
        {
          id: 'consciousness',
          text: 'Is the elder conscious and breathing normally?',
          type: 'yes_no',
          required: true,
          criticalFlag: true
        },
        {
          id: 'severe_injury',
          text: 'Is there severe bleeding, head injury, or inability to move?',
          type: 'yes_no',
          required: true,
          criticalFlag: true
        },
        {
          id: 'pain_level_initial',
          text: 'On a scale of 1-10, how severe is the pain?',
          type: 'scale',
          required: true,
          criticalFlag: false
        }
      ],
      criticalFlags: ['consciousness_no', 'severe_injury_yes', 'pain_level_initial_8_plus'],
      nextStepLogic: [
        {
          condition: 'consciousness_no OR severe_injury_yes OR pain_level_initial >= 8',
          nextStep: 'emergency'
        },
        {
          condition: 'consciousness_yes AND severe_injury_no AND pain_level_initial < 8',
          nextStep: 2
        }
      ]
    },
    {
      stepNumber: 2,
      title: 'Rapid Assessment',
      questions: [
        {
          id: 'pain_location',
          text: 'Where is the pain located?',
          type: 'multiple_choice',
          options: ['Head/Neck', 'Back/Spine', 'Hip/Pelvis', 'Arm/Shoulder', 'Leg/Knee', 'Other'],
          required: true
        },
        {
          id: 'mobility_status',
          text: 'Can the elder move without assistance?',
          type: 'yes_no',
          required: true
        },
        {
          id: 'current_medications',
          text: 'Is the elder taking blood thinners or other medications?',
          type: 'yes_no',
          required: true
        },
        {
          id: 'head_injury_check',
          text: 'Did the elder hit their head during the fall?',
          type: 'yes_no',
          required: true,
          criticalFlag: true
        },
        {
          id: 'confusion_check',
          text: 'Is the elder confused or disoriented?',
          type: 'yes_no',
          required: true,
          criticalFlag: true
        }
      ],
      criticalFlags: ['head_injury_check_yes', 'confusion_check_yes'],
      nextStepLogic: [
        {
          condition: 'head_injury_check_yes OR confusion_check_yes',
          nextStep: 'emergency'
        },
        {
          condition: 'mobility_status_no',
          nextStep: 'emergency'
        },
        {
          condition: 'DEFAULT',
          nextStep: 3
        }
      ]
    },
    {
      stepNumber: 3,
      title: 'Action Plan Generation',
      questions: [
        {
          id: 'action_preference',
          text: 'Based on the assessment, what action would you prefer?',
          type: 'multiple_choice',
          options: ['Call 911', 'Go to Urgent Care', 'Call Nurse Line', 'Monitor at Home'],
          required: true
        }
      ],
      criticalFlags: [],
      nextStepLogic: [
        {
          condition: 'DEFAULT',
          nextStep: 4
        }
      ]
    },
    {
      stepNumber: 4,
      title: 'Outcome Capture',
      questions: [
        {
          id: 'action_taken',
          text: 'What action was taken?',
          type: 'text',
          required: true
        },
        {
          id: 'emergency_called',
          text: 'Were emergency services called?',
          type: 'yes_no',
          required: true
        },
        {
          id: 'outcome_notes',
          text: 'Additional notes about the outcome:',
          type: 'text',
          required: false
        }
      ],
      criticalFlags: [],
      nextStepLogic: [
        {
          condition: 'DEFAULT',
          nextStep: 'complete'
        }
      ]
    }
  ]
};

// Injury Protocol Template
const INJURY_PROTOCOL: TriageProtocolTemplate = {
  protocolType: 'injury',
  steps: [
    {
      stepNumber: 1,
      title: 'Immediate Safety Check',
      questions: [
        {
          id: 'consciousness',
          text: 'Is the elder conscious and alert?',
          type: 'yes_no',
          required: true,
          criticalFlag: true
        },
        {
          id: 'bleeding_severity',
          text: 'Is there active bleeding?',
          type: 'multiple_choice',
          options: ['No bleeding', 'Minor bleeding', 'Moderate bleeding', 'Severe bleeding'],
          required: true,
          criticalFlag: true
        },
        {
          id: 'breathing_status',
          text: 'Is breathing normal and unlabored?',
          type: 'yes_no',
          required: true,
          criticalFlag: true
        }
      ],
      criticalFlags: ['consciousness_no', 'bleeding_severity_severe', 'breathing_status_no'],
      nextStepLogic: [
        {
          condition: 'consciousness_no OR bleeding_severity_severe OR breathing_status_no',
          nextStep: 'emergency'
        },
        {
          condition: 'DEFAULT',
          nextStep: 2
        }
      ]
    },
    {
      stepNumber: 2,
      title: 'Rapid Assessment',
      questions: [
        {
          id: 'injury_location',
          text: 'Where is the injury located?',
          type: 'multiple_choice',
          options: ['Head/Face', 'Neck', 'Chest', 'Abdomen', 'Arms', 'Legs', 'Back'],
          required: true
        },
        {
          id: 'pain_scale',
          text: 'Pain level (0-10 scale):',
          type: 'scale',
          required: true
        },
        {
          id: 'mobility_affected',
          text: 'Is mobility affected by the injury?',
          type: 'yes_no',
          required: true
        },
        {
          id: 'swelling_present',
          text: 'Is there visible swelling or deformity?',
          type: 'yes_no',
          required: true
        }
      ],
      criticalFlags: ['pain_scale_8_plus'],
      nextStepLogic: [
        {
          condition: 'pain_scale >= 8',
          nextStep: 'emergency'
        },
        {
          condition: 'DEFAULT',
          nextStep: 3
        }
      ]
    },
    {
      stepNumber: 3,
      title: 'Action Plan Generation',
      questions: [
        {
          id: 'recommended_action',
          text: 'Recommended next step:',
          type: 'multiple_choice',
          options: ['Emergency Room', 'Urgent Care', 'Primary Care', 'Home Care'],
          required: true
        }
      ],
      criticalFlags: [],
      nextStepLogic: [
        {
          condition: 'DEFAULT',
          nextStep: 4
        }
      ]
    },
    {
      stepNumber: 4,
      title: 'Outcome Capture',
      questions: [
        {
          id: 'action_taken',
          text: 'Action taken:',
          type: 'text',
          required: true
        },
        {
          id: 'emergency_called',
          text: 'Were emergency services contacted?',
          type: 'yes_no',
          required: true
        },
        {
          id: 'follow_up_needed',
          text: 'Is follow-up care needed?',
          type: 'yes_no',
          required: true
        }
      ],
      criticalFlags: [],
      nextStepLogic: [
        {
          condition: 'DEFAULT',
          nextStep: 'complete'
        }
      ]
    }
  ]
};

// Chest Pain Protocol Template
const CHEST_PAIN_PROTOCOL: TriageProtocolTemplate = {
  protocolType: 'chest_pain',
  steps: [
    {
      stepNumber: 1,
      title: 'Immediate Safety Check',
      questions: [
        {
          id: 'consciousness',
          text: 'Is the elder conscious and responsive?',
          type: 'yes_no',
          required: true,
          criticalFlag: true
        },
        {
          id: 'chest_pain_severity',
          text: 'How severe is the chest pain (0-10)?',
          type: 'scale',
          required: true,
          criticalFlag: true
        },
        {
          id: 'breathing_difficulty',
          text: 'Is there difficulty breathing or shortness of breath?',
          type: 'yes_no',
          required: true,
          criticalFlag: true
        },
        {
          id: 'sweating_nausea',
          text: 'Is there sweating, nausea, or dizziness?',
          type: 'yes_no',
          required: true,
          criticalFlag: true
        }
      ],
      criticalFlags: ['consciousness_no', 'chest_pain_severity_7_plus', 'breathing_difficulty_yes', 'sweating_nausea_yes'],
      nextStepLogic: [
        {
          condition: 'consciousness_no OR chest_pain_severity >= 7 OR breathing_difficulty_yes OR sweating_nausea_yes',
          nextStep: 'emergency'
        },
        {
          condition: 'DEFAULT',
          nextStep: 2
        }
      ]
    },
    {
      stepNumber: 2,
      title: 'Rapid Assessment',
      questions: [
        {
          id: 'pain_duration',
          text: 'How long has the chest pain been present?',
          type: 'multiple_choice',
          options: ['Less than 5 minutes', '5-15 minutes', '15-30 minutes', 'More than 30 minutes'],
          required: true
        },
        {
          id: 'pain_radiation',
          text: 'Does the pain radiate to arm, jaw, or back?',
          type: 'yes_no',
          required: true,
          criticalFlag: true
        },
        {
          id: 'cardiac_history',
          text: 'Does the elder have a history of heart problems?',
          type: 'yes_no',
          required: true
        },
        {
          id: 'current_medications',
          text: 'Is the elder taking heart medications?',
          type: 'yes_no',
          required: true
        }
      ],
      criticalFlags: ['pain_radiation_yes'],
      nextStepLogic: [
        {
          condition: 'pain_radiation_yes OR pain_duration_more_than_30',
          nextStep: 'emergency'
        },
        {
          condition: 'DEFAULT',
          nextStep: 3
        }
      ]
    },
    {
      stepNumber: 3,
      title: 'Action Plan Generation',
      questions: [
        {
          id: 'immediate_action',
          text: 'Immediate action required:',
          type: 'multiple_choice',
          options: ['Call 911 Immediately', 'Go to Emergency Room', 'Call Cardiologist', 'Monitor Closely'],
          required: true
        }
      ],
      criticalFlags: [],
      nextStepLogic: [
        {
          condition: 'DEFAULT',
          nextStep: 4
        }
      ]
    },
    {
      stepNumber: 4,
      title: 'Outcome Capture',
      questions: [
        {
          id: 'action_taken',
          text: 'Action taken:',
          type: 'text',
          required: true
        },
        {
          id: 'emergency_called',
          text: 'Were emergency services called?',
          type: 'yes_no',
          required: true
        },
        {
          id: 'symptoms_resolved',
          text: 'Have symptoms improved or resolved?',
          type: 'yes_no',
          required: true
        }
      ],
      criticalFlags: [],
      nextStepLogic: [
        {
          condition: 'DEFAULT',
          nextStep: 'complete'
        }
      ]
    }
  ]
};

// Confusion Protocol Template
const CONFUSION_PROTOCOL: TriageProtocolTemplate = {
  protocolType: 'confusion',
  steps: [
    {
      stepNumber: 1,
      title: 'Immediate Safety Check',
      questions: [
        {
          id: 'responsiveness',
          text: 'Is the elder responsive to voice and touch?',
          type: 'yes_no',
          required: true,
          criticalFlag: true
        },
        {
          id: 'orientation_check',
          text: 'Does the elder know their name, location, and date?',
          type: 'multiple_choice',
          options: ['Knows all three', 'Knows two', 'Knows one', 'Knows none'],
          required: true,
          criticalFlag: true
        },
        {
          id: 'physical_symptoms',
          text: 'Are there any physical symptoms (fever, weakness, difficulty speaking)?',
          type: 'yes_no',
          required: true,
          criticalFlag: true
        }
      ],
      criticalFlags: ['responsiveness_no', 'orientation_check_knows_none', 'physical_symptoms_yes'],
      nextStepLogic: [
        {
          condition: 'responsiveness_no OR orientation_check_knows_none OR physical_symptoms_yes',
          nextStep: 'emergency'
        },
        {
          condition: 'DEFAULT',
          nextStep: 2
        }
      ]
    },
    {
      stepNumber: 2,
      title: 'Rapid Assessment',
      questions: [
        {
          id: 'confusion_onset',
          text: 'When did the confusion start?',
          type: 'multiple_choice',
          options: ['Suddenly (minutes)', 'Gradually (hours)', 'Over days', 'Chronic/ongoing'],
          required: true
        },
        {
          id: 'medication_changes',
          text: 'Have there been recent medication changes?',
          type: 'yes_no',
          required: true
        },
        {
          id: 'recent_illness',
          text: 'Has the elder been ill recently (UTI, infection, etc.)?',
          type: 'yes_no',
          required: true
        },
        {
          id: 'safety_concerns',
          text: 'Are there immediate safety concerns (wandering, agitation)?',
          type: 'yes_no',
          required: true,
          criticalFlag: true
        }
      ],
      criticalFlags: ['safety_concerns_yes'],
      nextStepLogic: [
        {
          condition: 'safety_concerns_yes OR confusion_onset_suddenly',
          nextStep: 'emergency'
        },
        {
          condition: 'DEFAULT',
          nextStep: 3
        }
      ]
    },
    {
      stepNumber: 3,
      title: 'Action Plan Generation',
      questions: [
        {
          id: 'recommended_care',
          text: 'Recommended level of care:',
          type: 'multiple_choice',
          options: ['Emergency Room', 'Urgent Care', 'Primary Care Same Day', 'Schedule Appointment'],
          required: true
        }
      ],
      criticalFlags: [],
      nextStepLogic: [
        {
          condition: 'DEFAULT',
          nextStep: 4
        }
      ]
    },
    {
      stepNumber: 4,
      title: 'Outcome Capture',
      questions: [
        {
          id: 'action_taken',
          text: 'Action taken:',
          type: 'text',
          required: true
        },
        {
          id: 'emergency_called',
          text: 'Were emergency services called?',
          type: 'yes_no',
          required: true
        },
        {
          id: 'safety_measures',
          text: 'What safety measures were implemented?',
          type: 'text',
          required: false
        }
      ],
      criticalFlags: [],
      nextStepLogic: [
        {
          condition: 'DEFAULT',
          nextStep: 'complete'
        }
      ]
    }
  ]
};

// =============================================
// Protocol Templates Registry
// =============================================

const PROTOCOL_TEMPLATES: Record<string, TriageProtocolTemplate> = {
  fall: FALL_PROTOCOL,
  injury: INJURY_PROTOCOL,
  chest_pain: CHEST_PAIN_PROTOCOL,
  confusion: CONFUSION_PROTOCOL
};

// =============================================
// Triage Protocol State Machine
// =============================================

export class TriageProtocolStateMachine {
  private protocol: TriageProtocol;
  private template: TriageProtocolTemplate;
  private responses: Record<string, any> = {};

  constructor(alertId: string, protocolType: 'fall' | 'injury' | 'chest_pain' | 'confusion') {
    this.template = PROTOCOL_TEMPLATES[protocolType];
    if (!this.template) {
      throw new Error(`Unknown protocol type: ${protocolType}`);
    }

    this.protocol = {
      alertId,
      protocolType,
      currentStep: this.template.steps[0],
      responses: {}
    };
  }

  /**
   * Get the current protocol state
   */
  getProtocol(): TriageProtocol {
    return { ...this.protocol };
  }

  /**
   * Get the current step
   */
  getCurrentStep(): TriageStep {
    return this.protocol.currentStep;
  }

  /**
   * Record a response to a question
   */
  recordResponse(questionId: string, response: any): void {
    this.responses[questionId] = response;
    this.protocol.responses = { ...this.responses };
  }

  /**
   * Check if current step has critical flags triggered
   */
  hasCriticalFlags(): boolean {
    const currentStep = this.protocol.currentStep;
    
    for (const flag of currentStep.criticalFlags) {
      if (this.evaluateCondition(flag)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get the next step based on current responses
   */
  getNextStep(): TriageStep | 'emergency' | 'complete' {
    const currentStep = this.protocol.currentStep;
    
    // Evaluate step transition logic
    for (const transition of currentStep.nextStepLogic) {
      if (this.evaluateCondition(transition.condition)) {
        if (transition.nextStep === 'emergency' || transition.nextStep === 'complete') {
          return transition.nextStep;
        }
        
        // Find the step by number
        const nextStep = this.template.steps.find(step => step.stepNumber === transition.nextStep);
        if (nextStep) {
          return nextStep;
        }
      }
    }
    
    // Default: go to next sequential step
    const currentStepNumber = currentStep.stepNumber;
    const nextStep = this.template.steps.find(step => step.stepNumber === currentStepNumber + 1);
    
    return nextStep || 'complete';
  }

  /**
   * Proceed to the next step
   */
  proceedToNextStep(): 'emergency' | 'complete' | TriageStep {
    const nextStep = this.getNextStep();
    
    if (nextStep === 'emergency' || nextStep === 'complete') {
      return nextStep;
    }
    
    this.protocol.currentStep = nextStep;
    return nextStep;
  }

  /**
   * Generate action plan based on responses
   */
  generateActionPlan(): ActionPlan {
    const protocolType = this.protocol.protocolType;
    const responses = this.responses;
    
    // Emergency escalation check
    if (this.hasCriticalFlags()) {
      return {
        recommendation: 'call_911',
        callScript: this.getEmergencyCallScript(protocolType),
        urgencyLevel: 10,
        estimatedTimeframe: 'Immediate',
        followUpTasks: this.getEmergencyFollowUpTasks()
      };
    }
    
    // Generate action plan based on protocol type and responses
    return this.generateProtocolSpecificActionPlan(protocolType, responses);
  }

  /**
   * Validate that all required questions in current step are answered
   */
  validateCurrentStep(): { valid: boolean; missingQuestions: string[] } {
    const currentStep = this.protocol.currentStep;
    const missingQuestions: string[] = [];
    
    for (const question of currentStep.questions) {
      if (question.required && !this.responses.hasOwnProperty(question.id)) {
        missingQuestions.push(question.text);
      }
    }
    
    return {
      valid: missingQuestions.length === 0,
      missingQuestions
    };
  }

  /**
   * Get all responses collected so far
   */
  getAllResponses(): Record<string, any> {
    return { ...this.responses };
  }

  /**
   * Reset the protocol to the beginning
   */
  reset(): void {
    this.responses = {};
    this.protocol.currentStep = this.template.steps[0];
    this.protocol.responses = {};
  }

  // =============================================
  // Private Helper Methods
  // =============================================

  private evaluateCondition(condition: string): boolean {
    if (condition === 'DEFAULT') {
      return true;
    }
    
    // Parse condition logic (simplified implementation)
    // Handle OR conditions
    if (condition.includes(' OR ')) {
      const orConditions = condition.split(' OR ');
      return orConditions.some(cond => this.evaluateSingleCondition(cond.trim()));
    }
    
    // Handle AND conditions
    if (condition.includes(' AND ')) {
      const andConditions = condition.split(' AND ');
      return andConditions.every(cond => this.evaluateSingleCondition(cond.trim()));
    }
    
    // Single condition
    return this.evaluateSingleCondition(condition);
  }

  private evaluateSingleCondition(condition: string): boolean {
    // Handle comparison operators
    if (condition.includes('>=')) {
      const [questionId, value] = condition.split('>=').map(s => s.trim());
      const response = this.responses[questionId];
      return response !== undefined && Number(response) >= Number(value);
    }
    
    if (condition.includes('<=')) {
      const [questionId, value] = condition.split('<=').map(s => s.trim());
      const response = this.responses[questionId];
      return response !== undefined && Number(response) <= Number(value);
    }
    
    // Handle exact matches (question_id_expected_value)
    // e.g., "consciousness_no", "severe_injury_yes", "pain_level_initial_8_plus"
    const parts = condition.split('_');
    if (parts.length >= 2) {
      const expectedValue = parts[parts.length - 1];
      const questionId = parts.slice(0, -1).join('_');
      const response = this.responses[questionId];
      
      if (expectedValue === 'yes') {
        return response === true || response === 'yes';
      }
      if (expectedValue === 'no') {
        return response === false || response === 'no';
      }
      
      // Handle special cases like "8_plus" for pain levels
      if (expectedValue === 'plus' && parts.length >= 3) {
        const threshold = parts[parts.length - 2];
        const actualQuestionId = parts.slice(0, -2).join('_');
        const actualResponse = this.responses[actualQuestionId];
        try {
          return actualResponse !== undefined && Number(actualResponse) >= Number(threshold);
        } catch {
          return false;
        }
      }
      
      return response === expectedValue;
    }
    
    return false;
  }

  private getEmergencyCallScript(protocolType: string): string {
    const scripts = {
      fall: "This is a medical emergency. An elderly person has fallen and may have serious injuries. Please send an ambulance immediately. The person is [conscious/unconscious] and [breathing normally/having difficulty breathing].",
      injury: "This is a medical emergency. An elderly person has sustained an injury with [severe bleeding/difficulty breathing/loss of consciousness]. Please send an ambulance immediately.",
      chest_pain: "This is a medical emergency. An elderly person is experiencing severe chest pain with [difficulty breathing/sweating/nausea]. This may be a heart attack. Please send an ambulance immediately.",
      confusion: "This is a medical emergency. An elderly person is experiencing severe confusion or altered mental state with [physical symptoms]. Please send an ambulance immediately."
    };
    
    return scripts[protocolType] || "This is a medical emergency involving an elderly person. Please send an ambulance immediately.";
  }

  private getEmergencyFollowUpTasks(): TaskTemplate[] {
    return [
      {
        title: 'Follow up on emergency response',
        description: 'Contact family members and track emergency services response',
        priority: 'urgent',
        estimatedMinutes: 15,
        checklist: [
          { text: 'Confirm ambulance arrival', required: true },
          { text: 'Notify primary family contacts', required: true },
          { text: 'Gather medical information for hospital', required: true }
        ],
        dueInHours: 1
      }
    ];
  }

  private generateProtocolSpecificActionPlan(protocolType: string, responses: Record<string, any>): ActionPlan {
    // Simplified action plan generation based on protocol type
    switch (protocolType) {
      case 'fall':
        return this.generateFallActionPlan(responses);
      case 'injury':
        return this.generateInjuryActionPlan(responses);
      case 'chest_pain':
        return this.generateChestPainActionPlan(responses);
      case 'confusion':
        return this.generateConfusionActionPlan(responses);
      default:
        return {
          recommendation: 'monitor',
          callScript: 'Continue monitoring the situation and contact healthcare provider if symptoms worsen.',
          urgencyLevel: 3,
          estimatedTimeframe: 'Within 24 hours',
          followUpTasks: []
        };
    }
  }

  private generateFallActionPlan(responses: Record<string, any>): ActionPlan {
    const painLevel = responses.pain_level_initial || 0;
    const canMove = responses.mobility_status;
    
    if (painLevel >= 6 || !canMove) {
      return {
        recommendation: 'urgent_care',
        callScript: 'The elder has fallen and is experiencing significant pain or mobility issues. Please arrange for urgent medical evaluation.',
        urgencyLevel: 7,
        estimatedTimeframe: 'Within 2 hours',
        followUpTasks: [
          {
            title: 'Arrange urgent care visit',
            description: 'Schedule and transport to urgent care facility',
            priority: 'high',
            estimatedMinutes: 60,
            checklist: [
              { text: 'Call urgent care to confirm availability', required: true },
              { text: 'Arrange transportation', required: true },
              { text: 'Gather insurance and medication information', required: true }
            ],
            dueInHours: 2
          }
        ]
      };
    }
    
    return {
      recommendation: 'monitor',
      callScript: 'The elder appears stable after the fall. Continue monitoring for any changes in condition.',
      urgencyLevel: 4,
      estimatedTimeframe: 'Monitor for 24 hours',
      followUpTasks: [
        {
          title: 'Monitor post-fall condition',
          description: 'Check on elder regularly for next 24 hours',
          priority: 'medium',
          estimatedMinutes: 10,
          checklist: [
            { text: 'Check pain level every 4 hours', required: true },
            { text: 'Monitor mobility and balance', required: true },
            { text: 'Watch for signs of delayed injury', required: true }
          ],
          dueInHours: 4
        }
      ]
    };
  }

  private generateInjuryActionPlan(responses: Record<string, any>): ActionPlan {
    const painLevel = responses.pain_scale || 0;
    const bleedingSeverity = responses.bleeding_severity || 'none';
    
    if (painLevel >= 7 || bleedingSeverity === 'moderate') {
      return {
        recommendation: 'urgent_care',
        callScript: 'The elder has sustained an injury requiring medical attention. Please arrange for urgent care evaluation.',
        urgencyLevel: 6,
        estimatedTimeframe: 'Within 4 hours',
        followUpTasks: []
      };
    }
    
    return {
      recommendation: 'monitor',
      callScript: 'The injury appears minor. Continue monitoring and provide basic first aid as needed.',
      urgencyLevel: 3,
      estimatedTimeframe: 'Monitor closely',
      followUpTasks: []
    };
  }

  private generateChestPainActionPlan(responses: Record<string, any>): ActionPlan {
    // Chest pain should generally be treated seriously
    return {
      recommendation: 'urgent_care',
      callScript: 'The elder is experiencing chest pain. Given the potential cardiac implications, please arrange for immediate medical evaluation.',
      urgencyLevel: 8,
      estimatedTimeframe: 'Within 1 hour',
      followUpTasks: [
        {
          title: 'Urgent cardiac evaluation',
          description: 'Ensure immediate medical assessment for chest pain',
          priority: 'urgent',
          estimatedMinutes: 30,
          checklist: [
            { text: 'Contact primary care physician', required: true },
            { text: 'Prepare cardiac medication list', required: true },
            { text: 'Monitor vital signs if possible', required: true }
          ],
          dueInHours: 1
        }
      ]
    };
  }

  private generateConfusionActionPlan(responses: Record<string, any>): ActionPlan {
    const onsetType = responses.confusion_onset;
    const medicationChanges = responses.medication_changes;
    
    if (onsetType === 'suddenly' || medicationChanges) {
      return {
        recommendation: 'urgent_care',
        callScript: 'The elder is experiencing confusion that may require immediate medical evaluation to rule out serious causes.',
        urgencyLevel: 7,
        estimatedTimeframe: 'Within 2 hours',
        followUpTasks: []
      };
    }
    
    return {
      recommendation: 'nurse_line',
      callScript: 'The elder is experiencing confusion. Please contact the nurse line or primary care provider for guidance.',
      urgencyLevel: 5,
      estimatedTimeframe: 'Within 4 hours',
      followUpTasks: []
    };
  }
}

// =============================================
// Utility Functions
// =============================================

/**
 * Create a new triage protocol instance
 */
export function createTriageProtocol(
  alertId: string, 
  protocolType: 'fall' | 'injury' | 'chest_pain' | 'confusion'
): TriageProtocolStateMachine {
  return new TriageProtocolStateMachine(alertId, protocolType);
}

/**
 * Get available protocol types
 */
export function getAvailableProtocolTypes(): string[] {
  return Object.keys(PROTOCOL_TEMPLATES);
}

/**
 * Get protocol template by type
 */
export function getProtocolTemplate(protocolType: string): TriageProtocolTemplate | null {
  return PROTOCOL_TEMPLATES[protocolType] || null;
}

/**
 * Validate protocol responses for completeness
 */
export function validateProtocolResponses(
  protocolType: string, 
  responses: Record<string, any>
): { valid: boolean; errors: string[] } {
  const template = PROTOCOL_TEMPLATES[protocolType];
  if (!template) {
    return { valid: false, errors: ['Invalid protocol type'] };
  }
  
  const errors: string[] = [];
  
  // Check that all required questions across all steps have responses
  for (const step of template.steps) {
    for (const question of step.questions) {
      if (question.required && !responses.hasOwnProperty(question.id)) {
        errors.push(`Missing required response for: ${question.text}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}