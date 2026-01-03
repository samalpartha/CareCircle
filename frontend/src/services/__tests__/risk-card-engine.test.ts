/**
 * Property-Based Tests for Risk Card Engine
 * Feature: care-operations-console
 * 
 * Property 5: Risk Card CTA Standardization
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.6, 3.7
 */

import {
  createRiskCard,
  createRiskCards,
  validateRiskCard,
  calculateTrend,
  calculateDataCoverage,
  formatTrendMessage,
  formatDataCoverageMessage,
  getScoreSeverity,
  getScoreColor,
  getTrendArrow,
  getTrendColor,
  getUrgencyLabel,
  getUrgencyColor,
  sortRiskCardsBySeverity,
  filterHighRiskCards,
  CTA_TEMPLATES,
  SAFETY_DISCLAIMER,
  FACTOR_TEMPLATES,
  RiskScoreData
} from '../risk-card-engine';

import { RiskCard, RiskType, ContributingFactor } from '../../types/care-operations';

// =============================================
// Test Helpers
// =============================================

const ALL_RISK_TYPES: RiskType[] = ['cognitive', 'medication', 'emotional', 'physical', 'nutrition'];

const generateRandomScore = (): number => Math.floor(Math.random() * 101);

const generateRandomRiskType = (): RiskType => 
  ALL_RISK_TYPES[Math.floor(Math.random() * ALL_RISK_TYPES.length)];

const generateRandomRiskScoreData = (): RiskScoreData => ({
  type: generateRandomRiskType(),
  currentScore: generateRandomScore(),
  previousScore: generateRandomScore(),
  dataPoints: Math.floor(Math.random() * 20) + 1,
  timespanDays: Math.floor(Math.random() * 30) + 1,
  lastUpdate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
});

// =============================================
// Property 5: Risk Card CTA Standardization
// =============================================

