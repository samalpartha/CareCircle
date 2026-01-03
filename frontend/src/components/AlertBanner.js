import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatCareTime } from '../utils/timeFormat';
import './AlertBanner.css';

function AlertBanner({ alert, onDismiss, compact = false }) {
  const { t } = useTranslation();

  const getAlertIcon = (type) => {
    const icons = {
      healthConcern: '🏥',
      memoryIssue: '🧠',
      emotionalDistress: '😟',
      medicationConcern: '💊',
      urgentHelp: '🚨',
      behavioralChange: '⚠️',
      cognitiveRisk: '🧠',
    };
    return icons[type] || '🔔';
  };

  // Get human-readable title - use alert.title first, then fallback to formatted type
  const getAlertTitle = () => {
    // If alert has a title field, use it directly
    if (alert.title && !alert.title.startsWith('alerts.')) {
      return alert.title;
    }

    // Use translation keys for alert types
    const titleKey = `alerts.titles.${alert.type}`;
    const translated = t(titleKey);

    // If translation exists, use it; otherwise fallback to generic alert
    return translated !== titleKey ? translated : t('alerts.titles.careAlert');
  };

  // Alert tiers based on severity - maps to monetization
  const getAlertTier = (severity) => {
    const tiers = {
      urgent: { label: t('alerts.tiers.urgent'), icon: '🔴', className: 'tier-urgent', sla: t('alerts.sla.immediate') },
      high: { label: t('alerts.tiers.attention'), icon: '🟠', className: 'tier-attention', sla: t('alerts.sla.twoHours') },
      moderate: { label: t('alerts.tiers.attention'), icon: '🟠', className: 'tier-attention', sla: t('alerts.sla.twentyFourHours') },
      medium: { label: t('alerts.tiers.monitor'), icon: '🟡', className: 'tier-monitor', sla: t('alerts.sla.thisWeek') },
      low: { label: t('alerts.tiers.info'), icon: '🔵', className: 'tier-info', sla: t('alerts.sla.awareness') },
    };
    return tiers[severity] || tiers.medium;
  };

  const tier = getAlertTier(alert.severity);

  return (
    <div className={`alert-banner alert-${alert.severity} ${compact ? 'compact' : ''}`}>
      {/* Tier Badge */}
      <div className={`alert-tier-badge ${tier.className}`}>
        <span className="tier-icon">{tier.icon}</span>
        <span className="tier-label">{tier.label}</span>
      </div>

      <div className="alert-content">
        <span className="alert-icon">{getAlertIcon(alert.type)}</span>
        <div className="alert-text">
          <h4>{getAlertTitle()}</h4>
          <p>{alert.message}</p>
          <div className="alert-meta">
            <span className="alert-time" title={formatCareTime(alert.timestamp).tooltip}>
              {formatCareTime(alert.timestamp).relative}
            </span>
            <span className="alert-sla">{tier.sla}</span>
          </div>
        </div>
      </div>
      {onDismiss && (
        <button
          className="alert-dismiss"
          onClick={(e) => {
            e.stopPropagation(); // Prevent opening details drawer
            if (window.confirm(t('alerts.deleteConfirm'))) {
              onDismiss(alert.id);
            }
          }}
          aria-label={t('alerts.deleteButton')}
          title={t('alerts.deleteButton')}
        >
          🗑️
        </button>
      )}
    </div>
  );
}

export default AlertBanner;

