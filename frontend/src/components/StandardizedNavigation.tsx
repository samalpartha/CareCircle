/**
 * Standardized Navigation Component
 * Implements Requirements 8.1, 8.2, 8.3 for consistent navigation terminology and structure
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  getNavigationService, 
  NavigationItem, 
  NavigationState,
  validateNavigation 
} from '../services/navigation';
import './StandardizedNavigation.css';

interface StandardizedNavigationProps {
  signOut?: () => void;
  user: any;
  compact?: boolean;
}

/**
 * Standardized Left Navigation Component
 * Follows Requirements 8.1, 8.2, 8.3 for consistent terminology and structure
 */
function StandardizedNavigation({ signOut, user, compact = false }: StandardizedNavigationProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigationService = getNavigationService();
  
  const [navigationState, setNavigationState] = useState<NavigationState>(
    navigationService.getCurrentState()
  );
  const [primaryNavigation, setPrimaryNavigation] = useState<NavigationItem[]>([]);
  const [secondaryNavigation, setSecondaryNavigation] = useState<NavigationItem[]>([]);

  // Subscribe to navigation state changes
  useEffect(() => {
    const unsubscribe = navigationService.subscribe(setNavigationState);
    return unsubscribe;
  }, [navigationService]);

  // Update navigation when location changes
  useEffect(() => {
    navigationService.updateCurrentPath(location.pathname);
    setPrimaryNavigation(navigationService.getPrimaryNavigation());
    setSecondaryNavigation(navigationService.getSecondaryNavigation());
  }, [location.pathname, navigationService]);

  // Validate navigation structure on mount (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const validation = validateNavigation();
      if (!validation.valid) {
        console.warn('Navigation structure validation failed:', validation.errors);
      }
    }
  }, []);

  const handleNavigationClick = (path: string) => {
    const standardizedPath = navigationService.navigateTo(path);
    // The actual navigation will be handled by React Router Link component
  };

  return (
    <nav 
      className={`standardized-navigation ${compact ? 'compact' : ''}`} 
      role="navigation" 
      aria-label="Main navigation"
    >
      {/* Logo & Brand */}
      <div className="nav-brand">
        <Link to="/" className="brand-link" onClick={() => handleNavigationClick('/')}>
          <div className="brand-icon">
            <img src="/logo.png" alt="CareCircle Logo" />
          </div>
          {!compact && (
            <div className="brand-text">
              <h1>CareCircle</h1>
              <p>Care Operations Console</p>
            </div>
          )}
        </Link>
      </div>

      {/* Primary Call-to-Action */}
      <Link 
        to="/call" 
        className="cta-call"
        onClick={() => handleNavigationClick('/call')}
        aria-label="Start voice call"
      >
        <span className="cta-icon">📞</span>
        {!compact && <span className="cta-text">{t('navigation.call')}</span>}
      </Link>

      {/* Primary Navigation Links */}
      <div className="nav-section primary-nav">
        {!compact && <h2 className="nav-section-title">Main</h2>}
        <div className="nav-links">
          {primaryNavigation.map((item) => (
            <Link 
              key={item.id}
              to={item.path} 
              className={`nav-link ${item.isActive ? 'active' : ''}`}
              onClick={() => handleNavigationClick(item.path)}
              aria-current={item.isActive ? 'page' : undefined}
              title={compact ? item.description : undefined}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              {!compact && (
                <>
                  <span className="nav-label">{item.label}</span>
                  {item.badge && (
                    <span className="nav-badge" aria-label={`${item.badge} items`}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Secondary Navigation Links */}
      {secondaryNavigation.length > 0 && (
        <div className="nav-section secondary-nav">
          {!compact && <h2 className="nav-section-title">More</h2>}
          <div className="nav-links">
            {secondaryNavigation.map((item) => (
              <Link 
                key={item.id}
                to={item.path} 
                className={`nav-link ${item.isActive ? 'active' : ''}`}
                onClick={() => handleNavigationClick(item.path)}
                aria-current={item.isActive ? 'page' : undefined}
                title={compact ? item.description : undefined}
              >
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                {!compact && <span className="nav-label">{item.label}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* User Profile & Sign Out */}
      <div className="nav-user">
        {!compact && (
          <div className="user-info">
            <div className="user-avatar">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="user-details">
              <div className="user-name">{user?.username || 'User'}</div>
              <div className="user-role">Family Caregiver</div>
            </div>
          </div>
        )}
        <button 
          onClick={signOut || (() => {})} 
          className="sign-out-btn" 
          title="Sign Out" 
          aria-label="Sign Out"
        >
          <span className="signout-icon">🚪</span>
          {!compact && <span className="signout-text">Sign Out</span>}
        </button>
      </div>
    </nav>
  );
}

export default StandardizedNavigation;