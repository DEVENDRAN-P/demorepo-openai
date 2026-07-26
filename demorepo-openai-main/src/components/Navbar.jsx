import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { logout } from '../services/authService';
import { useDarkMode } from '../context/DarkModeContext';

// Inline SVG icons (clean, production-grade)
const IconBriefcase = (props) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M3 13h18" />
  </svg>
);
const IconHome = ({ active }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={active ? 'var(--primary-700)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" />
  </svg>
);
const IconUpload = ({ active }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={active ? 'var(--primary-700)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5-5 5 5" />
    <path d="M12 15V5" />
  </svg>
);
const IconClipboard = ({ active }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={active ? 'var(--primary-700)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="4" rx="1" />
    <path d="M9 4H5a2 2 0 0 0-2 2v13a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V6a2 2 0 0 0-2-2h-4" />
    <path d="M9 12h6M9 16h6" />
  </svg>
);
const IconChart = ({ active }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={active ? 'var(--primary-700)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <rect x="7" y="10" width="3" height="7" />
    <rect x="12" y="6" width="3" height="11" />
    <rect x="17" y="13" width="3" height="4" />
  </svg>
);
const IconChat = ({ active }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={active ? 'var(--primary-700)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <circle cx="9" cy="10" r="1" />
    <circle cx="12" cy="10" r="1" />
    <circle cx="15" cy="10" r="1" />
  </svg>
);
const IconSupport = ({ active }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={active ? 'var(--primary-700)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 21H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2z" />
    <path d="M10 5V3h4v2" />
    <path d="M12 13v1" />
    <path d="M9 12a3 3 0 0 0 6 0" />
  </svg>
);
const IconGlobe = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);
const IconPalette = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22a10 10 0 1 1 10-10c0 3-2 4-4 4h-1a2 2 0 0 0-2 2v1c0 2-1 3-3 3z" />
    <circle cx="7.5" cy="10.5" r="1.5" />
    <circle cx="12" cy="7.5" r="1.5" />
    <circle cx="16.5" cy="10.5" r="1.5" />
  </svg>
);
const IconUser = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconSettings = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconPhone = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const IconHelp = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconLogOut = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const IconMenu = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
const IconClose = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconWhatsApp = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004c-1.022 0-2.032.218-2.992.654-5.61 2.63-7.423 8.816-3.906 13.938 1.92 2.858 5.264 4.53 8.896 4.53 5.343 0 9.788-4.308 9.988-9.682.049-.956.066-1.922.03-2.887-.006-.122-.039-.243-.06-.364-.09-1.054-.313-2.083-.716-3.058-2.615-6.325-9.412-9.587-16.08-6.761-1.83 1.123-3.295 2.67-4.226 4.39 6.168-2.236 12.324 1.367 14.288 6.937 1.964 5.57-1.04 11.9-6.93 14.158-1.843.677-3.866.77-5.835.307-6.305-1.514-10.68-7.582-9.625-14.191.23-1.502 1.008-3.09 2.176-4.265 1.168-1.175 2.692-2.087 4.263-2.524.893-.243 1.82-.367 2.775-.366z" />
  </svg>
);
const IconMoon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
const IconSun = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

// Theme support
const THEMES = {
  indigo: { '--primary-50': '#eef2ff', '--primary-600': '#4f46e5', '--primary-700': '#4338ca' },
  teal: { '--primary-50': '#f0fdfa', '--primary-600': '#0d9488', '--primary-700': '#0f766e' },
  amber: { '--primary-50': '#fffbeb', '--primary-600': '#d97706', '--primary-700': '#b45309' },
};

function Navbar({ user }) {
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode, resetTheme } = useDarkMode();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'indigo');

  // Refs for click-outside detection
  const themeRef = useRef(null);
  const langRef = useRef(null);
  const menuRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (themeRef.current && !themeRef.current.contains(event.target)) {
        setThemeOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target)) {
        setLangOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const applyTheme = (name) => {
    const def = THEMES[name] || THEMES.indigo;
    Object.entries(def).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleThemeChange = (name) => {
    setTheme(name);
    localStorage.setItem('theme', name);
    applyTheme(name);
    setThemeOpen(false);
  };

  const handleLogout = async () => {
    if (window.confirm(t('logout_confirm'))) {
      try {
        await logout();
        localStorage.removeItem('user');
        resetTheme();
        navigate('/login');
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    setLangOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/dashboard', label: t('dashboard'), icon: (a) => <IconHome active={a} /> },
    { path: '/bill-upload', label: t('upload_bill'), icon: (a) => <IconUpload active={a} /> },
    { path: '/gst-forms', label: t('gst_forms'), icon: (a) => <IconClipboard active={a} /> },
    { path: '/reports', label: t('reports'), icon: (a) => <IconChart active={a} /> },
    { path: '/chat', label: t('ai_assistant'), icon: (a) => <IconChat active={a} /> },
    { path: '/support', label: t('support'), icon: (a) => <IconSupport active={a} /> },
  ];

  const handleNavClick = (path) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  return (
    <nav style={{
      background: 'var(--bg-primary)',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      boxShadow: 'var(--shadow-sm)',
      transition: 'all 0.3s ease',
    }}>
      <div className="container" style={{ padding: '0 1.5rem', maxWidth: '100%' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '4.5rem',
          gap: '1rem',
          minWidth: 0,
        }}>
          {/* Logo */}
          <Link to="/dashboard" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.875rem',
            textDecoration: 'none',
            minWidth: 0,
            flex: '0 1 auto',
          }}>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
              flexShrink: 0,
            }}>
              <IconBriefcase />
            </div>
            <div style={{ minWidth: 0 }} className="logo-text">
              <h1 style={{
                fontSize: '1.125rem',
                fontWeight: 800,
                margin: 0,
                background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.025em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {t('app_name')}
              </h1>
            </div>
          </Link>

          {/* Nav Items - Desktop */}
          <div style={{
            display: 'none',
            alignItems: 'center',
            gap: '0.375rem',
          }} className="nav-desktop">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem 1rem',
                    borderRadius: 'var(--radius-lg)',
                    textDecoration: 'none',
                    color: active ? 'var(--primary-700)' : 'var(--text-secondary)',
                    background: active ? 'var(--primary-50)' : 'transparent',
                    fontWeight: active ? 600 : 500,
                    fontSize: '0.875rem',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'var(--bg-secondary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  {item.icon(active)}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="btn btn-ghost btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDarkMode ? '#fbbf24' : '#6b7280',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                padding: '0.625rem',
              }}
              title={isDarkMode ? t('switch_to_light_mode') : t('switch_to_dark_mode')}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-secondary)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {isDarkMode ? <IconSun /> : <IconMoon />}
            </button>

            {/* WhatsApp Button */}
            <a
              href="https://chat.whatsapp.com/EIp9BBhF3PX3jAc3pghamL?mode=wwt"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#25D366',
                transition: 'all 0.2s ease',
              }}
              title={t('join_whatsapp_group')}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(37, 211, 102, 0.1)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <IconWhatsApp />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'none' }} className="whatsapp-label">
                {t('chat')}
              </span>
            </a>

            {/* Theme Selector - Hidden on mobile */}
            <div style={{ position: 'relative', display: 'none' }} className="theme-selector" ref={themeRef}>
              <button
                onClick={() => {
                  setThemeOpen(!themeOpen);
                  setLangOpen(false);
                }}
                className="btn btn-ghost btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', transition: 'all 0.3s ease' }}
                aria-label="Change theme"
              >
                <IconPalette />
                <span style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>
                  {theme}
                </span>
              </button>
              {themeOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  marginTop: '0.5rem',
                  width: '180px',
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-xl)',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                  zIndex: 60,
                  transition: 'all 0.3s ease',
                }}>
                  {/*
                    { key: 'indigo', name: 'Indigo', swatch: ['#eef2ff', '#4f46e5'] },
                    { key: 'teal', name: 'Teal', swatch: ['#f0fdfa', '#0d9488'] },
                    { key: 'amber', name: 'Amber', swatch: ['#fffbeb', '#d97706'] },
                  */}
                  {Object.entries(THEMES).map(([key, def]) => (
                    <button
                      key={key}
                      onClick={() => handleThemeChange(key)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: 'none',
                        background: theme === key ? (isDarkMode ? 'var(--bg-secondary)' : 'var(--primary-50)') : 'transparent',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: theme === key ? 700 : 500,
                        color: theme === key ? 'var(--primary-700)' : 'var(--text-secondary)',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.625rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{
                        display: 'inline-flex',
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        background: `linear-gradient(135deg, ${def['--primary-50']} 0%, ${def['--primary-700']} 100%)`,
                        border: '1px solid var(--border-color)',
                      }} />
                      <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Language Selector */}
            <div style={{ position: 'relative' }} ref={langRef}>
              <button
                onClick={() => {
                  setLangOpen(!langOpen);
                  setThemeOpen(false);
                }}
                className="btn btn-ghost btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', transition: 'all 0.3s ease' }}
              >
                <IconGlobe />
                <span style={{ textTransform: 'uppercase' }}>{i18n.language}</span>
              </button>
              {langOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  marginTop: '0.5rem',
                  width: '160px',
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-xl)',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                  zIndex: 50,
                  transition: 'all 0.3s ease',
                }}>
                  {['en', 'hi', 'ta', 'ml', 'kn'].map((code, index) => (
                    <button
                      key={code}
                      onClick={() => changeLanguage(code)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: 'none',
                        background: i18n.language === code ? 'var(--primary-50)' : 'var(--bg-primary)',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: i18n.language === code ? 600 : 500,
                        color: i18n.language === code ? 'var(--primary-700)' : 'var(--text-secondary)',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.625rem',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (i18n.language !== code) {
                          e.currentTarget.style.background = 'var(--bg-secondary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (i18n.language !== code) {
                          e.currentTarget.style.background = 'var(--bg-primary)';
                        }
                      }}
                    >
                      <span style={{ fontSize: '1.125rem' }}>{['🇬🇧', '🇮🇳', '🇮🇳', '🇮🇳', '🇮🇳'][index]}</span>
                      <span>{t(['english', 'hindi', 'tamil', 'malayalam', 'kannada'][index])}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User Menu */}
            <div style={{ position: 'relative', display: 'none' }} className="user-menu" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="btn btn-ghost btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  paddingRight: '0.875rem',
                }}
              >
                <div style={{
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}>
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {user?.name}
                </span>
              </button>
              {menuOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  marginTop: '0.5rem',
                  width: '280px',
                  minWidth: 'max-content',
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-xl)',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                  zIndex: 50,
                  transition: 'all 0.3s ease',
                }}>
                  <div style={{
                    padding: '0.875rem 1rem',
                    borderBottom: '1px solid var(--border-color)',
                    transition: 'all 0.3s ease',
                  }}>
                    <p style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      margin: 0,
                      transition: 'color 0.3s ease',
                    }}>
                      {user?.name}
                    </p>
                    <p style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-tertiary)',
                      margin: 0,
                      marginTop: '0.125rem',
                      transition: 'color 0.3s ease',
                      wordBreak: 'break-all',
                      overflowWrap: 'anywhere',
                      lineHeight: '1.4',
                    }}>
                      {user?.email}
                    </p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      padding: '0.75rem 1rem',
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <IconUser size={18} />
                    <span>{t('profile')}</span>
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      padding: '0.75rem 1rem',
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <IconSettings size={18} />
                    <span>{t('settings')}</span>
                  </Link>
                  <Link
                    to="/support?tab=contact"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      padding: '0.75rem 1rem',
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <IconPhone size={18} />
                    <span>Contact Us</span>
                  </Link>
                  <Link
                    to="/support"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      padding: '0.75rem 1rem',
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <IconHelp size={18} />
                    <span>{t('help')}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      padding: '0.75rem 1rem',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--error)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      textAlign: 'left',
                      borderTop: '1px solid var(--border-color)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--error-light)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <IconLogOut size={18} />
                    <span>{t('logout')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-menu-btn"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
              }}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div style={{
          background: 'var(--bg-primary)',
          borderTop: '1px solid var(--border-color)',
          padding: '1rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          maxHeight: 'calc(100vh - 4.5rem)',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}>
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => handleNavClick(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-lg)',
                  textDecoration: 'none',
                  color: active ? 'var(--primary-700)' : 'var(--text-secondary)',
                  background: active ? (isDarkMode ? 'var(--bg-secondary)' : 'var(--primary-50)') : 'transparent',
                  fontWeight: active ? 600 : 500,
                  fontSize: '0.9375rem',
                  transition: 'all 0.15s ease',
                }}
              >
                {item.icon(active)}
                <span>{item.label}</span>
              </Link>
            );
          })}
          <hr style={{ margin: '0.75rem 0', border: 'none', borderTop: '1px solid var(--border-color)' }} />
          <a
            href="https://chat.whatsapp.com/EIp9BBhF3PX3jAc3pghamL?mode=wwt"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              textDecoration: 'none',
              borderRadius: 'var(--radius-lg)',
              color: '#25D366',
              fontWeight: 600,
              fontSize: '0.9375rem',
              transition: 'all 0.15s ease',
              background: 'rgba(37, 211, 102, 0.05)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(37, 211, 102, 0.15)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(37, 211, 102, 0.05)'}
          >
            <IconWhatsApp />
            <span>Join WhatsApp Group</span>
          </a>
          <hr style={{ margin: '0.75rem 0', border: 'none', borderTop: '1px solid var(--border-color)' }} />
          <button
            onClick={() => {
              setLangOpen(!langOpen);
              setMobileMenuOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontWeight: 500,
              fontSize: '0.9375rem',
            }}
          >
            <IconGlobe />
            <span>{t('language')} ({i18n.language.toUpperCase()})</span>
          </button>
          {langOpen && (
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              padding: '0.5rem',
              marginBottom: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}>
              {['en', 'hi', 'ta', 'ml', 'kn'].map((code, index) => (
                <button
                  key={code}
                  onClick={() => {
                    changeLanguage(code);
                    setLangOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: 'none',
                    background: i18n.language === code ? (isDarkMode ? 'var(--bg-secondary)' : 'white') : 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: i18n.language === code ? 600 : 500,
                    color: i18n.language === code ? 'var(--primary-700)' : 'var(--text-secondary)',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    borderRadius: 'var(--radius-md)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (i18n.language !== code) {
                      e.currentTarget.style.background = 'var(--bg-secondary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (i18n.language !== code) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span>{['🇬🇧', '🇮🇳', '🇮🇳', '🇮🇳', '🇮🇳'][index]}</span>
                  <span>{t(['english', 'hindi', 'tamil', 'malayalam', 'kannada'][index])}</span>
                </button>
              ))}
            </div>
          )}
          <Link
            to="/profile"
            onClick={() => handleNavClick('/profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              textDecoration: 'none',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-secondary)',
              fontWeight: 500,
              fontSize: '0.9375rem',
            }}
          >
            <span>👤</span>
            <span>{t('profile')}</span>
          </Link>
          <Link
            to="/settings"
            onClick={() => handleNavClick('/settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              textDecoration: 'none',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-secondary)',
              fontWeight: 500,
              fontSize: '0.9375rem',
            }}
          >
            <span>⚙️</span>
            <span>{t('settings')}</span>
          </Link>
          <Link
            to="/support?tab=contact"
            onClick={() => handleNavClick('/support?tab=contact')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              textDecoration: 'none',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-secondary)',
              fontWeight: 500,
              fontSize: '0.9375rem',
            }}
          >
            <span>📞</span>
            <span>Contact Us</span>
          </Link>
          <Link
            to="/support"
            onClick={() => handleNavClick('/support')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              textDecoration: 'none',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-secondary)',
              fontWeight: 500,
              fontSize: '0.9375rem',
            }}
          >
            <span>❓</span>
            <span>{t('help')}</span>
          </Link>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              color: 'var(--error)',
              fontWeight: 500,
              fontSize: '0.9375rem',
            }}
          >
            <span>🚪</span>
            <span>{t('logout')}</span>
          </button>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .nav-desktop {
            display: flex !important;
          }
          .logo-text {
            display: block !important;
          }
          .mobile-menu-btn {
            display: none !important;
          }
          .theme-selector {
            display: block !important;
          }
          .user-menu {
            display: block !important;
          }
          .whatsapp-label {
            display: inline !important;
          }
        }
      `}</style>
    </nav>
  );
}

export default Navbar;