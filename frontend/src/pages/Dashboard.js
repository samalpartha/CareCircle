import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertBanner from '../components/AlertBanner';
import RiskScoreCard from '../components/RiskScoreCard';
import AlertExplainabilityDrawer from '../components/AlertExplainabilityDrawer';
import AIAttributionBadge from '../components/AIAttributionBadge';
import TakeActionWorkflow from '../components/TakeActionWorkflow';
import { useToast } from '../components/Toast';
import { formatLastUpdated, isDataStale, formatCareTime } from '../utils/timeFormat';
import './Dashboard.css';

function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({
    activeTasks: 0,
    completedToday: 0,
    pendingTasks: 0,
    urgentAlerts: 0,
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [hasData, setHasData] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showExplainability, setShowExplainability] = useState(false);
  const [showTakeAction, setShowTakeAction] = useState(false);
  // Track actioned alerts - persisted in localStorage
  const [dismissedAlerts, setDismissedAlerts] = useState(() => {
    const stored = localStorage.getItem('carecircle_dismissed_alerts');
    return stored ? JSON.parse(stored) : [];
  });
  const [priorityDismissed, setPriorityDismissed] = useState(() => {
    return localStorage.getItem('carecircle_priority_dismissed') === 'true';
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Persist dismissed alerts to localStorage
  useEffect(() => {
    localStorage.setItem('carecircle_dismissed_alerts', JSON.stringify(dismissedAlerts));
  }, [dismissedAlerts]);

  useEffect(() => {
    localStorage.setItem('carecircle_priority_dismissed', priorityDismissed.toString());
  }, [priorityDismissed]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load tasks and alerts in parallel
      const [tasksData, alertsData] = await Promise.all([
        api.getTasks({ limit: 5 }),
        api.getAlerts({ limit: 10 })
      ]);

      const tasksList = Array.isArray(tasksData) ? tasksData : [];
      const alertsList = Array.isArray(alertsData) ? alertsData : [];

      setTasks(tasksList);
      setAlerts(alertsList);
      setHasData(tasksList.length > 0 || alertsList.length > 0);

      // Calculate stats
      const pendingTasks = tasksList.filter(t => t.status === 'pending');
      const inProgressTasks = tasksList.filter(t => t.status === 'inProgress');
      const urgentAlerts = alertsList.filter(a => a.priority === 'high' || a.priority === 'urgent' || a.severity === 'urgent');

      // Calculate completed today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const completedToday = tasksList.filter(t => {
        if (t.status === 'completed' && t.completed_at) {
          const completedDate = new Date(t.completed_at);
          return completedDate >= today;
        }
        return false;
      }).length;

      setStats({
        activeTasks: inProgressTasks.length + pendingTasks.length,
        completedToday: completedToday,
        pendingTasks: pendingTasks.length,
        urgentAlerts: urgentAlerts.length,
      });

      setLastUpdated(new Date());

    } catch (error) {
      console.error('Error loading dashboard:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityClass = (priority) => {
    const classes = {
      urgent: 'priority-urgent',
      high: 'priority-high',
      medium: 'priority-medium',
      low: 'priority-low',
    };
    return classes[priority] || 'priority-medium';
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / (1000 * 60)); // minutes

    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const renderDescription = (description) => {
    console.log('renderDescription called with:', description, typeof description);
    if (!description) return <p>{t('task.noDescription')}</p>;

    // Try to parse JSON if it looks like a JSON object
    if (typeof description === 'string' && (description.trim().startsWith('{') || description.trim().startsWith('['))) {
      try {
        const parsed = JSON.parse(description);
        console.log('Successfully parsed JSON:', parsed);
        // If it's a simple object with keys like Problem, Why, etc., render nicely
        if (typeof parsed === 'object' && parsed !== null) {
          return (
            <div className="task-structured-data">
              {Object.entries(parsed).map(([key, value]) => {
                // Skip internal keys
                if (key.startsWith('_')) return null;

                // Format keys: "whyItMatters" -> "Why It Matters", "cognitive_concerns" -> "Cognitive Concerns"
                const label = key.replace(/([A-Z_])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();

                // Handle different value types
                let displayValue;
                if (Array.isArray(value)) {
                  // Render arrays as bullet points
                  displayValue = (
                    <ul style={{ margin: '0.25rem 0', paddingLeft: '1.5rem' }}>
                      {value.map((item, idx) => (
                        <li key={idx}>{typeof item === 'object' ? JSON.stringify(item) : item}</li>
                      ))}
                    </ul>
                  );
                } else if (typeof value === 'object' && value !== null) {
                  // Render nested objects inline
                  displayValue = JSON.stringify(value);
                } else {
                  displayValue = value;
                }

                return (
                  <div key={key} className="structured-field">
                    <strong>{label}:</strong> {displayValue}
                  </div>
                );
              })}
            </div>
          );
        }
      } catch (e) {
        // Fallback to text rendering if parse fails
      }
    }

    // Default text rendering
    return <p>{description}</p>;
  };

  // Delete alert from backend and update state
  const handleDeleteAlert = async (alertId) => {
    // Find the alert to check severity
    const alertToDelete = alerts.find(a => a.id === alertId);

    // Require confirmation for urgent/high alerts
    if (alertToDelete && (alertToDelete.severity === 'urgent' || alertToDelete.severity === 'high')) {
      const confirmed = window.confirm(t('dashboard.confirmDeleteUrgent'));
      if (!confirmed) return;
    }

    try {
      await api.deleteAlert(alertId);
      // Update local state
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      setDismissedAlerts(prev => prev.filter(id => id !== alertId));
    } catch (error) {
      console.error('Error deleting alert:', error);
      // Even if backend fails, dismiss locally
      setDismissedAlerts(prev => [...prev, alertId]);
    }
  };

  const handleDeleteTask = async (taskId) => {
    const confirmed = window.confirm(t('dashboard.deleteTaskConfirm'));
    if (!confirmed) return;

    try {
      await api.deleteTask(taskId);
      // Update local state
      setTasks(prev => prev.filter(t => (t.task_id || t.id || t.SK) !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
      alert(t('dashboard.deleteTaskFailed'));
    }
  };

  if (loading) {
    return <LoadingSpinner message={t('dashboard.loadingDashboard')} />;
  }

  // Check if there are urgent items (only real alerts, excluding dismissed ones)
  const urgentAlerts = alerts.filter(a =>
    !dismissedAlerts.includes(a.id) &&
    (a.severity === 'urgent' || a.severity === 'high')
  );
  const hasUrgentItems = !priorityDismissed && urgentAlerts.length > 0;

  return (
    <div className="dashboard">
      {/* Persistent Urgent Banner - Only shows for real urgent alerts */}
      {hasUrgentItems && (
        <div className="urgent-banner-persistent">
          <div className="urgent-banner-content">
            <span className="urgent-icon">🚨</span>
            <span className="urgent-text">
              <strong>{urgentAlerts.length} {urgentAlerts.length > 1 ? t('dashboard.urgentItemsNeedAttention', { count: urgentAlerts.length, plural: 's', verb: '' }) : t('dashboard.urgentItemsNeedAttention', { count: urgentAlerts.length, plural: '', verb: 's' })}</strong>
              <span className="urgent-cta">{t('dashboard.scrollDownToTakeAction')}</span>
            </span>
          </div>
          <button
            className="urgent-action-btn"
            onClick={() => {
              if (urgentAlerts.length > 0) {
                setSelectedAlert(urgentAlerts[0]);
                setShowTakeAction(true);
              }
            }}
          >
            {t('dashboard.takeActionNow')}
          </button>
        </div>
      )}

      <div className="dashboard-header">
        <div className="header-content">
          <h1>{t('dashboard.title')}</h1>
          <p className="subtitle">{t('dashboard.subtitle')}</p>
          {lastUpdated && (
            <p className="last-updated">
              {t('dashboard.lastUpdated')} {formatLastUpdated(lastUpdated)}
              {isDataStale(lastUpdated) && (
                <span className="stale-warning"> ⚠️ {t('dashboard.dataOutdated')}</span>
              )}
            </p>
          )}
        </div>
        <Link to="/call" className="btn btn-primary btn-large pulse">
          <span className="icon">📞</span>
          {t('dashboard.startCall')}
        </Link>
      </div>

      {error && (
        <div className="error-banner">
          <span className="icon">⚠️</span>
          {error}
          <button onClick={loadDashboardData} className="btn btn-sm btn-outline">
            {t('dashboard.retry')}
          </button>
        </div>
      )}

      {/* TODAY'S PRIORITY - Only shows when there are real urgent alerts */}
      {alerts.length > 0 && alerts.some(a => a.severity === 'urgent' || a.severity === 'high') && !priorityDismissed && (
        <div className="todays-priority-section">
          {alerts.filter(a => a.severity === 'urgent' || a.severity === 'high').slice(0, 1).map(alert => (
            <div key={alert.id} className="priority-card priority-urgent">
              <div className="priority-header">
                <span className="priority-badge">⚠️ {t('dashboard.todaysPriority')}</span>
                <span className="priority-time">
                  {alert.timestamp ? formatCareTime(alert.timestamp).relative : t('dashboard.recently')}
                </span>
              </div>
              <div className="priority-content">
                <h3 className="priority-title">{alert.title || alert.message || 'Urgent alert requires attention'}</h3>
                <p className="priority-description">
                  {alert.description || alert.message || 'AI analysis detected a concern that needs your attention.'}
                </p>
              </div>
              <div className="priority-action">
                <div className="recommended-action">
                  <span className="action-icon">👉</span>
                  <span className="action-text">{t('dashboard.recommendedAction')}</span>
                </div>
                <div className="priority-buttons">
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setSelectedAlert(alert);
                      setShowTakeAction(true);
                    }}
                  >
                    🎯 {t('dashboard.takeAction')}
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      setSelectedAlert(alert);
                      setShowExplainability(true);
                    }}
                  >
                    {t('dashboard.whyThisAlert')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div
          className="stat-card stat-primary clickable"
          onClick={() => navigate('/tasks?filter=active')}
          title="Click to view active tasks"
        >
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-value">{stats.activeTasks}</div>
            <div className="stat-label">{t('dashboard.activeTasks')}</div>
          </div>
        </div>

        <div className="stat-card stat-success">
          <div className="stat-icon">✓</div>
          <div className="stat-content">
            <div className="stat-value">{stats.completedToday}</div>
            <div className="stat-label">{t('dashboard.completedToday')}</div>
          </div>
        </div>

        <div
          className="stat-card stat-warning clickable"
          onClick={() => navigate('/tasks?filter=pending')}
          title="Click to view pending tasks"
        >
          <div className="stat-icon">⏰</div>
          <div className="stat-content">
            <div className="stat-value">{stats.pendingTasks}</div>
            <div className="stat-label">{t('dashboard.pendingTasks')}</div>
          </div>
        </div>

        <div className="stat-card stat-danger clickable">
          <div className="stat-icon">🚨</div>
          <div className="stat-content">
            <div className="stat-value">{stats.urgentAlerts}</div>
            <div className="stat-label">{t('dashboard.urgentAlerts')}</div>
          </div>
        </div>
      </div>

      <div className="risk-scores-section">
        <h2 className="section-title">
          <span className="section-icon">🤖</span>
          {t('dashboard.aiRiskAssessment')}
        </h2>
        <div className="risk-scores-grid">
          <RiskScoreCard
            title={t('dashboard.cognitiveRisk')}
            score={62}
            trend={8}
            level="high"
            description="Elevated risk based on recent conversation patterns"
            factors={[
              'Memory recall delays increased 42%',
              'Medication name confusion (2 instances)',
              'Date/time orientation deviation',
            ]}
            lastUpdated="5 minutes ago"
            trendWindow="14 days"
            confidence="high"
            hasAction={true}
            baselineRange={{ min: 40, max: 55 }}
            onStartCall={() => navigate('/call')}
            onVerifyMeds={() => {
              setSelectedAlert({
                id: 'cognitive-risk-1',
                type: 'cognitiveRisk',
                severity: 'high',
                title: 'Verify Medication Schedule',
                message: 'Check current medication list and today\'s schedule',
                timestamp: new Date().toISOString(),
              });
              setShowTakeAction(true);
            }}
            onTakeAction={() => {
              setSelectedAlert({
                id: 'cognitive-risk-1',
                type: 'cognitiveRisk',
                severity: 'high',
                title: 'Cognitive Risk Assessment',
                message: 'Elevated cognitive risk detected based on conversation analysis',
                timestamp: new Date(Date.now() - 300000).toISOString(),
              });
              setShowTakeAction(true);
            }}
            onExplain={() => {
              setSelectedAlert({
                id: 'cognitive-risk-1',
                type: 'cognitiveRisk',
                severity: 'high',
                title: 'Cognitive Risk Assessment',
                message: 'Elevated cognitive risk detected based on conversation analysis',
                timestamp: new Date(Date.now() - 300000).toISOString(),
              });
              setShowExplainability(true);
            }}
          />
          <RiskScoreCard
            title={t('dashboard.medicationAdherence')}
            score={48}
            trend={-12}
            level="moderate"
            description="Improving adherence after intervention"
            factors={[
              'Missed doses decreased from 4 to 2/week',
              'Schedule verification implemented',
              'Family check-ins increased',
            ]}
            lastUpdated="1 hour ago"
            trendWindow="7 days"
            confidence="medium"
            hasAction={true}
            baselineRange={{ min: 35, max: 50 }}
            onStartCall={() => navigate('/call')}
            onVerifyMeds={() => {
              setSelectedAlert({
                id: 'medication-adherence-1',
                type: 'medicationConcern',
                severity: 'moderate',
                title: 'Verify Medication Schedule',
                message: 'Confirm medication doses and timing',
                timestamp: new Date().toISOString(),
              });
              setShowTakeAction(true);
            }}
            onExplain={() => {
              setSelectedAlert({
                id: 'medication-adherence-1',
                type: 'medicationConcern',
                severity: 'moderate',
                title: 'Medication Adherence Assessment',
                message: 'Medication adherence improving after recent interventions',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
              });
              setShowExplainability(true);
            }}
          />
          <RiskScoreCard
            title={t('dashboard.emotionalWellbeing')}
            score={28}
            trend={-5}
            level="low"
            description="Stable emotional state with positive engagement"
            factors={[
              'Positive sentiment in 80% of conversations',
              'Social interaction maintained',
              'Sleep patterns regular',
            ]}
            lastUpdated="2 hours ago"
            trendWindow="30 days"
            confidence="high"
            hasAction={false}
            onExplain={() => {
              setSelectedAlert({
                id: 'emotional-wellbeing-1',
                type: 'emotionalDistress',
                severity: 'low',
                title: 'Emotional Wellbeing Assessment',
                message: 'Stable emotional patterns detected in recent analysis',
                timestamp: new Date(Date.now() - 7200000).toISOString(),
              });
              setShowExplainability(true);
            }}
          />
        </div>
      </div>

      {/* First-time onboarding checklist */}
      {!hasData && !loading && (
        <div className="onboarding-card">
          <h2>🎯 {t('dashboard.onboarding.title')}</h2>
          <p>{t('dashboard.onboarding.subtitle')}</p>
          <div className="checklist">
            <div key="checklist-task" className="checklist-item">
              <span className="checkbox">☐</span>
              <div className="checklist-content">
                <strong>{t('dashboard.onboarding.createTask')}</strong>
                <p>{t('dashboard.onboarding.createTaskDesc')}</p>
                <Link to="/tasks" className="btn btn-sm btn-primary">{t('dashboard.onboarding.createTaskButton')}</Link>
              </div>
            </div>
            <div key="checklist-call" className="checklist-item">
              <span className="checkbox">☐</span>
              <div className="checklist-content">
                <strong>{t('dashboard.onboarding.startConversation')}</strong>
                <p>{t('dashboard.onboarding.startConversationDesc')}</p>
                <Link to="/call" className="btn btn-sm btn-primary">{t('dashboard.onboarding.startConversationButton')}</Link>
              </div>
            </div>
            <div key="checklist-profile" className="checklist-item">
              <span className="checkbox">☐</span>
              <div className="checklist-content">
                <strong>{t('dashboard.onboarding.setupProfile')}</strong>
                <p>{t('dashboard.onboarding.setupProfileDesc')}</p>
                <Link to="/profile" className="btn btn-sm btn-outline">{t('dashboard.onboarding.setupProfileButton')}</Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Recent Alerts */}
        <div className="dashboard-card alerts-card">
          <div className="card-header">
            <h2>
              <span className="icon">🔔</span>
              {t('dashboard.recentAlerts')}
            </h2>
            <Link to="/alerts" className="view-all-link">
              {t('common.viewAll')} →
            </Link>
          </div>

          <div className="alerts-list">
            {alerts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✓</div>
                <p>{t('dashboard.noAlerts')}</p>
                <Link to="/call" className="btn btn-sm btn-primary" style={{ marginTop: '1rem' }}>
                  {t('dashboard.emptyStates.noAlertsCall')}
                </Link>
              </div>
            ) : (
              alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id || alert.SK}
                  onClick={() => {
                    setSelectedAlert(alert);
                    setShowExplainability(true);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <AlertBanner
                    alert={alert}
                    compact={true}
                    onDismiss={(alertId) => {
                      // Stop propagation is handled in AlertBanner
                      handleDeleteAlert(alertId);
                    }}
                  />
                  <AIAttributionBadge type="ai-detected" variant="default" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Tasks */}
        <div className="dashboard-card tasks-card">
          <div className="card-header">
            <h2>
              <span className="icon">📝</span>
              {t('dashboard.yourTasks')}
            </h2>
            <Link to="/tasks" className="view-all-link">
              {t('common.viewAll')} →
            </Link>
          </div>

          <div className="tasks-list">
            {tasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎉</div>
                <p>{t('dashboard.noTasks')}</p>
                <Link to="/tasks" className="btn btn-sm btn-primary" style={{ marginTop: '1rem' }}>
                  {t('dashboard.emptyStates.noTasksCreate')}
                </Link>
              </div>
            ) : (
              tasks.map((task) => (
                <div key={task.task_id || task.id || task.SK} className={`task-item ${getPriorityClass(task.priority)}`}>
                  <div className="task-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0 }}>{task.title}</h3>
                      <AIAttributionBadge
                        type={task.source || 'ai-recommended'}
                        variant="default"
                      />
                    </div>
                    {renderDescription(task.description)}
                    <div className="task-meta">
                      <span className="task-assignee">
                        👤 {task.assigned_to_name || t('task.unassigned')}
                      </span>
                      {task.created_at && (
                        <span className="task-time">{formatTime(task.created_at)}</span>
                      )}
                    </div>
                  </div>
                  <div className="task-actions">
                    <span className={`priority-badge ${getPriorityClass(task.priority)}`}>
                      {task.priority || 'medium'}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedAlert(task);
                        setShowTakeAction(true);
                      }}
                      className="btn btn-sm btn-outline"
                    >
                      {t('task.view')}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTask(task.task_id || task.id || task.SK);
                      }}
                      className="btn btn-sm btn-ghost"
                      style={{ color: 'var(--color-error, #c41e3a)' }}
                      title="Delete this care action"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>{t('dashboard.quickActions')}</h2>
        <div className="actions-grid">
          <Link to="/call" className="action-card">
            <span className="action-icon">📞</span>
            <h3>{t('dashboard.actions.startCall')}</h3>
            <p>{t('dashboard.actions.callDescription')}</p>
          </Link>

          <Link to="/tasks" className="action-card">
            <span className="action-icon">📋</span>
            <h3>{t('dashboard.actions.manageTasks')}</h3>
            <p>{t('dashboard.actions.tasksDescription')}</p>
          </Link>

          <Link to="/analytics" className="action-card">
            <span className="action-icon">📊</span>
            <h3>{t('dashboard.actions.viewAnalytics')}</h3>
            <p>{t('dashboard.actions.analyticsDescription')}</p>
          </Link>

          <Link to="/profile" className="action-card">
            <span className="action-icon">⚙️</span>
            <h3>{t('dashboard.actions.settings')}</h3>
            <p>{t('dashboard.actions.settingsDescription')}</p>
          </Link>
        </div>
      </div>

      {/* Alert Explainability Drawer - RAG-Powered */}
      {
        showExplainability && selectedAlert && (
          <AlertExplainabilityDrawer
            alert={{
              alert_type: selectedAlert.type || 'memoryIssue',
              urgency: selectedAlert.severity || 'high',
              cognitive_concerns: [
                'Temporal disorientation detected during conversation',
                'Medication name confusion (Metformin)'
              ],
              emotional_concerns: [],
              health_mentions: ['Dizziness reported'],
              medication_concerns: [
                'Possible missed Metformin dose',
                'Confusion about medication schedule'
              ],
              summary: selectedAlert.message || 'Memory confusion and medication adherence concerns detected',
              transcript_preview: 'I feel a bit dizzy... I think I forgot my Metformin this morning. What day is it again?',
              timestamp: selectedAlert.timestamp || new Date().toISOString(),
            }}
            onClose={() => {
              setShowExplainability(false);
              setSelectedAlert(null);
            }}
          />
        )
      }

      {/* Take Action Workflow - 3-step guided process */}
      {
        showTakeAction && selectedAlert && (
          <TakeActionWorkflow
            alert={selectedAlert}
            onClose={() => {
              setShowTakeAction(false);
              setSelectedAlert(null);
            }}
            onComplete={async (outcome) => {
              console.log('Action completed:', outcome);

              // 1. Optimistic UI update - remove alert immediately
              const alertToRemove = selectedAlert;
              setAlerts(prev => prev.filter(a => a.id !== alertToRemove.id));
              setStats(prev => ({
                ...prev,
                urgentAlerts: Math.max(0, prev.urgentAlerts - 1),
                completedToday: prev.completedToday + 1
              }));

              // 2. Show success toast
              showToast({
                type: 'success',
                title: 'Action Completed',
                message: `${outcome.actionType || 'Alert'} resolved successfully`,
                duration: 3000
              });

              // 3. Backend sync
              try {
                await handleDeleteAlert(alertToRemove.id);
              } catch (error) {
                console.error('Failed to delete alert:', error);
                // Rollback on failure
                loadDashboardData();
                showToast({
                  type: 'error',
                  title: 'Sync Failed',
                  message: 'Action saved but sync failed. Will retry.',
                  duration: 5000
                });
              }

              // Dismiss the priority banner
              setPriorityDismissed(true);

              // Close the workflow
              setShowTakeAction(false);
              setSelectedAlert(null);

              // 4. Smart next action - check for remaining urgent alerts
              const remainingUrgent = alerts.filter(a =>
                a.id !== alertToRemove.id &&
                (a.severity === 'urgent' || a.severity === 'high')
              );

              if (remainingUrgent.length > 0) {
                // Auto-focus next urgent alert after a brief delay
                setTimeout(() => {
                  setSelectedAlert(remainingUrgent[0]);
                  setShowTakeAction(true);
                }, 500);
              } else {
                // All caught up! Show celebration
                showToast({
                  type: 'success',
                  title: '🎉 All Caught Up!',
                  message: 'No urgent alerts remaining. Great work today!',
                  duration: 4000
                });
              }
            }}
          />
        )
      }
    </div >
  );
}

export default Dashboard;
