import React, { useState, useEffect } from 'react';
import { getUserBills } from '../services/firebaseDataService';
import { getUserBusinesses } from '../utils/businessHelper';

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

  const [bills, setBills] = useState([]);
  const [userBusinesses, setUserBusinesses] = useState([]);

  useEffect(() => {
    if (user) {
      setUserBusinesses(getUserBusinesses(user));
    }
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;
    getUserBills(user.uid)
      .then(fetched => {
        const firstBizId = userBusinesses[0]?.id || 'apex_retailers';
        const filtered = fetched.filter(b => {
          if (!b.businessId) return activeBusinessId === firstBizId;
          return b.businessId === activeBusinessId;
        });
        setBills(filtered);
        console.log('Loaded bills count:', filtered.length);
      })
      .catch(e => console.error(e));
  }, [user?.uid, activeBusinessId, userBusinesses]);


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

        {bills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🎯</span>
            <strong style={{ display: 'block', fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Advisor Recommendations</strong>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto', lineHeight: '1.6' }}>
              Tax advisory tips, Input Tax Credit (ITC) alerts, and late fee warnings will populate dynamically after invoices are uploaded.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {list.map((rec, idx) => (
              <div key={idx} style={{ padding: '1.25rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', borderLeft: '5px solid var(--theme-primary-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
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
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', verticalAlign: 'middle' }}><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--primary-600)' }}><circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9h6a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z"/></svg> Estimated Saving: {rec.saving}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default Recommendations;
