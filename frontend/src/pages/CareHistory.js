import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCareTime } from '../utils/timeFormat';
import './CareHistory.css';

function CareHistory() {
  const { t } = useTranslation();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedCall, setSelectedCall] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      // Load calls, completed tasks and alerts as history
      const [callsData, tasksData, alertsData] = await Promise.all([
        api.getCalls(),
        api.getTasks({ status: 'completed' }),
        api.getAlerts()
      ]);

      // Handle API response format (calls come inside { calls: [] })
      const callsArray = callsData?.calls || (Array.isArray(callsData) ? callsData : []);
      const tasks = Array.isArray(tasksData) ? tasksData : [];
      const alerts = Array.isArray(alertsData) ? alertsData : [];

      // Combine and format as history entries
      const historyEntries = [
        // Add calls - handle both old and new API field names
        ...callsArray.map(call => ({
          id: call.callId || call.call_id || call.SK,
          type: 'call',
          title: `Call with ${call.elderName || call.elder_name || 'Elder'}`,
          description: call.transcript ? (call.transcript.substring(0, 100) + '...') : 'No transcript',
          timestamp: call.createdAt || call.created_at,
          status: call.status || 'completed',
          icon: '📞',
          category: 'Care Call',
          duration: call.duration || call.duration_seconds,
          fullData: call
        })),
        // Add completed tasks
        ...tasks.filter(t => t.status === 'completed').map(task => ({
          id: task.task_id || task.id,
          type: 'task',
          title: task.title,
          description: task.description,
          timestamp: task.completed_at || task.updated_at || task.created_at,
          status: 'completed',
          icon: '✅',
          category: 'Task Completed'
        })),
        // Add alerts
        ...alerts.map(alert => ({
          id: alert.id || alert.SK,
          type: 'alert',
          title: alert.title || 'Alert',
          description: alert.message,
          timestamp: alert.timestamp || alert.created_at,
          status: alert.status || 'detected',
          icon: alert.severity === 'urgent' ? '🚨' : '⚠️',
          category: 'Alert Detected',
          severity: alert.severity
        }))
      ];

      // Sort by timestamp (newest first)
      historyEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setHistory(historyEntries);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCall = async (callId) => {
    if (!window.confirm('Delete this call record?')) return;
    try {
      await api.deleteCall(callId);
      loadHistory();
      setSelectedCall(null);
    } catch (error) {
      console.error('Error deleting call:', error);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredHistory = history.filter(entry => {
    if (filter === 'all') return true;
    return entry.type === filter;
  });

  // Group history by date
  const groupedHistory = filteredHistory.reduce((groups, entry) => {
    const date = new Date(entry.timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {});

  if (loading) {
    return <LoadingSpinner message="Loading care history..." />;
  }

  return (
    <div className="care-history-page">
      <div className="page-header">
        <div>
          <h1>📋 Care History</h1>
          <p className="subtitle">Complete timeline of calls, tasks, and alerts</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="history-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Events ({history.length})
        </button>
        <button 
          className={`filter-btn ${filter === 'call' ? 'active' : ''}`}
          onClick={() => setFilter('call')}
        >
          📞 Calls ({history.filter(h => h.type === 'call').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'task' ? 'active' : ''}`}
          onClick={() => setFilter('task')}
        >
          ✅ Tasks ({history.filter(h => h.type === 'task').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'alert' ? 'active' : ''}`}
          onClick={() => setFilter('alert')}
        >
          ⚠️ Alerts ({history.filter(h => h.type === 'alert').length})
        </button>
      </div>

      {/* Timeline */}
      <div className="history-timeline">
        {Object.keys(groupedHistory).length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No history yet</h3>
            <p>Care activities will appear here as they happen.</p>
          </div>
        ) : (
          Object.entries(groupedHistory).map(([date, entries]) => (
            <div key={date} className="timeline-group">
              <div className="timeline-date">{date}</div>
              <div className="timeline-entries">
                {entries.map(entry => (
                  <div 
                    key={entry.id} 
                    className={`timeline-entry entry-${entry.type} ${entry.type === 'call' ? 'clickable' : ''}`}
                    onClick={() => entry.type === 'call' && setSelectedCall(entry.fullData)}
                  >
                    <div className="entry-icon">{entry.icon}</div>
                    <div className="entry-content">
                      <div className="entry-header">
                        <span className="entry-category">{entry.category}</span>
                        <span className="entry-time">
                          {formatCareTime(entry.timestamp).relative}
                        </span>
                      </div>
                      <h4 className="entry-title">{entry.title}</h4>
                      {entry.duration && (
                        <span className="entry-duration">⏱️ {formatDuration(entry.duration)}</span>
                      )}
                      {entry.description && (
                        <p className="entry-description">{entry.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Call Details Modal */}
      {selectedCall && (
        <div className="modal-overlay" onClick={() => setSelectedCall(null)}>
          <div className="modal-content call-details-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📞 Call Details</h2>
              <button className="modal-close" onClick={() => setSelectedCall(null)}>×</button>
            </div>
            <div className="call-details">
              <div className="detail-row">
                <span className="detail-label">Elder:</span>
                <span className="detail-value">{selectedCall.elderName || selectedCall.elder_name || 'Unknown'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Duration:</span>
                <span className="detail-value">{formatDuration(selectedCall.duration || selectedCall.duration_seconds)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Date:</span>
                <span className="detail-value">
                  {(selectedCall.createdAt || selectedCall.created_at) ? new Date(selectedCall.createdAt || selectedCall.created_at).toLocaleString() : 'Unknown'}
                </span>
              </div>
              
              <div className="transcript-section">
                <h3>📝 Transcript</h3>
                <div className="transcript-box">
                  {selectedCall.transcript || 'No transcript available'}
                </div>
              </div>

              {selectedCall.analysis && (
                <div className="analysis-section">
                  <h3>🤖 AI Analysis</h3>
                  <div className="analysis-content">
                    {selectedCall.analysis.summary && (
                      <p className="analysis-summary">{selectedCall.analysis.summary}</p>
                    )}
                    {selectedCall.analysis.concerns && selectedCall.analysis.concerns.length > 0 && (
                      <div className="concerns-list">
                        <h4>Concerns Detected:</h4>
                        <ul>
                          {selectedCall.analysis.concerns.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button 
                  className="btn btn-danger"
                  onClick={() => handleDeleteCall(selectedCall.callId || selectedCall.call_id || selectedCall.SK)}
                >
                  🗑️ Delete Call Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CareHistory;
