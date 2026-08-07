import React, { useState, useEffect } from 'react';
import { getUserBills } from '../services/firebaseDataService';
import { useTranslation } from 'react-i18next';

function NotificationCenter({ user }) {
  const { t } = useTranslation();
  const [bills, setBills] = useState([]);
  const [activeBusinessId, setActiveBusinessId] = useState(() => {
    return localStorage.getItem('activeBusinessId') || 'apex_retailers';
  });

  useEffect(() => {
    const handleBusinessChanged = (e) => {
      if (e.detail?.businessId) {
        setActiveBusinessId(e.detail.businessId);
      }
    };
    window.addEventListener('businessChanged', handleBusinessChanged);
    return () => window.removeEventListener('businessChanged', handleBusinessChanged);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    getUserBills(user.uid)
      .then(fetched => {
        const filtered = fetched.filter(b => {
          if (!b.businessId) return activeBusinessId === 'apex_retailers';
          return b.businessId === activeBusinessId;
        });
        setBills(filtered);
      })
      .catch(e => console.error(e));
  }, [user?.uid, activeBusinessId]);

  const pendingCount = bills.filter(b => !b.filed).length;

  const alerts = [
    {
      iconKey: 'warning',
      title: t('notif_invalid_gstin_title', 'High Risk: Invalid GSTIN Format'),
      desc: t('notif_invalid_gstin_desc', 'Invoice upload #INV-AUTO contains an invalid GSTIN code. Verify the supplier registration registry to prevent Input Tax Credit losses.'),
      category: t('compliance_category', 'Compliance'),
      time: t('one_hour_ago', '1 hour ago')
    },
    {
      iconKey: 'milestone',
      title: t('notif_gstr_approaching_title', 'Milestone: GSTR Deadline Approaching'),
      desc: t('notif_gstr_approaching_desc', { count: pendingCount, defaultValue: 'You have {{count}} pending invoices waiting GSTR-1 preparation. File before the due date to avoid penalty charges.' }),
      category: t('filing_category', 'Filing'),
      time: t('three_hours_ago', '3 hours ago')
    },
    {
      iconKey: 'analytics',
      title: t('notif_expense_shift_title', 'Expense Shift Detected'),
      desc: t('notif_expense_shift_desc', 'Office and telecom category expenditures spiked by 14% this month. Deep analytics charts are available.'),
      category: t('analytics_category', 'Analytics'),
      time: t('one_day_ago', '1 day ago')
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>{t('notification_workspace', 'Notification Workspace')}</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          {t('notification_workspace_subtitle', 'Overview center for all real-time compliance task alerts, tax deadlines, and AI agent summaries.')}
        </p>
      </div>

      {/* Notifications ledger */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: 0, marginBottom: '1.5rem' }}>{t('ai_notifications_feed', 'AI Notifications Feed')}</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {alerts.map((al, idx) => (
            <div key={idx} style={{ padding: '1rem 1.25rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', borderLeft: '4px solid var(--theme-secondary-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                <span style={{ fontSize: '0.65rem', background: 'var(--bg-secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--theme-secondary)' }}>{al.category}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{al.time}</span>
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0.25rem 0', display: 'flex', alignItems: 'center' }}>
                {al.iconKey === 'warning' && (
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '0.5rem', color: 'var(--error)', flexShrink: 0 }}>
                    <path d="m10.29 3.86 8.47 14.71c.77 1.34-.19 3-1.73 3H3.64c-1.54 0-2.5-1.66-1.73-3L10.29 3.86Z"/>
                    <line x1="12" x2="12" y1="9" y2="13"/>
                    <line x1="12" x2="12.01" y1="17" y2="17"/>
                  </svg>
                )}
                {al.iconKey === 'milestone' && (
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '0.5rem', color: 'var(--theme-secondary)', flexShrink: 0 }}>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                )}
                {al.iconKey === 'analytics' && (
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '0.5rem', color: 'var(--success)', flexShrink: 0 }}>
                    <path d="M3 3v18h18"/>
                    <path d="m18.7 9.3-5.1 5.2-2.8-2.7-4.3 4.3"/>
                  </svg>
                )}
                <span>{al.title}</span>
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {al.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default NotificationCenter;
