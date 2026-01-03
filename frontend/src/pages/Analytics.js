import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import './Analytics.css';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

function Analytics() {
  const { t } = useTranslation();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('week');
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  async function loadAnalytics() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAnalytics({ timeRange });
      setAnalytics(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading analytics:', error);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const getTimeRangeDescription = () => {
    const descriptions = {
      week: 'Last 7 days (rolling)',
      month: 'Last 30 days (rolling)',
      year: 'Last 365 days (rolling)',
    };
    return descriptions[timeRange] || timeRange;
  };

  if (loading) {
    return <LoadingSpinner message="Loading analytics..." />;
  }

  const hasData = analytics && (analytics.totalTasks > 0 || analytics.tasksByMember?.length > 0);

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div>
          <h1>{t('analytics.title')}</h1>
          <p className="subtitle">Track care metrics and trends</p>
          {lastUpdated && (
            <p className="last-updated">
              Last updated: {lastUpdated.toLocaleTimeString()} • {getTimeRangeDescription()}
            </p>
          )}
        </div>
        <div className="time-range-selector">
          <button 
            className={timeRange === 'week' ? 'active' : ''}
            onClick={() => setTimeRange('week')}
            title="Last 7 days (rolling)"
          >
            Week
          </button>
          <button 
            className={timeRange === 'month' ? 'active' : ''}
            onClick={() => setTimeRange('month')}
            title="Last 30 days (rolling)"
          >
            Month
          </button>
          <button 
            className={timeRange === 'year' ? 'active' : ''}
            onClick={() => setTimeRange('year')}
            title="Last 365 days (rolling)"
          >
            Year
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span className="icon">⚠️</span>
          {error}
          <button onClick={loadAnalytics} className="btn btn-sm btn-outline">
            Retry
          </button>
        </div>
      )}

      {/* Care Trajectory Summary - Outcome-focused executive view */}
      <div className="care-trajectory-section">
        <h2 className="trajectory-title">
          <span className="section-icon">📊</span>
          Care Trajectory Summary
          <span className="trajectory-period">({getTimeRangeDescription()})</span>
        </h2>
        <div className="trajectory-grid">
          <div className="trajectory-card trajectory-warning">
            <div className="trajectory-header">
              <span className="trajectory-label">Cognitive Risk</span>
              <span className="trajectory-trend trend-up">↑ Rising</span>
            </div>
            <div className="trajectory-status">
              <span className="status-indicator warning"></span>
              <span className="status-text">Requires attention</span>
            </div>
            <p className="trajectory-insight">Memory patterns showing 8% increase in confusion markers</p>
          </div>
          
          <div className="trajectory-card trajectory-success">
            <div className="trajectory-header">
              <span className="trajectory-label">Medication Adherence</span>
              <span className="trajectory-trend trend-down">↓ Improving</span>
            </div>
            <div className="trajectory-status">
              <span className="status-indicator success"></span>
              <span className="status-text">On track</span>
            </div>
            <p className="trajectory-insight">Missed doses reduced by 50% after intervention</p>
          </div>
          
          <div className="trajectory-card trajectory-stable">
            <div className="trajectory-header">
              <span className="trajectory-label">Overall Stability</span>
              <span className="trajectory-trend trend-stable">→ Stable</span>
            </div>
            <div className="trajectory-status">
              <span className="status-indicator stable"></span>
              <span className="status-text">Holding steady</span>
            </div>
            <p className="trajectory-insight">No significant changes in overall care patterns</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="analytics-summary">
        <div className="summary-card" title="Percentage of tasks completed vs. total created">
          <div className="summary-icon">✅</div>
          <div className="summary-content">
            <h3>{analytics?.taskCompletion || 0}%</h3>
            <p>{t('analytics.taskCompletion')}</p>
          </div>
        </div>

        <div className="summary-card" title="Average time to accept a task after creation">
          <div className="summary-icon">⏱️</div>
          <div className="summary-content">
            <h3>{analytics?.avgResponseTime || 0}h</h3>
            <p>{t('analytics.responseTime')}</p>
          </div>
        </div>

        <div className="summary-card" title="Family members with active or completed tasks">
          <div className="summary-icon">👥</div>
          <div className="summary-content">
            <h3>{analytics?.activeMembers || 0}</h3>
            <p>Active Family Members</p>
          </div>
        </div>

        <div className="summary-card" title="Total tasks created in this period">
          <div className="summary-icon">🎯</div>
          <div className="summary-content">
            <h3>{analytics?.totalTasks || 0}</h3>
            <p>Total Tasks</p>
          </div>
        </div>
      </div>

      {!hasData && !loading ? (
        <div className="analytics-empty-state">
          <div className="empty-icon">📊</div>
          <h2>No analytics data yet</h2>
          <p>Start creating tasks and recording calls to see insights here.</p>
          <div className="empty-actions">
            <Link to="/tasks" className="btn btn-primary">
              Create Tasks
            </Link>
            <Link to="/call" className="btn btn-outline">
              Start a Call
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Charts Grid */}
          <div className="analytics-grid">
            {/* Task Distribution */}
            <div className="analytics-card">
              <h2>
                📊 {t('analytics.distribution')}
                <span className="info-icon" title="Shows how tasks are distributed across family members">ℹ️</span>
              </h2>
              {analytics?.tasksByMember && analytics.tasksByMember.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.tasksByMember}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.tasksByMember.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">
                  <p>No task distribution data available.</p>
                  <Link to="/tasks" className="link">Create tasks to see distribution</Link>
                </div>
              )}
            </div>

            {/* Behavioral Trends */}
            <div className="analytics-card">
              <h2>
                📈 {t('analytics.trends')}
                <span className="info-icon" title="Daily tasks and alerts over time">ℹ️</span>
              </h2>
              {analytics?.trendsData && analytics.trendsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.trendsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="tasks" stroke="#0ea5e9" strokeWidth={2} name="Tasks" />
                    <Line type="monotone" dataKey="alerts" stroke="#ef4444" strokeWidth={2} name="Alerts" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">
                  <p>No trend data available yet.</p>
                  <Link to="/call" className="link">Record calls to generate trends</Link>
                </div>
              )}
            </div>
          </div>

          {/* Intervention Effectiveness */}
          <div className="analytics-card full-width">
            <h2>
              🎯 {t('analytics.effectiveness')}
              <span className="info-icon" title="Shows resolution rates by category">ℹ️</span>
            </h2>
            {analytics?.effectivenessData && analytics.effectivenessData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.effectivenessData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="resolved" fill="#10b981" name="Resolved" />
                  <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
                  <Bar dataKey="escalated" fill="#ef4444" name="Escalated" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">
                <p>No effectiveness data available.</p>
                <Link to="/tasks" className="link">Complete tasks to track effectiveness</Link>
              </div>
            )}
          </div>

          {/* Insights */}
          {analytics?.insights && analytics.insights.length > 0 && (
            <div className="insights-section">
              <h2>💡 Key Insights</h2>
              <div className="insights-grid">
                {analytics.insights.map((insight, index) => (
                  <div key={index} className={`insight-card insight-${insight.type}`}>
                    <span className="insight-icon">
                      {insight.type === 'positive' ? '✓' : insight.type === 'warning' ? '⚠️' : 'ℹ️'}
                    </span>
                    <p>{insight.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Analytics;
