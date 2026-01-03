/**
 * Property-Based Tests for Stress Mode Interface
 * Feature: care-operations-console
 * 
 * Property 13: Stress Mode Interface Simplification - Requirements 7.1, 7.2, 7.4, 7.7
 * Property 14: Functionality Preservation - Requirements 7.3, 7.6, 7.7
 */

import {
  StressModeManager,
  StressModeConfig,
  getStressModeManager,
  resetStressModeManager,
  DEFAULT_STRESS_MODE_CONFIG,
  STRESS_MODE_ACTIVE_CONFIG,
  ESSENTIAL_ACTIONS,
  NAVIGATION_ITEMS,
  getNavigationItems,
  generateCSSVariables,
  shouldSuggestStressMode,
  validateStressModeConfig,
  VOICE_PROMPTS
} from '../stress-mode';

// =============================================
// Test Helpers
// =============================================

// Mock speechSynthesis and SpeechSynthesisUtterance
const mockSpeak = jest.fn();
const mockCancel = jest.fn();

class MockSpeechSynthesisUtterance {
  text: string;
  rate: number = 1;
  pitch: number = 1;
  volume: number = 1;
  voice: any = null;
  
  constructor(text: string) {
    this.text = text;
  }
}

beforeAll(() => {
  // @ts-ignore
  global.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
  
  Object.defineProperty(window, 'speechSynthesis', {
    value: {
      speak: mockSpeak,
      cancel: mockCancel,
      getVoices: () => []
    },
    writable: true
  });
});

afterEach(() => {
  mockSpeak.mockClear();
  mockCancel.mockClear();
});

// =============================================
// Property 13: Stress Mode Interface Simplification
// =============================================

describe('Property 13: Stress Mode Interface Simplification', () => {
  beforeEach(() => {
    resetStressModeManager();
  });

  /**
   * Property 13.1: Stress mode uses larger text
   */
  test('Property 13.1: Stress mode increases font sizes', () => {
    const normalVars = generateCSSVariables(DEFAULT_STRESS_MODE_CONFIG);
    const stressVars = generateCSSVariables(STRESS_MODE_ACTIVE_CONFIG);
    
    // Stress mode should have larger font sizes
    const parseSize = (size: string) => parseFloat(size.replace('rem', ''));
    
    expect(parseSize(stressVars['--stress-font-size-base']))
      .toBeGreaterThan(parseSize(normalVars['--stress-font-size-base']));
    expect(parseSize(stressVars['--stress-font-size-lg']))
      .toBeGreaterThan(parseSize(normalVars['--stress-font-size-lg']));
    expect(parseSize(stressVars['--stress-font-size-xl']))
      .toBeGreaterThan(parseSize(normalVars['--stress-font-size-xl']));
  });

  /**
   * Property 13.2: Stress mode uses larger buttons
   */
  test('Property 13.2: Stress mode increases button sizes', () => {
    const normalVars = generateCSSVariables(DEFAULT_STRESS_MODE_CONFIG);
    const stressVars = generateCSSVariables(STRESS_MODE_ACTIVE_CONFIG);
    
    // Extract min-height numeric value
    const parseHeight = (height: string) => parseInt(height.replace('px', ''));
    
    expect(parseHeight(stressVars['--stress-button-min-height']))
      .toBeGreaterThan(parseHeight(normalVars['--stress-button-min-height']));
  });

  /**
   * Property 13.3: Stress mode reduces navigation items
   */
  test('Property 13.3: Stress mode shows only essential navigation', () => {
    const normalNav = getNavigationItems(DEFAULT_STRESS_MODE_CONFIG);
    const stressNav = getNavigationItems(STRESS_MODE_ACTIVE_CONFIG);
    
    expect(stressNav.length).toBeLessThan(normalNav.length);
    
    // All stress nav items should be essential
    stressNav.forEach(item => {
      expect(item.essential).toBe(true);
    });
  });

  /**
   * Property 13.4: Essential actions are properly prioritized
   */
  test('Property 13.4: Essential actions are priority ordered', () => {
    const manager = getStressModeManager();
    const actions = manager.getEssentialActions();
    
    // Should be sorted by priority (lower = higher priority)
    for (let i = 1; i < actions.length; i++) {
      expect(actions[i].priority).toBeGreaterThanOrEqual(actions[i - 1].priority);
    }
    
    // First action should be call 911
    expect(actions[0].action).toBe('call_911');
  });

  /**
   * Property 13.5: Emergency contacts are prominent
   */
  test('Property 13.5: Stress mode makes emergency contacts prominent', () => {
    expect(STRESS_MODE_ACTIVE_CONFIG.emergencyContactsProminent).toBe(true);
    expect(DEFAULT_STRESS_MODE_CONFIG.emergencyContactsProminent).toBe(false);
  });

  /**
   * Property 13.6: High contrast mode is enabled
   */
  test('Property 13.6: Stress mode enables high contrast', () => {
    const stressVars = generateCSSVariables(STRESS_MODE_ACTIVE_CONFIG);
    
    expect(STRESS_MODE_ACTIVE_CONFIG.highContrast).toBe(true);
    expect(stressVars['--stress-border-width']).toBe('3px');
    expect(stressVars['--stress-focus-ring-width']).toBe('4px');
  });

  /**
   * Property 13.7: Animations are reduced
   */
  test('Property 13.7: Stress mode reduces animations', () => {
    const stressVars = generateCSSVariables(STRESS_MODE_ACTIVE_CONFIG);
    
    expect(STRESS_MODE_ACTIVE_CONFIG.reducedAnimations).toBe(true);
    expect(stressVars['--stress-animation-duration']).toBe('0ms');
  });
});

