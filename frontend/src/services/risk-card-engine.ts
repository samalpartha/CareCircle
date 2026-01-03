/**
 * Risk Card Engine with Standardized CTAs
 * Displays AI health assessments with actionable, consistent CTAs
 * 
 * Risk Card Types:
 * - Cognitive: Memory, orientation, decision-making trends
 * - Medication Adherence: Missed doses, confusion, side effects
 * - Emotional Wellbeing: Mood, social engagement, depression indicators
 * - Physical Safety: Fall risk, mobility, home hazards
 * - Nutrition: Eating patterns, weight changes, hydration
 */

import {
  RiskCard,
  RiskType,
  TrendIndicator,
  DataCoverage,
  ActionCTA,
  ContributingFactor
} from '../types/care-operations';

// =============================================
// Safety Disclaimer (Required on all risk cards)
// =============================================

export const SAFETY_DISCLAIMER = 
  "Not a diagnosis. Use as an early signal for professional consultation. " +
  "Always consult healthcare providers for medical decisions.";

// =============================================
// Standardized CTA Patterns
// =============================================

export interface StandardizedCTA {
  label: string;
  estimatedMinutes: number;
  urgency: 'immediate' | 'today' | 'this_week';
  actionType: 'call' | 'checklist' | 'schedule' | 'navigate';
  description: string;
}

/**
 * CTA templates by risk type
 */
export const CTA_TEMPLATES: Record<RiskType, StandardizedCTA> = {
  cognitive: {
    label: 'Run 2-min Check-in Call',
    estimatedMinutes: 2,
    urgency: 'today',
    actionType: 'call',
    description: 'Quick cognitive assessment call to evaluate current mental status'
  },
  medication: {
    label: 'Verify Today\'s Doses',
    estimatedMinutes: 5,
    urgency: 'immediate',
    actionType: 'checklist',
    description: 'Review and confirm all scheduled medications have been taken'
  },
  emotional: {
    label: 'Schedule Social Touchpoint',
    estimatedMinutes: 15,
    urgency: 'this_week',
    actionType: 'schedule',
    description: 'Arrange a social call or visit to improve emotional wellbeing'
  },
  physical: {
    label: 'Complete Safety Checklist',
    estimatedMinutes: 10,
    urgency: 'today',
    actionType: 'checklist',
    description: 'Review home safety and mobility status'
  },
  nutrition: {
    label: 'Review Meal Log',
    estimatedMinutes: 5,
    urgency: 'today',
    actionType: 'navigate',
    description: 'Check recent eating patterns and hydration levels'
  }
};

// =============================================
// Trend Analysis
// =============================================

/**
 * Calculate trend from historical scores
 */
export function calculateTrend(
  currentScore: number,
  previousScore: number,
  timeframeDays: number = 7
): TrendIndicator {
  const change = currentScore - previousScore;
  const percentageChange = previousScore > 0 
    ? (change / previousScore) * 100 
    : change;
  
  let direction: 'improving' | 'stable' | 'declining';
  let significance: 'significant' | 'moderate' | 'minimal';
  
  // For risk scores, lower is better (less risk)
  // So if currentScore < previousScore, that's improving
  if (change < -5) {
    direction = 'improving';
  } else if (change > 5) {
    direction = 'declining';
  } else {
    direction = 'stable';
  }
  
  const absoluteChange = Math.abs(percentageChange);
  if (absoluteChange > 20) {
    significance = 'significant';
  } else if (absoluteChange > 10) {
    significance = 'moderate';
  } else {
    significance = 'minimal';
  }
  
  return {
    direction,
    magnitude: Math.round(absoluteChange * 10) / 10,
    timeframe: `since ${timeframeDays} days ago`,
    significance
  };
}

/**
 * Format trend for display: "What changed" before "Why"
 * e.g., "Up 8% since last week because..."
 */
export function formatTrendMessage(trend: TrendIndicator, riskType: RiskType): string {
  const directionText = {
    improving: 'Down',
    stable: 'Stable',
    declining: 'Up'
  };
  
  const riskLabels: Record<RiskType, string> = {
    cognitive: 'Cognitive risk',
    medication: 'Medication adherence concern',
    emotional: 'Emotional wellbeing concern',
    physical: 'Physical safety risk',
    nutrition: 'Nutrition concern'
  };
  
  if (trend.direction === 'stable') {
    return `${riskLabels[riskType]} is stable ${trend.timeframe}`;
  }
  
  return `${riskLabels[riskType]} is ${directionText[trend.direction]} ${trend.magnitude}% ${trend.timeframe}`;
}

// =============================================
// Data Coverage Assessment
// =============================================

