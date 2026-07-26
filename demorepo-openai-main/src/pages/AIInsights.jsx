import React, { useState, useEffect } from 'react';
import { getUserBills } from '../services/firebaseDataService';

function AIInsights({ user }) {
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

  // Compute mock insights list
  const pendingCount = bills.filter(b => !b.filed).length;
  
  const insights = [
    {
      title: 'Utilities Cost Variance Alert',
      type: 'Expense Trend',
      desc: `Your telecom and energy utility bills increased by 14% this month. Large invoice #${bills[0]?.invoiceNumber || '101'} accounts for the main variance chunk.`,
      impact: '₹1,200 additional overhead cash outlay.'
    },
    {
      title: 'BSNL Telecom GSTIN Correction opportunity',
      type: 'ITC Matching',
      desc: 'AI identified a broadband invoice containing empty/invalid GSTIN. Re-submitting the BSNL invoice with your active corporate GSTIN will unlock input credit claims.',
      impact: '₹280 cash refund recovery.'
    },
    {
      title: 'Quarterly compliance timeline review',
      type: 'Filing Alert',
      desc: `You have ${pendingCount} pending returns awaiting filing. Lock GSTR-1 ledger before the GSTR deadline to prevent late fee charges.`,
      impact: 'Potential ₹50/day portal delay fine.'
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>AI System Insights</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Daily compiled financial observations, risk anomalies, and tax variance reports.
        </p>
      </div>

      {/* Insights lists */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: 0, marginBottom: '1.5rem' }}>Active Insights Feed</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {insights.map((ins, idx) => (
            <div key={idx} style={{ padding: '1.25rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', borderLeft: '5px solid var(--theme-secondary-light)' }}>
              <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.65rem', background: 'var(--bg-secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--theme-secondary)' }}>{ins.type}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Updated Today</span>
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: '0.25rem 0 0.5rem 0' }}>{ins.title}</h4>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {ins.desc}
              </p>
              <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
                💡 Impact: {ins.impact}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default AIInsights;
