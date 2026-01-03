import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import TaskCard from '../components/TaskCard';
import { api } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import './Tasks.css';

function Tasks() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allTasks, setAllTasks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState(searchParams.get('filter') || 'all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    elderName: '',
  });
  const [creating, setCreating] = useState(false);
  const [counts, setCounts] = useState({
    all: 0,
    assignedToMe: 0,
    active: 0,
    completed: 0,
  });
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    filterTasks();
  }, [filter, allTasks]);

  async function loadTasks() {
    setLoading(true);
    setError(null);
    try {
      const tasksData = await api.getTasks({});
      const tasksList = Array.isArray(tasksData) ? tasksData : [];
      setAllTasks(tasksList);
      
      // Calculate counts
      setCounts({
        all: tasksList.length,
        assignedToMe: tasksList.filter(t => t.assigned_to).length,
        active: tasksList.filter(t => t.status === 'pending' || t.status === 'inProgress').length,
        completed: tasksList.filter(t => t.status === 'completed').length,
      });
    } catch (error) {
      console.error('Error loading tasks:', error);
      setError('Failed to load tasks. Please try again.');
      setAllTasks([]);
    } finally {
      setLoading(false);
    }
  }

  function filterTasks() {
    let filtered = [...allTasks];

    if (filter === 'assignedToMe') {
      filtered = filtered.filter(t => t.assigned_to);
    } else if (filter === 'active') {
      filtered = filtered.filter(t => t.status === 'pending' || t.status === 'inProgress');
    } else if (filter === 'completed') {
      filtered = filtered.filter(t => t.status === 'completed');
    }
    // 'all' shows everything

    setTasks(filtered);
  }

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setSearchParams({ filter: newFilter });
  };

  const handleAcceptTask = async (taskId) => {
    if (!taskId) {
      console.error('Cannot accept task: taskId is undefined');
      alert('Error: Task ID is missing. Please refresh the page and try again.');
      return;
    }
    
    try {
      console.log('Accepting task:', taskId);
      const acceptResult = await api.acceptTask(taskId);
      console.log('Task accepted successfully', acceptResult);
      await loadTasks();
    } catch (error) {
      console.error('Error accepting task:', error);
      alert(`Failed to accept task. Error: ${error.message || 'Unknown error'}`);
    }
  };

  const handleCompleteTask = async (taskId, notes = '') => {
    try {
      await api.completeTask(taskId, notes);
      loadTasks();
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Failed to complete task. Please try again.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }
    try {
      await api.deleteTask(taskId);
      setShowDetailsModal(false);
      loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  const handleViewDetails = (taskId) => {
    const task = allTasks.find(t => (t.task_id || t.id) === taskId);
    if (task) {
      setSelectedTask(task);
      setShowDetailsModal(true);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    if (!newTask.title.trim()) {
      alert('Please enter a task title');
      return;
    }

    setCreating(true);
    try {
      await api.createTask(newTask);
      setShowCreateModal(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        elderName: '',
      });
      loadTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const renderEmptyState = () => {
    const hasAnyTasks = allTasks.length > 0;
    
    if (!hasAnyTasks) {
      // True empty - no tasks in system
      return (
        <div className="empty-state empty-state-true">
          <div className="empty-icon">📋</div>
          <h3>No tasks yet</h3>
          <p>Create your first care task to start tracking progress.</p>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            Create Your First Task
          </button>
        </div>
      );
    } else {
      // Filtered empty - tasks exist but none match filter
      return (
        <div className="empty-state empty-state-filtered">
          <div className="empty-icon">🔍</div>
          <h3>No tasks in this view</h3>
          <p>Try "All Tasks" or select a different filter.</p>
          <button 
            className="btn btn-outline"
            onClick={() => handleFilterChange('all')}
          >
            View All Tasks ({counts.all})
          </button>
        </div>
      );
    }
  };

  return (
    <div className="tasks-page">
      <div className="tasks-header">
        <div>
          <h1>{t('tasks.title')}</h1>
          <p className="subtitle">Manage and coordinate care tasks</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          ➕ {t('tasks.newTask')}
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <span className="icon">⚠️</span>
          {error}
          <button onClick={loadTasks} className="btn btn-sm btn-outline">
            Retry
          </button>
        </div>
      )}

      <div className="tasks-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => handleFilterChange('all')}
        >
          All Tasks
          {counts.all > 0 && <span className="count-badge">{counts.all}</span>}
        </button>
        <button 
          className={`filter-btn ${filter === 'assignedToMe' ? 'active' : ''}`}
          onClick={() => handleFilterChange('assignedToMe')}
        >
          Assigned to Me
          {counts.assignedToMe > 0 && <span className="count-badge">{counts.assignedToMe}</span>}
        </button>
        <button 
          className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
          onClick={() => handleFilterChange('active')}
        >
          Active
          {counts.active > 0 && <span className="count-badge">{counts.active}</span>}
        </button>
        <button 
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => handleFilterChange('completed')}
        >
          Completed
          {counts.completed > 0 && <span className="count-badge">{counts.completed}</span>}
        </button>
        
        {filter !== 'all' && (
          <button 
            className="filter-clear"
            onClick={() => handleFilterChange('all')}
            title="Clear filters"
          >
            ✕ Clear
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner message="Loading care actions..." />
      ) : tasks.length > 0 ? (
        <div className="tasks-grid">
          {tasks.map(task => (
            <TaskCard
              key={task.task_id || task.id}
              task={task}
              onAccept={() => handleAcceptTask(task.task_id || task.id)}
              onComplete={() => {
                const notes = prompt('Add completion notes (optional):');
                if (notes !== null) {
                  handleCompleteTask(task.task_id || task.id, notes);
                }
              }}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      ) : (
        renderEmptyState()
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Care Action</h2>
              <button 
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="task-form">
              <div className="form-group">
                <label>Task Title *</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="e.g., Check medication schedule"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Add details about this task..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Elder's Name</label>
                <input
                  type="text"
                  value={newTask.elderName}
                  onChange={(e) => setNewTask({ ...newTask, elderName: e.target.value })}
                  placeholder="Who is this task for?"
                />
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="modal-actions">
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {showDetailsModal && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content modal-details" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Task Details</h2>
              <button 
                className="modal-close"
                onClick={() => setShowDetailsModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h3>{selectedTask.title}</h3>
                <p className="task-description-full">{selectedTask.description}</p>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Elder:</span>
                  <span className="detail-value">{selectedTask.elderName || selectedTask.elder_name || 'Not specified'}</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Priority:</span>
                  <span className={`detail-value priority-${selectedTask.priority}`}>
                    {selectedTask.priority?.toUpperCase()}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Status:</span>
                  <span className={`detail-value status-${selectedTask.status}`}>
                    {selectedTask.status}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Assigned To:</span>
                  <span className="detail-value">
                    {selectedTask.assigned_to_name || selectedTask.assignedTo || selectedTask.assigned_to || 'Unassigned'}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Created:</span>
                  <span className="detail-value">
                    {selectedTask.createdAt || selectedTask.created_at 
                      ? new Date(selectedTask.createdAt || selectedTask.created_at).toLocaleString()
                      : 'Just now'}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Task ID:</span>
                  <span className="detail-value detail-value-mono">
                    {selectedTask.task_id || selectedTask.id}
                  </span>
                </div>
              </div>

              {selectedTask.notes && (
                <div className="detail-section">
                  <h4>Completion Notes:</h4>
                  <p>{selectedTask.notes}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-danger"
                onClick={() => handleDeleteTask(selectedTask.task_id || selectedTask.id)}
              >
                🗑️ Delete
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
              {selectedTask.status === 'pending' && (
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    handleAcceptTask(selectedTask.task_id || selectedTask.id);
                    setShowDetailsModal(false);
                  }}
                >
                  Accept Task
                </button>
              )}
              {selectedTask.status === 'inProgress' && (
                <button 
                  className="btn btn-success"
                  onClick={() => {
                    const notes = prompt('Add completion notes (optional):');
                    if (notes !== null) {
                      handleCompleteTask(selectedTask.task_id || selectedTask.id, notes);
                      setShowDetailsModal(false);
                    }
                  }}
                >
                  Mark Complete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tasks;
