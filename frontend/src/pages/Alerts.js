import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import AlertBanner from '../components/AlertBanner';
import AlertExplainabilityDrawer from '../components/AlertExplainabilityDrawer';
import LoadingSpinner from '../components/LoadingSpinner';
import './Alerts.css';

function Alerts() {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showExplainability, setShowExplainability] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const alertsData = await api.getAlerts();
      setAlerts(Array.isArray(alertsData) ? alertsData : []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAlert = async (alertId) => {
    try {
      await api.deleteAlert(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'urgent') return alert.severity === 'urgent' || alert.severity === 'high';
    if (filter === 'resolved') return alert.status === 'resolved';
    return alert.severity === filter;
  });

  const alertCounts = {
    all: alerts.length,
    urgent: alerts.filter(a => a.severity === 'urgent' || a.severity === 'high').length,
    medium: alerts.filter(a => a.severity === 'medium').length,
    low: alerts.filter(a => a.severity === 'low').length,
  };

  if (loading) {
    return <LoadingSpinner message="Loading alerts..." />;
  }

  return (
    <div className="alerts-page">
      <div className="page-header">
        <div>
          <h1>🚨 Risk Alerts</h1>
          <p className="subtitle">AI-detected concerns requiring your attention</p>
        </div>
        <button className="btn btn-secondary" onClick={loadAlerts}>
          🔄 Refresh
        </button>
      </div>

      {/* Alert Statistics */}
      <div className="alert-stats">
        <div className={`stat-card ${alertCounts.urgent > 0 ? 'stat-urgent' : ''}`}>
          <div className="stat-icon">🔴</div>
          <div className="stat-content">
            <div className="stat-value">{alertCounts.urgent}</div>
            <div className="stat-label">Urgent</div>
          </div>
        </div>
        <div className="stat-card stat-warning">
          <div className="stat-icon">🟡</div>
          <div className="stat-content">
            <div className="stat-value">{alertCounts.medium}</div>
            <div className="stat-label">Medium</div>
          </div>
        </div>
        <div className="stat-card stat-info">
          <div className="stat-icon">🔵</div>
          <div className="stat-content">
            <div className="stat-value">{alertCounts.low}</div>
            <div className="stat-label">Low</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{alertCounts.all}</div>
            <div className="stat-label">Total</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="alert-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Alerts ({alertCounts.all})
        </button>
        <button 
          className={`filter-btn filter-urgent ${filter === 'urgent' ? 'active' : ''}`}
          onClick={() => setFilter('urgent')}
        >
          🔴 Urgent ({alertCounts.urgent})
        </button>
        <button 
          className={`filter-btn ${filter === 'medium' ? 'active' : ''}`}
          onClick={() => setFilter('medium')}
        >
          🟡 Medium ({alertCounts.medium})
        </button>
        <button 
          className={`filter-btn ${filter === 'low' ? 'active' : ''}`}
          onClick={() => setFilter('low')}
        >
          🔵 Low ({alertCounts.low})
        </button>
      </div>

      {/* Alert List */}
      <div className="alerts-list">
        {filteredAlerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <h3>No alerts to show</h3>
            <p>
              {filter === 'all' 
                ? 'Great news! There are no active alerts requiring attention.'
                : `No ${filter} priority alerts at this time.`}
            </p>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div 
              key={alert.id || alert.SK} 
              className="alert-item"
              onClick={() => {
                setSelectedAlert(alert);
                setShowExplainability(true);
              }}
            >
              <AlertBanner 
                alert={alert} 
                onDismiss={(alertId) => {
                  handleDeleteAlert(alertId);
                }}
              />
            </div>
          ))
        )}
      </div>

      {/* Explainability Drawer */}
      {showExplainability && selectedAlert && (
        <AlertExplainabilityDrawer
          alert={selectedAlert}
          onClose={() => {
            setShowExplainability(false);
            setSelectedAlert(null);
          }}
        />
      )}
    </div>
  );
}

export default Alerts;




