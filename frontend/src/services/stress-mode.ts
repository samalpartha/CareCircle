/**
 * Stress Mode Interface System
 * Simplifies UI during high-stress situations for reduced cognitive load
 * 
 * Features:
 * - Larger text and buttons
 * - Reduced menu options (essential only)
 * - Emergency contact prominence
 * - Voice guidance for critical steps
 * - Automatic suggestion for urgent alerts
 */

// =============================================
// Stress Mode Configuration
// =============================================

export interface StressModeConfig {
  enabled: boolean;
  fontSize: 'normal' | 'large' | 'extra-large';
  buttonSize: 'normal' | 'large' | 'extra-large';
  showEssentialOnly: boolean;
  emergencyContactsProminent: boolean;
  voiceGuidanceEnabled: boolean;
  autoSuggestOnUrgent: boolean;
  reducedAnimations: boolean;
  highContrast: boolean;
}

export const DEFAULT_STRESS_MODE_CONFIG: StressModeConfig = {
  enabled: false,
  fontSize: 'normal',
  buttonSize: 'normal',
  showEssentialOnly: false,
  emergencyContactsProminent: false,
  voiceGuidanceEnabled: false,
  autoSuggestOnUrgent: true,
  reducedAnimations: false,
  highContrast: false
};

export const STRESS_MODE_ACTIVE_CONFIG: StressModeConfig = {
  enabled: true,
  fontSize: 'extra-large',
  buttonSize: 'extra-large',
  showEssentialOnly: true,
  emergencyContactsProminent: true,
  voiceGuidanceEnabled: true,
  autoSuggestOnUrgent: true,
  reducedAnimations: true,
  highContrast: true
};

// =============================================
// Essential Actions (shown in Stress Mode)
// =============================================

export interface StressModeAction {
  id: string;
  label: string;
  icon: string;
  description: string;
  voicePrompt: string;
  action: 'call_911' | 'call_elder' | 'call_emergency_contact' | 'triage' | 'send_help' | 'checkin';
  priority: number; // Lower = higher priority
  color: 'red' | 'orange' | 'blue' | 'green';
}

export const ESSENTIAL_ACTIONS: StressModeAction[] = [
  {
    id: 'call_911',
    label: 'Call 911',
    icon: '🚨',
    description: 'Emergency services',
    voicePrompt: 'Tap to call emergency services. This will dial 911.',
    action: 'call_911',
    priority: 1,
    color: 'red'
  },
  {
    id: 'call_elder',
    label: 'Call Elder',
    icon: '📞',
    description: 'Call directly',
    voicePrompt: 'Tap to call your loved one directly.',
    action: 'call_elder',
    priority: 2,
    color: 'blue'
  },
  {
    id: 'send_help',
    label: 'Send Help',
    icon: '🏃',
    description: 'Alert nearby caregiver',
    voicePrompt: 'Tap to alert the nearest family caregiver who can respond immediately.',
    action: 'send_help',
    priority: 3,
    color: 'orange'
  },
  {
    id: 'start_triage',
    label: 'Start Triage',
    icon: '📋',
    description: 'Guided assessment',
    voicePrompt: 'Tap to start a guided health assessment with step-by-step questions.',
    action: 'triage',
    priority: 4,
    color: 'blue'
  },
  {
    id: 'checkin',
    label: 'Quick Check-in',
    icon: '✓',
    description: 'Log wellness check',
    voicePrompt: 'Tap to record a quick wellness check-in.',
    action: 'checkin',
    priority: 5,
    color: 'green'
  }
];

// =============================================
// Navigation Items for Stress Mode
// =============================================

export interface StressModeNavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  essential: boolean;
}

