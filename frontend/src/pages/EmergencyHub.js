import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import './EmergencyHub.css';

// Global emergency numbers by country
const EMERGENCY_NUMBERS = {
  US: { ambulance: '911', police: '911', fire: '911', poison: '1-800-222-1222' },
  UK: { ambulance: '999', police: '999', fire: '999', poison: '111' },
  IN: { ambulance: '102', police: '100', fire: '101', poison: '1800-11-6117' },
  CN: { ambulance: '120', police: '110', fire: '119', poison: '120' },
  JP: { ambulance: '119', police: '110', fire: '119', poison: '110' },
  DE: { ambulance: '112', police: '110', fire: '112', poison: '030 19240' },
  FR: { ambulance: '15', police: '17', fire: '18', poison: '01 40 05 48 48' },
  ES: { ambulance: '112', police: '112', fire: '112', poison: '91 562 04 20' },
  SA: { ambulance: '997', police: '999', fire: '998', poison: '920033119' },
  AE: { ambulance: '998', police: '999', fire: '997', poison: '800-424' },
};

function EmergencyHub() {
  const { t, i18n } = useTranslation();
  const [contacts, setContacts] = useState([]);
  const [medicalId, setMedicalId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showMedicalIdModal, setShowMedicalIdModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [countryCode, setCountryCode] = useState('US');
  const [sosActive, setSosActive] = useState(false);
  const [sosProgress, setSosProgress] = useState(0);
  
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: '',
    contact_type: 'family',
    is_local: false,
    response_time_minutes: 30,
    has_key: false,
    priority: 1,
    notes: '',
  });

  useEffect(() => {
    loadData();
    detectCountry();
  }, []);

  const detectCountry = () => {
    // Try to detect from browser language
    const lang = navigator.language || 'en-US';
    const countryPart = lang.split('-')[1] || 'US';
    if (EMERGENCY_NUMBERS[countryPart]) {
      setCountryCode(countryPart);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [contactsData, medicalIdData] = await Promise.all([
        api.getEmergencyContacts(),
        api.getMedicalId(),
      ]);
      // Handle API response format { contacts: [] }
      const contactsArray = contactsData?.contacts || (Array.isArray(contactsData) ? contactsData : []);
      setContacts(contactsArray);
      setMedicalId(medicalIdData);
    } catch (error) {
      console.error('Error loading emergency data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get contact ID (handles both camelCase and snake_case)
  const getContactId = (contact) => contact.contactId || contact.contact_id || contact.SK;

  const handleSosPress = () => {
    setSosActive(true);
    setSosProgress(0);
    
    // 3-second hold to trigger
    const interval = setInterval(() => {
      setSosProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          triggerEmergency();
          return 100;
        }
        return prev + 10;
      });
    }, 300);

    // Store interval ID for cleanup
    window.sosInterval = interval;
  };

  const handleSosRelease = () => {
    if (window.sosInterval) {
      clearInterval(window.sosInterval);
    }
    setSosActive(false);
    setSosProgress(0);
  };

  const triggerEmergency = () => {
    // In production, this would:
    // 1. Send location to all emergency contacts
    // 2. Initiate calls to local support
    // 3. Prepare medical ID for first responders
    alert('🚨 EMERGENCY ACTIVATED!\n\nIn a real implementation, this would:\n• Send your location to all emergency contacts\n• Call local support (neighbors with keys)\n• Prepare medical ID for first responders\n• Optionally dial emergency services');
    setSosActive(false);
    setSosProgress(0);
  };

  const handleCall = (number) => {
    window.location.href = `tel:${number}`;
  };

  const handleSubmitContact = async (e) => {
    e.preventDefault();
    try {
      if (editingContact) {
        await api.updateEmergencyContact(getContactId(editingContact), contactForm);
      } else {
        await api.createEmergencyContact(contactForm);
      }
      setShowContactModal(false);
      setEditingContact(null);
      resetContactForm();
      loadData();
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('Failed to save contact.');
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!window.confirm('Remove this emergency contact?')) return;
    try {
      await api.deleteEmergencyContact(contactId);
      loadData();
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

  const resetContactForm = () => {
    setContactForm({
      name: '',
      phone: '',
      email: '',
      relationship: '',
      contact_type: 'family',
      is_local: false,
      response_time_minutes: 30,
      has_key: false,
      priority: 1,
      notes: '',
    });
  };

  const openEditContact = (contact) => {
    setEditingContact(contact);
    setContactForm({
      name: contact.name || '',
      phone: contact.phone || '',
      email: contact.email || '',
      relationship: contact.relationship || '',
      contact_type: contact.contact_type || 'family',
      is_local: contact.is_local || false,
      response_time_minutes: contact.response_time_minutes || 30,
      has_key: contact.has_key || false,
      priority: contact.priority || 1,
      notes: contact.notes || '',
    });
    setShowContactModal(true);
  };

  const emergencyNumbers = EMERGENCY_NUMBERS[countryCode] || EMERGENCY_NUMBERS.US;

  if (loading) {
    return <LoadingSpinner message="Loading emergency information..." />;
  }

  // Sort contacts by priority and local status
  const sortedContacts = [...contacts].sort((a, b) => {
    if (a.is_local && !b.is_local) return -1;
    if (!a.is_local && b.is_local) return 1;
    return (a.priority || 99) - (b.priority || 99);
  });

  const localContacts = sortedContacts.filter(c => c.is_local);
  const familyContacts = sortedContacts.filter(c => !c.is_local && c.contact_type === 'family');
  const medicalContacts = sortedContacts.filter(c => c.contact_type === 'medical');

  return (
    <div className="emergency-hub">
      <div className="page-header">
        <div>
          <h1>🚨 Emergency Hub</h1>
          <p className="subtitle">Quick access to help when you need it most</p>
        </div>
        <select 
          className="country-selector"
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
        >
          <option value="US">🇺🇸 United States</option>
          <option value="UK">🇬🇧 United Kingdom</option>
          <option value="IN">🇮🇳 India</option>
          <option value="CN">🇨🇳 China</option>
          <option value="JP">🇯🇵 Japan</option>
          <option value="DE">🇩🇪 Germany</option>
          <option value="FR">🇫🇷 France</option>
          <option value="ES">🇪🇸 Spain</option>
          <option value="SA">🇸🇦 Saudi Arabia</option>
          <option value="AE">🇦🇪 UAE</option>
        </select>
      </div>

      {/* SOS Button */}
      <div className="sos-section card">
        <h2>🆘 Emergency SOS</h2>
        <p>Press and hold for 3 seconds to alert all emergency contacts</p>
        <button 
          className={`sos-button ${sosActive ? 'active' : ''}`}
          onMouseDown={handleSosPress}
          onMouseUp={handleSosRelease}
          onMouseLeave={handleSosRelease}
          onTouchStart={handleSosPress}
          onTouchEnd={handleSosRelease}
        >
          <div className="sos-progress" style={{ width: `${sosProgress}%` }} />
          <span className="sos-text">
            {sosActive ? 'HOLD...' : 'SOS'}
          </span>
        </button>
        <p className="sos-hint">Sends location + Medical ID to all contacts</p>
      </div>

      {/* Emergency Services */}
      <div className="emergency-services card">
        <h2>📞 Emergency Services</h2>
        <div className="services-grid">
          <button className="service-btn ambulance" onClick={() => handleCall(emergencyNumbers.ambulance)}>
            <span className="service-icon">🚑</span>
            <span className="service-name">Ambulance</span>
            <span className="service-number">{emergencyNumbers.ambulance}</span>
          </button>
          <button className="service-btn police" onClick={() => handleCall(emergencyNumbers.police)}>
            <span className="service-icon">🚓</span>
            <span className="service-name">Police</span>
            <span className="service-number">{emergencyNumbers.police}</span>
          </button>
          <button className="service-btn fire" onClick={() => handleCall(emergencyNumbers.fire)}>
            <span className="service-icon">🚒</span>
            <span className="service-name">Fire</span>
            <span className="service-number">{emergencyNumbers.fire}</span>
          </button>
          <button className="service-btn poison" onClick={() => handleCall(emergencyNumbers.poison)}>
            <span className="service-icon">☠️</span>
            <span className="service-name">Poison Control</span>
            <span className="service-number">{emergencyNumbers.poison}</span>
          </button>
        </div>
      </div>

      {/* Medical ID Card */}
      <div className="medical-id-card card" onClick={() => setShowMedicalIdModal(true)}>
        <div className="medical-id-header">
          <h2>🆔 Medical ID</h2>
          <button className="btn btn-secondary btn-sm">View Full</button>
        </div>
        {medicalId ? (
          <div className="medical-id-preview">
            <div className="id-row">
              <span className="id-label">Name:</span>
              <span className="id-value">{medicalId.name || 'Not set'}</span>
            </div>
            <div className="id-row">
              <span className="id-label">Blood Type:</span>
              <span className="id-value">{medicalId.blood_type || 'Unknown'}</span>
            </div>
            <div className="id-row">
              <span className="id-label">Conditions:</span>
              <span className="id-value">
                {medicalId.conditions?.length > 0 ? medicalId.conditions.join(', ') : 'None listed'}
              </span>
            </div>
            <div className="id-row allergies">
              <span className="id-label">⚠️ Allergies:</span>
              <span className="id-value">
                {medicalId.allergies?.length > 0 ? medicalId.allergies.join(', ') : 'None listed'}
              </span>
            </div>
          </div>
        ) : (
          <p className="no-medical-id">No medical information added yet. Tap to set up.</p>
        )}
      </div>

      {/* Speed Dial Contacts */}
      <div className="contacts-section">
        <div className="contacts-header">
          <h2>📞 Speed Dial</h2>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => {
              resetContactForm();
              setEditingContact(null);
              setShowContactModal(true);
            }}
          >
            ➕ Add Contact
          </button>
        </div>

        {/* Local Support (Can respond quickly) */}
        {localContacts.length > 0 && (
          <div className="contact-group">
            <h3>🏘️ Local Support (Nearby)</h3>
            <div className="contacts-grid">
              {localContacts.map(contact => (
                <div key={getContactId(contact)} className="contact-card local">
                  <div className="contact-info">
                    <span className="contact-name">{contact.name}</span>
                    <span className="contact-relationship">{contact.relationship}</span>
                    {contact.has_key && <span className="has-key-badge">🔑 Has Key</span>}
                    <span className="response-time">⏱️ {contact.response_time_minutes} min</span>
                  </div>
                  <div className="contact-actions">
                    <button className="btn btn-success btn-sm" onClick={() => handleCall(contact.phone)}>
                      📞 Call
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEditContact(contact)}>
                      ✏️
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteContact(getContactId(contact))}>
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Family */}
        {familyContacts.length > 0 && (
          <div className="contact-group">
            <h3>👨‍👩‍👧‍👦 Family</h3>
            <div className="contacts-grid">
              {familyContacts.map(contact => (
                <div key={getContactId(contact)} className="contact-card">
                  <div className="contact-info">
                    <span className="contact-name">{contact.name}</span>
                    <span className="contact-relationship">{contact.relationship}</span>
                  </div>
                  <div className="contact-actions">
                    <button className="btn btn-success btn-sm" onClick={() => handleCall(contact.phone)}>
                      📞 Call
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEditContact(contact)}>
                      ✏️
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteContact(getContactId(contact))}>
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Medical Team */}
        {medicalContacts.length > 0 && (
          <div className="contact-group">
            <h3>👨‍⚕️ Medical Team</h3>
            <div className="contacts-grid">
              {medicalContacts.map(contact => (
                <div key={getContactId(contact)} className="contact-card medical">
                  <div className="contact-info">
                    <span className="contact-name">{contact.name}</span>
                    <span className="contact-relationship">{contact.relationship}</span>
                  </div>
                  <div className="contact-actions">
                    <button className="btn btn-success btn-sm" onClick={() => handleCall(contact.phone)}>
                      📞 Call
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEditContact(contact)}>
                      ✏️
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteContact(getContactId(contact))}>
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {contacts.length === 0 && (
          <div className="empty-state">
            <p>No emergency contacts added yet.</p>
            <button className="btn btn-primary" onClick={() => setShowContactModal(true)}>
              ➕ Add First Contact
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Contact Modal */}
      {showContactModal && (
        <div className="modal-overlay" onClick={() => setShowContactModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingContact ? 'Edit Contact' : 'Add Emergency Contact'}</h2>
              <button className="modal-close" onClick={() => setShowContactModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmitContact} className="contact-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={contactForm.name}
                    onChange={e => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone *</label>
                  <input
                    type="tel"
                    value={contactForm.phone}
                    onChange={e => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Relationship</label>
                  <input
                    type="text"
                    value={contactForm.relationship}
                    onChange={e => setContactForm(prev => ({ ...prev, relationship: e.target.value }))}
                    placeholder="e.g., Daughter, Neighbor"
                  />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={contactForm.contact_type}
                    onChange={e => setContactForm(prev => ({ ...prev, contact_type: e.target.value }))}
                  >
                    <option value="family">Family</option>
                    <option value="neighbor">Neighbor</option>
                    <option value="friend">Friend</option>
                    <option value="medical">Medical</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={contactForm.is_local}
                      onChange={e => setContactForm(prev => ({ ...prev, is_local: e.target.checked }))}
                    />
                    Can respond quickly (nearby)
                  </label>
                </div>
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={contactForm.has_key}
                      onChange={e => setContactForm(prev => ({ ...prev, has_key: e.target.checked }))}
                    />
                    Has key to home
                  </label>
                </div>
              </div>

              {contactForm.is_local && (
                <div className="form-group">
                  <label>Response Time (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={contactForm.response_time_minutes}
                    onChange={e => setContactForm(prev => ({ ...prev, response_time_minutes: parseInt(e.target.value) || 30 }))}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Priority (1 = first to call)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={contactForm.priority}
                  onChange={e => setContactForm(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={contactForm.notes}
                  onChange={e => setContactForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  placeholder="Any special instructions..."
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowContactModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingContact ? 'Save Changes' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Medical ID Modal */}
      {showMedicalIdModal && medicalId && (
        <div className="modal-overlay" onClick={() => setShowMedicalIdModal(false)}>
          <div className="modal-content medical-id-full" onClick={e => e.stopPropagation()}>
            <div className="modal-header medical-id-modal-header">
              <h2>🆔 Medical ID Card</h2>
              <button className="modal-close" onClick={() => setShowMedicalIdModal(false)}>×</button>
            </div>
            <div className="medical-id-content">
              <div className="id-section">
                <h3>Personal Information</h3>
                <div className="id-grid">
                  <div className="id-field">
                    <span className="field-label">Name</span>
                    <span className="field-value">{medicalId.name || 'Not set'}</span>
                  </div>
                  <div className="id-field">
                    <span className="field-label">Date of Birth</span>
                    <span className="field-value">{medicalId.date_of_birth || 'Not set'}</span>
                  </div>
                  <div className="id-field">
                    <span className="field-label">Blood Type</span>
                    <span className="field-value">{medicalId.blood_type || 'Unknown'}</span>
                  </div>
                  <div className="id-field">
                    <span className="field-label">Weight</span>
                    <span className="field-value">{medicalId.weight || 'Not set'}</span>
                  </div>
                </div>
              </div>

              <div className="id-section conditions">
                <h3>Medical Conditions</h3>
                {medicalId.conditions?.length > 0 ? (
                  <div className="condition-tags">
                    {medicalId.conditions.map((c, i) => (
                      <span key={i} className="condition-tag">{c}</span>
                    ))}
                  </div>
                ) : (
                  <p className="no-data">No conditions listed</p>
                )}
              </div>

              <div className="id-section allergies">
                <h3>⚠️ Allergies</h3>
                {medicalId.allergies?.length > 0 ? (
                  <div className="allergy-tags">
                    {medicalId.allergies.map((a, i) => (
                      <span key={i} className="allergy-tag">{a}</span>
                    ))}
                  </div>
                ) : (
                  <p className="no-data">No allergies listed</p>
                )}
              </div>

              <div className="id-section medications">
                <h3>💊 Current Medications</h3>
                {medicalId.medications?.length > 0 ? (
                  <ul className="medication-list">
                    {medicalId.medications.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-data">No medications listed</p>
                )}
              </div>

              <div className="id-section emergency-contacts">
                <h3>📞 Emergency Contacts</h3>
                {medicalId.emergency_contacts?.length > 0 ? (
                  <div className="emergency-contact-list">
                    {medicalId.emergency_contacts.map((c, i) => (
                      <div key={i} className="emergency-contact-item">
                        <span className="ec-name">{c.name}</span>
                        <span className="ec-relation">({c.relationship})</span>
                        <span className="ec-phone">{c.phone}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-data">No emergency contacts listed</p>
                )}
              </div>

              <div className="id-footer">
                <small>Generated: {medicalId.generated_at ? new Date(medicalId.generated_at).toLocaleString() : 'N/A'}</small>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmergencyHub;

