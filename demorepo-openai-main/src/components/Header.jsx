import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDarkMode } from '../context/DarkModeContext';

const BUSINESSES = [
  { id: 'apex_retailers', name: 'Apex Retailers', gstin: '29ABCDE1234F2Z5', compliance: 95, status: 'Ready' },
  { id: 'nexgen_solutions', name: 'NexGen Software Solutions', gstin: '27XYZAB5678C1Z0', compliance: 88, status: 'Auditing' },
  { id: 'phoenix_logistics', name: 'Phoenix Logistics', gstin: '07AAACP1234A1Z9', compliance: 100, status: 'Filed' }
];

function Header({ onMenuClick }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [activeBusiness, setActiveBusiness] = useState(() => {
    const saved = localStorage.getItem('activeBusinessId') || 'apex_retailers';
    return BUSINESSES.find(b => b.id === saved) || BUSINESSES[0];
  });

  const [headerSearch, setHeaderSearch] = useState('');

  // Sync active business shifts
  useEffect(() => {
    const handleBusinessChanged = (e) => {
      if (e.detail?.businessId) {
        const match = BUSINESSES.find(b => b.id === e.detail.businessId);
        if (match) setActiveBusiness(match);
      }
    };
    window.addEventListener('businessChanged', handleBusinessChanged);
    return () => window.removeEventListener('businessChanged', handleBusinessChanged);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (headerSearch.trim()) {
      navigate(`/search?q=${encodeURIComponent(headerSearch)}`);
      setHeaderSearch('');
    }
  };

  return (
    <header style={{
      height: '65px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 990,
      flexShrink: 0
    }}>
      
      {/* Left: Active Entity & Compliance details */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          onClick={onMenuClick}
          className="header-menu-btn"
          title="Toggle Navigation Menu"
        >
          ☰
        </button>
        <div>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {activeBusiness.name}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
            <span>GSTIN: {activeBusiness.gstin}</span>
            <span>•</span>
            <span style={{ color: 'var(--theme-secondary-light)' }}>Filing: {activeBusiness.status}</span>
          </div>
        </div>

        {/* Quick Compliance widget */}
        <div className="header-compliance-score" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Score:</span>
          <strong style={{ color: activeBusiness.compliance >= 90 ? 'var(--success)' : 'var(--warning)' }}>
            {activeBusiness.compliance}%
          </strong>
        </div>
      </div>

      {/* Center: Global Header Search */}
      <form onSubmit={handleSearchSubmit} style={{ flex: 1, maxWidth: '350px', margin: '0 1.5rem', display: 'block' }} className="header-search-form">
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem' }}>🔍</span>
          <input 
            type="text" 
            placeholder="Search transactions, bills, settings..." 
            value={headerSearch}
            onChange={(e) => setHeaderSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '0.4rem 1rem 0.4rem 2rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              outline: 'none'
            }}
          />
        </div>
      </form>

      {/* Right: Actions, Notifications & Shortcuts */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        
        {/* Quick AI Action button */}
        <button 
          onClick={() => navigate('/agent')}
          className="btn btn-outline"
          style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem', border: '1px solid var(--theme-secondary)' }}
        >
          <span>⚡</span> <span className="header-btn-text">AI Agent</span>
        </button>

        {/* Quick Upload shortcut */}
        <button 
          onClick={() => navigate('/bill-upload')}
          className="btn btn-primary"
          style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <span>📤</span> <span className="header-btn-text">Upload</span>
        </button>

        {/* Notifications Shortcut */}
        <button 
          onClick={() => navigate('/notifications')}
          style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', position: 'relative' }}
        >
          <span>🔔</span>
          <span style={{ position: 'absolute', top: '2px', right: '2px', width: '6px', height: '6px', background: 'var(--error)', borderRadius: '50%' }}></span>
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '1.2rem',
            cursor: 'pointer',
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isDarkMode ? '#fbbf24' : '#64748b',
            transition: 'transform 0.2s, color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>

        {/* User profile dropdown shortcut */}
        <button 
          onClick={() => navigate('/settings')}
          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-secondary) 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 700
          }}>
            {user?.name?.charAt(0) || '👤'}
          </div>
        </button>

      </div>

    </header>
  );
}

export default Header;
