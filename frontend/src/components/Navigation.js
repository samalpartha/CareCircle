import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ThemeToggle from './ThemeToggle';
import './Navigation.css';

function Navigation({ signOut, user }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <Link to="/">
            <h1>{t('app.name')}</h1>
            <p className="nav-tagline">{t('app.tagline')}</p>
          </Link>
        </div>

        <div className="nav-links">
          <Link to="/" className={isActive('/')}>
            {t('navigation.dashboard')}
          </Link>
          <Link to="/tasks" className={isActive('/tasks')}>
            {t('navigation.tasks')}
          </Link>
          <Link to="/analytics" className={isActive('/analytics')}>
            {t('navigation.analytics')}
          </Link>
          <Link to="/call" className={`nav-call-btn ${isActive('/call')}`}>
            📞 {t('navigation.call')}
          </Link>
        </div>

        <div className="nav-user">
          <div className="language-selector">
            <select 
              value={i18n.language} 
              onChange={(e) => changeLanguage(e.target.value)}
              className="language-dropdown"
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
          
          <Link to="/profile" className="user-profile">
            <div className="user-avatar">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <span>{user?.username}</span>
          </Link>

          <button onClick={signOut} className="sign-out-btn">
            {t('navigation.signOut')}
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;