describe('Property 5: Risk Card CTA Standardization', () => {
  
  /**
   * Property 5.1: Every risk card type has a standardized primary CTA
   * For any risk card type, it should display a standardized primary CTA with estimated time
   */
  test('Property 5.1: Each risk type has a standardized CTA template', () => {
    ALL_RISK_TYPES.forEach(riskType => {
      const template = CTA_TEMPLATES[riskType];
      
      // Template must exist
      expect(template).toBeDefined();
      
      // Required fields
      expect(template.label).toBeTruthy();
      expect(typeof template.label).toBe('string');
      expect(template.label.length).toBeGreaterThan(0);
      
      expect(template.estimatedMinutes).toBeGreaterThan(0);
      expect(typeof template.estimatedMinutes).toBe('number');
      
      expect(['immediate', 'today', 'this_week']).toContain(template.urgency);
      expect(['call', 'checklist', 'schedule', 'navigate']).toContain(template.actionType);
      
      expect(template.description).toBeTruthy();
    });
  });

  /**
   * Property 5.2: Created risk cards have all required fields
   * For any risk card creation, all required fields must be populated
   */
  test('Property 5.2: Created risk cards have required structure', () => {
    for (let i = 0; i < 50; i++) {
      const data = generateRandomRiskScoreData();
      const card = createRiskCard(
        data.type,
        data.currentScore,
        data.previousScore,
        data.dataPoints,
        data.timespanDays,
        data.lastUpdate
      );
      
      // Validate structure
      const validation = validateRiskCard(card);
      expect(validation.valid).toBe(true);
      if (!validation.valid) {
        console.error('Validation errors:', validation.errors);
      }
      
      // Verify all required fields
      expect(card.type).toBe(data.type);
      expect(card.score).toBeGreaterThanOrEqual(0);
      expect(card.score).toBeLessThanOrEqual(100);
      expect(card.trend).toBeDefined();
      expect(card.confidence).toBeDefined();
      expect(card.dataCoverage).toBeDefined();
      expect(card.primaryCTA).toBeDefined();
      expect(card.factors).toBeDefined();
      expect(card.safetyDisclaimer).toBe(SAFETY_DISCLAIMER);
    }
  });

  /**
   * Property 5.3: CTA has estimated time display
   * Every CTA must show estimated completion time
   */
  test('Property 5.3: CTA includes estimated time', () => {
    for (let i = 0; i < 50; i++) {
      const data = generateRandomRiskScoreData();
      const card = createRiskCard(
        data.type,
        data.currentScore,
        data.previousScore,
        data.dataPoints,
        data.timespanDays,
        data.lastUpdate
      );
      
      // CTA must have estimated time
      expect(card.primaryCTA.estimatedTime).toBeGreaterThan(0);
      expect(typeof card.primaryCTA.estimatedTime).toBe('number');
      
      // CTA must have a label
      expect(card.primaryCTA.label).toBeTruthy();
      
      // CTA must have urgency
      expect(['immediate', 'today', 'this_week']).toContain(card.primaryCTA.urgency);
      
      // CTA must have action function
      expect(typeof card.primaryCTA.action).toBe('function');
    }
  });

  /**
   * Property 5.4: Confidence level is displayed based on data coverage
   * Confidence should reflect data quality
   */
  test('Property 5.4: Confidence level reflects data coverage', () => {
    // High confidence: many data points, recent update
    const highCoverage = calculateDataCoverage(15, 14, new Date());
    expect(highCoverage.confidence).toBe('high');
    
    // Medium confidence
    const mediumCoverage = calculateDataCoverage(7, 5, new Date(Date.now() - 2 * 24 * 60 * 60 * 1000));
    expect(mediumCoverage.confidence).toBe('medium');
    
    // Low confidence: few data points or stale data
    const lowCoverage = calculateDataCoverage(2, 1, new Date(Date.now() - 5 * 24 * 60 * 60 * 1000));
    expect(lowCoverage.confidence).toBe('low');
    
    // Test with random data
    for (let i = 0; i < 30; i++) {
      const data = generateRandomRiskScoreData();
      const card = createRiskCard(
        data.type,
        data.currentScore,
        data.previousScore,
        data.dataPoints,
        data.timespanDays,
        data.lastUpdate
      );
      
      expect(['high', 'medium', 'low']).toContain(card.confidence);
      expect(card.dataCoverage.confidence).toBe(card.confidence);
    }
  });

  /**
   * Property 5.5: Safety disclaimer is always present
   * Every risk card must include the required safety disclaimer
   */
  test('Property 5.5: Safety disclaimer is required on all risk cards', () => {
    for (let i = 0; i < 100; i++) {
      const data = generateRandomRiskScoreData();
      const card = createRiskCard(
        data.type,
        data.currentScore,
        data.previousScore,
        data.dataPoints,
        data.timespanDays,
        data.lastUpdate
      );
      
      // Safety disclaimer must be present
      expect(card.safetyDisclaimer).toBeTruthy();
      expect(card.safetyDisclaimer).toBe(SAFETY_DISCLAIMER);
      expect(card.safetyDisclaimer).toContain('Not a diagnosis');
      expect(card.safetyDisclaimer).toContain('professional consultation');
    }
  });

  /**
   * Property 5.6: Contributing factors are present
   * Each risk card should have contributing factors
   */
  test('Property 5.6: Contributing factors are included', () => {
    ALL_RISK_TYPES.forEach(riskType => {
      // Each type should have factor templates
      const factors = FACTOR_TEMPLATES[riskType];
      expect(factors).toBeDefined();
      expect(factors.length).toBeGreaterThan(0);
      
      // Each factor should have required structure
      factors.forEach(factor => {
        expect(factor.factor).toBeTruthy();
        expect(['high', 'medium', 'low']).toContain(factor.impact);
        expect(factor.description).toBeTruthy();
      });
    });
    
    // Test created cards have factors
    for (let i = 0; i < 30; i++) {
      const data = generateRandomRiskScoreData();
      const card = createRiskCard(
        data.type,
        data.currentScore,
        data.previousScore,
        data.dataPoints,
        data.timespanDays,
        data.lastUpdate
      );
      
      expect(card.factors).toBeDefined();
      expect(card.factors.length).toBeGreaterThan(0);
    }
  });
});

// =============================================
// Trend Indicator Tests
// =============================================