/**
 * Calculate data coverage for confidence assessment
 */
export function calculateDataCoverage(
  dataPoints: number,
  timespanDays: number,
  lastUpdateDate: Date
): DataCoverage {
  let confidence: 'high' | 'medium' | 'low';
  
  // Confidence based on data points and recency
  const daysSinceUpdate = Math.floor(
    (Date.now() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (dataPoints >= 10 && timespanDays >= 7 && daysSinceUpdate <= 1) {
    confidence = 'high';
  } else if (dataPoints >= 5 && timespanDays >= 3 && daysSinceUpdate <= 3) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }
  
  return {
    confidence,
    dataPoints,
    timespan: `${timespanDays} days`,
    lastUpdate: lastUpdateDate.toISOString()
  };
}

/**
 * Format data coverage for display
 * e.g., "High confidence based on 12 conversations over 14 days"
 */
export function formatDataCoverageMessage(coverage: DataCoverage): string {
  return `${coverage.confidence.charAt(0).toUpperCase() + coverage.confidence.slice(1)} confidence based on ${coverage.dataPoints} data points over ${coverage.timespan}`;
}

// =============================================
// Contributing Factors
// =============================================

/**
 * Common contributing factors by risk type
 */
export const FACTOR_TEMPLATES: Record<RiskType, ContributingFactor[]> = {
  cognitive: [
    { factor: 'Memory recall', impact: 'high', description: 'Difficulty remembering recent conversations' },
    { factor: 'Orientation', impact: 'medium', description: 'Confusion about time or place' },
    { factor: 'Decision making', impact: 'medium', description: 'Difficulty with routine decisions' }
  ],
  medication: [
    { factor: 'Missed doses', impact: 'high', description: 'One or more medications not taken as scheduled' },
    { factor: 'Timing inconsistency', impact: 'medium', description: 'Medications taken at irregular times' },
    { factor: 'Side effects', impact: 'medium', description: 'Reports of medication side effects' }
  ],
  emotional: [
    { factor: 'Mood changes', impact: 'high', description: 'Increased sadness or irritability' },
    { factor: 'Social isolation', impact: 'high', description: 'Reduced social interactions' },
    { factor: 'Sleep patterns', impact: 'medium', description: 'Changes in sleep quality or duration' }
  ],
  physical: [
    { factor: 'Fall risk', impact: 'high', description: 'Unsteady gait or balance issues' },
    { factor: 'Mobility decline', impact: 'high', description: 'Reduced ability to move independently' },
    { factor: 'Home hazards', impact: 'medium', description: 'Environmental risks in living space' }
  ],
  nutrition: [
    { factor: 'Appetite changes', impact: 'high', description: 'Significant decrease in food intake' },
    { factor: 'Hydration', impact: 'high', description: 'Insufficient fluid intake' },
    { factor: 'Weight changes', impact: 'medium', description: 'Unexplained weight loss or gain' }
  ]
};

// =============================================
// Risk Card Creation
// =============================================

/**
 * Create a standardized risk card
 */
export function createRiskCard(
  type: RiskType,
  score: number,
  previousScore: number,
  dataPoints: number,
  timespanDays: number,
  lastUpdateDate: Date,
  customFactors?: ContributingFactor[],
  onAction?: () => void
): RiskCard {
  // Normalize score to 0-100
  const normalizedScore = Math.max(0, Math.min(100, score));
  
  // Calculate trend
  const trend = calculateTrend(normalizedScore, previousScore, timespanDays);
  
  // Calculate data coverage
  const dataCoverage = calculateDataCoverage(dataPoints, timespanDays, lastUpdateDate);
  
  // Get CTA template
  const ctaTemplate = CTA_TEMPLATES[type];
  
  // Create ActionCTA
  const primaryCTA: ActionCTA = {
    label: ctaTemplate.label,
    estimatedTime: ctaTemplate.estimatedMinutes,
    urgency: ctaTemplate.urgency,
    action: onAction || (() => {
      console.log(`Action triggered for ${type} risk card`);
    })
  };
  
  // Get contributing factors
  const factors = customFactors || FACTOR_TEMPLATES[type];
  
  return {
    type,
    score: normalizedScore,
    trend,
    confidence: dataCoverage.confidence,
    dataCoverage,
    primaryCTA,
    factors,
    safetyDisclaimer: SAFETY_DISCLAIMER
  };
}

/**
 * Get severity level based on score
 */
export function getScoreSeverity(score: number): 'critical' | 'high' | 'moderate' | 'low' {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'moderate';
  return 'low';
}

/**
 * Get color for risk score display
 */
export function getScoreColor(score: number): string {
  const severity = getScoreSeverity(score);
  const colors = {
    critical: '#dc2626', // red-600
    high: '#ea580c',     // orange-600
    moderate: '#ca8a04', // yellow-600
    low: '#16a34a'       // green-600
  };
  return colors[severity];
}

// =============================================
// Risk Card Display Helpers
// =============================================

/**
 * Format score with appropriate unit
 */
export function formatScore(score: number): string {
  return `${Math.round(score)}/100`;
}

/**
 * Get trend arrow for display
 */
export function getTrendArrow(trend: TrendIndicator): string {
  const arrows = {
    improving: '↓',
    stable: '→',
    declining: '↑'
  };
  return arrows[trend.direction];
}

/**
 * Get trend color for display
 * Note: For risk scores, declining (↑) is bad, improving (↓) is good
 */
export function getTrendColor(trend: TrendIndicator): string {
  const colors = {
    improving: '#16a34a', // green - risk going down is good
    stable: '#6b7280',    // gray
    declining: '#dc2626'  // red - risk going up is bad
  };
  return colors[trend.direction];
}

/**
 * Get urgency label for CTA
 */
export function getUrgencyLabel(urgency: 'immediate' | 'today' | 'this_week'): string {
  const labels = {
    immediate: 'Do Now',
    today: 'Today',
    this_week: 'This Week'
  };
  return labels[urgency];
}

/**
 * Get urgency color for CTA badge
 */
export function getUrgencyColor(urgency: 'immediate' | 'today' | 'this_week'): string {
  const colors = {
    immediate: '#dc2626', // red
    today: '#ea580c',     // orange
    this_week: '#2563eb'  // blue
  };
  return colors[urgency];
}

// =============================================
// Risk Card Validation
// =============================================

/**
 * Validate a risk card has all required fields
 */
export function validateRiskCard(card: RiskCard): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required fields
  if (!card.type || !['cognitive', 'medication', 'emotional', 'physical', 'nutrition'].includes(card.type)) {
    errors.push('Invalid or missing risk type');
  }
  
  if (typeof card.score !== 'number' || card.score < 0 || card.score > 100) {
    errors.push('Score must be a number between 0 and 100');
  }
  
  if (!card.trend || !['improving', 'stable', 'declining'].includes(card.trend.direction)) {
    errors.push('Invalid or missing trend indicator');
  }
  
  if (!card.confidence || !['high', 'medium', 'low'].includes(card.confidence)) {
    errors.push('Invalid or missing confidence level');
  }
  
  if (!card.primaryCTA || !card.primaryCTA.label) {
    errors.push('Missing primary CTA');
  }
  
  if (!card.primaryCTA.estimatedTime || card.primaryCTA.estimatedTime <= 0) {
    errors.push('CTA must have estimated time');
  }
  
  if (!card.safetyDisclaimer || card.safetyDisclaimer.length < 10) {
    errors.push('Safety disclaimer is required');
  }
  
  if (!card.dataCoverage) {
    errors.push('Data coverage information is required');
  }
  
  if (!card.factors || card.factors.length === 0) {
    errors.push('At least one contributing factor is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// =============================================
// Batch Risk Card Creation
// =============================================

export interface RiskScoreData {
  type: RiskType;
  currentScore: number;
  previousScore: number;
  dataPoints: number;
  timespanDays: number;
  lastUpdate: Date;
  customFactors?: ContributingFactor[];
}

/**
 * Create multiple risk cards from data
 */
export function createRiskCards(
  scoreData: RiskScoreData[],
  onAction?: (type: RiskType) => void
): RiskCard[] {
  return scoreData.map(data => 
    createRiskCard(
      data.type,
      data.currentScore,
      data.previousScore,
      data.dataPoints,
      data.timespanDays,
      data.lastUpdate,
      data.customFactors,
      onAction ? () => onAction(data.type) : undefined
    )
  );
}

/**
 * Sort risk cards by severity (highest risk first)
 */
export function sortRiskCardsBySeverity(cards: RiskCard[]): RiskCard[] {
  return [...cards].sort((a, b) => {
    // Higher score = higher risk = should appear first
    if (a.score !== b.score) {
      return b.score - a.score;
    }
    
    // If same score, declining trends are more urgent
    const trendPriority = { declining: 0, stable: 1, improving: 2 };
    return trendPriority[a.trend.direction] - trendPriority[b.trend.direction];
  });
}

/**
 * Filter risk cards to only show those above threshold
 */
export function filterHighRiskCards(cards: RiskCard[], threshold: number = 40): RiskCard[] {
  return cards.filter(card => card.score >= threshold);
}


