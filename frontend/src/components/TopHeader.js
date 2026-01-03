import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ThemeToggle from './ThemeToggle';
import './TopHeader.css';

/**
 * Top Header - Contextual Actions Only
 * Language, Theme, Notifications, Help
 */
function TopHeader() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);

    // Set RTL direction for Arabic
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    document.documentElement.dir = rtlLanguages.includes(lng) ? 'rtl' : 'ltr';
  };

  // Dynamic page title and subtitle based on route
  const getPageInfo = () => {
    switch (location.pathname) {
      case '/':
        return {
          title: t('dashboard.title'),
          subtitle: t('dashboard.subtitle')
        };
      case '/tasks':
        return {
          title: t('tasks.title'),
          subtitle: t('tasks.subtitle')
        };
      case '/analytics':
        return {
          title: t('analytics.title'),
          subtitle: t('analytics.subtitle')
        };
      case '/call':
        return {
          title: t('call.title'),
          subtitle: t('call.subtitle')
        };
      case '/profile':
        return {
          title: t('profile.title'),
          subtitle: t('profile.subtitle')
        };
      case '/actions':
        return {
          title: t('navigation.careActions'),
          subtitle: 'Pending care actions and interventions'
        };
      case '/alerts':
        return {
          title: t('navigation.alerts'),
          subtitle: 'Recent alerts and notifications'
        };
      case '/history':
        return {
          title: t('navigation.careHistory'),
          subtitle: 'Historical care records and timeline'
        };
      case '/reports':
        return {
          title: t('navigation.reports'),
          subtitle: 'Care reports and documentation'
        };
      case '/about':
        return {
          title: 'About CareCircle',
          subtitle: 'Complete app guide and workflows'
        };
      default:
        return {
          title: t('app.name'),
          subtitle: t('app.tagline')
        };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <header className="top-header" role="banner">
      <div className="header-content">
        {/* Page Title - Dynamically updated */}
        <div className="header-title">
          <h2 id="page-title">{pageInfo.title}</h2>
          <p id="page-subtitle" className="header-subtitle">
            {pageInfo.subtitle}
          </p>
        </div>

        {/* Contextual Actions */}
        <div className="header-actions">
          {/* Notifications */}
          <button
            className="header-action-btn"
            title="Notifications"
            aria-label="Notifications"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <span className="action-icon">🔔</span>
            <span className="notification-badge">1</span>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="notifications-dropdown">
              <div className="notifications-header">
                <h3>Notifications</h3>
                <button onClick={() => setShowNotifications(false)} className="close-btn">×</button>
              </div>
              <div className="notifications-list">
                <div className="notification-item unread">
                  <span className="notification-icon">🔔</span>
                  <div className="notification-content">
                    <p className="notification-title">New Task Assigned</p>
                    <p className="notification-message">Check medication - requires your attention</p>
                    <p className="notification-time">2 hours ago</p>
                  </div>
                </div>
                <div className="notification-item">
                  <span className="notification-icon">✅</span>
                  <div className="notification-content">
                    <p className="notification-title">Task Completed</p>
                    <p className="notification-message">Testing task has been completed</p>
                    <p className="notification-time">5 hours ago</p>
                  </div>
                </div>
              </div>
              <div className="notifications-footer">
                <button
                  className="view-all-btn"
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/today');
                  }}
                >
                  View All Notifications
                </button>
              </div>
            </div>
          )}

          {/* Language Selector */}
          <div className="language-selector">
            <select
              value={i18n.language}
              onChange={(e) => changeLanguage(e.target.value)}
              className="language-dropdown"
              aria-label="Select language"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="hi">हिन्दी</option>
              <option value="ar">العربية</option>
              <option value="zh">中文</option>
              <option value="pt">Português</option>
            </select>
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export default TopHeader;