export const NAVIGATION_ITEMS: StressModeNavItem[] = [
  { id: 'dashboard', label: 'Home', icon: '🏠', path: '/', essential: true },
  { id: 'queue', label: 'Care Queue', icon: '📋', path: '/queue', essential: true },
  { id: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦', path: '/family', essential: true },
  { id: 'tasks', label: 'Tasks', icon: '✓', path: '/tasks', essential: true },
  { id: 'timeline', label: 'Timeline', icon: '📜', path: '/timeline', essential: false },
  { id: 'alerts', label: 'Alerts', icon: '⚠️', path: '/alerts', essential: false },
  { id: 'medications', label: 'Medications', icon: '💊', path: '/medications', essential: true },
  { id: 'analytics', label: 'Analytics', icon: '📊', path: '/analytics', essential: false },
  { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings', essential: false },
  { id: 'emergency', label: 'Emergency', icon: '🚨', path: '/emergency', essential: true }
];

/**
 * Get navigation items based on stress mode
 */
export function getNavigationItems(config: StressModeConfig): StressModeNavItem[] {
  if (config.showEssentialOnly) {
    return NAVIGATION_ITEMS.filter(item => item.essential);
  }
  return NAVIGATION_ITEMS;
}

// =============================================
// CSS Variable Generation
// =============================================

export interface StressModeCSSVars {
  '--stress-font-size-base': string;
  '--stress-font-size-lg': string;
  '--stress-font-size-xl': string;
  '--stress-button-padding': string;
  '--stress-button-min-height': string;
  '--stress-button-font-size': string;
  '--stress-icon-size': string;
  '--stress-border-width': string;
  '--stress-focus-ring-width': string;
  '--stress-animation-duration': string;
}

const FONT_SIZE_SCALES = {
  normal: { base: '1rem', lg: '1.125rem', xl: '1.25rem' },
  large: { base: '1.25rem', lg: '1.5rem', xl: '1.75rem' },
  'extra-large': { base: '1.5rem', lg: '1.875rem', xl: '2.25rem' }
};

const BUTTON_SIZE_SCALES = {
  normal: { padding: '0.75rem 1.5rem', minHeight: '44px', fontSize: '1rem', iconSize: '1.25rem' },
  large: { padding: '1rem 2rem', minHeight: '56px', fontSize: '1.125rem', iconSize: '1.5rem' },
  'extra-large': { padding: '1.5rem 2.5rem', minHeight: '72px', fontSize: '1.5rem', iconSize: '2rem' }
};

/**
 * Generate CSS variables for stress mode
 */
export function generateCSSVariables(config: StressModeConfig): StressModeCSSVars {
  const fontScale = FONT_SIZE_SCALES[config.fontSize];
  const buttonScale = BUTTON_SIZE_SCALES[config.buttonSize];
  
  return {
    '--stress-font-size-base': fontScale.base,
    '--stress-font-size-lg': fontScale.lg,
    '--stress-font-size-xl': fontScale.xl,
    '--stress-button-padding': buttonScale.padding,
    '--stress-button-min-height': buttonScale.minHeight,
    '--stress-button-font-size': buttonScale.fontSize,
    '--stress-icon-size': buttonScale.iconSize,
    '--stress-border-width': config.highContrast ? '3px' : '2px',
    '--stress-focus-ring-width': config.highContrast ? '4px' : '3px',
    '--stress-animation-duration': config.reducedAnimations ? '0ms' : '200ms'
  };
}

/**
 * Apply stress mode CSS variables to document
 */
export function applyStressModeStyles(config: StressModeConfig): void {
  const vars = generateCSSVariables(config);
  const root = document.documentElement;
  
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  
  // Apply stress mode class
  if (config.enabled) {
    root.classList.add('stress-mode');
    root.classList.add('stress-mode-active');
  } else {
    root.classList.remove('stress-mode');
    root.classList.remove('stress-mode-active');
  }
  
  if (config.highContrast) {
    root.classList.add('high-contrast');
  } else {
    root.classList.remove('high-contrast');
  }
  
  if (config.reducedAnimations) {
    root.classList.add('reduced-motion');
  } else {
    root.classList.remove('reduced-motion');
  }
}

// =============================================
// Voice Guidance System
// =============================================

export interface VoiceGuidanceMessage {
  id: string;
  message: string;
  priority: 'urgent' | 'important' | 'informational';
  interruptible: boolean;
}

/**
 * Speak a message using Web Speech API
 */
export function speakMessage(
  message: string,
  config: StressModeConfig,
  options: { rate?: number; pitch?: number } = {}
): SpeechSynthesisUtterance | null {
  if (!config.voiceGuidanceEnabled || !('speechSynthesis' in window)) {
    return null;
  }
  
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.rate = options.rate ?? 0.9; // Slightly slower for clarity
  utterance.pitch = options.pitch ?? 1;
  utterance.volume = 1;
  
  // Use a clear, calm voice if available
  const voices = speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => 
    v.name.includes('Samantha') || 
    v.name.includes('Google') ||
    v.lang.startsWith('en')
  );
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }
  
  speechSynthesis.speak(utterance);
  return utterance;
}

/**
 * Cancel all speech
 */
export function cancelSpeech(): void {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
}

/**
 * Voice prompts for common situations
 */
export const VOICE_PROMPTS = {
  stressModeActivated: 'Stress mode activated. The screen is now simplified. Large buttons are available for emergency actions.',
  stressModeDeactivated: 'Stress mode deactivated. Full interface restored.',
  urgentAlertReceived: 'Urgent alert received. Please review the alert details on screen.',
  triageStarted: 'Starting triage assessment. Please follow the on-screen questions.',
  triageStepPrompt: (step: number) => `Step ${step}. Please answer the question on screen.`,
  taskAssigned: 'A new care task has been assigned to you. Check your care queue.',
  emergencyContactCalling: (name: string) => `Calling ${name}. Please wait.`,
  call911Initiated: 'Calling 911. Stay on the line and be ready to provide your location.'
};

