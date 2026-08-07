import React, { useState, useEffect } from 'react';
import { getUserBills } from '../services/firebaseDataService';

function ComplianceCenter({ user }) {
  const [bills, setBills] = useState([]);
  const [activeBusinessId, setActiveBusinessId] = useState(() => {
    return localStorage.getItem('activeBusinessId') || 'apex_retailers';
  });

  const [activePlan, setActivePlan] = useState(() => {
    return localStorage.getItem('saas_active_plan') || 'free';
  });

  useEffect(() => {
    const handlePlanChanged = () => {
      setActivePlan(localStorage.getItem('saas_active_plan') || 'free');
    };
    window.addEventListener('planChanged', handlePlanChanged);
    return () => window.removeEventListener('planChanged', handlePlanChanged);
  }, []);

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

  // Extract compliance warnings
  const issues = [];
  bills.forEach(bill => {
    const hasMathMismatch = Math.abs((bill.amount || 0) + (bill.taxAmount || 0) - (bill.totalAmount || 0)) > 2;
    if (hasMathMismatch) {
      issues.push({
        invoiceNumber: bill.invoiceNumber || 'INV-AUTO',
        supplierName: bill.supplierName || 'Unknown',
        type: 'Tax Mismatch',
        severity: 'Medium',
        explanation: 'The sum of taxable value and calculated tax does not equal the invoice grand total.',
        businessImpact: 'Potential auditing flags by tax officers or ITC mismatch in GSTR-2B.',
        recommendedFix: 'Review the invoice breakdown values and edit details manually.'
      });
    }

    if (!bill.gstin || bill.gstin.includes('XXXXX')) {
      issues.push({
        invoiceNumber: bill.invoiceNumber || 'INV-AUTO',
        supplierName: bill.supplierName || 'Unknown',
        type: 'Missing/Invalid GSTIN',
        severity: 'High',
        explanation: 'Supplier GSTIN is either completely missing or formatted incorrectly.',
        businessImpact: 'Complete loss of Input Tax Credit (ITC) for this invoice, increasing tax liabilities.',
        recommendedFix: 'Contact the supplier to obtain their registered GSTIN details and update metadata.'
      });
    }

    if (!bill.hsn) {
      issues.push({
        invoiceNumber: bill.invoiceNumber || 'INV-AUTO',
        supplierName: bill.supplierName || 'Unknown',
        type: 'Missing HSN Code',
        severity: 'Low',
        explanation: 'Harmonized System of Nomenclature (HSN) code is missing for items.',
        businessImpact: 'HSN reporting is mandatory under GST rules for business sales exceeding ₹5 crores.',
        recommendedFix: 'Assign appropriate HSN code based on business expense categories.'
      });
    }
  });

  const totalPossible = issues.length === 0 ? 100 : Math.max(45, 100 - (issues.length * 12));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>GST Compliance Center</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Continuously audit transactions, resolve portal filing blocks, and optimize Input Tax Credits.
        </p>
      </div>

      {/* Compliance dial and stats */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '2rem', marginBottom: '2.5rem' }}>
        
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Filing Score</span>
          <div style={{ position: 'relative', width: '130px', height: '130px', margin: '1rem 0' }}>
            <svg width="130" height="130" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-color)" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--theme-primary)" strokeWidth="8" strokeDasharray="263.8" strokeDashoffset={263.8 - (263.8 * totalPossible) / 100} strokeLinecap="round" transform="rotate(-90 50 50)" />
            </svg>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 800 }}>{totalPossible}%</span>
              <span style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Audited</span>
            </div>
          </div>
          <span style={{ fontSize: '0.85rem', color: totalPossible >= 90 ? 'var(--success)' : 'var(--warning)', fontWeight: 700 }}>
            {totalPossible >= 90 ? '✓ HIGH COMPLIANCE' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--warning)' }}><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> ACTIONS REQUIRED</span>}
          </span>
        </div>

        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: 0, marginBottom: '1.25rem' }}>Compliance Summary</h3>
          
          <div className="grid grid-cols-3" style={{ gap: '1.25rem' }}>
            <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Outstanding Alerts</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: issues.length > 0 ? 'var(--error)' : 'var(--success)' }}>
                {issues.length}
              </div>
            </div>
            <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ITC Vetted (This month)</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--theme-secondary-light)' }}>
                ₹{(bills.reduce((sum, b) => sum + (b.taxAmount || 0), 0)).toLocaleString()}
              </div>
            </div>
            <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Risk Assessment</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: issues.some(i => i.severity === 'High') ? 'var(--error)' : 'var(--success)' }}>
                {issues.some(i => i.severity === 'High') ? 'HIGH' : 'LOW'}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Compliance issues details */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: 0, marginBottom: '1.5rem' }}>Pending Compliance Tasks</h3>

        {activePlan === 'free' ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem 2rem', 
            background: 'var(--bg-primary)', 
            borderRadius: 'var(--radius-lg)', 
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
              <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto' }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Compliance Task Audits are Locked</strong>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '500px', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              We detected <strong>{issues.length} compliance warnings</strong> in your ledger. Upgrade to the Pro Plan to view the specific invoice numbers, detailed explanations, and recommended legal fixes.
            </p>
            <button 
              onClick={() => {
                localStorage.setItem('selectedPlan', 'pro');
                window.location.href = '/pricing';
              }}
              className="btn btn-primary" 
              style={{ background: 'var(--primary-600)', padding: '0.6rem 1.5rem', fontSize: '0.85rem' }}
            >
              Upgrade to Pro (₹199/mo)
            </button>
          </div>
        ) : (
          issues.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              🎉 Complete compliance! No errors or warnings detected in current invoice ledger.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {issues.map((issue, idx) => (
                <div key={idx} style={{ padding: '1.25rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', borderLeft: `5px solid ${issue.severity === 'High' ? 'var(--error)' : issue.severity === 'Medium' ? 'var(--warning)' : 'var(--info)'}` }}>
                  <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.675rem', background: 'var(--bg-secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700, marginRight: '0.5rem' }}>{issue.type}</span>
                      <strong style={{ fontSize: '0.9rem' }}>Invoice #{issue.invoiceNumber} (Supplier: {issue.supplierName})</strong>
                    </div>
                    <span className={`badge-premium ${issue.severity === 'High' ? 'badge-critical' : 'badge-average'}`} style={{ fontSize: '0.65rem' }}>
                      {issue.severity} Severity
                    </span>
                  </div>

                  <div className="grid grid-cols-3" style={{ gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <div>
                      <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>Problem Explanation</strong>
                      {issue.explanation}
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>Business Impact</strong>
                      {issue.businessImpact}
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>Recommended Action</strong>
                      {issue.recommendedFix}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

    </div>
  );
}

export default ComplianceCenter;
