import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDarkMode } from '../context/DarkModeContext';
import { useTranslation } from 'react-i18next';
import { getUserBusinesses } from '../utils/businessHelper';

// Removed static BUSINESSES definition to enforce data isolation

function Header({ onMenuClick }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { t, i18n } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const [userBusinesses, setUserBusinesses] = useState([]);

  useEffect(() => {
    if (user) {
      setUserBusinesses(getUserBusinesses(user));
    }
  }, [user]);

  const [activeBusiness, setActiveBusiness] = useState(() => {
    const list = getUserBusinesses(user);
    const saved = localStorage.getItem('activeBusinessId');
    return list.find(b => b.id === saved) || list[0] || { id: '', name: '', gstin: '', compliance: 100, status: 'Ready' };
  });

  useEffect(() => {
    if (userBusinesses.length > 0) {
      const saved = localStorage.getItem('activeBusinessId');
      const found = userBusinesses.find(b => b.id === saved);
      if (found) {
        setActiveBusiness(found);
      } else {
        setActiveBusiness(userBusinesses[0]);
      }
    }
  }, [userBusinesses]);

  const [headerSearch, setHeaderSearch] = useState('');

  // Sync active business shifts
  useEffect(() => {
    const handleBusinessChanged = (e) => {
      if (e.detail?.businessId && userBusinesses.length > 0) {
        const match = userBusinesses.find(b => b.id === e.detail.businessId);
        if (match) setActiveBusiness(match);
      }
    };
    window.addEventListener('businessChanged', handleBusinessChanged);
    return () => window.removeEventListener('businessChanged', handleBusinessChanged);
  }, [userBusinesses]);

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
          style={{ alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
        <div>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {activeBusiness.name}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--text-tertiary)' }} className="header-business-info">
            <span>GSTIN: {activeBusiness.gstin}</span>
            <span className="header-business-info-bullet">•</span>
            <span style={{ color: 'var(--theme-secondary-light)' }}>{t('filing_status', 'Filing:')} {activeBusiness.status}</span>
          </div>
        </div>

        {/* Quick Compliance widget */}
        <div className="header-compliance-score" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{t('compliance_score_label', 'Score')}:</span>
          <strong style={{ color: activeBusiness.compliance >= 90 ? 'var(--success)' : 'var(--warning)' }}>
            {activeBusiness.compliance}%
          </strong>
        </div>
      </div>

      {/* Center: Global Header Search */}
      <form onSubmit={handleSearchSubmit} style={{ flex: 1, maxWidth: '350px', margin: '0 1.5rem', display: 'block' }} className="header-search-form">
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)' }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input 
            type="text" 
            placeholder={t('header_search_placeholder', 'Search transactions, bills, settings...')} 
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
          <span className="header-btn-icon"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg></span>           <span className="header-btn-text">{t('ai_agent', 'AI Agent')}</span>
        </button>

        {/* Quick Upload shortcut */}
        <button 
          onClick={() => navigate('/bill-upload')}
          className="btn btn-primary"
          style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <span className="header-btn-icon"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg></span>           <span className="header-btn-text">{t('upload')}</span>
        </button>

        {/* Notifications Shortcut */}
        <button 
          onClick={() => navigate('/notifications')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem', color: 'var(--text-secondary)' }}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9z"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
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
          title={isDarkMode ? t('switch_to_light_mode') : t('switch_to_dark_mode')}
        >
          {isDarkMode ? (
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          ) : (
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          )}
        </button>

        {/* Language Selector Dropdown */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button 
            onClick={() => setLangOpen(!langOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.15rem',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            title={t('change_language', 'Change Language')}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </button>
          {langOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '0.5rem',
              width: '150px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
              zIndex: 1000
            }}>
              {['en', 'hi', 'ta', 'ml', 'kn'].map((code, index) => (
                <button
                  key={code}
                  onClick={() => {
                    i18n.changeLanguage(code);
                    localStorage.setItem('language', code);
                    setLangOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    border: 'none',
                    background: i18n.language === code ? 'var(--primary-50)' : 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: i18n.language === code ? 700 : 500,
                    color: i18n.language === code ? 'var(--primary-700)' : 'var(--text-secondary)',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" x2="22" y1="12" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  </span>
                  <span>{[t('english'), t('hindi'), t('tamil'), t('malayalam'), t('kannada')]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

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
            {user?.name?.charAt(0) || <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
          </div>
        </button>

      </div>

    </header>
  );
}

export default Header;
