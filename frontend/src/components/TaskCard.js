import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatCareTime } from '../utils/timeFormat';
import './TaskCard.css';

function TaskCard({ task, onAccept, onComplete, onViewDetails }) {
  const { t } = useTranslation();
  
  // Get consistent task ID
  const taskId = task.task_id || task.id;
  
  // Handle both camelCase and snake_case from backend
  const createdAt = task.createdAt || task.created_at;
  // Prefer assigned_to_name (username) over assigned_to (UUID)
  const assignedTo = task.assigned_to_name || task.assignedTo || task.assigned_to;
  const elderName = task.elderName || task.elder_name;
  
  // Format time with caregiver-friendly display (no negative times)
  const timeInfo = formatCareTime(createdAt);

  const getPriorityClass = (priority) => {
    const classes = {
      urgent: 'priority-urgent',
      high: 'priority-high',
      medium: 'priority-medium',
      low: 'priority-low',
    };
    return classes[priority] || 'priority-medium';
  };

  const getStatusClass = (status) => {
    const classes = {
      pending: 'status-pending',
      inProgress: 'status-in-progress',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
    };
    return classes[status] || 'status-pending';
  };

  const getAlertIcon = (alertType) => {
    const icons = {
      healthConcern: '🏥',
      memoryIssue: '🧠',
      emotionalDistress: '😟',
      medicationConcern: '💊',
      urgentHelp: '🚨',
      behavioralChange: '⚠️',
    };
    return icons[alertType] || '📋';
  };

  // Get human-readable priority with fallback
  const getPriorityLabel = (priority) => {
    const labels = {
      urgent: 'URGENT',
      high: 'HIGH',
      medium: 'MEDIUM',
      low: 'LOW',
    };
    return labels[priority] || priority?.toUpperCase() || 'MEDIUM';
  };

  // Get human-readable status with fallback
  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      inProgress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return labels[status] || status || 'Pending';
  };

  return (
    <div className={`task-card ${getPriorityClass(task.priority)}`}>
      <div className="task-header">
        <div className="task-title-row">
          <span className="task-icon">{getAlertIcon(task.alertType)}</span>
          <h3>{task.title}</h3>
        </div>
        <span className={`task-priority ${getPriorityClass(task.priority)}`}>
          {getPriorityLabel(task.priority)}
        </span>
      </div>

      <p className="task-description">{task.description}</p>

      <div className="task-meta">
        <div className="task-meta-item">
          <span className="meta-label">{t('tasks.assignedTo')}:</span>
          <span className="meta-value">{assignedTo || t('tasks.status.pending')}</span>
        </div>
        <div className="task-meta-item">
          <span className="meta-label">{t('tasks.createdAt')}:</span>
          <span className="meta-value" title={timeInfo.tooltip}>
            {timeInfo.relative}
          </span>
        </div>
      </div>

      <div className="task-status-bar">
        <span className={`status-badge ${getStatusClass(task.status)}`}>
          {getStatusLabel(task.status)}
        </span>
      </div>

      <div className="task-actions">
        {task.status === 'pending' && (
          <button 
            className="btn btn-primary" 
            onClick={() => {
              console.log('Accept task clicked:', taskId);
              onAccept(taskId);
            }}
          >
            {t('tasks.accept')}
          </button>
        )}
        {task.status === 'inProgress' && (
          <button 
            className="btn btn-success" 
            onClick={() => {
              console.log('Complete task clicked:', taskId);
              onComplete(taskId);
            }}
          >
            {t('tasks.complete')}
          </button>
        )}
        {onViewDetails && (
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              console.log('View details clicked:', taskId);
              onViewDetails(taskId);
            }}
          >
            {t('tasks.details')}
          </button>
        )}
      </div>
    </div>
  );
}

export default TaskCard;

