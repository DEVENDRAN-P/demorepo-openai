import React, { useEffect } from 'react';

function Notification({ message, type = 'success', duration = 3000, onClose }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  const colors = {
    success: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
    error: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
    warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
    info: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  };

  const style = colors[type] || colors.info;

  return (
    <div
      className="notification animate-slide-in"
      style={{
        background: style.bg,
        borderLeft: `4px solid ${style.border}`,
        color: style.text,
      }}
    >
      <span style={{ fontSize: '1.25rem' }}>{icons[type]}</span>
      <p style={{ margin: 0, fontWeight: 500, color: style.text }}>{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.25rem',
            color: style.text,
            opacity: 0.7,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

export default Notification;