describe('Trend Indicator Tests', () => {
  /**
   * Property: Trend direction is calculated correctly
   */
  test('Trend direction reflects score changes', () => {
    // Score decreased = improving (less risk)
    const improving = calculateTrend(40, 60, 7);
    expect(improving.direction).toBe('improving');
    
    // Score increased = declining (more risk)
    const declining = calculateTrend(70, 50, 7);
    expect(declining.direction).toBe('declining');
    
    // Small change = stable
    const stable = calculateTrend(52, 50, 7);
    expect(stable.direction).toBe('stable');
    
    // Random tests
    for (let i = 0; i < 50; i++) {
      const current = generateRandomScore();
      const previous = generateRandomScore();
      const trend = calculateTrend(current, previous);
      
      const change = current - previous;
      if (change < -5) {
        expect(trend.direction).toBe('improving');
      } else if (change > 5) {
        expect(trend.direction).toBe('declining');
      } else {
        expect(trend.direction).toBe('stable');
      }
    }
  });

  /**
   * Property: Trend significance is calculated correctly
   */
  test('Trend significance reflects magnitude of change', () => {
    // Large change (>20%) = significant
    const significant = calculateTrend(20, 50, 7); // 60% change
    expect(significant.significance).toBe('significant');
    
    // Medium change (10-20%) = moderate
    const moderate = calculateTrend(42, 50, 7); // 16% change
    expect(moderate.significance).toBe('moderate');
    
    // Small change (<10%) = minimal
    const minimal = calculateTrend(48, 50, 7); // 4% change
    expect(minimal.significance).toBe('minimal');
  });

  /**
   * Property: Trend message format is consistent
   */
  test('Trend message format is correct', () => {
    ALL_RISK_TYPES.forEach(riskType => {
      const trend = calculateTrend(60, 50, 7);
      const message = formatTrendMessage(trend, riskType);
      
      expect(message).toBeTruthy();
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(10);
      expect(message).toContain('since');
    });
  });
});

// =============================================
// Score Severity Tests
// =============================================

describe('Score Severity Tests', () => {
  /**
   * Property: Severity levels are consistent
   */
  test('Severity levels match score ranges', () => {
    // Critical: 80-100
    for (let score = 80; score <= 100; score++) {
      expect(getScoreSeverity(score)).toBe('critical');
    }
    
    // High: 60-79
    for (let score = 60; score < 80; score++) {
      expect(getScoreSeverity(score)).toBe('high');
    }
    
    // Moderate: 40-59
    for (let score = 40; score < 60; score++) {
      expect(getScoreSeverity(score)).toBe('moderate');
    }
    
    // Low: 0-39
    for (let score = 0; score < 40; score++) {
      expect(getScoreSeverity(score)).toBe('low');
    }
  });

  /**
   * Property: Colors match severity
   */
  test('Score colors are consistent with severity', () => {
    const criticalColor = getScoreColor(90);
    const highColor = getScoreColor(70);
    const moderateColor = getScoreColor(50);
    const lowColor = getScoreColor(20);
    
    // All colors should be valid hex colors
    const hexPattern = /^#[0-9a-fA-F]{6}$/;
    expect(criticalColor).toMatch(hexPattern);
    expect(highColor).toMatch(hexPattern);
    expect(moderateColor).toMatch(hexPattern);
    expect(lowColor).toMatch(hexPattern);
    
    // Colors should be different for different severities
    expect(criticalColor).not.toBe(lowColor);
    expect(highColor).not.toBe(lowColor);
  });
});

// =============================================
// Display Helper Tests
// =============================================

describe('Display Helper Tests', () => {
  /**
   * Property: Trend arrows are correct
   */
  test('Trend arrows match direction', () => {
    expect(getTrendArrow({ direction: 'improving', magnitude: 10, timeframe: '7 days', significance: 'moderate' })).toBe('↓');
    expect(getTrendArrow({ direction: 'stable', magnitude: 2, timeframe: '7 days', significance: 'minimal' })).toBe('→');
    expect(getTrendArrow({ direction: 'declining', magnitude: 15, timeframe: '7 days', significance: 'significant' })).toBe('↑');
  });

  /**
   * Property: Trend colors follow risk logic
   * For risk scores: improving (down) = green, declining (up) = red
   */
  test('Trend colors follow risk logic', () => {
    const improvingColor = getTrendColor({ direction: 'improving', magnitude: 10, timeframe: '7 days', significance: 'moderate' });
    const decliningColor = getTrendColor({ direction: 'declining', magnitude: 10, timeframe: '7 days', significance: 'moderate' });
    
    // Improving should be green-ish, declining should be red-ish
    expect(improvingColor).not.toBe(decliningColor);
  });

  /**
   * Property: Urgency labels are human-readable
   */
  test('Urgency labels are descriptive', () => {
    expect(getUrgencyLabel('immediate')).toBe('Do Now');
    expect(getUrgencyLabel('today')).toBe('Today');
    expect(getUrgencyLabel('this_week')).toBe('This Week');
  });

  /**
   * Property: Data coverage message is formatted correctly
   */
  test('Data coverage message is readable', () => {
    const coverage = calculateDataCoverage(12, 14, new Date());
    const message = formatDataCoverageMessage(coverage);
    
    expect(message).toContain('confidence');
    expect(message).toContain('12');
    expect(message).toContain('data points');
    expect(message).toContain('14 days');
  });
});