// =============================================
// Property 14: Functionality Preservation
// =============================================

describe('Property 14: Functionality Preservation', () => {
  beforeEach(() => {
    resetStressModeManager();
  });

  /**
   * Property 14.1: All essential actions exist and are complete
   */
  test('Property 14.1: Essential actions have all required fields', () => {
    ESSENTIAL_ACTIONS.forEach(action => {
      expect(action.id).toBeTruthy();
      expect(action.label).toBeTruthy();
      expect(action.icon).toBeTruthy();
      expect(action.description).toBeTruthy();
      expect(action.voicePrompt).toBeTruthy();
      expect(action.action).toBeTruthy();
      expect(typeof action.priority).toBe('number');
      expect(['red', 'orange', 'blue', 'green']).toContain(action.color);
    });
  });

  /**
   * Property 14.2: Navigation preserves critical paths
   */
  test('Property 14.2: Essential navigation includes critical paths', () => {
    const essentialNav = NAVIGATION_ITEMS.filter(i => i.essential);
    const essentialPaths = essentialNav.map(i => i.path);
    
    // Critical paths must be present
    expect(essentialPaths).toContain('/');           // Dashboard
    expect(essentialPaths).toContain('/family');     // Family
    expect(essentialPaths).toContain('/medications'); // Medications
    expect(essentialPaths).toContain('/emergency');   // Emergency
  });

  /**
   * Property 14.3: Manager toggle works correctly
   */
  test('Property 14.3: Stress mode can be toggled', () => {
    const manager = getStressModeManager();
    
    expect(manager.getConfig().enabled).toBe(false);
    
    manager.enable();
    expect(manager.getConfig().enabled).toBe(true);
    expect(manager.getConfig().showEssentialOnly).toBe(true);
    
    manager.disable();
    expect(manager.getConfig().enabled).toBe(false);
    expect(manager.getConfig().showEssentialOnly).toBe(false);
  });

  /**
   * Property 14.4: Configuration updates are partial
   */
  test('Property 14.4: Partial config updates preserve other settings', () => {
    const manager = getStressModeManager();
    
    manager.updateConfig({ voiceGuidanceEnabled: true });
    expect(manager.getConfig().voiceGuidanceEnabled).toBe(true);
    expect(manager.getConfig().enabled).toBe(false); // Unchanged
    expect(manager.getConfig().fontSize).toBe('normal'); // Unchanged
    
    manager.updateConfig({ fontSize: 'large', buttonSize: 'large' });
    expect(manager.getConfig().fontSize).toBe('large');
    expect(manager.getConfig().buttonSize).toBe('large');
    expect(manager.getConfig().voiceGuidanceEnabled).toBe(true); // Still true
  });

  /**
   * Property 14.5: Subscribers are notified
   */
  test('Property 14.5: Subscribers receive config updates', () => {
    const manager = getStressModeManager();
    const listener = jest.fn();
    
    const unsubscribe = manager.subscribe(listener);
    
    manager.enable();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
    
    manager.disable();
    expect(listener).toHaveBeenCalledTimes(2);
    
    unsubscribe();
    manager.enable();
    expect(listener).toHaveBeenCalledTimes(2); // Not called again
  });
});

