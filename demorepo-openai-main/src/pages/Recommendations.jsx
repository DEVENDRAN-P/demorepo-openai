import React, { useState, useEffect } from 'react';
import { getUserBills } from '../services/firebaseDataService';

function Recommendations({ user }) {
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
        // bills loaded successfully
        console.log('Loaded bills count:', filtered.length);
      })
      .catch(e => console.error(e));
  }, [user?.uid, activeBusinessId]);


  const list = [
    {
      title: 'Claim BSNL Telecom ITC credit',
      desc: 'Contact BSNL customer helpline or login to the billing portal to add your active GSTIN number. Once registered, all monthly broadband bills will carry your GST credit.',
      category: 'Tax Savings',
      priority: 'High',
      saving: '₹2,800/year'
    },
    {
      title: 'Fix math discrepancy on supplier bill',
      desc: 'Verify calculations breakdown in invoice #INV-AUTO. Contact supplier if there is an error in their billing systems, or correct the entry manually.',
      category: 'Correction',
      priority: 'Medium',
      saving: 'Audit Safety'
    },
    {
      title: 'Lock GSTR returns before quarterly deadline',
      desc: 'File GSTR-1 and GSTR-3B filings. Delayed returns incur penalty fees on portal.',
      category: 'Compliance',
      priority: 'High',
      saving: 'Fine Prevention'
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Tax Optimization Advisor</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Continuously audit transactions to identify missing deductions, supplier correction tasks, and compliance checks.
        </p>
      </div>

      {/* Recommendations ledger */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: 0, marginBottom: '1.5rem' }}>AI Optimization Action Checklist</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {list.map((rec, idx) => (
            <div key={idx} style={{ padding: '1.25rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', borderLeft: '5px solid var(--theme-primary-light)' }}>
              <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.65rem', background: 'var(--bg-secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--theme-primary-light)' }}>{rec.category}</span>
                <span className={`badge-premium ${rec.priority === 'High' ? 'badge-critical' : 'badge-good'}`} style={{ fontSize: '0.65rem' }}>
                  {rec.priority} Priority
                </span>
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: '0.25rem 0 0.5rem 0' }}>{rec.title}</h4>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {rec.desc}
              </p>
              <div style={{ fontSize: '0.75rem', color: 'var(--theme-secondary-light)', fontWeight: 700 }}>
                💰 Estimated Saving: {rec.saving}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default Recommendations;