// =============================================
// Batch Operations Tests
// =============================================

describe('Batch Operations Tests', () => {
  /**
   * Property: Batch creation works for all types
   */
  test('createRiskCards creates valid cards for all types', () => {
    const scoreData: RiskScoreData[] = ALL_RISK_TYPES.map(type => ({
      type,
      currentScore: generateRandomScore(),
      previousScore: generateRandomScore(),
      dataPoints: 10,
      timespanDays: 7,
      lastUpdate: new Date()
    }));
    
    const cards = createRiskCards(scoreData);
    
    expect(cards.length).toBe(ALL_RISK_TYPES.length);
    cards.forEach((card, index) => {
      expect(card.type).toBe(scoreData[index].type);
      const validation = validateRiskCard(card);
      expect(validation.valid).toBe(true);
    });
  });

  /**
   * Property: Sorting puts highest risk first
   */
  test('sortRiskCardsBySeverity orders by score descending', () => {
    for (let i = 0; i < 20; i++) {
      const cards: RiskCard[] = ALL_RISK_TYPES.map(type => 
        createRiskCard(type, generateRandomScore(), 50, 10, 7, new Date())
      );
      
      const sorted = sortRiskCardsBySeverity(cards);
      
      for (let j = 1; j < sorted.length; j++) {
        expect(sorted[j - 1].score).toBeGreaterThanOrEqual(sorted[j].score);
      }
    }
  });

  /**
   * Property: Filtering respects threshold
   */
  test('filterHighRiskCards respects threshold', () => {
    for (let i = 0; i < 20; i++) {
      const cards: RiskCard[] = [];
      
      // Create cards with known scores
      for (let j = 0; j < 10; j++) {
        cards.push(createRiskCard(
          generateRandomRiskType(),
          j * 10, // 0, 10, 20, ... 90
          50,
          10,
          7,
          new Date()
        ));
      }
      
      // Filter at threshold 50
      const filtered = filterHighRiskCards(cards, 50);
      
      filtered.forEach(card => {
        expect(card.score).toBeGreaterThanOrEqual(50);
      });
      
      // Should have cards with scores 50, 60, 70, 80, 90
      expect(filtered.length).toBe(5);
    }
  });
});

// =============================================
// Validation Tests
// =============================================

describe('Validation Tests', () => {
  /**
   * Property: Valid cards pass validation
   */
  test('Valid risk cards pass validation', () => {
    for (let i = 0; i < 50; i++) {
      const data = generateRandomRiskScoreData();
      const card = createRiskCard(
        data.type,
        data.currentScore,
        data.previousScore,
        data.dataPoints,
        data.timespanDays,
        data.lastUpdate
      );
      
      const result = validateRiskCard(card);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    }
  });

  /**
   * Property: Invalid cards fail validation with specific errors
   */
  test('Invalid risk cards fail with descriptive errors', () => {
    // Missing type
    const noType = {
      score: 50,
      trend: { direction: 'stable' as const, magnitude: 0, timeframe: '7 days', significance: 'minimal' as const },
      confidence: 'high' as const,
      dataCoverage: { confidence: 'high' as const, dataPoints: 10, timespan: '7 days', lastUpdate: new Date().toISOString() },
      primaryCTA: { label: 'Test', estimatedTime: 5, urgency: 'today' as const, action: () => {} },
      factors: [{ factor: 'Test', impact: 'high' as const, description: 'Test' }],
      safetyDisclaimer: SAFETY_DISCLAIMER
    } as RiskCard;
    
    const noTypeResult = validateRiskCard(noType);
    expect(noTypeResult.valid).toBe(false);
    expect(noTypeResult.errors.some(e => e.includes('type'))).toBe(true);
    
    // Invalid score
    const invalidScore = createRiskCard('cognitive', 150, 50, 10, 7, new Date());
    // Score should be clamped, so it should still be valid
    expect(invalidScore.score).toBeLessThanOrEqual(100);
  });
});

