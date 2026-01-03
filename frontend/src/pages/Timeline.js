/**
 * Timeline Page - Historical Care Events
 * Implements Requirements 8.5: Merge historical care events into single Timeline view with filtering
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Breadcrumbs from '../components/Breadcrumbs.js';
import { getCurrentBreadcrumbs } from '../services/navigation.js';
import './Timeline.css';

/**
 * Timeline Page Component
 * Displays historical care events with filtering options
 * Replaces the old "Care History" terminology with standardized "Timeline"
 */
function Timeline() {
  const { t } = useTranslation();
  const [timelineEntries, setTimelineEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [dateRange, setDateRange] = useState('week');
  const [breadcrumbs] = useState(getCurrentBreadcrumbs());

  // Mock data for demonstration
  useEffect(() => {
    setTimeout(() => {
      const mockTimelineEntries = [
        {
          id: 'timeline-001',
          familyId: 'family-001',
          elderId: 'elder-001',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          eventType: 'triage_performed',
          title: 'Urgent Triage Protocol Completed',
          description: 'Fall response protocol completed - no emergency services needed',
          details: {
            protocolType: 'fall',
            outcome: 'monitor',
            actionTaken: 'Monitored at home',
            followUpRequired: true
          },
          caregiver: {
            id: 'caregiver-001',
            name: 'Sarah Johnson'
          },
          immutable: true,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'timeline-002',
          familyId: 'family-001',
          elderId: 'elder-002',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
          eventType: 'medication_taken',
          title: 'Morning Medications Verified',
          description: 'All morning medications taken as prescribed',
          details: {
            medications: ['Lisinopril 10mg', 'Metformin 500mg'],
            adherence: 'complete',
            notes: 'No side effects reported'
          },
          caregiver: {
            id: 'caregiver-002',
            name: 'Michael Smith'
          },
          immutable: true,
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'timeline-003',
          familyId: 'family-001',
          elderId: 'elder-001',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          eventType: 'task_completed',
          title: 'Weekly Wellness Check Completed',
          description: 'Comprehensive wellness assessment completed with positive results',
          details: {
            taskType: 'wellness_check',
            outcome: 'success',
            metrics: {
              mood: 'good',
              mobility: 'stable',
              cognitive: 'normal'
            }
          },
          caregiver: {
            id: 'caregiver-001',
            name: 'Sarah Johnson'
          },
          immutable: true,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'timeline-004',
          familyId: 'family-001',
          elderId: 'elder-002',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          eventType: 'escalation_triggered',
          title: 'Task Escalated to Primary Caregiver',
          description: 'Medication reminder task escalated due to no response',
          details: {
            originalAssignee: 'caregiver-003',
            escalatedTo: 'caregiver-001',
            reason: 'No response after 2 hours',
            resolved: true
          },
          caregiver: {
            id: 'system',
            name: 'System'
          },
          immutable: true,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'timeline-005',
          familyId: 'family-001',
          elderId: 'elder-001',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
          eventType: 'alert_created',
          title: 'Cognitive Risk Alert Generated',
          description: 'AI detected potential cognitive decline based on conversation patterns',
          details: {
            alertType: 'cognitive',
            severity: 'medium',
            confidence: 0.75,
            triggers: ['memory_lapses', 'confusion_episodes']
          },
          caregiver: {
            id: 'system',
            name: 'AI System'
          },
          immutable: true,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      setTimelineEntries(mockTimelineEntries);
      setLoading(false);
    }, 500);
  }, []);

  const getFilteredEntries = () => {
    let filtered = timelineEntries;

    // Filter by event type
    if (activeFilter !== 'all') {
      filtered = filtered.filter(entry => entry.eventType === activeFilter);
    }

    // Filter by date range
    const now = new Date();
    let cutoffDate;

    switch (dateRange) {
      case 'day':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = new Date(0); // Show all
    }

    filtered = filtered.filter(entry => new Date(entry.timestamp) >= cutoffDate);

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'alert_created': return '🚨';
      case 'task_completed': return '✅';
      case 'triage_performed': return '🏥';
      case 'medication_taken': return '💊';
      case 'escalation_triggered': return '⬆️';
      case 'outcome_captured': return '📝';
      default: return '📋';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredEntries = getFilteredEntries();

  if (loading) {
    return (
      <div className="timeline-page">
        <div className="loading-spinner">Loading timeline...</div>
      </div>
    );
  }

  return (
    <div className="timeline-page">
      <Breadcrumbs items={breadcrumbs} />

      <div className="page-header">
        <h1 className="page-title">
          <span className="page-icon">📅</span>
          {t('timeline.title')}
        </h1>
        <p className="page-description">
          {t('timeline.subtitle')}
        </p>
      </div>

      {/* Timeline Filters */}
      <div className="timeline-controls">
        <div className="filter-section">
          <label className="filter-label">Event Type:</label>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              {t('timeline.filters.allEvents')}
            </button>
            <button
              className={`filter-btn ${activeFilter === 'alert_created' ? 'active' : ''}`}
              onClick={() => setActiveFilter('alert_created')}
            >
              {t('timeline.filters.alerts')}
            </button>
            <button
              className={`filter-btn ${activeFilter === 'task_completed' ? 'active' : ''}`}
              onClick={() => setActiveFilter('task_completed')}
            >
              {t('timeline.filters.tasks')}
            </button>
            <button
              className={`filter-btn ${activeFilter === 'triage_performed' ? 'active' : ''}`}
              onClick={() => setActiveFilter('triage_performed')}
            >
              {t('timeline.filters.triage')}
            </button>
            <button
              className={`filter-btn ${activeFilter === 'medication_taken' ? 'active' : ''}`}
              onClick={() => setActiveFilter('medication_taken')}
            >
              {t('timeline.filters.medications')}
            </button>
            <button
              className={`filter-btn ${activeFilter === 'escalation_triggered' ? 'active' : ''}`}
              onClick={() => setActiveFilter('escalation_triggered')}
            >
              {t('timeline.filters.escalations')}
            </button>
          </div>
        </div>

        <div className="filter-section">
          <label className="filter-label">Time Range:</label>
          <select
            className="date-range-select"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="day">{t('timeline.dateRange.last24Hours')}</option>
            <option value="week">{t('timeline.dateRange.lastWeek')}</option>
            <option value="month">{t('timeline.dateRange.lastMonth')}</option>
            <option value="all">{t('timeline.dateRange.allTime')}</option>
          </select>
        </div>
      </div>

      {/* Timeline Entries */}
      <div className="timeline-container">
        {filteredEntries.length === 0 ? (
          <div className="empty-timeline">
            <div className="empty-icon">📅</div>
            <h3>No events found</h3>
            <p>No timeline entries match the selected filters.</p>
          </div>
        ) : (
          <div className="timeline-entries">
            {filteredEntries.map((entry, index) => (
              <div key={entry.id} className="timeline-entry">
                <div className="timeline-marker">
                  <div className="marker-icon">
                    {getEventIcon(entry.eventType)}
                  </div>
                  {index < filteredEntries.length - 1 && (
                    <div className="timeline-line"></div>
                  )}
                </div>

                <div className="timeline-content">
                  <div className="entry-header">
                    <h3 className="entry-title">{entry.title}</h3>
                    <div className="entry-meta">
                      <span className="entry-time">{formatTimestamp(entry.timestamp)}</span>
                      <span className="entry-caregiver">by {entry.caregiver.name}</span>
                    </div>
                  </div>

                  <p className="entry-description">{entry.description}</p>

                  {entry.details && Object.keys(entry.details).length > 0 && (
                    <div className="entry-details">
                      <button
                        className="details-toggle"
                        onClick={() => {
                          const detailsEl = document.getElementById(`details-${entry.id}`);
                          if (detailsEl) {
                            detailsEl.style.display = detailsEl.style.display === 'none' ? 'block' : 'none';
                          }
                        }}
                      >
                        View Details
                      </button>
                      <div id={`details-${entry.id}`} className="details-content" style={{ display: 'none' }}>
                        <pre>{JSON.stringify(entry.details, null, 2)}</pre>
                      </div>
                    </div>
                  )}

                  <div className="entry-footer">
                    <span className="immutable-badge">
                      🔒 Immutable Record
                    </span>
                    <span className="event-type-badge">
                      {entry.eventType.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline Statistics */}
      <div className="timeline-stats">
        <div className="stat-item">
          <span className="stat-value">{timelineEntries.length}</span>
          <span className="stat-label">Total Events</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{timelineEntries.filter(e => e.eventType === 'task_completed').length}</span>
          <span className="stat-label">Tasks Completed</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{timelineEntries.filter(e => e.eventType === 'triage_performed').length}</span>
          <span className="stat-label">Triage Protocols</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{new Set(timelineEntries.map(e => e.caregiver.id)).size}</span>
          <span className="stat-label">Active Caregivers</span>
        </div>
      </div>
    </div>
  );
}

export default Timeline;