// =============================================
// Auto-Suggestion Logic
// =============================================

export interface AutoSuggestion {
  suggestStressMode: boolean;
  reason?: string;
  voiceMessage?: string;
}

/**
 * Determine if stress mode should be suggested
 */
export function shouldSuggestStressMode(
  config: StressModeConfig,
  urgentAlertCount: number,
  activeTriageId: string | null,
  recentEscalation: boolean
): AutoSuggestion {
  // Don't suggest if already enabled
  if (config.enabled) {
    return { suggestStressMode: false };
  }
  
  // Don't suggest if auto-suggest is disabled
  if (!config.autoSuggestOnUrgent) {
    return { suggestStressMode: false };
  }
  
  // Suggest if there are urgent alerts
  if (urgentAlertCount > 0) {
    return {
      suggestStressMode: true,
      reason: `You have ${urgentAlertCount} urgent alert${urgentAlertCount > 1 ? 's' : ''}`,
      voiceMessage: 'Would you like to enable stress mode for a simpler interface?'
    };
  }
  
  // Suggest if triage is active
  if (activeTriageId) {
    return {
      suggestStressMode: true,
      reason: 'Triage in progress',
      voiceMessage: 'A triage is in progress. Enable stress mode for clearer guidance?'
    };
  }
  
  // Suggest if there was a recent escalation
  if (recentEscalation) {
    return {
      suggestStressMode: true,
      reason: 'Recent task escalation',
      voiceMessage: 'A task was recently escalated. Would stress mode help?'
    };
  }
  
  return { suggestStressMode: false };
}

// =============================================
// Stress Mode Manager
// =============================================

export class StressModeManager {
  private config: StressModeConfig;
  private listeners: Set<(config: StressModeConfig) => void> = new Set();
  
  constructor(initialConfig: StressModeConfig = DEFAULT_STRESS_MODE_CONFIG) {
    this.config = { ...initialConfig };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): StressModeConfig {
    return { ...this.config };
  }
  
  /**
   * Enable stress mode
   */
  enable(): void {
    this.config = { ...STRESS_MODE_ACTIVE_CONFIG, enabled: true };
    this.applyChanges();
    speakMessage(VOICE_PROMPTS.stressModeActivated, this.config);
  }
  
  /**
   * Disable stress mode
   */
  disable(): void {
    this.config = { ...DEFAULT_STRESS_MODE_CONFIG, enabled: false };
    this.applyChanges();
    speakMessage(VOICE_PROMPTS.stressModeDeactivated, this.config);
  }
  
  /**
   * Toggle stress mode
   */
  toggle(): void {
    if (this.config.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }
  
  /**
   * Update specific configuration options
   */
  updateConfig(updates: Partial<StressModeConfig>): void {
    this.config = { ...this.config, ...updates };
    this.applyChanges();
  }
  
  /**
   * Apply configuration changes
   */
  private applyChanges(): void {
    applyStressModeStyles(this.config);
    this.notifyListeners();
  }
  
  /**
   * Subscribe to configuration changes
   */
  subscribe(listener: (config: StressModeConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.config));
  }
  
  /**
   * Get essential actions for current mode
   */
  getEssentialActions(): StressModeAction[] {
    return [...ESSENTIAL_ACTIONS].sort((a, b) => a.priority - b.priority);
  }
  
  /**
   * Get navigation items for current mode
   */
  getNavigationItems(): StressModeNavItem[] {
    return getNavigationItems(this.config);
  }
  
  /**
   * Check if should suggest stress mode
   */
  checkAutoSuggest(
    urgentAlertCount: number,
    activeTriageId: string | null,
    recentEscalation: boolean
  ): AutoSuggestion {
    return shouldSuggestStressMode(
      this.config,
      urgentAlertCount,
      activeTriageId,
      recentEscalation
    );
  }
  
  /**
   * Speak a message if voice guidance enabled
   */
  speak(message: string): void {
    speakMessage(message, this.config);
  }
}

// =============================================
// Singleton Instance
// =============================================

let stressModeInstance: StressModeManager | null = null;

export function getStressModeManager(): StressModeManager {
  if (!stressModeInstance) {
    stressModeInstance = new StressModeManager();
  }
  return stressModeInstance;
}

export function resetStressModeManager(): void {
  stressModeInstance = null;
}

// =============================================
// Validation
// =============================================

/**
 * Validate stress mode configuration
 */
export function validateStressModeConfig(
  config: Partial<StressModeConfig>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (config.fontSize !== undefined && 
      !['normal', 'large', 'extra-large'].includes(config.fontSize)) {
    errors.push('Invalid font size');
  }
  
  if (config.buttonSize !== undefined &&
      !['normal', 'large', 'extra-large'].includes(config.buttonSize)) {
    errors.push('Invalid button size');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}


