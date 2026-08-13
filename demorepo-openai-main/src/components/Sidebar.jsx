import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Logo from './Logo';
import { useTranslation } from 'react-i18next';
import { getUserBusinesses } from '../utils/businessHelper';
import { fetchActivePlan } from '../services/subscriptionService';
import { preloadRoute } from '../utils/preloadRoutes';

// Removed static BUSINESSES definition to enforce isolated user workspaces

// Helper to render SVG Icons directly
const iconMap = {
  dashboard: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1"/>
      <rect x="14" y="3" width="7" height="5" rx="1"/>
      <rect x="14" y="12" width="7" height="9" rx="1"/>
      <rect x="3" y="16" width="7" height="5" rx="1"/>
    </svg>
  ),
  agent: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2"/>
      <circle cx="12" cy="5" r="2"/>
      <path d="M12 7v4M8 15h.01M16 15h.01"/>
    </svg>
  ),
  upload: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
    </svg>
  ),
  invoices: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9h6m-6 4h6"/>
    </svg>
  ),
  compliance: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12l2 2 4-4m5 .5a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  ),
  health: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  audit: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="11" y1="8" x2="11" y2="14"/>
      <line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
  ),
  forecast: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/>
      <path d="m19 9-5 5-4-4-3 3"/>
    </svg>
  ),
  reports: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 17v-2m3 2v-4m3 2V9m-9 8h12"/>
    </svg>
  ),
  insights: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
    </svg>
  ),
  recommendations: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
    </svg>
  ),
  expenses: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <line x1="2" y1="10" x2="22" y2="10"/>
      <path d="M6 14h.01M10 14h.01"/>
    </svg>
  ),
  vendors: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  business: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  notifications: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9z"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  documents: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  chat: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  search: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  settings: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  penalty: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  pricing: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <line x1="12" y1="4" x2="12" y2="20"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
    </svg>
  ),
  profile: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  support: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
};

