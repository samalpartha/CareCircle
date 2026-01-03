import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentUser, updateUserAttributes } from 'aws-amplify/auth';
import { getUserProfile, updateUserProfile } from '../services/api';
import './Profile.css';

function Profile() {
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    language: 'en',
    zipCode: '',
    skills: [],
    availability: 'flexible',
    notifications: {
      sms: true,
      email: true,
      push: true,
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const skillOptions = [
    'Medical/Healthcare',
    'Financial/Legal',
    'Transportation',
    'Technology Support',
    'Emotional Support',
    'Meal Preparation',
    'Home Maintenance',
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const user = await getCurrentUser();
      const userProfile = await getUserProfile(user.userId);
      
      setProfile({
        username: user.username || '',
        email: user.signInDetails?.loginId || '',
        ...userProfile,
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // Update Cognito attributes
      await updateUserAttributes({
        userAttributes: {
          'custom:language': profile.language,
          'custom:zipcode': profile.zipCode,
        },
      });

      // Update profile in database
      await updateUserProfile(profile);

      // Update i18n language
      i18n.changeLanguage(profile.language);
      localStorage.setItem('language', profile.language);

      setMessage({ type: 'success', text: 'Profile saved successfully!' });
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: t('common.error') });
    } finally {
      setSaving(false);
    }
  };

  const handleSkillToggle = (skill) => {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h1>{t('profile.title')}</h1>

        <form onSubmit={handleSave} className="profile-form">
          {/* Personal Information */}
          <section className="form-section">
            <h2>👤 {t('profile.personalInfo')}</h2>
            
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={profile.username}
                disabled
                className="form-input disabled"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="form-input disabled"
              />
            </div>

            <div className="form-group">
              <label>{t('profile.language')}</label>
              <select
                value={profile.language}
                onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                className="form-input"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="hi">हिन्दी</option>
                <option value="ar">العربية</option>
                <option value="zh">中文</option>
                <option value="pt">Português</option>
              </select>
            </div>

            <div className="form-group">
              <label>{t('profile.zipCode')}</label>
              <input
                type="text"
                value={profile.zipCode}
                onChange={(e) => setProfile({ ...profile, zipCode: e.target.value })}
                className="form-input"
                placeholder="Enter your ZIP code"
              />
            </div>
          </section>

          {/* Skills & Expertise */}
          <section className="form-section">
            <h2>🎯 {t('profile.skills')}</h2>
            <div className="skills-grid">
              {skillOptions.map(skill => (
                <button
                  key={skill}
                  type="button"
                  className={`skill-badge ${profile.skills.includes(skill) ? 'selected' : ''}`}
                  onClick={() => handleSkillToggle(skill)}
                >
                  {profile.skills.includes(skill) ? '✓ ' : ''}{skill}
                </button>
              ))}
            </div>
          </section>

          {/* Availability */}
          <section className="form-section">
            <h2>📅 {t('profile.availability')}</h2>
            <div className="availability-options">
              <label className="radio-label">
                <input
                  type="radio"
                  name="availability"
                  value="flexible"
                  checked={profile.availability === 'flexible'}
                  onChange={(e) => setProfile({ ...profile, availability: e.target.value })}
                />
                <span>Flexible - Can help anytime</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="availability"
                  value="weekends"
                  checked={profile.availability === 'weekends'}
                  onChange={(e) => setProfile({ ...profile, availability: e.target.value })}
                />
                <span>Weekends Only</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="availability"
                  value="limited"
                  checked={profile.availability === 'limited'}
                  onChange={(e) => setProfile({ ...profile, availability: e.target.value })}
                />
                <span>Limited Availability</span>
              </label>
            </div>
          </section>

          {/* Notification Preferences */}
          <section className="form-section">
            <h2>🔔 {t('profile.notifications')}</h2>
            <div className="notification-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={profile.notifications.sms}
                  onChange={(e) => setProfile({
                    ...profile,
                    notifications: { ...profile.notifications, sms: e.target.checked },
                  })}
                />
                <span>SMS Notifications</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={profile.notifications.email}
                  onChange={(e) => setProfile({
                    ...profile,
                    notifications: { ...profile.notifications, email: e.target.checked },
                  })}
                />
                <span>Email Notifications</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={profile.notifications.push}
                  onChange={(e) => setProfile({
                    ...profile,
                    notifications: { ...profile.notifications, push: e.target.checked },
                  })}
                />
                <span>Push Notifications</span>
              </label>
            </div>
          </section>

          {/* Message */}
          {message && (
            <div className={`form-message form-message-${message.type}`}>
              {message.text}
            </div>
          )}

          {/* Submit Button */}
          <div className="form-actions">
            <button 
              type="submit" 
              className="btn btn-primary btn-large"
              disabled={saving}
            >
              {saving ? 'Saving...' : t('profile.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Profile;

