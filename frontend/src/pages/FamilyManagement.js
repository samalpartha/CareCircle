import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import './FamilyManagement.css';

function FamilyManagement() {
  const { t } = useTranslation();
  const [elders, setElders] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [showElderModal, setShowElderModal] = useState(false);
  const [showCaregiverModal, setShowCaregiverModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingElder, setEditingElder] = useState(null);
  const [editingCaregiver, setEditingCaregiver] = useState(null);

  const [elderForm, setElderForm] = useState({
    name: '',
    age: '',
    relationship: 'parent',
    gender: '',
    location: '',
    phoneNumber: '',
    email: '',
    medicalConditions: '',
    medications: '',
    allergies: '',
    emergencyContact: '',
    notes: ''
  });

  const [caregiverForm, setCaregiverForm] = useState({
    name: '',
    relationship: 'sibling',
    role: 'primary',
    phoneNumber: '',
    email: '',
    location: '',
    zipCode: '',
    skills: [],
    availability: 'flexible',
    preferredLanguage: 'en',
    notes: ''
  });
  const [errors, setErrors] = useState({});

  const validateForm = (form, type = 'elder') => {
    const newErrors = {};

    // Email validation
    if (form.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // Phone validation
    if (form.phoneNumber) {
      const phoneRegex = /^\+?[\d\s-()]{10,}$/;
      if (!phoneRegex.test(form.phoneNumber)) {
        newErrors.phoneNumber = 'Please enter a valid phone number (at least 10 digits)';
      }
    }

    // Required fields
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (type === 'elder' && !form.age) newErrors.age = 'Age is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    loadFamilyData();
  }, []);

  const loadFamilyData = async () => {
    try {
      setLoading(true);
      const [eldersData, caregiversData] = await Promise.all([
        api.getElders(),
        api.getCaregivers()
      ]);
      setElders(eldersData || []);
      setCaregivers(caregiversData || []);
    } catch (error) {
      console.error('Error loading family data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddElder = () => {
    setEditingElder(null);
    setElderForm({
      name: '',
      age: '',
      relationship: 'parent',
      gender: '',
      location: '',
      phoneNumber: '',
      email: '',
      medicalConditions: '',
      medications: '',
      allergies: '',
      emergencyContact: '',
      notes: ''
    });
    setShowElderModal(true);
  };

  const handleEditElder = (elder) => {
    setEditingElder(elder);
    setElderForm({
      name: elder.name || '',
      age: elder.age || '',
      relationship: elder.relationship || 'parent',
      gender: elder.gender || '',
      location: elder.location || '',
      phoneNumber: elder.phoneNumber || elder.phone_number || '', // Handle camel and snake case
      email: elder.email || '',
      // Convert arrays to comma-separated strings for textareas
      medicalConditions: elder.medicalConditions || (Array.isArray(elder.conditions) ? elder.conditions.join(', ') : '') || '',
      medications: elder.medications ? (Array.isArray(elder.medications) ? elder.medications.join(', ') : elder.medications) : '',
      allergies: elder.allergies || '',
      emergencyContact: elder.emergencyContact || elder.emergency_contact || '',
      notes: elder.notes || ''
    });
    setShowElderModal(true);
  };

  const handleSaveElder = async () => {
    if (!validateForm(elderForm, 'elder')) return;

    try {
      // transform for backend
      const payload = {
        ...elderForm,
        phone_number: elderForm.phoneNumber,
        conditions: elderForm.medicalConditions.split(',').map(s => s.trim()).filter(Boolean),
        medications: elderForm.medications.split(',').map(s => s.trim()).filter(Boolean),
        emergency_contact: elderForm.emergencyContact
      };

      if (editingElder) {
        await api.updateElder(editingElder.id, payload);
      } else {
        await api.createElder(payload);
      }
      setShowElderModal(false);
      loadFamilyData();
    } catch (error) {
      console.error('Error saving elder:', error);
      alert('Failed to save. Please try again.');
    }
  };

  const handleDeleteElder = async (elderId) => {
    if (!window.confirm('Are you sure you want to remove this elder profile?')) {
      return;
    }
    try {
      await api.deleteElder(elderId);
      loadFamilyData();
    } catch (error) {
      console.error('Error deleting elder:', error);
    }
  };

  const handleAddCaregiver = () => {
    setEditingCaregiver(null);
    setCaregiverForm({
      name: '',
      relationship: 'sibling',
      role: 'primary',
      phoneNumber: '',
      email: '',
      location: '',
      zipCode: '',
      skills: [],
      availability: 'flexible',
      preferredLanguage: 'en',
      notes: ''
    });
    setShowCaregiverModal(true);
  };

  const handleSaveCaregiver = async () => {
    if (!validateForm(caregiverForm, 'caregiver')) return;

    try {
      if (editingCaregiver) {
        await api.updateCaregiver(editingCaregiver.id, caregiverForm);
      } else {
        await api.createCaregiver(caregiverForm);
      }
      setShowCaregiverModal(false);
      loadFamilyData();
    } catch (error) {
      console.error('Error saving caregiver:', error);
      alert('Failed to save. Please try again.');
    }
  };

  const handleDeleteCaregiver = async (caregiverId) => {
    if (!window.confirm('Are you sure you want to remove this caregiver?')) {
      return;
    }
    try {
      await api.deleteCaregiver(caregiverId);
      loadFamilyData();
    } catch (error) {
      console.error('Error deleting caregiver:', error);
      alert('Failed to delete. Please try again.');
    }
  };

  const toggleSkill = (skill) => {
    setCaregiverForm(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const skillOptions = [
    'Medical/Healthcare',
    'Financial/Legal',
    'Transportation',
    'Technology Support',
    'Emotional Support',
    'Meal Preparation',
    'Home Maintenance',
    'Personal Care'
  ];

  if (loading) {
    return (
      <div className="family-management">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading family information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="family-management">
      <div className="page-header">
        <div>
          <h1>👨‍👩‍👧‍👦 {t('family.title')}</h1>
          <p className="subtitle">{t('family.subtitle')}</p>
        </div>
      </div>

      {/* Elderly Section */}
      <section className="family-section">
        <div className="section-header">
          <div>
            <h2>👴👵 {t('family.elderlyRelatives')}</h2>
            <p>People you are caring for</p>
          </div>
          <button className="btn btn-primary" onClick={handleAddElder}>
            ➕ {t('family.addElder')}
          </button>
        </div>

        {elders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👴👵</div>
            <h3>No Elderly Relatives Added Yet</h3>
            <p>Add the elderly people you're caring for to get started</p>
            <button className="btn btn-primary" onClick={handleAddElder}>
              ➕ Add Your First Elder
            </button>
          </div>
        ) : (
          <div className="cards-grid">
            {elders.map(elder => (
              <div key={elder.id} className="profile-card elder-card">
                <div className="card-header">
                  <div className="profile-avatar">
                    {elder.gender === 'male' ? '👴' : elder.gender === 'female' ? '👵' : '🧓'}
                  </div>
                  <div className="profile-info">
                    <h3>{elder.name}</h3>
                    <p className="relationship">{elder.relationship}, Age {elder.age}</p>
                  </div>
                </div>

                <div className="card-body">
                  <div className="info-row">
                    <span className="label">📍 Location:</span>
                    <span className="value">{elder.location || 'Not specified'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">📞 Phone:</span>
                    <span className="value">{elder.phoneNumber || elder.phone_number || 'Not specified'}</span>
                  </div>
                  {(elder.medicalConditions || (Array.isArray(elder.conditions) && elder.conditions.length > 0)) && (
                    <div className="info-row">
                      <span className="label">🏥 Conditions:</span>
                      <span className="value">{elder.medicalConditions || (Array.isArray(elder.conditions) ? elder.conditions.join(', ') : elder.conditions)}</span>
                    </div>
                  )}
                  {(elder.medications && (typeof elder.medications === 'string' ? elder.medications : (Array.isArray(elder.medications) && elder.medications.length > 0))) && (
                    <div className="info-row">
                      <span className="label">💊 Medications:</span>
                      <span className="value">{Array.isArray(elder.medications) ? elder.medications.join(', ') : elder.medications}</span>
                    </div>
                  )}
                </div>

                <div className="card-actions">
                  <button className="btn btn-secondary" onClick={() => handleEditElder(elder)}>
                    ✏️ Edit
                  </button>
                  <button className="btn btn-ghost" onClick={() => handleDeleteElder(elder.id)}>
                    🗑️ Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Caregivers Section */}
      <section className="family-section">
        <div className="section-header">
          <div>
            <h2>👨‍⚕️👩‍⚕️ {t('family.familyCaregivers')}</h2>
            <p>Family members helping with care</p>
          </div>
          <button className="btn btn-primary" onClick={handleAddCaregiver}>
            ➕ {t('family.addCaregiver')}
          </button>
        </div>

        {caregivers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👨‍👩‍👧‍👦</div>
            <h3>No Caregivers Added Yet</h3>
            <p>Add family members who help with caregiving</p>
            <button className="btn btn-primary" onClick={handleAddCaregiver}>
              ➕ Add Your First Caregiver
            </button>
          </div>
        ) : (
          <div className="cards-grid">
            {caregivers.map(caregiver => (
              <div key={caregiver.id} className="profile-card caregiver-card">
                <div className="card-header">
                  <div className="profile-avatar">👤</div>
                  <div className="profile-info">
                    <h3>{caregiver.name}</h3>
                    <p className="relationship">{caregiver.relationship} • {caregiver.role} caregiver</p>
                  </div>
                </div>

                <div className="card-body">
                  <div className="info-row">
                    <span className="label">📍 Location:</span>
                    <span className="value">{caregiver.location || 'Not specified'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">📞 Phone:</span>
                    <span className="value">{caregiver.phoneNumber || 'Not specified'}</span>
                  </div>
                  {caregiver.skills && caregiver.skills.length > 0 && (
                    <div className="skills-section">
                      <span className="label">🎯 Skills:</span>
                      <div className="skills-tags">
                        {caregiver.skills.map(skill => (
                          <span key={skill} className="skill-tag">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="card-actions">
                  <button className="btn btn-secondary" onClick={() => {
                    setEditingCaregiver(caregiver);
                    setCaregiverForm({
                      name: caregiver.name || '',
                      relationship: caregiver.relationship || 'sibling',
                      role: caregiver.role || 'primary',
                      phoneNumber: caregiver.phoneNumber || '',
                      email: caregiver.email || '',
                      location: caregiver.location || '',
                      zipCode: caregiver.zipCode || '',
                      skills: caregiver.skills || [],
                      availability: caregiver.availability || 'flexible',
                      preferredLanguage: caregiver.preferredLanguage || 'en',
                      notes: caregiver.notes || ''
                    });
                    setShowCaregiverModal(true);
                  }}>
                    ✏️ Edit
                  </button>
                  <button className="btn btn-ghost" onClick={() => handleDeleteCaregiver(caregiver.id)}>
                    🗑️ Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Elder Modal */}
      {showElderModal && (
        <div className="modal-overlay" onClick={() => setShowElderModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingElder ? 'Edit Elder Profile' : 'Add New Elder'}</h2>
              <button className="modal-close" onClick={() => setShowElderModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={elderForm.name}
                    onChange={e => setElderForm({ ...elderForm, name: e.target.value })}
                    placeholder="e.g., Mary Johnson"
                  />
                </div>

                <div className="form-group">
                  <label>Age *</label>
                  <input
                    type="number"
                    value={elderForm.age}
                    onChange={e => setElderForm({ ...elderForm, age: e.target.value })}
                    placeholder="e.g., 78"
                    className={errors.age ? 'error' : ''}
                  />
                  {errors.age && <span className="error-text">{errors.age}</span>}
                </div>

                <div className="form-group">
                  <label>Relationship *</label>
                  <select
                    value={elderForm.relationship}
                    onChange={e => setElderForm({ ...elderForm, relationship: e.target.value })}
                  >
                    <option value="parent">Parent</option>
                    <option value="grandparent">Grandparent</option>
                    <option value="spouse">Spouse</option>
                    <option value="sibling">Sibling</option>
                    <option value="other">Other Relative</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Gender</label>
                  <select
                    value={elderForm.gender}
                    onChange={e => setElderForm({ ...elderForm, gender: e.target.value })}
                  >
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Location/Address</label>
                  <input
                    type="text"
                    value={elderForm.location}
                    onChange={e => setElderForm({ ...elderForm, location: e.target.value })}
                    placeholder="e.g., San Francisco, CA"
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={elderForm.phoneNumber}
                    onChange={e => setElderForm({ ...elderForm, phoneNumber: e.target.value })}
                    placeholder="e.g., (555) 123-4567"
                    className={errors.phoneNumber ? 'error' : ''}
                  />
                  {errors.phoneNumber && <span className="error-text">{errors.phoneNumber}</span>}
                </div>

                <div className="form-group full-width">
                  <label>Email</label>
                  <input
                    type="email"
                    value={elderForm.email}
                    onChange={e => setElderForm({ ...elderForm, email: e.target.value })}
                    placeholder="e.g., mary@example.com"
                    className={errors.email ? 'error' : ''}
                  />
                  {errors.email && <span className="error-text">{errors.email}</span>}
                </div>

                <div className="form-group full-width">
                  <label>Medical Conditions</label>
                  <textarea
                    value={elderForm.medicalConditions}
                    onChange={e => setElderForm({ ...elderForm, medicalConditions: e.target.value })}
                    placeholder="e.g., Diabetes Type 2, Hypertension, Arthritis"
                    rows="2"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Current Medications</label>
                  <textarea
                    value={elderForm.medications}
                    onChange={e => setElderForm({ ...elderForm, medications: e.target.value })}
                    placeholder="e.g., Metformin 500mg (morning), Lisinopril 10mg (evening)"
                    rows="2"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Allergies</label>
                  <input
                    type="text"
                    value={elderForm.allergies}
                    onChange={e => setElderForm({ ...elderForm, allergies: e.target.value })}
                    placeholder="e.g., Penicillin, Peanuts"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Emergency Contact</label>
                  <input
                    type="text"
                    value={elderForm.emergencyContact}
                    onChange={e => setElderForm({ ...elderForm, emergencyContact: e.target.value })}
                    placeholder="Name and phone number"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Additional Notes</label>
                  <textarea
                    value={elderForm.notes}
                    onChange={e => setElderForm({ ...elderForm, notes: e.target.value })}
                    placeholder="Any other important information"
                    rows="3"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowElderModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveElder}
                disabled={!elderForm.name || !elderForm.age}
              >
                {editingElder ? 'Save Changes' : 'Add Elder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Caregiver Modal */}
      {showCaregiverModal && (
        <div className="modal-overlay" onClick={() => setShowCaregiverModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCaregiver ? 'Edit Caregiver' : 'Add New Caregiver'}</h2>
              <button className="modal-close" onClick={() => setShowCaregiverModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={caregiverForm.name}
                    onChange={e => setCaregiverForm({ ...caregiverForm, name: e.target.value })}
                    placeholder="e.g., John Smith"
                  />
                </div>

                <div className="form-group">
                  <label>Relationship *</label>
                  <select
                    value={caregiverForm.relationship}
                    onChange={e => setCaregiverForm({ ...caregiverForm, relationship: e.target.value })}
                  >
                    <option value="sibling">Sibling</option>
                    <option value="child">Child</option>
                    <option value="spouse">Spouse</option>
                    <option value="friend">Friend</option>
                    <option value="professional">Professional Caregiver</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Role *</label>
                  <select
                    value={caregiverForm.role}
                    onChange={e => setCaregiverForm({ ...caregiverForm, role: e.target.value })}
                  >
                    <option value="primary">Primary Caregiver</option>
                    <option value="secondary">Secondary Caregiver</option>
                    <option value="backup">Backup Support</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={caregiverForm.phoneNumber}
                    onChange={e => setCaregiverForm({ ...caregiverForm, phoneNumber: e.target.value })}
                    placeholder="(555) 123-4567"
                    className={errors.phoneNumber ? 'error' : ''}
                  />
                  {errors.phoneNumber && <span className="error-text">{errors.phoneNumber}</span>}
                </div>

                <div className="form-group full-width">
                  <label>Email</label>
                  <input
                    type="email"
                    value={caregiverForm.email}
                    onChange={e => setCaregiverForm({ ...caregiverForm, email: e.target.value })}
                    placeholder="john@example.com"
                    className={errors.email ? 'error' : ''}
                  />
                  {errors.email && <span className="error-text">{errors.email}</span>}
                </div>

                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={caregiverForm.location}
                    onChange={e => setCaregiverForm({ ...caregiverForm, location: e.target.value })}
                    placeholder="City, State"
                  />
                </div>

                <div className="form-group">
                  <label>ZIP Code</label>
                  <input
                    type="text"
                    value={caregiverForm.zipCode}
                    onChange={e => setCaregiverForm({ ...caregiverForm, zipCode: e.target.value })}
                    placeholder="12345"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Skills & Expertise</label>
                  <div className="skills-selector">
                    {skillOptions.map(skill => (
                      <label key={skill} className="skill-checkbox">
                        <input
                          type="checkbox"
                          checked={caregiverForm.skills.includes(skill)}
                          onChange={() => toggleSkill(skill)}
                        />
                        <span>{skill}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Availability</label>
                  <select
                    value={caregiverForm.availability}
                    onChange={e => setCaregiverForm({ ...caregiverForm, availability: e.target.value })}
                  >
                    <option value="flexible">Flexible</option>
                    <option value="weekdays">Weekdays Only</option>
                    <option value="weekends">Weekends Only</option>
                    <option value="limited">Limited Hours</option>
                    <option value="emergency">Emergency Only</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Preferred Language</label>
                  <select
                    value={caregiverForm.preferredLanguage}
                    onChange={e => setCaregiverForm({ ...caregiverForm, preferredLanguage: e.target.value })}
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="hi">हिन्दी</option>
                    <option value="ar">العربية</option>
                    <option value="zh">中文</option>
                    <option value="pt">Português</option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label>Notes</label>
                  <textarea
                    value={caregiverForm.notes}
                    onChange={e => setCaregiverForm({ ...caregiverForm, notes: e.target.value })}
                    placeholder="Any additional information"
                    rows="3"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowCaregiverModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveCaregiver}
                disabled={!caregiverForm.name}
              >
                {editingCaregiver ? 'Save Changes' : 'Add Caregiver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FamilyManagement;


