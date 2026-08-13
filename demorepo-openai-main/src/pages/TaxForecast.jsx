import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getUserBills } from '../services/firebaseDataService';
import { fetchActivePlan } from '../services/subscriptionService';
import { useTranslation } from 'react-i18next';

function TaxForecast({ user }) {
  const { t } = useTranslation();
  const [forecastData, setForecastData] = useState([]);
  const [liability, setLiability] = useState(0);
  const [itcTotal, setItcTotal] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [confidence, setConfidence] = useState('Low');
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

        // Deterministic forecast — computed ONLY from the user's stored
        // invoices. No AI magic, no hardcoded multipliers, no fake fallback
        // base (e.g. ₹12,000) when the user has no data.
        const GSTIN_REGEX = /^[0-9]{2}[A-Za-z0-9]{10}[0-9A-Za-z]{2}$/;
        const monthly = new Map(); // "YYYY-MM" -> { liability, credit }
        for (const b of filtered) {
          const d = new Date(b.invoiceDate || b.createdAt || Date.now());
          if (Number.isNaN(d.getTime())) continue;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const entry = monthly.get(key) || { liability: 0, credit: 0 };
          entry.liability += b.taxAmount || 0;
          const gstin = String(b.gstin || '').trim();
          if (GSTIN_REGEX.test(gstin) && !gstin.toUpperCase().includes('XXXXX')) {
            entry.credit += b.taxAmount || 0;
          }
          monthly.set(key, entry);
        }

        const monthKeys = [...monthly.keys()].sort();
        const last3 = monthKeys.slice(-3).map((k) => monthly.get(k).liability);
        const avgMonthly = last3.length ? last3.reduce((s, v) => s + v, 0) / last3.length : 0;
        const latestLiability = monthKeys.length ? monthly.get(monthKeys[monthKeys.length - 1]).liability : 0;
        const nextEstimate = avgMonthly > 0 ? Math.round(avgMonthly) : latestLiability;

        // Chart: up to 4 actual months + next-month projection (clearly marked)
        const now = new Date();
        const nextKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const chart = monthKeys.slice(-4).map((k) => {
          const e = monthly.get(k);
          return {
            month: k,
            liability: Math.round(e.liability),
            credit: Math.round(e.credit),
            savings: 0,
            projected: false,
          };
        });
        if (nextEstimate > 0 && !chart.some((c) => c.month === nextKey)) {
          chart.push({ month: `${nextKey} (proj.)`, liability: nextEstimate, credit: 0, savings: 0, projected: true });
        }

        setForecastData(chart);
        setLiability(nextEstimate);
        setItcTotal(monthKeys.reduce((s, k) => s + monthly.get(k).credit, 0));
        setInvoiceCount(filtered.length);
        setConfidence(filtered.length >= 6 ? 'High' : filtered.length >= 2 ? 'Medium' : 'Low');
      })
      .catch(e => console.error(e));
  }, [user?.uid, activeBusinessId]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Title Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>{t('taxforecast_title')}</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          {t('taxforecast_subtitle')}
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--theme-secondary-light)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('taxforecast_next_liability')}</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>₹{liability.toLocaleString()}</div>
          <span style={{ fontSize: '0.675rem', color: confidence === 'High' ? 'var(--success)' : 'var(--warning)' }}>{t('taxforecast_confidence')}: {confidence}</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('taxforecast_expected_credit')}</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--success)' }}>
            -₹{itcTotal.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)' }}>{t('taxforecast_credit_desc', { count: invoiceCount })}</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--theme-primary-light)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('taxforecast_cash_reserve')}</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--theme-secondary-light)' }}>
            ₹{Math.round(liability * 0.1).toLocaleString()}
          </div>
          <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)' }}>{t('taxforecast_reserve_desc')}</span>
        </div>
      </div>

      {/* Recharts chart */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', position: 'relative' }}>
        {activePlan === 'free' && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(4px)',
            borderRadius: 'var(--radius-xl)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
            textAlign: 'center',
            padding: '2rem'
          }}>
            <span style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
              <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto' }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <strong style={{ fontSize: '1.1rem', color: 'white', marginBottom: '0.5rem' }}>{t('taxforecast_trend_locked')}</strong>
            <p style={{ color: '#cbd5e1', fontSize: '0.8rem', maxWidth: '400px', margin: '0 0 1.25rem 0', lineHeight: '1.5' }}>
              {t('taxforecast_trend_locked_desc')}
            </p>
            <button 
              onClick={() => {
                localStorage.setItem('selectedPlan', 'pro');
                window.location.href = '/pricing';
              }}
              className="btn btn-primary" 
              style={{ background: 'var(--primary-600)', padding: '0.5rem 1.25rem', fontSize: '0.75rem' }}
            >
              {t('taxforecast_upgrade_pro')}
            </button>
          </div>
        )}
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.5rem' }}>{t('taxforecast_4month_balance')}</h3>
        
        {forecastData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {t('taxforecast_no_data')}
          </div>
        ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={forecastData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="month" stroke="var(--text-secondary)" style={{ fontSize: '0.75rem' }} />
            <YAxis stroke="var(--text-secondary)" style={{ fontSize: '0.75rem' }} />
            <Tooltip contentStyle={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
            <Bar dataKey="liability" fill="#6366f1" name="GST (computed)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="credit" fill="#10b981" name="ITC Credit (computed)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="savings" fill="#14b8a6" name="Recommended Reserve" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        )}
      </div>

      {/* Predictive Scenario Simulator */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', position: 'relative' }}>
        {activePlan !== 'business' && (
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
            padding: '1.5rem'
          }}>
            <span style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto' }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <strong style={{ fontSize: '0.95rem', color: 'white', marginBottom: '0.25rem' }}>{t('taxforecast_simulator')}</strong>
            <p style={{ color: '#cbd5e1', fontSize: '0.75rem', maxWidth: '450px', margin: '0 0 1rem 0', lineHeight: '1.4' }}>
              {t('taxforecast_simulator_desc')}
            </p>
            <button 
              onClick={() => {
                localStorage.setItem('selectedPlan', 'business');
                window.location.href = '/pricing';
              }}
              className="btn btn-primary" 
              style={{ background: 'var(--primary-600)', padding: '0.4rem 1rem', fontSize: '0.7rem' }}
            >
              {t('taxforecast_upgrade_business')}
            </button>
          </div>
        )}
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg></span> {t('taxforecast_cash_flow_readiness')}
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          {t('taxforecast_computed_from')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }} className="grid">
          <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'left' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('taxforecast_next_month_estimate')}</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--theme-primary-light)' }}>
              ₹{liability.toLocaleString()}
            </div>
            <span style={{ fontSize: '0.675rem', color: 'var(--text-tertiary)' }}>{t('taxforecast_avg_desc')}</span>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'left' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('taxforecast_recommended_reserve')}</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--warning)' }}>
              ₹{Math.round(liability * 0.1).toLocaleString()}
            </div>
            <span style={{ fontSize: '0.675rem', color: 'var(--text-tertiary)' }}>{t('taxforecast_keep_aside')}</span>
          </div>
        </div>
      </div>

    </div>
  );
}

export default TaxForecast;
