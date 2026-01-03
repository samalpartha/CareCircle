import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCareTime } from '../utils/timeFormat';
import './Medications.css';

function Medications() {
  const { t } = useTranslation();
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: 'daily',
    schedule: [],
    with_food: false,
    purpose: '',
    prescriber: '',
    refills_remaining: 0,
    notes: '',
  });

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    try {
      setLoading(true);
      const data = await api.getMedications();
      // Handle API response format { medications: [] }
      const medsArray = data?.medications || (Array.isArray(data) ? data : []);
      setMedications(medsArray);
    } catch (error) {
      console.error('Error loading medications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedId = (med) => med.medicationId || med.medication_id || med.SK;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Map form data to API format
      const apiData = {
        name: formData.name,
        dosage: formData.dosage,
        frequency: formData.frequency,
        schedule: formData.schedule,
        instructions: formData.with_food ? 'Take with food' : formData.notes,
        prescribedBy: formData.prescriber,
        pillsRemaining: formData.refills_remaining,
      };

      if (editingMed) {
        await api.updateMedication(getMedId(editingMed), apiData);
      } else {
        await api.createMedication(apiData);
      }
      setShowModal(false);
      setEditingMed(null);
      resetForm();
      loadMedications();
    } catch (error) {
      console.error('Error saving medication:', error);
      alert('Failed to save medication. Please try again.');
    }
  };

  const handleDelete = async (medId) => {
    if (!window.confirm('Are you sure you want to delete this medication?')) return;
    try {
      await api.deleteMedication(medId);
      loadMedications();
    } catch (error) {
      console.error('Error deleting medication:', error);
      alert('Failed to delete medication.');
    }
  };

  const handleLogTaken = async (med, taken = true) => {
    try {
      await api.logMedicationTaken(getMedId(med), {
        taken,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      });
      alert(`Medication marked as ${taken ? 'taken' : 'skipped'}!`);
      loadMedications(); // Refresh to show updated adherence
    } catch (error) {
      console.error('Error logging medication:', error);
      alert('Failed to log medication.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      dosage: '',
      frequency: 'daily',
      schedule: [],
      with_food: false,
      purpose: '',
      prescriber: '',
      refills_remaining: 0,
      notes: '',
    });
  };

  const openEditModal = (med) => {
    setEditingMed(med);
    // Map API response to form data (handle both camelCase and snake_case)
    setFormData({
      name: med.name || '',
      dosage: med.dosage || '',
      frequency: med.frequency || 'daily',
      schedule: med.schedule || [],
      with_food: (med.instructions || '').toLowerCase().includes('food') || med.with_food || false,
      purpose: med.purpose || '',
      prescriber: med.prescribedBy || med.prescriber || '',
      refills_remaining: med.pillsRemaining || med.refills_remaining || 0,
      notes: med.instructions || med.notes || '',
    });
    setShowModal(true);
  };

  const addScheduleTime = () => {
    setFormData(prev => ({
      ...prev,
      schedule: [...prev.schedule, '08:00']
    }));
  };

  const updateScheduleTime = (index, time) => {
    setFormData(prev => ({
      ...prev,
      schedule: prev.schedule.map((t, i) => i === index ? time : t)
    }));
  };

  const removeScheduleTime = (index) => {
    setFormData(prev => ({
      ...prev,
      schedule: prev.schedule.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return <LoadingSpinner message="Loading medications..." />;
  }

  return (
    <div className="medications-page">
      <div className="page-header">
        <div>
          <h1>💊 Medications</h1>
          <p className="subtitle">Manage prescriptions and track adherence</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setEditingMed(null);
            setShowModal(true);
          }}
        >
          ➕ Add Medication
        </button>
      </div>

      {medications.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">💊</div>
          <h3>No medications added yet</h3>
          <p>Add medications to track schedules and improve adherence.</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            ➕ Add First Medication
          </button>
        </div>
      ) : (
        <div className="medications-grid">
          {medications.map(med => (
            <div key={getMedId(med)} className="medication-card card">
              <div className="med-header">
                <div className="med-icon">💊</div>
                <div className="med-info">
                  <h3>{med.name}</h3>
                  <span className="med-dosage">{med.dosage}</span>
                </div>
                <div className={`med-status ${med.active !== false ? 'active' : 'inactive'}`}>
                  {med.active !== false ? '✓ Active' : 'Inactive'}
                </div>
              </div>

              <div className="med-details">
                {med.purpose && (
                  <div className="med-detail">
                    <span className="label">For:</span>
                    <span className="value">{med.purpose}</span>
                  </div>
                )}
                
                <div className="med-detail">
                  <span className="label">Schedule:</span>
                  <div className="schedule-times">
                    {(med.schedule || []).map((time, i) => (
                      <span key={i} className="time-badge">
                        {time.includes(':') ? time : `${time}:00`}
                      </span>
                    ))}
                    {(!med.schedule || med.schedule.length === 0) && (
                      <span className="no-schedule">No schedule set</span>
                    )}
                  </div>
                </div>

                {med.with_food && (
                  <div className="med-detail">
                    <span className="instruction">🍽️ Take with food</span>
                  </div>
                )}

                {(med.prescribedBy || med.prescriber) && (
                  <div className="med-detail">
                    <span className="label">Prescriber:</span>
                    <span className="value">{med.prescribedBy || med.prescriber}</span>
                  </div>
                )}

                {(med.pillsRemaining !== undefined || med.refills_remaining !== undefined) && (
                  <div className="med-detail">
                    <span className="label">Pills Left:</span>
                    <span className={`value ${(med.pillsRemaining || med.refills_remaining) <= 5 ? 'warning' : ''}`}>
                      {med.pillsRemaining || med.refills_remaining} remaining
                      {(med.pillsRemaining || med.refills_remaining) <= 5 && ' ⚠️'}
                    </span>
                  </div>
                )}
              </div>

              <div className="med-actions">
                <button 
                  className="btn btn-success btn-sm"
                  onClick={() => handleLogTaken(med, true)}
                >
                  ✅ Taken
                </button>
                <button 
                  className="btn btn-warning btn-sm"
                  onClick={() => handleLogTaken(med, false)}
                >
                  ⏭️ Skip
                </button>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => openEditModal(med)}
                >
                  ✏️ Edit
                </button>
                <button 
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleDelete(getMedId(med))}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingMed ? 'Edit Medication' : 'Add Medication'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="medication-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Medication Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Metformin"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Dosage *</label>
                  <input
                    type="text"
                    value={formData.dosage}
                    onChange={e => setFormData(prev => ({ ...prev, dosage: e.target.value }))}
                    placeholder="e.g., 500mg"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Purpose</label>
                <input
                  type="text"
                  value={formData.purpose}
                  onChange={e => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                  placeholder="e.g., Type 2 Diabetes"
                />
              </div>

              <div className="form-group">
                <label>Schedule</label>
                <div className="schedule-inputs">
                  {formData.schedule.map((time, index) => (
                    <div key={index} className="schedule-item">
                      <input
                        type="time"
                        value={time}
                        onChange={e => updateScheduleTime(index, e.target.value)}
                      />
                      <button 
                        type="button" 
                        className="btn-icon-sm"
                        onClick={() => removeScheduleTime(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={addScheduleTime}
                  >
                    ➕ Add Time
                  </button>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Frequency</label>
                  <select
                    value={formData.frequency}
                    onChange={e => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                  >
                    <option value="daily">Daily</option>
                    <option value="twice_daily">Twice Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="as_needed">As Needed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Refills Remaining</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.refills_remaining}
                    onChange={e => setFormData(prev => ({ ...prev, refills_remaining: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.with_food}
                    onChange={e => setFormData(prev => ({ ...prev, with_food: e.target.checked }))}
                  />
                  Take with food
                </label>
              </div>

              <div className="form-group">
                <label>Prescriber</label>
                <input
                  type="text"
                  value={formData.prescriber}
                  onChange={e => setFormData(prev => ({ ...prev, prescriber: e.target.value }))}
                  placeholder="e.g., Dr. Smith"
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingMed ? 'Save Changes' : 'Add Medication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Medications;

