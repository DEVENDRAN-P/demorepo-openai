import React, { useState, useEffect } from 'react';
import { getUserBills } from '../services/firebaseDataService';

function NotificationCenter({ user }) {
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
      title: '⚠️ High Risk: Invalid GSTIN Format',
      desc: 'Invoice upload #INV-AUTO contains an invalid GSTIN code. Verify the supplier registration registry to prevent Input Tax Credit losses.',
      category: 'Compliance',
      time: '1 hour ago'
    },
    {
      title: '📅 Milestone: GSTR Deadline Approaching',
      desc: `You have ${pendingCount} pending invoices waiting GSTR-1 preparation. File before the due date to avoid penalty charges.`,
      category: 'Filing',
      time: '3 hours ago'
    },
    {
      title: '📈 Expense Shift Detected',
      desc: 'Office and telecom category expenditures spiked by 14% this month. Deep analytics charts are available.',
      category: 'Analytics',
      time: '1 day ago'
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Notification Workspace</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Overview center for all real-time compliance task alerts, tax deadlines, and AI agent summaries.
        </p>
      </div>

      {/* Notifications ledger */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: 0, marginBottom: '1.5rem' }}>AI Notifications Feed</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {alerts.map((al, idx) => (
            <div key={idx} style={{ padding: '1rem 1.25rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', borderLeft: '4px solid var(--theme-secondary-light)' }}>
              <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                <span style={{ fontSize: '0.65rem', background: 'var(--bg-secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--theme-secondary)' }}>{al.category}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{al.time}</span>
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0.25rem 0' }}>{al.title}</h4>
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
