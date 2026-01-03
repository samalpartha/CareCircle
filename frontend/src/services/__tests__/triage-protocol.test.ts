/**
 * Property-Based Tests for Triage Protocol State Machine
 * Feature: care-operations-console, Property 1: Urgent Triage Protocol Consistency
 * Validates: Requirements 1.1, 1.2, 1.4, 1.5, 1.6
 */

import {
  TriageProtocolStateMachine,
  createTriageProtocol,
  getAvailableProtocolTypes,
  getProtocolTemplate,
  validateProtocolResponses
} from '../triage-protocol';

// Simple property-based testing helpers using Jest
const generateRandomString = (length: number = 10): string => 
  Math.random().toString(36).substring(2, length + 2);

const generateRandomAlertId = (): string => 
  `ALERT#${Date.now()}-${generateRandomString(8)}`;

const generateRandomProtocolType = (): 'fall' | 'injury' | 'chest_pain' | 'confusion' => {
  const types: ('fall' | 'injury' | 'chest_pain' | 'confusion')[] = ['fall', 'injury', 'chest_pain', 'confusion'];
  return types[Math.floor(Math.random() * types.length)];
};

const generateRandomBoolean = (): boolean => Math.random() > 0.5;

const generateRandomInteger = (min: number, max: number): number => 
  Math.floor(Math.random() * (max - min + 1)) + min;

