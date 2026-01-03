import React from 'react';
import './RiskScoreCard.css';

/**
 * Risk Score Card Component
 * Shows AI-calculated risk with trend and explainability
 */
function RiskScoreCard({ 
  title, 
  score, 
  trend, 
  level, 
  description, 
  factors,
  lastUpdated,
  onExplain,
  trendWindow = '14 days',
  confidence = 'high',
  hasAction = true,
  baselineRange = null, // e.g., { min: 40, max: 55 }
  onStartCall,
  onVerifyMeds,
  onTakeAction,
}) {
  const getConfidenceLabel = (conf) => {
    const labels = {
      high: { text: 'High confidence', icon: '✓✓', color: '#10b981' },
      medium: { text: 'Moderate confidence', icon: '✓', color: '#f59e0b' },
      low: { text: 'Limited data', icon: '?', color: '#6b7280' },
    };
    return labels[conf] || labels.medium;
  };
  const confInfo = getConfidenceLabel(confidence);
  const getLevelColor = (level) => {
    const colors = {
      low: '#10b981',
      moderate: '#f59e0b',
      high: '#ef4444',
      critical: '#dc2626',
    };
    return colors[level] || '#6b7280';
  };

  const getTrendIcon = (trend) => {
    if (trend > 0) return '▲';
    if (trend < 0) return '▼';
    return '→';
  };

  const getTrendColor = (trend) => {
    if (trend > 0) return '#ef4444'; // Red for increasing risk
    if (trend < 0) return '#10b981'; // Green for decreasing risk
    return '#6b7280'; // Gray for stable
  };

  return (
    <div className="risk-score-card">
      {/* Header */}
      <div className="risk-header">
        <h3 className="risk-title">{title}</h3>
        <span className="ai-badge">🤖 AI-Calculated</span>
      </div>

      {/* Trust Indicators */}
      <div className="trust-indicators">
        <span className="trust-badge trend-window" title="Analysis time period">
          📅 Based on last {trendWindow}
        </span>
        <span 
          className="trust-badge confidence" 
          style={{ borderColor: confInfo.color, color: confInfo.color }}
          title="Confidence level based on data consistency"
        >
          {confInfo.icon} {confInfo.text}
        </span>
        {hasAction && (
          <span className="trust-badge action-available" title="Recommended action is available">
            🎯 Action available
          </span>
        )}
      </div>

      {/* Score Display */}
      <div className="risk-score-display">
        <div className="score-value">
          <span className="score-number">{score}%</span>
          <span 
            className="score-trend" 
            style={{ color: getTrendColor(trend) }}
          >
            {getTrendIcon(trend)} {Math.abs(trend)}%
          </span>
        </div>
        <p className="score-description">{description}</p>
      </div>

      {/* Progress Bar with Baseline */}
      <div className="risk-progress">
        <div className="progress-track">
          {/* Baseline Range Indicator */}
          {baselineRange && (
            <div 
              className="baseline-range"
              style={{ 
                left: `${baselineRange.min}%`,
                width: `${baselineRange.max - baselineRange.min}%`
              }}
              title={`Typical range: ${baselineRange.min}–${baselineRange.max}%`}
            />
          )}
          <div 
            className="risk-progress-bar"
            style={{ 
              width: `${score}%`,
              backgroundColor: getLevelColor(level)
            }}
          />
        </div>
        <div className="risk-labels">
          <span className="risk-label-left">0%</span>
          <span 
            className="risk-label-center"
            style={{ color: getLevelColor(level) }}
          >
            {level.toUpperCase()}
          </span>
          <span className="risk-label-right">100%</span>
        </div>
        {/* Baseline Context */}
        {baselineRange && (
          <p className="baseline-context">
            📊 Typical range last 90 days: {baselineRange.min}–{baselineRange.max}%. Current: {score}%
          </p>
        )}
      </div>

      {/* Key Factors */}
      {factors && factors.length > 0 && (
        <div className="risk-factors">
          <h4 className="factors-title">Key Contributing Factors:</h4>
          <ul className="factors-list">
            {factors.map((factor, index) => (
              <li key={index} className="factor-item">
                <span className="factor-icon">•</span>
                {factor}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Direct Actions - In-card actionable buttons */}
      {hasAction && (
        <div className="risk-actions">
          {onStartCall && (
            <button className="risk-action-btn" onClick={onStartCall} title="Start a call with script">
              <span>📞</span> Call
            </button>
          )}
          {onVerifyMeds && (
            <button className="risk-action-btn" onClick={onVerifyMeds} title="Verify medication checklist">
              <span>💊</span> Verify Meds
            </button>
          )}
          {onTakeAction && (
            <button className="risk-action-btn primary" onClick={onTakeAction} title="Take recommended action">
              <span>🎯</span> Take Action
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="risk-footer">
        <span className="last-updated">
          Updated {lastUpdated || 'recently'}
        </span>
        <button 
          className="explain-btn"
          onClick={onExplain}
          title="See AI explanation for this risk score"
        >
          <span>Why?</span>
          <span className="explain-icon">💡</span>
        </button>
      </div>
    </div>
  );
}

export default RiskScoreCard;

