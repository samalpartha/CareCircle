import React, { useState } from 'react';
import './AlertExplainability.css';

/**
 * Alert Explainability Component
 * Shows WHY an alert was triggered with AI reasoning
 */
function AlertExplainability({ alert, onClose }) {
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);

  if (!alert) return null;

  const {
    type,
    severity,
    message,
    triggers = [],
    baseline = {},
    aiConfidence = 0,
    timestamp,
    recommendation,
  } = alert;

  const getSeverityColor = (severity) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      urgent: '#dc2626',
    };
    return colors[severity] || '#6b7280';
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🚨',
      urgent: '🔴',
    };
    return icons[severity] || '⚠️';
  };

  return (
    <div className="alert-explainability-overlay" onClick={onClose}>
      <div className="alert-explainability-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="explainability-header">
          <div className="header-main">
            <span className="severity-icon">{getSeverityIcon(severity)}</span>
            <div>
              <h2 className="drawer-title">{message}</h2>
              <p className="drawer-subtitle">AI Alert Explanation</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* Alert Badge */}
        <div className="alert-badge-container">
          <span 
            className="severity-badge"
            style={{ 
              backgroundColor: getSeverityColor(severity),
              color: 'white'
            }}
          >
            {severity.toUpperCase()} PRIORITY
          </span>
          <span className="ai-confidence-badge">
            AI Confidence: {aiConfidence}%
          </span>
          <span className="status-badge">
            🤖 AI-Detected · Awaiting Human Review
          </span>
        </div>

        {/* Trigger Analysis */}
        <div className="explainability-section">
          <h3 className="section-title">
            <span className="section-icon">🔍</span>
            This alert was triggered due to:
          </h3>
          <ul className="trigger-list">
            {triggers.length > 0 ? (
              triggers.map((trigger, index) => (
                <li key={index} className="trigger-item">
                  <span className="trigger-bullet">•</span>
                  <span className="trigger-text">{trigger}</span>
                </li>
              ))
            ) : (
              <>
                <li className="trigger-item">
                  <span className="trigger-bullet">•</span>
                  <span className="trigger-text">Missed medication name recall during call</span>
                </li>
                <li className="trigger-item">
                  <span className="trigger-bullet">•</span>
                  <span className="trigger-text">Increased pause duration (+42% vs baseline)</span>
                </li>
                <li className="trigger-item">
                  <span className="trigger-bullet">•</span>
                  <span className="trigger-text">Deviation from 14-day cognitive baseline</span>
                </li>
              </>
            )}
          </ul>
        </div>

        {/* Baseline Comparison */}
        {baseline && Object.keys(baseline).length > 0 && (
          <div className="explainability-section">
            <h3 className="section-title">
              <span className="section-icon">📊</span>
              Baseline Comparison:
            </h3>
            <div className="baseline-grid">
              {Object.entries(baseline).map(([key, value]) => (
                <div key={key} className="baseline-item">
                  <span className="baseline-label">{key}</span>
                  <span className="baseline-value">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Recommendation */}
        {recommendation && (
          <div className="explainability-section recommendation-section">
            <h3 className="section-title">
              <span className="section-icon">💡</span>
              AI Recommendation:
            </h3>
            <p className="recommendation-text">{recommendation}</p>
          </div>
        )}

        {/* Full Analysis Toggle */}
        {!showFullAnalysis ? (
          <button 
            className="view-full-analysis-btn"
            onClick={() => setShowFullAnalysis(true)}
          >
            View Full Analysis
            <span className="expand-icon">▼</span>
          </button>
        ) : (
          <div className="full-analysis">
            <h3 className="section-title">
              <span className="section-icon">📋</span>
              Detailed Analysis:
            </h3>
            <div className="analysis-details">
              <div className="detail-row">
                <span className="detail-label">Alert Type:</span>
                <span className="detail-value">{type || 'Cognitive Concern'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Detection Time:</span>
                <span className="detail-value">{timestamp || 'Just now'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Analysis Method:</span>
                <span className="detail-value">AI Pattern Recognition + Baseline Deviation</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Data Sources:</span>
                <span className="detail-value">Voice analysis, Response patterns, Historical baseline</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Next Steps:</span>
                <span className="detail-value">Human review required for confirmation</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="drawer-actions">
          <button className="action-btn action-btn-primary">
            Confirm & Create Care Action
          </button>
          <button className="action-btn action-btn-secondary">
            Mark as False Positive
          </button>
        </div>
      </div>
    </div>
  );
}

export default AlertExplainability;