function Sidebar({ mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Single central logout path: sign out via AuthContext (which clears all
  // user-specific caches) and land on the public Home page.
  const handleLogout = async () => {
    if (window.confirm(t('logout_confirm', 'Are you sure you want to log out?'))) {
      try {
        await logout();
        navigate('/');
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
  };
  // Collapsed (icon-only) applies to tablet widths only (769–1199px).
  // Mobile (<=768px) is a full-width drawer so the menu must stay expanded,
  // and desktop (>=1200px) keeps the expanded sidebar.
  const [collapsed, setCollapsed] = useState(() => {
    const w = window.innerWidth;
    return w > 768 && w < 1200;
  });
  const [userBusinesses, setUserBusinesses] = useState([]);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setCollapsed(w > 768 && w < 1200);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (user) {
      setUserBusinesses(getUserBusinesses(user));
    }
  }, [user]);

  const [activeBusiness, setActiveBusiness] = useState(() => {
    const list = getUserBusinesses(user);
    const saved = localStorage.getItem('activeBusinessId');
    return list.find(b => b.id === saved) || list[0] || { id: '', name: '', gstin: '' };
  });

  // Keep activeBusiness in sync if userBusinesses list updates
  useEffect(() => {
    if (userBusinesses.length > 0) {
      const saved = localStorage.getItem('activeBusinessId');
      const found = userBusinesses.find(b => b.id === saved);
      if (found) {
        setActiveBusiness(found);
      } else {
        setActiveBusiness(userBusinesses[0]);
        localStorage.setItem('activeBusinessId', userBusinesses[0].id);
      }
    }
  }, [userBusinesses]);

  // Synchronize on business change event triggers
  useEffect(() => {
    const handleBusinessChanged = (e) => {
      if (e.detail?.businessId && userBusinesses.length > 0) {
        const found = userBusinesses.find(b => b.id === e.detail.businessId);
        if (found) setActiveBusiness(found);
      }
    };
    window.addEventListener('businessChanged', handleBusinessChanged);
    return () => window.removeEventListener('businessChanged', handleBusinessChanged);
  }, [userBusinesses]);

  useEffect(() => {
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  }, [location.pathname, setMobileOpen]);

  const [selectedPlan, setSelectedPlan] = useState(() => {
    return localStorage.getItem('saas_active_plan') || 'free';
  });

  // Resolve the ACTUAL plan from the server. localStorage is only a display cache —
  // entitlement is always enforced by the backend.
  useEffect(() => {
    let mounted = true;
    fetchActivePlan().then((plan) => {
      if (mounted) setSelectedPlan(plan);
    });
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    const handlePlanChanged = () => {
      fetchActivePlan().then((plan) => setSelectedPlan(plan));
    };
    window.addEventListener('planChanged', handlePlanChanged);
    return () => window.removeEventListener('planChanged', handlePlanChanged);
  }, []);

  const handleBusinessChange = (e) => {
    const targetId = e.target.value;
    const targetIndex = userBusinesses.findIndex(b => b.id === targetId);

    // Enforce tier-based business profile limits
    if (selectedPlan === 'free' && targetIndex > 0) {
      alert(t('alert_single_business_limit', '⚠️ Single Business Limit: Under the Free Tier, you are limited to 1 business profile. Upgrade to the Pro Plan to manage up to 2 businesses, or Business Plan to unlock up to 5 businesses.'));
      return;
    }

    if (selectedPlan === 'pro' && targetIndex >= 2) {
      alert(t('alert_pro_business_limit', '⚠️ Pro Business Limit: Under the Pro Tier, you can manage up to 2 businesses. Upgrade to the Business Plan to manage up to 5 business entities and unlock continuous compliance monitoring.'));
      return;
    }

    const selected = userBusinesses.find(b => b.id === targetId);
    if (selected) {
      setActiveBusiness(selected);
      localStorage.setItem('activeBusinessId', selected.id);
      window.dispatchEvent(new CustomEvent('businessChanged', { detail: { businessId: selected.id } }));
    }
  };

  const menuItems = [
    { name: 'Dashboard', translationKey: 'dashboard', path: '/dashboard', icon: iconMap.dashboard },
    { name: 'AI Accountant Agent', translationKey: 'ai_accountant_agent_menu', path: '/agent', icon: iconMap.agent },
    { name: 'Agent Activity', translationKey: 'agent_activity', path: '/agent-activity', icon: iconMap.agent },
    { name: 'Invoice Intelligence', translationKey: 'invoice_intelligence_menu', path: '/bill-upload', icon: iconMap.upload },
    { name: 'Invoices', translationKey: 'invoices_ledger', path: '/invoices', icon: iconMap.invoices },
    { name: 'Document Assistant', translationKey: 'document_assistant', path: '/documents', icon: iconMap.documents },
    { name: 'Compliance Center', translationKey: 'compliance_center', path: '/compliance', icon: iconMap.compliance },
    { name: 'Penalty Center', translationKey: 'penalty_center', path: '/penalty', icon: iconMap.penalty },
    { name: 'Business Health', translationKey: 'business_health_index', path: '/health', icon: iconMap.health },
    { name: 'Reports', translationKey: 'analytics_reports', path: '/reports', icon: iconMap.reports },
    { name: 'Analytics', translationKey: 'analytics', path: '/expenses', icon: iconMap.expenses },
    { name: 'Business Directory', translationKey: 'business_directory', path: '/business', icon: iconMap.business },
    { name: 'Notifications', translationKey: 'notifications', path: '/notifications', icon: iconMap.notifications },
    { name: 'Pricing & Billing', translationKey: 'pricing_billing', path: '/pricing', icon: iconMap.pricing },
    { name: 'Settings', translationKey: 'settings', path: '/settings', icon: iconMap.settings },
    { name: 'Help', translationKey: 'help', path: '/support', icon: iconMap.support },
    { name: 'Profile', translationKey: 'profile', path: '/profile', icon: iconMap.profile }
  ];

  return (
    <aside 
      className={`sidebar-aside ${mobileOpen ? 'mobile-open' : ''}`}
      role="navigation"
      aria-label={t('main_navigation', 'Main navigation')}
      style={{
        width: collapsed ? '70px' : '260px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 1000,
        flexShrink: 0
      }}
    >
      
      {/* Brand Header */}
      <div style={{
        padding: collapsed ? '1.25rem 0.5rem' : '1.25rem 1.5rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        overflow: 'hidden',
        gap: '0.5rem'
      }}>
        {collapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
            <Logo variant="icon" size="28px" onClick={() => setCollapsed(false)} style={{ cursor: 'pointer' }} />
            <button 
              onClick={() => setCollapsed(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', outline: 'none', padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title={t('expand_sidebar', 'Expand Sidebar')}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        ) : (
          <>
            <Logo variant="sidebar" size="145px" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button 
                onClick={() => setCollapsed(true)}
                className="sidebar-collapse-btn"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', outline: 'none', padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title={t('collapse_sidebar', 'Collapse Sidebar')}
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <button 
                onClick={() => { if (setMobileOpen) setMobileOpen(false); }}
                className="sidebar-mobile-close"
                aria-label={t('close_menu', 'Close menu')}
                title={t('close_menu', 'Close menu')}
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Entity Switcher */}
      {!collapsed && (
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
          <select 
            value={activeBusiness.id} 
            onChange={handleBusinessChange}
            style={{
              width: '100%',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-md)',
              padding: '0.5rem',
              fontWeight: 600,
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {userBusinesses.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation menu list */}
      <nav style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0.75rem 0.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem'
      }}>
        {menuItems.map((item, idx) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={idx}
              to={item.path}
              onClick={() => { if (setMobileOpen) setMobileOpen(false); }}
              // Warm up the page chunk while the user is still hovering the link,
              // so clicking it navigates instantly (no Suspense fallback).
              onMouseEnter={() => preloadRoute(item.path)}
              onFocus={() => preloadRoute(item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 1rem',
                borderRadius: 'var(--radius-md)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--bg-tertiary)' : 'transparent',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: isActive ? 600 : 500,
                transition: 'all 0.2s ease',
                borderLeft: isActive ? '3px solid var(--theme-secondary)' : '3px solid transparent'
              }}
              className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}
            >
              <span style={{ display: 'flex', alignItems: 'center', color: isActive ? 'var(--theme-secondary)' : 'inherit' }}>
                {item.icon}
              </span>
              {!collapsed && <span>{t(item.translationKey, item.name)}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User profile section at the bottom */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        overflow: 'hidden'
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-secondary) 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.9rem',
              flexShrink: 0
            }}>
              {user?.name?.charAt(0) || <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || t('guest_user', 'Guest User')}
              </span>
              <span style={{ fontSize: '0.675rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email || 'guest@gstbuddy.ai'}
              </span>
              <span style={{
                fontSize: '0.6rem',
                color: 'white',
                background: (!user || selectedPlan === 'free') ? '#64748b' : selectedPlan === 'pro' ? 'var(--theme-primary-light)' : '#14b8a6',
                padding: '0.1rem 0.375rem',
                borderRadius: '4px',
                width: 'fit-content',
                marginTop: '0.25rem',
                fontWeight: 700,
                textTransform: 'uppercase'
              }}>
                {!user ? t('not_subscribed', 'Not Subscribed') : selectedPlan === 'free' ? t('free_tier', 'Free Tier') : selectedPlan === 'pro' ? t('pro_tier', 'Pro Tier') : t('business_tier', 'Business Tier')}
              </span>
            </div>
          </div>
        )}
        
        <button 
          onClick={user ? handleLogout : () => navigate('/')}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: user ? '#ef4444' : 'var(--primary-600)',
            cursor: 'pointer',
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            justifyContent: collapsed ? 'center' : 'flex-start'
          }}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{user ? <><path d="M16 17l5-5-5-5M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></> : <><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></>}</svg>
          {!collapsed && <span>{user ? t('sign_out', 'Sign Out') : t('sign_in', 'Sign In')}</span>}
        </button>
      </div>

    </aside>
  );
}

export default Sidebar;