// =============================================
// Auto-Suggestion Tests
// =============================================

describe('Auto-Suggestion Tests', () => {
  
  /**
   * Property: Suggests when urgent alerts present
   */
  test('Suggests stress mode when urgent alerts present', () => {
    const suggestion = shouldSuggestStressMode(
      DEFAULT_STRESS_MODE_CONFIG,
      3, // 3 urgent alerts
      null,
      false
    );
    
    expect(suggestion.suggestStressMode).toBe(true);
    expect(suggestion.reason).toContain('3 urgent alert');
  });

  /**
   * Property: Suggests when triage active
   */
  test('Suggests stress mode when triage active', () => {
    const suggestion = shouldSuggestStressMode(
      DEFAULT_STRESS_MODE_CONFIG,
      0,
      'TRIAGE#123', // Active triage
      false
    );
    
    expect(suggestion.suggestStressMode).toBe(true);
    expect(suggestion.reason).toContain('Triage');
  });

  /**
   * Property: Suggests after escalation
   */
  test('Suggests stress mode after recent escalation', () => {
    const suggestion = shouldSuggestStressMode(
      DEFAULT_STRESS_MODE_CONFIG,
      0,
      null,
      true // Recent escalation
    );
    
    expect(suggestion.suggestStressMode).toBe(true);
    expect(suggestion.reason).toContain('escalation');
  });

  /**
   * Property: Does not suggest when already enabled
   */
  test('Does not suggest when already in stress mode', () => {
    const suggestion = shouldSuggestStressMode(
      STRESS_MODE_ACTIVE_CONFIG,
      5,
      'TRIAGE#123',
      true
    );
    
    expect(suggestion.suggestStressMode).toBe(false);
  });

  /**
   * Property: Does not suggest when auto-suggest disabled
   */
  test('Does not suggest when auto-suggest disabled', () => {
    const config: StressModeConfig = {
      ...DEFAULT_STRESS_MODE_CONFIG,
      autoSuggestOnUrgent: false
    };
    
    const suggestion = shouldSuggestStressMode(config, 5, null, false);
    
    expect(suggestion.suggestStressMode).toBe(false);
  });
});

// =============================================
// Voice Prompts Tests
// =============================================

