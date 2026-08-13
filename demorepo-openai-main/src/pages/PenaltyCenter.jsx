import React, { useState, useEffect } from 'react';
import { fetchActivePlan } from '../services/subscriptionService';
import { getUserBills } from '../services/firebaseDataService';
import { useTranslation } from 'react-i18next';

function PenaltyCenter({ user }) {
  const { t } = useTranslation();
  // Calculator States
  const [returnType, setReturnType] = useState('normal'); // 'nil' or 'normal'
  const [daysDelayed, setDaysDelayed] = useState(0);
  const [netTaxPayable, setNetTaxPayable] = useState(0);

  // Real user data for the proactive warning (no hardcoded demo values)
  const [pendingInvoices, setPendingInvoices] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;
    let mounted = true;
    getUserBills()
      .then((bills) => {
        if (mounted) setPendingInvoices((Array.isArray(bills) ? bills : []).filter((b) => !b.filed).length);
      })
      .catch(() => { /* keep zero on error */ });
    return () => { mounted = false; };
  }, [user?.uid]);

  const businessName = user?.shopName || user?.businessName || user?.displayName || 'your business';
  
  // Calculated outputs
  const [lateFees, setLateFees] = useState(0);
  const [interestCharged, setInterestCharged] = useState(0);
  const [totalPenalty, setTotalPenalty] = useState(0);
  const [hasCalculated, setHasCalculated] = useState(false);

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
  }, []);

  useEffect(() => {
    const handlePlanChanged = () => {
      fetchActivePlan().then((plan) => setActivePlan(plan));
    };
    window.addEventListener('planChanged', handlePlanChanged);
    return () => window.removeEventListener('planChanged', handlePlanChanged);
  }, []);

  const calculatePenalties = () => {
    // 1. Calculate Late Fees
    // Section 47 of CGST Act:
    // Nil return late fee: Rs 20 per day (Rs 10 CGST + Rs 10 SGST) capped at Rs 500
    // Normal return late fee: Rs 50 per day (Rs 25 CGST + Rs 25 SGST) capped at Rs 5,000 (standard limit)
    let perDayFee = returnType === 'nil' ? 20 : 50;
    let maxCap = returnType === 'nil' ? 500 : 5000;
    let computedLateFee = Math.min(daysDelayed * perDayFee, maxCap);

    // 2. Calculate Interest under Section 50:
    // Interest is charged at 18% per annum on the net tax liability paid delayed.
    // Formula: Net Tax * (18 / 100) * (Days / 365)
    let computedInterest = 0;
    if (netTaxPayable > 0 && daysDelayed > 0) {
      computedInterest = Math.round(netTaxPayable * 0.18 * (daysDelayed / 365));
    }

    setLateFees(computedLateFee);
    setInterestCharged(computedInterest);
    setTotalPenalty(computedLateFee + computedInterest);
    setHasCalculated(true);
  };

  const penaltyHistory = [
    { period: 'May 2026', type: 'GSTR-3B', delayedDays: 4, feePaid: '₹200', interestPaid: '₹0', status: 'Settled' },
    { period: 'March 2026', type: 'GSTR-1', delayedDays: 12, feePaid: '₹600', interestPaid: '₹148', status: 'Settled' }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>{t('penalty_title')}</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          {t('penalty_subtitle')}
        </p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        
        {/* Interactive Calculator Panel */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/></svg>
            {t('penalty_estimator')}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>{t('penalty_filing_classification')}</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={() => setReturnType('nil')} 
                  className={`btn ${returnType === 'nil' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
                >
                  {t('penalty_nil_return')}
                </button>
                <button 
                  onClick={() => setReturnType('normal')} 
                  className={`btn ${returnType === 'normal' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
                >
                  {t('penalty_normal_return')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>{t('penalty_days_delayed')}</label>
                <input 
                  type="number" 
                  value={daysDelayed}
                  onChange={(e) => setDaysDelayed(Math.max(0, parseInt(e.target.value) || 0))}
                  style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>{t('penalty_net_liability')} (₹)</label>
                <input 
                  type="number" 
                  value={netTaxPayable}
                  onChange={(e) => setNetTaxPayable(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none' }}
                  disabled={returnType === 'nil'}
                />
              </div>
            </div>

            <button onClick={calculatePenalties} className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 700 }}>
              {t('penalty_calculate')}
            </button>

            {hasCalculated && (
              <div style={{ 
                marginTop: '1rem', 
                borderTop: '1px solid var(--border-color)', 
                paddingTop: '1.25rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.85rem' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{t('penalty_late_fee')}:</span>
                  <strong>₹{lateFees.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{t('penalty_delay_interest')}:</span>
                  <strong>₹{interestCharged.toLocaleString()}</strong>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: '1.15rem', 
                  fontWeight: 800, 
                  borderTop: '1px solid var(--border-color)', 
                  paddingTop: '0.75rem',
                  color: totalPenalty > 0 ? 'var(--error)' : 'var(--success)'
                }}>
                  <span>{t('penalty_total_estimate')}:</span>
                  <span>₹{totalPenalty.toLocaleString()}</span>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* AI Penalty Prevention Recommendations & Deadlines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Proactive Warning for Business Plan, otherwise lock or standard deadlines */}
          {activePlan === 'business' ? (
            <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', borderLeft: '4px solid var(--error)', background: 'rgba(239, 68, 68, 0.03)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.75rem 0', color: 'var(--error)' }}>
                ⚡ {t('penalty_proactive_warning')}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '0 0 1rem 0' }}>
                <strong>{t('penalty_risk_detected')}</strong>: {t('penalty_risk_desc', { businessName })}
              </p>
              <div style={{ background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{t('penalty_unfiled_records')}:</span>
                  <strong style={{ color: 'var(--error)' }}>{pendingInvoices} {pendingInvoices === 1 ? t('penalty_invoice') : t('penalty_invoices')}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => alert("Use the AI Agent (Agent Activity page) to run a compliance review on your records.")}
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: '0.45rem', fontSize: '0.75rem', background: 'var(--primary-600)' }}
                >
                  {t('penalty_review_compliance')}
                </button>
                <button 
                  onClick={() => alert("Open the GST Forms page to generate GSTR-1 / GSTR-3B drafts from your records.")}
                  className="btn btn-outline" 
                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem' }}
                >
                  {t('penalty_prepare_return')}
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', borderLeft: '4px solid var(--error)', position: 'relative' }}>
              {activePlan !== 'business' && (
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(2px)',
                  borderRadius: 'var(--radius-xl)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '1.25rem',
                  zIndex: 10
                }}>
                  <span style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--text-tertiary)' }}>
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </span>
                  <strong style={{ fontSize: '0.85rem', color: 'white' }}>{t('penalty_proactive_warning')}</strong>
                  <p style={{ fontSize: '0.7rem', color: '#cbd5e1', margin: '0.25rem 0 0.75rem 0', maxWidth: '85%', lineHeight: '1.4' }}>
                    {t('penalty_proactive_desc')}
                  </p>
                  <button 
                    onClick={() => {
                      localStorage.setItem('selectedPlan', 'business');
                      window.location.href = '/pricing';
                    }}
                    className="btn btn-primary" 
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem', background: 'var(--primary-600)' }}
                  >
                    {t('penalty_unlock_business')}
                  </button>
                </div>
              )}
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.75rem 0', color: 'var(--text-primary)' }}>{t('penalty_deadlines_warning')}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '0 0 1rem 0' }}>
                {t('penalty_deadlines_desc')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
                  <span><strong>GSTR-1</strong> ({t('penalty_sales_outward')})</span>
                  <span>{t('penalty_due_11th')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>GSTR-3B</strong> ({t('penalty_tax_summary')})</span>
                  <span>{t('penalty_due_20th')}</span>
                </div>
              </div>
            </div>
          )}

          {/* AI Penalty Mitigation */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', color: 'var(--warning)' }}><path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2-1 4-2 5v1a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-1c-1-1-2-3-2-5a7 7 0 0 1 7-7z"/></svg> {t('penalty_mitigation_tips')}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.8rem', lineHeight: '1.4' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--success)' }}>✔</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  <strong>{t('penalty_tip_nil')}</strong>: {t('penalty_tip_nil_desc')}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--success)' }}>✔</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  <strong>{t('penalty_tip_cash')}</strong>: {t('penalty_tip_cash_desc')}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--success)' }}>✔</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  <strong>{t('penalty_tip_alerts')}</strong>: {t('penalty_tip_alerts_desc')}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Historical Penalties */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', marginTop: '2rem', position: 'relative' }}>
        {activePlan === 'free' && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(3px)',
            borderRadius: 'var(--radius-xl)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            textAlign: 'center',
            padding: '2rem'
          }}>
            <span style={{ display: 'block', marginBottom: '0.75rem', color: 'var(--text-tertiary)' }}>
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </span>
            <strong style={{ fontSize: '1rem', color: 'white', marginBottom: '0.25rem' }}>{t('penalty_ledger_locked')}</strong>
            <p style={{ color: '#cbd5e1', fontSize: '0.775rem', maxWidth: '400px', margin: '0 0 1rem 0' }}>
              {t('penalty_ledger_locked_desc')}
            </p>
            <button 
              onClick={() => {
                localStorage.setItem('selectedPlan', 'pro');
                window.location.href = '/pricing';
              }}
              className="btn btn-primary" 
              style={{ background: 'var(--primary-600)', padding: '0.45rem 1.25rem', fontSize: '0.725rem' }}
            >
              {t('penalty_upgrade_pro')}
            </button>
          </div>
        )}
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.25rem' }}>{t('penalty_history_log')}</h3>
        
        <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem' }}>{t('penalty_filing_period')}</th>
              <th style={{ padding: '0.75rem' }}>{t('penalty_form_type')}</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>{t('penalty_days_delayed')}</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>{t('penalty_late_fees_paid')}</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>{t('penalty_interest_paid')}</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>{t('penalty_filing_status')}</th>
            </tr>
          </thead>
          <tbody>
            {penaltyHistory.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 600 }}>{item.period}</td>
                <td style={{ padding: '0.75rem' }}>{item.type}</td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>{item.delayedDays} {t('penalty_days')}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>{item.feePaid}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>{item.interestPaid}</td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                  <span className="badge-premium badge-excellent" style={{ fontSize: '0.65rem' }}>{item.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

    </div>
  );
}

export default PenaltyCenter;
