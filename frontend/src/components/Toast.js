import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import './Toast.css';

// Toast Context for global access
const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback(({ type = 'info', title, message, duration = 3000, action }) => {
    const id = Date.now() + Math.random();
    const toast = { id, type, title, message, action, duration };

    setToasts(prev => [...prev, toast]);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div className="toast-container" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map(toast => (
          <ToastItem key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ id, type, title, message, action, duration, onClose }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [onClose, duration]);

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  return (
    <div className={`toast toast-${type}`} role="alert">
      <div className="toast-content">
        <div className="toast-icon" aria-hidden="true">{icons[type]}</div>
        <div className="toast-text">
          {title && <div className="toast-title">{title}</div>}
          <div className="toast-message">{message || title}</div>
        </div>
        {action && (
          <button className="toast-action" onClick={action.onClick}>
            {action.label}
          </button>
        )}
        <button className="toast-close" onClick={onClose} aria-label="Close notification" type="button">
          ✕
        </button>
      </div>
    </div>
  );
}

// Legacy component for backward compatibility
export default function Toast({ message, type = 'success', onClose, duration = 4000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [onClose, duration]);

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  const ariaLabels = {
    success: 'Success notification',
    error: 'Error notification',
    info: 'Information notification',
    warning: 'Warning notification',
  };

  return (
    <div
      className={`toast toast-${type}`}
      role="alert"
      aria-live="polite"
      aria-label={ariaLabels[type]}
    >
      <span className="toast-icon" aria-hidden="true">
        {icons[type]}
      </span>
      <span className="toast-message">{message}</span>
      <button
        className="toast-close"
        onClick={onClose}
        aria-label="Close notification"
        type="button"
      >
        ×
      </button>
    </div>
  );
}