describe('Voice Prompts Tests', () => {
  
  /**
   * Property: All voice prompts are defined
   */
  test('All required voice prompts exist', () => {
    expect(VOICE_PROMPTS.stressModeActivated).toBeTruthy();
    expect(VOICE_PROMPTS.stressModeDeactivated).toBeTruthy();
    expect(VOICE_PROMPTS.urgentAlertReceived).toBeTruthy();
    expect(VOICE_PROMPTS.triageStarted).toBeTruthy();
    expect(VOICE_PROMPTS.taskAssigned).toBeTruthy();
    expect(VOICE_PROMPTS.call911Initiated).toBeTruthy();
    
    // Function prompts work
    expect(VOICE_PROMPTS.triageStepPrompt(1)).toContain('Step 1');
    expect(VOICE_PROMPTS.emergencyContactCalling('John')).toContain('John');
  });

  /**
   * Property: Voice prompts are accessible and clear
   */
  test('Voice prompts use clear, simple language', () => {
    const prompts = [
      VOICE_PROMPTS.stressModeActivated,
      VOICE_PROMPTS.stressModeDeactivated,
      VOICE_PROMPTS.urgentAlertReceived,
      VOICE_PROMPTS.call911Initiated
    ];
    
    prompts.forEach(prompt => {
      // Should be reasonably short
      expect(prompt.length).toBeLessThan(200);
      // Should not use technical jargon
      expect(prompt.toLowerCase()).not.toContain('toggle');
      expect(prompt.toLowerCase()).not.toContain('configuration');
    });
  });
});

// =============================================
// Validation Tests
// =============================================

describe('Validation Tests', () => {
  
  /**
   * Property: Valid configs pass validation
   */
  test('Valid configurations pass validation', () => {
    const validConfigs = [
      { fontSize: 'normal' },
      { fontSize: 'large' },
      { fontSize: 'extra-large' },
      { buttonSize: 'normal' },
      { buttonSize: 'large' },
      { buttonSize: 'extra-large' },
      { fontSize: 'large', buttonSize: 'extra-large' }
    ];
    
    validConfigs.forEach(config => {
      const result = validateStressModeConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  /**
   * Property: Invalid configs fail validation
   */
  test('Invalid configurations fail validation', () => {
    const invalidConfigs = [
      { fontSize: 'tiny' },
      { fontSize: 'huge' },
      { buttonSize: 'tiny' },
      { buttonSize: 'massive' }
    ];
    
    invalidConfigs.forEach(config => {
      const result = validateStressModeConfig(config as any);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

// =============================================
// CSS Variables Tests
// =============================================

describe('CSS Variables Tests', () => {
  
  /**
   * Property: All CSS variables are generated
   */
  test('All required CSS variables are generated', () => {
    const vars = generateCSSVariables(DEFAULT_STRESS_MODE_CONFIG);
    
    expect(vars['--stress-font-size-base']).toBeTruthy();
    expect(vars['--stress-font-size-lg']).toBeTruthy();
    expect(vars['--stress-font-size-xl']).toBeTruthy();
    expect(vars['--stress-button-padding']).toBeTruthy();
    expect(vars['--stress-button-min-height']).toBeTruthy();
    expect(vars['--stress-button-font-size']).toBeTruthy();
    expect(vars['--stress-icon-size']).toBeTruthy();
    expect(vars['--stress-border-width']).toBeTruthy();
    expect(vars['--stress-focus-ring-width']).toBeTruthy();
    expect(vars['--stress-animation-duration']).toBeTruthy();
  });

  /**
   * Property: Variables scale consistently
   */
  test('CSS variables scale progressively', () => {
    const normalVars = generateCSSVariables({ ...DEFAULT_STRESS_MODE_CONFIG, fontSize: 'normal' });
    const largeVars = generateCSSVariables({ ...DEFAULT_STRESS_MODE_CONFIG, fontSize: 'large' });
    const xlVars = generateCSSVariables({ ...DEFAULT_STRESS_MODE_CONFIG, fontSize: 'extra-large' });
    
    const parseRem = (s: string) => parseFloat(s.replace('rem', ''));
    
    expect(parseRem(largeVars['--stress-font-size-base']))
      .toBeGreaterThan(parseRem(normalVars['--stress-font-size-base']));
    expect(parseRem(xlVars['--stress-font-size-base']))
      .toBeGreaterThan(parseRem(largeVars['--stress-font-size-base']));
  });
});

