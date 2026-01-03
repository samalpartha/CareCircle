import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import './TakeActionWorkflow.css';

/**
 * Take Action Workflow - 3-step guided checklist
 * Reduces caregiver cognitive load and increases closure rate on alerts
 */
function TakeActionWorkflow({ alert, onClose, onComplete }) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState({});
  const [notes, setNotes] = useState({});
  const [assignTo, setAssignTo] = useState('');
  const [escalateHours, setEscalateHours] = useState(4);

  // Define workflow steps based on alert type
  const getWorkflowSteps = () => {
    const baseSteps = [
      {
        id: 'verify',
        title: 'Verify Current Status',
        description: 'Confirm the current situation with your loved one',
        actions: [
          { id: 'call', label: 'Call Now', icon: '📞', action: () => navigate('/call') },
          { id: 'confirmed', label: 'Already Verified', icon: '✓' },
        ],
        checkItems: [
          'Spoke with elder or caregiver on-site',
          'Confirmed current mental state',
          'Noted any changes since alert',
        ],
      },
      {
        id: 'action',
        title: 'Take Corrective Action',
        description: 'Complete the recommended intervention',
        checkItems: getMedicationChecklist(),
      },
      {
        id: 'log',
        title: 'Log Outcome & Follow-up',
        description: 'Record what happened and set next steps',
        options: [
          { id: 'resolved', label: 'Resolved - No follow-up needed', icon: '✅' },
          { id: 'monitoring', label: 'Monitoring - Check again tomorrow', icon: '👁️' },
          { id: 'escalate', label: 'Escalate - Needs professional help', icon: '🚨' },
        ],
      },
    ];
    return baseSteps;
  };

  const getMedicationChecklist = () => {
    if (alert?.type === 'medicationConcern' || alert?.type === 'cognitiveRisk') {
      return [
        'Confirmed medication list (names + dosages)',
        'Verified today\'s schedule (morning/noon/night)',
        'Checked pill organizer or medication log',
        'Observed elder taking medication (if possible)',
      ];
    }
    return [
      'Completed recommended action',
      'Verified situation is safe',
      'No immediate concerns remain',
    ];
  };

  const steps = getWorkflowSteps();
  const currentStepData = steps[currentStep];

  const handleCheckItem = (itemIndex) => {
    const stepId = currentStepData.id;
    const currentItems = completedSteps[stepId] || [];
    if (currentItems.includes(itemIndex)) {
      setCompletedSteps({
        ...completedSteps,
        [stepId]: currentItems.filter(i => i !== itemIndex),
      });
    } else {
      setCompletedSteps({
        ...completedSteps,
        [stepId]: [...currentItems, itemIndex],
      });
    }
  };

  const isStepComplete = (stepIndex) => {
    const step = steps[stepIndex];
    const completed = completedSteps[step.id] || [];
    if (step.checkItems) {
      return completed.length >= step.checkItems.length;
    }
    return completed.length > 0;
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    // Create a task/action record
    const outcome = {
      alertId: alert?.id,
      actionType: alert?.type || 'general',
      description: alert?.title || 'Action taken',
      completedSteps,
      notes,
      assignTo,
      escalateHours: escalateHours > 0 ? escalateHours : null,
      outcome: 'resolved', // Default for now
      completedAt: new Date().toISOString(),
    };

    console.log('Completing workflow:', outcome);

    try {
      // Save to backend
      await api.createAction(outcome);

      if (onComplete) onComplete(outcome);
      onClose();
    } catch (error) {
      console.error('Error saving action:', error);
      alert('Failed to save action history. Please try again.');
    }
  };

  const handleSelectOutcome = (optionId) => {
    setCompletedSteps({
      ...completedSteps,
      [currentStepData.id]: [optionId],
    });
  };

  const progressPercent = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="workflow-overlay" onClick={onClose}>
      <div className="workflow-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="workflow-header">
          <div className="workflow-title">
            <span className="workflow-icon">🎯</span>
            <h2>Take Action</h2>
          </div>
          <button className="workflow-close" onClick={onClose}>✕</button>
        </div>

        {/* Progress Bar */}
        <div className="workflow-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="progress-steps">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`progress-step ${index === currentStep ? 'active' : ''} ${index < currentStep || isStepComplete(index) ? 'completed' : ''}`}
              >
                <span className="step-number">
                  {index < currentStep || isStepComplete(index) ? '✓' : index + 1}
                </span>
                <span className="step-label">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alert Context */}
        {alert && (
          <div className="workflow-context">
            <span className="context-icon">⚠️</span>
            <div className="context-text">
              <strong>{alert.title || 'Memory confusion detected'}</strong>
              <p>{alert.message || 'AI analysis found concerning patterns in recent conversations'}</p>
            </div>
          </div>
        )}

        {/* Current Step Content */}
        <div className="workflow-step">
          <h3 className="step-title">
            Step {currentStep + 1}: {currentStepData.title}
          </h3>
          <p className="step-description">{currentStepData.description}</p>

          {/* Quick Actions (Step 1) */}
          {currentStepData.actions && (
            <div className="step-actions">
              {currentStepData.actions.map(action => (
                <button
                  key={action.id}
                  className="action-btn"
                  onClick={action.action || (() => handleCheckItem(action.id))}
                >
                  <span className="action-icon">{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Checklist Items */}
          {currentStepData.checkItems && (
            <div className="step-checklist">
              {currentStepData.checkItems.map((item, index) => (
                <label key={index} className="checklist-item">
                  <input
                    type="checkbox"
                    checked={(completedSteps[currentStepData.id] || []).includes(index)}
                    onChange={() => handleCheckItem(index)}
                  />
                  <span className="checkmark"></span>
                  <span className="item-text">{item}</span>
                </label>
              ))}
            </div>
          )}

          {/* Outcome Options (Step 3) */}
          {currentStepData.options && (
            <div className="step-options">
              {currentStepData.options.map(option => (
                <button
                  key={option.id}
                  className={`option-btn ${(completedSteps[currentStepData.id] || []).includes(option.id) ? 'selected' : ''}`}
                  onClick={() => handleSelectOutcome(option.id)}
                >
                  <span className="option-icon">{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Notes Section (Step 3) */}
          {currentStep === steps.length - 1 && (
            <div className="step-notes">
              <label>Add notes (optional):</label>
              <textarea
                placeholder="Record any observations or follow-up needed..."
                value={notes[currentStepData.id] || ''}
                onChange={(e) => setNotes({ ...notes, [currentStepData.id]: e.target.value })}
              />

              <div className="escalation-options">
                <label>
                  <span>Assign to:</span>
                  <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                    <option value="">Me (default)</option>
                    <option value="family">Family Circle member</option>
                    <option value="caregiver">Professional caregiver</option>
                  </select>
                </label>

                <label>
                  <span>Escalate if no response in:</span>
                  <select value={escalateHours} onChange={(e) => setEscalateHours(Number(e.target.value))}>
                    <option value="0">Don't escalate</option>
                    <option value="2">2 hours</option>
                    <option value="4">4 hours</option>
                    <option value="8">8 hours</option>
                    <option value="24">24 hours</option>
                  </select>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="workflow-nav">
          <button
            className="btn btn-outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            ← Back
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              className="btn btn-primary"
              onClick={handleNext}
            >
              Next →
            </button>
          ) : (
            <button
              className="btn btn-success"
              onClick={handleComplete}
              disabled={(completedSteps[currentStepData.id] || []).length === 0}
            >
              ✓ Complete Action
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TakeActionWorkflow;




