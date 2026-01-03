import React from 'react';
import './AIAttributionBadge.css';

/**
 * AI Attribution Badge Component
 * Shows source of task/alert/recommendation
 */
function AIAttributionBadge({ type, variant = 'default' }) {
  const badges = {
    'ai-detected': {
      icon: '🤖',
      text: 'AI-Detected',
      color: '#667eea',
    },
    'ai-recommended': {
      icon: '💡',
      text: 'AI-Recommended',
      color: '#764ba2',
    },
    'human-confirmed': {
      icon: '✓',
      text: 'Human-Confirmed',
      color: '#10b981',
    },
    'family-initiated': {
      icon: '👨‍👩‍👧',
      text: 'Family-Initiated',
      color: '#0066cc',
    },
    'doctor-scheduled': {
      icon: '👨‍⚕️',
      text: 'Doctor-Scheduled',
      color: '#8b5cf6',
    },
    'system-generated': {
      icon: '⚙️',
      text: 'System-Generated',
      color: '#6b7280',
    },
  };

  const badge = badges[type] || badges['system-generated'];

  const variantStyles = {
    default: {
      backgroundColor: `${badge.color}15`,
      color: badge.color,
      border: `1px solid ${badge.color}40`,
    },
    solid: {
      backgroundColor: badge.color,
      color: 'white',
      border: 'none',
    },
    minimal: {
      backgroundColor: 'transparent',
      color: badge.color,
      border: `1px solid ${badge.color}`,
    },
  };

  return (
    <span 
      className={`ai-attribution-badge ai-badge-${variant}`}
      style={variantStyles[variant]}
      title={`Source: ${badge.text}`}
    >
      <span className="badge-icon" aria-hidden="true">{badge.icon}</span>
      <span className="badge-text">{badge.text}</span>
    </span>
  );
}

export default AIAttributionBadge;

