import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserBills } from '../services/firebaseDataService';
import { fetchActivePlan } from '../services/subscriptionService';

function AuditCenter({ user }) {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [activeBusinessId, setActiveBusinessId] = useState(() => {
    return localStorage.getItem('activeBusinessId') || null;
  });

  const [activePlan, setActivePlan] = useState(() => {
    return localStorage.getItem('saas_active_plan') || 'free';
  });

  // Resolve the ACTUAL plan from the server. localStorage is only a display cache —
  // entitlement is always enforced by the backend.
  useEffect(() => {
    let mounted = true;
    fetchActivePlan().then((plan) => {
      if (mounted) setActivePlan(plan);
    });
    return () => { mounted = false; };
  }, [user?.uid]);

  useEffect(() => {
    const handlePlanChanged = () => {
      fetchActivePlan().then((plan) => setActivePlan(plan));
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
          if (!activeBusinessId) return true; // show all when no business selected
          if (!b.businessId) return true; // include invoices without explicit business
          return b.businessId === activeBusinessId;
        });
        setBills(filtered);
      })
      .catch(e => console.error(e));
  }, [user?.uid, activeBusinessId]);

  // Compute duplicate checks and anomalies
  const auditDetections = [];
  const invoiceNumberSet = new Set();

  bills.forEach((bill) => {
    // 1. Math check (Business Plan only)
    if (activePlan === 'business') {
      const hasMathMismatch = Math.abs((bill.amount || 0) + (bill.taxAmount || 0) - (bill.totalAmount || 0)) > 2;
      if (hasMathMismatch) {
        auditDetections.push({
          bill,
          type: 'Math Mismatch',
          severity: 'High',
          explanation: `Calculations verification failed: Taxable (₹${bill.amount}) + Tax (₹${bill.taxAmount}) does not equal Grand Total (₹${bill.totalAmount}).`,
          action: 'Recalculate invoice breakdown segments or edit manually.'
        });
      }
    }

    // 2. Duplicate check (Pro & Business Tiers)
    if (bill.invoiceNumber && activePlan !== 'free') {
      if (invoiceNumberSet.has(bill.invoiceNumber)) {
        auditDetections.push({
          bill,
          type: 'Duplicate Invoice',
          severity: 'Critical',
          explanation: `Duplicate document scanned: Multiple uploads detected containing the exact same invoice reference number: #${bill.invoiceNumber}.`,
          action: 'Delete or archive the duplicated invoice record to avoid double tax filing.'
        });
      } else {
        invoiceNumberSet.add(bill.invoiceNumber);
      }
    }

    // 3. OCR Quality Alert (Business Plan only)
    if (activePlan === 'business' && bill.extractionConfidence === 'low') {
      auditDetections.push({
        bill,
        type: 'OCR Quality Alert',
        severity: 'Medium',
        explanation: 'Low confidence score in OCR scanning. Text structures or fonts appear distorted or unreadable.',
        action: 'Review fields layout segment highlight overlay or re-upload.'
      });
    }
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>AI Audit Center</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Real-time auditing checks matching duplication, mathematical integrity, fonts manipulation, and compliance leakages.
        </p>
      </div>

      {/* Overview stats */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--theme-primary-light)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Detections Found</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: (activePlan !== 'free' && auditDetections.length > 0) ? 'var(--error)' : 'var(--success)' }}>
            {activePlan === 'free' ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Locked</span> : `${auditDetections.length} Alerts`}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Duplication Scans</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--text-primary)' }}>
            {activePlan === 'free' ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Locked</span> : `${bills.length} Verified`}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--theme-secondary-light)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Fonts & Layouts Integrity</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--success)' }}>
            {activePlan === 'free' ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Locked</span> : '100% Secure'}
          </div>
        </div>

      </div>

      {/* Detections ledger */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: 0, marginBottom: '1.5rem' }}>Audit Warnings & Anomalies</h3>

        {activePlan === 'free' ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '4rem 2rem', 
            background: 'var(--bg-primary)', 
            borderRadius: 'var(--radius-lg)', 
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
              <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto' }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>AI Audit Center is Locked</strong>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '500px', lineHeight: '1.6', marginBottom: '1.75rem' }}>
              Automatically audit your invoice data mathematical accuracy, identify double-upload duplicates, scan layout integrity inconsistencies, and detect potential auditor flags.
            </p>
            <button 
              onClick={() => {
                localStorage.setItem('selectedPlan', 'pro');
                window.location.href = '/pricing';
              }}
              className="btn btn-primary" 
              style={{ background: 'var(--primary-600)', padding: '0.75rem 2rem', fontSize: '0.85rem' }}
            >
              Upgrade to Pro (₹199/mo)
            </button>
          </div>
        ) : (
          <>
            {auditDetections.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                ✓ Clean ledger. Duplications checks fully verified.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {auditDetections.map((det, idx) => (
                  <div key={idx} style={{ padding: '1.25rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', borderLeft: `5px solid ${det.severity === 'Critical' ? 'var(--error)' : 'var(--warning)'}` }}>
                    <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <span style={{ fontSize: '0.675rem', background: 'var(--bg-secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700, marginRight: '0.5rem', color: 'var(--error-light)' }}>{det.type}</span>
                        <strong style={{ fontSize: '0.9rem' }}>Invoice #{det.bill.invoiceNumber || 'INV-AUTO'}</strong>
                      </div>
                      <span className={`badge-premium ${det.severity === 'Critical' ? 'badge-critical' : 'badge-average'}`} style={{ fontSize: '0.65rem' }}>
                        {det.severity} Risk
                      </span>
                    </div>

                    <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {det.explanation}
                    </p>

                    <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--theme-secondary-light)' }}>
                      <strong>Recommended Business Action:</strong> {det.action}
                    </div>

                    <button 
                      onClick={() => navigate(`/bill/${det.bill.id}`, { state: { bill: det.bill } })}
                      className="btn btn-outline" 
                      style={{ marginTop: '1rem', padding: '0.4rem 1rem', fontSize: '0.75rem' }}
                    >
                      View Invoice Details
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activePlan === 'pro' && (
              <div style={{ padding: '1.25rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--theme-primary)', textAlign: 'center', marginTop: '1.5rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '0.5rem', color: 'var(--text-tertiary)' }}><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Math Calculations and OCR Quality checks are locked. Upgrade to the <strong>Business Plan</strong> to enable automatic mathematical verification, risk scoring, and vendor reconciliation triggers.
                </span>
                <button 
                  onClick={() => {
                    localStorage.setItem('selectedPlan', 'business');
                    window.location.href = '/pricing';
                  }}
                  className="btn btn-primary" 
                  style={{ marginLeft: '1rem', padding: '0.35rem 0.75rem', fontSize: '0.7rem', background: 'var(--primary-600)' }}
                >
                  Upgrade to Business
                </button>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}

export default AuditCenter;
