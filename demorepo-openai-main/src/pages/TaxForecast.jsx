import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getUserBills } from '../services/firebaseDataService';

function TaxForecast({ user }) {
  const [forecastData, setForecastData] = useState([]);
  const [liability, setLiability] = useState(0);
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

        // Compute forecast mock charts
        const baseGST = filtered.reduce((sum, b) => sum + (b.taxAmount || 0), 0) || 12000;
        setLiability(baseGST * 1.5);

        const months = ['Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026'];
        const chart = months.map((m, idx) => ({
          month: m,
          liability: Math.round(baseGST * (1.2 + idx * 0.1)),
          credit: Math.round(baseGST * (1.0 + idx * 0.05)),
          savings: Math.round(baseGST * 0.15)
        }));
        setForecastData(chart);
      })
      .catch(e => console.error(e));
  }, [user?.uid, activeBusinessId]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Title Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Tax Forecasting Console</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Evaluate future tax liabilities, Input Tax Credit trend run-rates, and set aside savings buffers.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--theme-secondary-light)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Next Month Est. Liability</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>₹{liability.toLocaleString()}</div>
          <span style={{ fontSize: '0.675rem', color: 'var(--success)' }}>Confidence: 94% (High)</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Expected Credit (ITC)</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--success)' }}>
            -₹{(liability / 1.5).toLocaleString()}
          </div>
          <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)' }}>Based on current expense speed</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--theme-primary-light)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Estimated Tax Savings</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--theme-secondary-light)' }}>
            ₹{(liability * 0.15).toLocaleString()}
          </div>
          <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)' }}>From auto HSN & supplier audit corrections</span>
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
            <strong style={{ fontSize: '1.1rem', color: 'white', marginBottom: '0.5rem' }}>4-Month Trend Projection is Locked</strong>
            <p style={{ color: '#cbd5e1', fontSize: '0.8rem', maxWidth: '400px', margin: '0 0 1.25rem 0', lineHeight: '1.5' }}>
              Upgrade to the Pro Plan to visualize upcoming monthly liabilities, purchase input tax credits, and optimized saving allocations.
            </p>
            <button 
              onClick={() => {
                localStorage.setItem('selectedPlan', 'pro');
                window.location.href = '/pricing';
              }}
              className="btn btn-primary" 
              style={{ background: 'var(--primary-600)', padding: '0.5rem 1.25rem', fontSize: '0.75rem' }}
            >
              Upgrade to Pro (₹199/mo)
            </button>
          </div>
        )}
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.5rem' }}>Next 4-Months Projected GST Balance</h3>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={forecastData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="month" stroke="var(--text-secondary)" style={{ fontSize: '0.75rem' }} />
            <YAxis stroke="var(--text-secondary)" style={{ fontSize: '0.75rem' }} />
            <Tooltip contentStyle={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
            <Bar dataKey="liability" fill="#6366f1" name="Sales GST Liability" radius={[4, 4, 0, 0]} />
            <Bar dataKey="credit" fill="#10b981" name="Purchases Input Credit" radius={[4, 4, 0, 0]} />
            <Bar dataKey="savings" fill="#14b8a6" name="Projected Savings" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
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
            <strong style={{ fontSize: '0.95rem', color: 'white', marginBottom: '0.25rem' }}>AI Cash-flow & Scenario Simulator</strong>
            <p style={{ color: '#cbd5e1', fontSize: '0.75rem', maxWidth: '450px', margin: '0 0 1rem 0', lineHeight: '1.4' }}>
              Simulate dynamic business scenario expansions, cash flow liquidity projections, and quarterly tax impact audits.
            </p>
            <button 
              onClick={() => {
                localStorage.setItem('selectedPlan', 'business');
                window.location.href = '/pricing';
              }}
              className="btn btn-primary" 
              style={{ background: 'var(--primary-600)', padding: '0.4rem 1rem', fontSize: '0.7rem' }}
            >
              Upgrade to Business (₹499/mo)
            </button>
          </div>
        )}
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg></span> Scenario-based Cash Flow Forecast
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Evaluate scenario impacts on cash reserving guidelines.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }} className="grid">
          <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'left' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Best Case Scenario (20% Revenue growth)</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--success)' }}>
              ₹{Math.round(liability * 1.8).toLocaleString()} Net Cash Reserve
            </div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'left' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Stress Case Scenario (Supplier non-filing loss)</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--error)' }}>
              ₹{Math.round(liability * 0.4).toLocaleString()} Reserving Buffer Required
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default TaxForecast;
