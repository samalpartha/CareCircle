/**
 * Today Page - Unified Care Queue
 * Implements Requirements 8.4: "Today" displays unified Care Queue
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Breadcrumbs from '../components/Breadcrumbs.js';
import TakeActionWorkflow from '../components/TakeActionWorkflow';
import { getCurrentBreadcrumbs } from '../services/navigation.js';
import './Today.css';

/**
 * Today Page Component
 * Displays the unified care queue merging alerts, tasks, medications, and check-ins
 * Implements Requirements 2.1, 2.2, 2.3, 2.5 from the Care Operations Console spec
 */
function Today() {
  const { t } = useTranslation();
  const [queueItems, setQueueItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [breadcrumbs] = useState(getCurrentBreadcrumbs());
  const [showTakeAction, setShowTakeAction] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Mock data for demonstration - in real implementation, this would come from the API
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const mockQueueItems = [
        {
          id: 'alert-001',
          type: 'alert',
          severity: 'urgent',
          title: 'Fall detected - Mary Johnson',
          elderName: 'Mary Johnson',
          dueAt: new Date(),
          estimatedMinutes: 15,
          status: 'new',
          suggestedAction: 'Start Urgent Triage Protocol',
          priority: 10,
          assignedTo: 'current-user'
        },
        {
          id: 'med-001',
          type: 'medication',
          severity: 'high',
          title: 'Morning medications due',
          elderName: 'Robert Smith',
          dueAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
          estimatedMinutes: 5,
          status: 'new',
          suggestedAction: 'Verify medication taken',
          priority: 8
        },
        {
          id: 'task-001',
          type: 'task',
          severity: 'medium',
          title: 'Weekly wellness check-in',
          elderName: 'Mary Johnson',
          dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
          estimatedMinutes: 10,
          status: 'new',
          suggestedAction: 'Schedule call',
          priority: 5
        },
        {
          id: 'checkin-001',
          type: 'checkin',
          severity: 'low',
          title: 'Daily mood check',
          elderName: 'Robert Smith',
          dueAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
          estimatedMinutes: 3,
          status: 'new',
          suggestedAction: 'Quick call',
          priority: 3
        }
      ];

      setQueueItems(mockQueueItems);
      setLoading(false);
    }, 500);
  }, []);

  const getFilteredItems = () => {
    switch (activeFilter) {
      case 'urgent':
        return queueItems.filter(item => item.severity === 'urgent');
      case 'due-today':
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return queueItems.filter(item => item.dueAt <= today);
      case 'assigned-to-me':
        return queueItems.filter(item => item.assignedTo === 'current-user');
      case 'medication':
        return queueItems.filter(item => item.type === 'medication');
      case 'cognitive':
        return queueItems.filter(item => item.title.toLowerCase().includes('cognitive') || item.title.toLowerCase().includes('mood'));
      case 'safety':
        return queueItems.filter(item => item.title.toLowerCase().includes('fall') || item.title.toLowerCase().includes('safety'));
      default:
        return queueItems;
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'urgent': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '📋';
      case 'low': return '📝';
      default: return '📋';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'alert': return '🚨';
      case 'medication': return '💊';
      case 'task': return '✅';
      case 'checkin': return '📞';
      case 'followup': return '🔄';
      default: return '📋';
    }
  };

  const formatDueTime = (dueAt) => {
    const now = new Date();
    const diffMs = dueAt.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 0) {
      return `Overdue by ${Math.abs(diffMins)} min`;
    } else if (diffMins === 0) {
      return 'Due now';
    } else if (diffMins < 60) {
      return `Due in ${diffMins} min`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      return `Due in ${diffHours}h ${diffMins % 60}m`;
    }
  };

  const handleTakeAction = (item) => {
    setSelectedItem(item);
    setShowTakeAction(true);
  };

  const handleAssign = (item) => {
    // In a real app, this would open a user selection modal
    alert(`Assigning "${item.title}" to a family member...`);
  };

  const handleSnooze = (item) => {
    // In a real app, this would update the due time
    setQueueItems(items => items.filter(i => i.id !== item.id));
    alert(`Snoozed "${item.title}" for 1 hour.`);
  };

  const filteredItems = getFilteredItems().sort((a, b) => b.priority - a.priority);

  if (loading) {
    return (
      <div className="today-page">
        <div className="loading-spinner">Loading today's care queue...</div>
      </div>
    );
  }

  return (
    <div className="today-page">
      <Breadcrumbs items={breadcrumbs} />

      <div className="page-header">
        <h1 className="page-title">
          <span className="page-icon">📋</span>
          {t('today.title')}
        </h1>
        <p className="page-description">
          {t('today.subtitle')}
        </p>
      </div>

      {/* Queue Filters */}
      <div className="queue-filters">
        <button
          className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          {t('today.filters.all')} ({queueItems.length})
        </button>
        <button
          className={`filter-btn urgent ${activeFilter === 'urgent' ? 'active' : ''}`}
          onClick={() => setActiveFilter('urgent')}
        >
          {t('today.filters.urgent')} ({queueItems.filter(item => item.severity === 'urgent').length})
        </button>
        <button
          className={`filter-btn ${activeFilter === 'due-today' ? 'active' : ''}`}
          onClick={() => setActiveFilter('due-today')}
        >
          {t('today.filters.high')}
        </button>
        <button
          className={`filter-btn ${activeFilter === 'assigned-to-me' ? 'active' : ''}`}
          onClick={() => setActiveFilter('assigned-to-me')}
        >
          {t('today.filters.assignedToMe')}
        </button>
        <button
          className={`filter-btn ${activeFilter === 'medication' ? 'active' : ''}`}
          onClick={() => setActiveFilter('medication')}
        >
          {t('today.filters.medium')}
        </button>
        <button
          className={`filter-btn ${activeFilter === 'cognitive' ? 'active' : ''}`}
          onClick={() => setActiveFilter('cognitive')}
        >
          {t('today.filters.medium')}
        </button>
        <button
          className={`filter-btn ${activeFilter === 'safety' ? 'active' : ''}`}
          onClick={() => setActiveFilter('safety')}
        >
          {t('today.filters.low')}
        </button>
      </div>

      {/* Queue Items */}
      <div className="queue-items">
        {filteredItems.length === 0 ? (
          <div className="empty-queue">
            <div className="empty-icon">✅</div>
            <h3>{t('today.empty.title')}</h3>
            <p>{t('today.empty.message')}</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={`queue-item ${item.severity} ${item.status}`}
            >
              <div className="item-header">
                <div className="item-icons">
                  <span className="severity-icon">{getSeverityIcon(item.severity)}</span>
                  <span className="type-icon">{getTypeIcon(item.type)}</span>
                </div>
                <div className="item-meta">
                  <span className="item-type">{item.type.toUpperCase()}</span>
                  <span className="item-due">{formatDueTime(item.dueAt)}</span>
                </div>
              </div>

              <div className="item-content">
                <h3 className="item-title">{item.title}</h3>
                <p className="item-elder">For: {item.elderName}</p>
                <p className="item-action">
                  <strong>Suggested action:</strong> {item.suggestedAction}
                </p>
                <div className="item-details">
                  <span className="estimated-time">~{item.estimatedMinutes} min</span>
                  {item.assignedTo && (
                    <span className="assigned-to">Assigned to me</span>
                  )}
                </div>
              </div>

              <div className="item-actions">
                <button
                  className="action-btn primary"
                  onClick={() => handleTakeAction(item)}
                >
                  {t('today.actions.takeAction')}
                </button>
                <button
                  className="action-btn secondary"
                  onClick={() => handleAssign(item)}
                >
                  {t('today.actions.assign')}
                </button>
                <button
                  className="action-btn tertiary"
                  onClick={() => handleSnooze(item)}
                >
                  {t('today.actions.snooze')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Queue Statistics */}
      <div className="queue-stats">
        <div className="stat-item">
          <span className="stat-value">{queueItems.length}</span>
          <span className="stat-label">Total Items</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{queueItems.filter(item => item.severity === 'urgent').length}</span>
          <span className="stat-label">Urgent</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{queueItems.filter(item => item.assignedTo === 'current-user').length}</span>
          <span className="stat-label">Assigned to Me</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{queueItems.reduce((sum, item) => sum + item.estimatedMinutes, 0)}</span>
          <span className="stat-label">Total Minutes</span>
        </div>
      </div>



      {/* Take Action Workflow */}
      {
        showTakeAction && selectedItem && (
          <TakeActionWorkflow
            alert={selectedItem}
            onClose={() => {
              setShowTakeAction(false);
              setSelectedItem(null);
            }}
            onComplete={(outcome) => {
              console.log('Action completed:', outcome);
              // Remove the item from the queue for demo purposes
              setQueueItems(items => items.filter(i => i.id !== selectedItem.id));
              setShowTakeAction(false);
              setSelectedItem(null);
              alert('✅ Action recorded and item resolved!');
            }}
          />
        )
      }
    </div >
  );
}

export default Today;