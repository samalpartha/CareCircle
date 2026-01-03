import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './LeftNavigation.css';

/**
 * Left Sidebar Navigation
 * Professional healthcare dashboard style
 */
function LeftNavigation({ signOut, user }) {
  const { t } = useTranslation();
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? 'active' : '';

  // Navigation order optimized for buyer psychology: Risk → Action → Outcome
  const navItems = [
    { path: '/', icon: '🏠', label: t('navigation.dashboard'), badge: null, description: 'Am I safe today?' },
    { path: '/alerts', icon: '🚨', label: t('navigation.alerts'), badge: null, description: 'What needs attention?' },
    { path: '/actions', icon: '🎯', label: t('navigation.careActions'), badge: null, description: 'What should I do?' },
    { path: '/medications', icon: '💊', label: t('navigation.medications'), badge: null, description: 'Pill reminders & adherence' },
    { path: '/emergency', icon: '🆘', label: t('navigation.emergencyHub'), badge: null, description: 'SOS & contacts' },
    { path: '/family', icon: '👨‍👩‍👧‍👦', label: t('navigation.family'), badge: null, description: 'Care team' },
    { path: '/history', icon: '📋', label: t('navigation.careHistory'), badge: null, description: 'Calls & history' },
    { path: '/analytics', icon: '📈', label: t('navigation.analytics'), badge: null, description: 'Are things improving?' },
    { path: '/reports', icon: '📄', label: t('navigation.reports'), badge: null, description: 'What can I share?' },
    { path: '/about', icon: 'ℹ️', label: t('navigation.about'), badge: null, description: 'App guide & workflows' },
  ];

  return (
    <nav className="left-navigation" role="navigation" aria-label="Main navigation">
      {/* Logo & Brand */}
      <div className="nav-brand">
        <Link to="/" className="brand-link">
          <div className="brand-icon">
            <img src="/logo.png" alt="CareCircle Logo" />
          </div>
          <div className="brand-text">
            <h1>CareCircle</h1>
            <p>{t('navigation.brandTagline')}</p>
          </div>
        </Link>
      </div>

      {/* Primary CTA */}
      <Link to="/call" className="cta-call">
        <span className="cta-icon">📞</span>
        <span className="cta-text">{t('navigation.call')}</span>
      </Link>

      {/* Navigation Links */}
      <div className="nav-links">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-link ${isActive(item.path)}`}
            aria-current={location.pathname === item.path ? 'page' : undefined}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {item.badge && (
              <span className="nav-badge" aria-label={`${item.badge} items`}>
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Settings - Bottom of nav */}
      <div className="nav-secondary">
        <Link to="/profile" className={`nav-link ${isActive('/profile')}`}>
          <span className="nav-icon">⚙️</span>
          <span className="nav-label">{t('navigation.settings')}</span>
        </Link>
      </div>

      {/* User Profile */}
      <div className="nav-user">
        <div className="user-info">
          <div className="user-avatar">
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="user-details">
            <div className="user-name">{user?.username || 'User'}</div>
            <div className="user-role">{t('navigation.userRole')}</div>
          </div>
        </div>
        <button onClick={signOut} className="sign-out-btn" title={t('navigation.signOutTitle')} aria-label={t('navigation.signOutTitle')}>
          <span className="signout-icon">🚪</span>
          <span className="signout-text">{t('navigation.signOut')}</span>
        </button>
      </div>
    </nav>
  );
}

export default LeftNavigation;