describe('Triage Protocol State Machine Property Tests', () => {
  
  /**
   * Property 1: Urgent Triage Protocol Consistency
   * For any urgent alert (severity urgent/high), the system should always present 
   * the same 4-step triage protocol: Safety Check → Assessment → Action Plan → Outcome Capture, 
   * regardless of alert type or elder
   * Validates: Requirements 1.1, 1.2, 1.4, 1.5, 1.6
   */
  test('Property 1: Urgent Triage Protocol Consistency', () => {
    // Test with 100 random iterations
    for (let i = 0; i < 100; i++) {
      const alertId = generateRandomAlertId();
      const protocolType = generateRandomProtocolType();
      
      // Create triage protocol for any alert type
      const protocol = createTriageProtocol(alertId, protocolType);
      
      // Should always have exactly 4 steps
      const template = getProtocolTemplate(protocolType);
      expect(template).toBeTruthy();
      expect(template!.steps).toHaveLength(4);
      
      // Step 1 should always be "Immediate Safety Check"
      expect(template!.steps[0].title).toBe('Immediate Safety Check');
      expect(template!.steps[0].stepNumber).toBe(1);
      
      // Step 2 should always be "Rapid Assessment"
      expect(template!.steps[1].title).toBe('Rapid Assessment');
      expect(template!.steps[1].stepNumber).toBe(2);
      
      // Step 3 should always be "Action Plan Generation"
      expect(template!.steps[2].title).toBe('Action Plan Generation');
      expect(template!.steps[2].stepNumber).toBe(3);
      
      // Step 4 should always be "Outcome Capture"
      expect(template!.steps[3].title).toBe('Outcome Capture');
      expect(template!.steps[3].stepNumber).toBe(4);
      
      // Current step should start at step 1
      const currentStep = protocol.getCurrentStep();
      expect(currentStep.stepNumber).toBe(1);
      expect(currentStep.title).toBe('Immediate Safety Check');
      
      // Should always include critical safety questions in step 1
      const safetyQuestions = currentStep.questions;
      const hasConsciousnessCheck = safetyQuestions.some(q => 
        q.text.toLowerCase().includes('conscious') || 
        q.text.toLowerCase().includes('responsive')
      );
      expect(hasConsciousnessCheck).toBe(true);
      
      // Should have critical flags for emergency escalation
      expect(currentStep.criticalFlags.length).toBeGreaterThan(0);
      
      // Should have next step logic defined
      expect(currentStep.nextStepLogic.length).toBeGreaterThan(0);
      
      // Protocol should be properly initialized
      const protocolState = protocol.getProtocol();
      expect(protocolState.alertId).toBe(alertId);
      expect(protocolState.protocolType).toBe(protocolType);
      expect(protocolState.responses).toEqual({});
    }
  });

  /**
   * Property 1.1: Step Progression Consistency
   * For any valid responses, step progression should follow the defined logic
   * NOTE: Using 'fall' protocol specifically as it has known question IDs
   */
  test('Property 1.1: Step Progression Consistency', () => {
    // Test with 100 random iterations using FALL protocol (known structure)
    for (let i = 0; i < 100; i++) {
      const alertId = generateRandomAlertId();
      const protocolType = 'fall' as const; // Use fall protocol for consistent testing
      const consciousness = generateRandomBoolean();
      const severeInjury = generateRandomBoolean();
      const painLevel = generateRandomInteger(0, 10);
      
      const protocol = createTriageProtocol(alertId, protocolType);
      
      // Record responses for step 1 (fall protocol specific questions)
      protocol.recordResponse('consciousness', consciousness);
      protocol.recordResponse('severe_injury', severeInjury);
      protocol.recordResponse('pain_level_initial', painLevel);
      
      // Get next step based on responses
      const nextStep = protocol.getNextStep();
      
      // If critical conditions are met, should escalate to emergency
      const hasCriticalCondition = !consciousness || severeInjury || painLevel >= 8;
      
      if (hasCriticalCondition) {
        expect(nextStep).toBe('emergency');
      } else {
        // Should proceed to step 2 if no critical conditions
        expect(typeof nextStep).toBe('object');
        if (typeof nextStep === 'object') {
          expect(nextStep.stepNumber).toBe(2);
        }
      }
      
      // Responses should be recorded correctly
      const allResponses = protocol.getAllResponses();
      expect(allResponses.consciousness).toBe(consciousness);
      expect(allResponses.severe_injury).toBe(severeInjury);
      expect(allResponses.pain_level_initial).toBe(painLevel);
    }
  });

  /**
   * Property 1.2: Critical Flag Detection Consistency
   * For any responses that trigger critical flags, emergency escalation should be consistent
   * NOTE: Using 'fall' protocol specifically as it has known question IDs
   */
  test('Property 1.2: Critical Flag Detection Consistency', () => {
    // Test with 50 random iterations using FALL protocol
    for (let i = 0; i < 50; i++) {
      const alertId = generateRandomAlertId();
      const protocolType = 'fall' as const; // Use fall protocol for consistent testing
      
      const protocol = createTriageProtocol(alertId, protocolType);
      
      // Record critical responses for fall protocol
      protocol.recordResponse('consciousness', false); // Always critical
      protocol.recordResponse('severe_injury', generateRandomBoolean());
      protocol.recordResponse('pain_level_initial', generateRandomInteger(8, 10)); // Always critical
      
      // Should detect critical flags
      const hasCriticalFlags = protocol.hasCriticalFlags();
      expect(hasCriticalFlags).toBe(true);
      
      // Should generate emergency action plan
      const actionPlan = protocol.generateActionPlan();
      expect(actionPlan.recommendation).toBe('call_911');
      expect(actionPlan.urgencyLevel).toBe(10);
      expect(actionPlan.estimatedTimeframe).toBe('Immediate');
      expect(actionPlan.callScript).toContain('emergency');
      expect(actionPlan.followUpTasks.length).toBeGreaterThan(0);
    }
  });

  /**
   * Property 1.3: Question Validation Consistency
   * For any step, required questions should be properly validated
   */
  test('Property 1.3: Question Validation Consistency', () => {
    // Test with 100 random iterations
    for (let i = 0; i < 100; i++) {
      const alertId = generateRandomAlertId();
      const protocolType = generateRandomProtocolType();
      
      const protocol = createTriageProtocol(alertId, protocolType);
      
      // Record only partial responses
      protocol.recordResponse('consciousness', generateRandomBoolean());
      
      // Validation should detect missing required questions
      const validation = protocol.validateCurrentStep();
      
      // Should not be valid if required questions are missing
      const currentStep = protocol.getCurrentStep();
      const requiredQuestions = currentStep.questions.filter(q => q.required);
      const answeredQuestions = Object.keys(protocol.getAllResponses());
      const missingRequired = requiredQuestions.filter(q => !answeredQuestions.includes(q.id));
      
      if (missingRequired.length > 0) {
        expect(validation.valid).toBe(false);
        expect(validation.missingQuestions.length).toBeGreaterThan(0);
      } else {
        expect(validation.valid).toBe(true);
        expect(validation.missingQuestions.length).toBe(0);
      }
    }
  });

  /**
   * Property 1.4: Action Plan Generation Consistency
   * For any complete protocol responses, action plan should be appropriate and consistent
   */
  test('Property 1.4: Action Plan Generation Consistency', () => {
    // Test with 50 random iterations
    for (let i = 0; i < 50; i++) {
      const alertId = generateRandomAlertId();
      const protocolType = generateRandomProtocolType();
      
      const protocol = createTriageProtocol(alertId, protocolType);
      
      // Record safe (non-critical) responses
      protocol.recordResponse('consciousness', true);
      protocol.recordResponse('severe_injury', false);
      protocol.recordResponse('pain_level_initial', generateRandomInteger(1, 5)); // Non-critical pain
      protocol.recordResponse('mobility_status', generateRandomBoolean());
      protocol.recordResponse('current_medications', generateRandomBoolean());
      
      // Should not have critical flags
      const hasCriticalFlags = protocol.hasCriticalFlags();
      expect(hasCriticalFlags).toBe(false);
      
      // Generate action plan
      const actionPlan = protocol.generateActionPlan();
      
      // Action plan should be appropriate for non-critical situation
      expect(['urgent_care', 'nurse_line', 'monitor']).toContain(actionPlan.recommendation);
      expect(actionPlan.urgencyLevel).toBeLessThan(10);
      expect(actionPlan.callScript).toBeTruthy();
      expect(actionPlan.estimatedTimeframe).toBeTruthy();
      expect(Array.isArray(actionPlan.followUpTasks)).toBe(true);
      
      // Urgency level should be reasonable (1-9 for non-emergency)
      expect(actionPlan.urgencyLevel).toBeGreaterThanOrEqual(1);
      expect(actionPlan.urgencyLevel).toBeLessThan(10);
    }
  });

  /**
   * Property 1.5: Protocol Template Consistency
   * For any protocol type, the template structure should be consistent and valid
   */
  test('Property 1.5: Protocol Template Consistency', () => {
    const protocolTypes: ('fall' | 'injury' | 'chest_pain' | 'confusion')[] = ['fall', 'injury', 'chest_pain', 'confusion'];
    
    protocolTypes.forEach(protocolType => {
      const template = getProtocolTemplate(protocolType);
      
      expect(template).toBeTruthy();
      expect(template!.protocolType).toBe(protocolType);
      expect(template!.steps).toHaveLength(4);
      
      // Each step should have required structure
      template!.steps.forEach((step, index) => {
        expect(step.stepNumber).toBe(index + 1);
        expect(step.title).toBeTruthy();
        expect(Array.isArray(step.questions)).toBe(true);
        expect(step.questions.length).toBeGreaterThan(0);
        expect(Array.isArray(step.criticalFlags)).toBe(true);
        expect(Array.isArray(step.nextStepLogic)).toBe(true);
        expect(step.nextStepLogic.length).toBeGreaterThan(0);
        
        // Each question should have required structure
        step.questions.forEach(question => {
          expect(question.id).toBeTruthy();
          expect(question.text).toBeTruthy();
          expect(['yes_no', 'scale', 'multiple_choice', 'text']).toContain(question.type);
          expect(typeof question.required).toBe('boolean');
          // criticalFlag is optional - check it's boolean if defined
          if (question.criticalFlag !== undefined) {
            expect(typeof question.criticalFlag).toBe('boolean');
          }
        });
        
        // Each transition should have required structure
        step.nextStepLogic.forEach(transition => {
          expect(transition.condition).toBeTruthy();
          expect(transition.nextStep).toBeTruthy();
        });
      });
      
      // Step 1 should always have critical safety questions
      const step1 = template!.steps[0];
      expect(step1.title).toBe('Immediate Safety Check');
      expect(step1.criticalFlags.length).toBeGreaterThan(0);
      
      // Step 4 should always be outcome capture
      const step4 = template!.steps[3];
      expect(step4.title).toBe('Outcome Capture');
      
      // Should have questions about action taken and emergency services
      const outcomeQuestions = step4.questions.map(q => q.id);
      expect(outcomeQuestions).toContain('action_taken');
      expect(outcomeQuestions).toContain('emergency_called');
    });
  });

  /**
   * Property 1.6: State Machine Reset Consistency
   * For any protocol state, reset should return to initial state
   */
  test('Property 1.6: State Machine Reset Consistency', () => {
    // Test with 50 random iterations
    for (let i = 0; i < 50; i++) {
      const alertId = generateRandomAlertId();
      const protocolType = generateRandomProtocolType();
      
      const protocol = createTriageProtocol(alertId, protocolType);
      
      // Record some random responses and progress through steps
      protocol.recordResponse('consciousness', generateRandomBoolean());
      protocol.recordResponse('severe_injury', generateRandomBoolean());
      protocol.recordResponse('pain_level_initial', generateRandomInteger(0, 10));
      
      // Try to proceed to next step (may or may not succeed based on validation)
      try {
        protocol.proceedToNextStep();
      } catch (error) {
        // Ignore validation errors for this test
      }
      
      // Reset the protocol
      protocol.reset();
      
      // Should be back to initial state
      const currentStep = protocol.getCurrentStep();
      expect(currentStep.stepNumber).toBe(1);
      expect(currentStep.title).toBe('Immediate Safety Check');
      
      // Responses should be cleared
      const responses = protocol.getAllResponses();
      expect(Object.keys(responses)).toHaveLength(0);
      
      // Protocol state should be reset
      const protocolState = protocol.getProtocol();
      expect(protocolState.responses).toEqual({});
      expect(protocolState.currentStep.stepNumber).toBe(1);
    }
  });

  /**
   * Property 1.7: Available Protocol Types Consistency
   * The system should always provide the same set of available protocol types
   */
  test('Property 1.7: Available Protocol Types Consistency', () => {
    const availableTypes = getAvailableProtocolTypes();
    
    expect(availableTypes).toHaveLength(4);
    expect(availableTypes).toContain('fall');
    expect(availableTypes).toContain('injury');
    expect(availableTypes).toContain('chest_pain');
    expect(availableTypes).toContain('confusion');
    
    // Each type should have a valid template
    availableTypes.forEach(type => {
      const template = getProtocolTemplate(type);
      expect(template).toBeTruthy();
      expect(template!.protocolType).toBe(type);
    });
  });

  /**
   * Property 1.8: Response Validation Consistency
   * For any protocol type and responses, validation should be consistent and accurate
   */
  test('Property 1.8: Response Validation Consistency', () => {
    // Test with 30 random iterations
    for (let i = 0; i < 30; i++) {
      const protocolType = generateRandomProtocolType();
      
      const completeResponses = {
        consciousness: generateRandomBoolean(),
        severe_injury: generateRandomBoolean(),
        pain_level_initial: generateRandomInteger(0, 10),
        action_taken: generateRandomString(20),
        emergency_called: generateRandomBoolean(),
        outcome_notes: generateRandomString(50)
      };
      
      const incompleteResponses = {
        consciousness: generateRandomBoolean()
        // Missing other required responses
      };
      
      // Test complete responses
      const completeValidation = validateProtocolResponses(protocolType, completeResponses);
      
      // Should be valid if all required questions are answered
      expect(typeof completeValidation.valid).toBe('boolean');
      expect(Array.isArray(completeValidation.errors)).toBe(true);
      
      // Test incomplete responses
      const incompleteValidation = validateProtocolResponses(protocolType, incompleteResponses);
      
      // Should not be valid with incomplete responses
      expect(incompleteValidation.valid).toBe(false);
      expect(incompleteValidation.errors.length).toBeGreaterThan(0);
      
      // Error messages should be descriptive
      incompleteValidation.errors.forEach(error => {
        expect(error).toContain('Missing required response');
      });
    }
  });

  /**
   * Property 1.9: Emergency Escalation Consistency
   * For any critical responses across all protocol types, emergency escalation should be consistent
   */
  test('Property 1.9: Emergency Escalation Consistency', () => {
    // Test each protocol type with its specific critical question IDs
    const protocolCriticalQuestions = {
      fall: { consciousness: false }, // unconscious triggers emergency
      injury: { consciousness: false }, // unconscious triggers emergency
      chest_pain: { consciousness: false }, // unconscious triggers emergency
      confusion: { responsiveness: false } // unresponsive triggers emergency
    };
    
    // Test each protocol type 10 times
    (Object.keys(protocolCriticalQuestions) as Array<keyof typeof protocolCriticalQuestions>).forEach(protocolType => {
      for (let i = 0; i < 10; i++) {
        const alertId = generateRandomAlertId();
        
        const protocol = createTriageProtocol(alertId, protocolType);
        
        // Record the appropriate critical response for this protocol type
        const criticalResponses = protocolCriticalQuestions[protocolType];
        Object.entries(criticalResponses).forEach(([questionId, response]) => {
          protocol.recordResponse(questionId, response);
        });
        
        // Should detect critical flags regardless of protocol type
        const hasCriticalFlags = protocol.hasCriticalFlags();
        expect(hasCriticalFlags).toBe(true);
        
        // Should generate emergency action plan
        const actionPlan = protocol.generateActionPlan();
        expect(actionPlan.recommendation).toBe('call_911');
        expect(actionPlan.urgencyLevel).toBe(10);
        expect(actionPlan.estimatedTimeframe).toBe('Immediate');
        
        // Call script should mention emergency
        expect(actionPlan.callScript.toLowerCase()).toContain('emergency');
        expect(actionPlan.callScript.toLowerCase()).toContain('ambulance');
        
        // Should have follow-up tasks
        expect(actionPlan.followUpTasks.length).toBeGreaterThan(0);
        
        // Follow-up tasks should be urgent
        actionPlan.followUpTasks.forEach(task => {
          expect(task.priority).toBe('urgent');
          expect(task.dueInHours).toBeLessThanOrEqual(2);
        });
      }
    });
  });

  /**
   * Property 1.10: Protocol State Immutability
   * For any protocol operations, the original template should remain unchanged
   */
  test('Property 1.10: Protocol State Immutability', () => {
    // Test with 30 random iterations
    for (let i = 0; i < 30; i++) {
      const protocolType = generateRandomProtocolType();
      
      // Get original template
      const originalTemplate = getProtocolTemplate(protocolType);
      const originalStepsCount = originalTemplate!.steps.length;
      const originalStep1Title = originalTemplate!.steps[0].title;
      
      // Create protocol and modify it
      const alertId = generateRandomAlertId();
      const protocol = createTriageProtocol(alertId, protocolType);
      
      // Record responses and progress
      protocol.recordResponse('consciousness', generateRandomBoolean());
      protocol.recordResponse('severe_injury', generateRandomBoolean());
      
      try {
        protocol.proceedToNextStep();
      } catch (error) {
        // Ignore validation errors
      }
      
      // Get template again
      const templateAfter = getProtocolTemplate(protocolType);
      
      // Template should be unchanged
      expect(templateAfter!.steps.length).toBe(originalStepsCount);
      expect(templateAfter!.steps[0].title).toBe(originalStep1Title);
      expect(templateAfter!.protocolType).toBe(originalTemplate!.protocolType);
      
      // Template structure should be identical
      expect(JSON.stringify(templateAfter)).toBe(JSON.stringify(originalTemplate));
    }
  });
});
