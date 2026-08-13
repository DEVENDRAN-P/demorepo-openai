import React, { useState, useEffect } from 'react';
import { getUserBills } from '../services/firebaseDataService';
import { useTranslation } from 'react-i18next';

function BusinessHealth({ user }) {
  const { t } = useTranslation();
  const [bills, setBills] = useState([]);
  const [activeBusinessId, setActiveBusinessId] = useState(() => {
    return localStorage.getItem('activeBusinessId') || null;
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
          if (!activeBusinessId) return true; // show all when no business selected
          if (!b.businessId) return true; // include invoices without explicit business
          return b.businessId === activeBusinessId;
        });
        setBills(filtered);
      })
      .catch(e => console.error(e));
  }, [user?.uid, activeBusinessId]);

  // Dynamic variables computation
  const totalTaxAmount = bills.reduce((sum, b) => sum + (b.taxAmount || 0), 0);
  const totalInvoiceVal = bills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  
  // Calculate standard metrics
  const isHealthy = bills.length > 0 && bills.every(b => b.filed);
  const rating = isHealthy ? 'Excellent' : bills.length === 0 ? 'Average' : 'Good';
  const score = isHealthy ? 98 : bills.length === 0 ? 60 : 85;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>{t('bizhealth_title')}</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          {t('bizhealth_subtitle')}
        </p>
      </div>

      {/* Main Stats Card */}
      <div className="grid" style={{ gridTemplateColumns: '1.2fr 1.8fr', gap: '2rem', marginBottom: '2.5rem' }}>
        
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{t('bizhealth_overall')}</span>
          <div style={{ fontSize: '3.5rem', fontWeight: 800, margin: '1rem 0', color: 'var(--theme-secondary-light)' }}>
            {score}
          </div>
          <span className={`badge-premium ${score >= 90 ? 'badge-excellent' : 'badge-good'}`} style={{ padding: '0.375rem 1.25rem' }}>
            {rating} {t('bizhealth_rating')}
          </span>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1rem', lineHeight: '1.5' }}>
            {t('bizhealth_calc_desc')}
          </p>
        </div>

        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>{t('bizhealth_stability')}</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyBetween: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('bizhealth_tax_efficiency')}</span>
                <strong>{score}% ({t('bizhealth_optimal')})</strong>
              </div>
              <div style={{ height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${score}%`, height: '100%', background: 'var(--theme-primary-light)' }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyBetween: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('bizhealth_expense_quality')}</span>
                <strong>92% ({t('bizhealth_high')})</strong>
              </div>
              <div style={{ height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: '92%', height: '100%', background: 'var(--theme-secondary-light)' }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyBetween: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('bizhealth_cash_flow')}</span>
                <strong>80% ({t('bizhealth_steady')})</strong>
              </div>
              <div style={{ height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: '80%', height: '100%', background: 'var(--theme-accent)' }}></div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Deep explainability module */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: 0, marginBottom: '1.5rem' }}>{t('bizhealth_diagnostics')}</h3>

        <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="m18.7 9.3-5.1 5.2-2.8-2.7-4.3 4.3"/></svg> {t('bizhealth_alignment')}</span></h4>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              {t('bizhealth_alignment_desc')} <strong>₹{totalInvoiceVal.toLocaleString()}</strong>. {t('bizhealth_alignment_desc2')} <strong>{totalTaxAmount > 0 ? '100%' : '0%'}</strong> {t('bizhealth_alignment_desc3')}.
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>🛡️ {t('bizhealth_risk_protections')}</h4>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              {t('bizhealth_risk_desc')}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

export default BusinessHealth;
