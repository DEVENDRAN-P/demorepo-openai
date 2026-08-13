import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { auth } from '../config/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { invalidatePlanCache } from '../services/subscriptionService';

const getApiUrl = (path) => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    if (window.location.port !== '5000') {
      return `http://localhost:5000${path}`;
    }
  }
  return path;
};

function PricingBilling({ user }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const handleMockNav = (targetRoute) => {
    if (user) {
      navigate(targetRoute);
    } else {
      localStorage.setItem('authRedirect', targetRoute);
      navigate('/signup');
    }
  };
  
  // Subscription and state variables
  const [activePlan, setActivePlan] = useState('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState('active');
  const [subscriptionStart, setSubscriptionStart] = useState(null);
  const [subscriptionExpiry, setSubscriptionExpiry] = useState(null);
  
  const [billingHistory, setBillingHistory] = useState([]);
  
  // UI States
  const [loadingState, setLoadingState] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Slider States for Section 8
  const [invoicesCount, setInvoicesCount] = useState(150);
  const [caCost, setCaCost] = useState(5000);
  const [hoursSpent, setHoursSpent] = useState(20);
  const [faqExpanded, setFaqExpanded] = useState({});



  // Checkout now happens on the dedicated /checkout page using the official
  // Cashfree Web SDK. The pricing page only routes users there.

  // Helper to parse JSON safely, falling back to clean text errors if the response is not JSON
  const safeParseJson = async (response) => {
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const responseText = await response.text();
      throw new Error(`Server returned non-JSON response (Status ${response.status}): ${responseText.substring(0, 180)}`);
    }
    return await response.json();
  };

  // 2. Load Subscription Status and History on Component Mount
  const fetchSubscriptionAndBillingData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.warn("⚠️ Guest user. Skipping subscription lookup.");
        setLoadingState(false);
        return;
      }

      const token = await currentUser.getIdToken(true);
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch active subscription status
      const statusRes = await fetch(getApiUrl('/api/subscription/status'), { headers });
      if (statusRes.ok) {
        const statusData = await safeParseJson(statusRes);
        // API shape: { success: true, subscription: { subscriptionPlan, ... } }
        const plan = statusData.subscription?.subscriptionPlan || statusData.subscriptionPlan || 'free';
        setActivePlan(plan);
        localStorage.setItem('saas_active_plan', plan);
        setSubscriptionStatus(statusData.subscription?.subscriptionStatus || statusData.subscriptionStatus);
        setSubscriptionStart(statusData.subscription?.subscriptionStart || statusData.subscriptionStart);
        setSubscriptionExpiry(statusData.subscription?.subscriptionExpiry || statusData.subscriptionExpiry);
      } else {
        const errText = await statusRes.text().catch(() => "");
        console.error('Failed to fetch subscription status from API.', statusRes.status, errText);
      }

      // Fetch payment history logs
      const historyRes = await fetch(getApiUrl('/api/payment/history'), { headers });
      if (historyRes.ok) {
        const historyData = await safeParseJson(historyRes);
        const formattedHistory = historyData.map(txn => ({
          id: txn.paymentId || txn.id,
          date: (txn.createdAt || '').split('T')[0],
          plan: txn.plan === 'pro' ? 'Pro Plan' : txn.plan === 'business' ? 'Business Plan' : txn.plan || '—',
          amount: `₹${txn.amount}`,
          status: txn.status,
          provider: txn.provider || 'Cashfree',
          orderId: txn.orderId,
          paymentId: txn.paymentId
        }));
        setBillingHistory(formattedHistory);
      } else {
        const errText = await historyRes.text().catch(() => "");
        console.error('Failed to fetch payment history from API.', historyRes.status, errText);
      }
    } catch (err) {
      console.error('Error fetching subscription/billing details:', err);
      setErrorMsg('Failed to load active subscription details from server.');
    } finally {
      setLoadingState(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionAndBillingData();

    // After a login redirect, continue to checkout with the pending plan
    const currentUser = auth.currentUser;
    if (currentUser) {
      const pendingPlan = localStorage.getItem('pending_subscribe_plan');
      if (pendingPlan) {
        localStorage.removeItem('pending_subscribe_plan');
        localStorage.setItem('selectedPlan', pendingPlan);
        navigate('/checkout');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 3. Route the user to the dedicated Cashfree checkout page
  const handleSubscribe = async (planId) => {
    if (planId === 'free') {
      alert('You are already on the Free Plan.');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      // Save the chosen plan so we can resume after login
      localStorage.setItem('authRedirect', '/pricing');
      localStorage.setItem('pending_subscribe_plan', planId);
      navigate('/login');
      return;
    }

    localStorage.setItem('selectedPlan', planId);
    navigate('/checkout');
  };

  const handleDowngradeToFree = async () => {
    if (!window.confirm("Are you sure you want to cancel your premium subscription and revert to the Free Tier?")) {
      return;
    }
    setIsProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const token = await currentUser.getIdToken(true);
      // Server-authoritative downgrade — the frontend never decides entitlement.
      const res = await fetch(getApiUrl('/api/subscription/downgrade'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      if (!res.ok) {
        const errData = await safeParseJson(res);
        throw new Error(errData.error || errData.message || 'Failed to downgrade subscription.');
      }
      setSuccessMsg('Successfully downgraded to the Free Tier!');
      await fetchSubscriptionAndBillingData();
      // Real plan change: drop the shared cache and notify other components.
      invalidatePlanCache();
      window.dispatchEvent(new Event('planChanged'));
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Loading spinner layout
  if (loadingState) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid var(--bg-tertiary)',
          borderTop: '5px solid var(--theme-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('pricing_retrieving')}</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', position: 'relative' }}>
      
      {/* Absolute Loading Overlay */}
      {isProcessing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '6px solid rgba(255,255,255,0.1)',
            borderTop: '6px solid var(--theme-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '1.5rem'
          }}></div>
          <h3 style={{ color: 'white', fontWeight: 800, fontSize: '1.2rem', margin: 0 }}>{t('pricing_gateway_processing')}</h3>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{t('pricing_gateway_processing_desc')}</p>
        </div>
      )}

      {/* Header section */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>{t('pricing_title')}</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          {t('pricing_subtitle')}
        </p>
      </div>

      {/* Status Notifications */}
      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><strong>{t('pricing_error')}:</strong> {errorMsg}</span>
          <button onClick={() => setErrorMsg('')} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem' }}>&times;</button>
        </div>
      )}

      {successMsg && (
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid rgba(34, 197, 94, 0.2)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><strong>{t('pricing_success')}:</strong> {successMsg}</span>
          <button onClick={() => setSuccessMsg('')} style={{ background: 'transparent', border: 'none', color: '#22c55e', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem' }}>&times;</button>
        </div>
      )}

      {/* Subscription Active Badge & Usage Limits Panel */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '2.5rem', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>{t('pricing_current_status')}</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('pricing_status')}:</span>
            <span style={{ 
              background: subscriptionStatus === 'active' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
              color: subscriptionStatus === 'active' ? '#22c55e' : '#ef4444', 
              padding: '0.25rem 0.75rem', 
              borderRadius: '9999px', 
              fontSize: '0.75rem', 
              fontWeight: 700,
              textTransform: 'uppercase'
            }}>
              {subscriptionStatus === 'active' ? t('pricing_active') : t('pricing_expired')}
            </span>
          </div>
        </div>
        
        <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '2rem', border: '1px solid var(--border-color)', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>{t('pricing_active_tier')}</span>
            <strong style={{ fontSize: '1.15rem', color: 'var(--theme-primary-light)' }}>
              {activePlan === 'free' ? t('pricing_free_plan') : activePlan === 'pro' ? t('pricing_pro_plan') : t('pricing_business_plan')}
            </strong>
          </div>
          {subscriptionStart && (
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>{t('pricing_billing_start')}</span>
              <strong style={{ fontSize: '0.95rem' }}>{new Date(subscriptionStart).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</strong>
            </div>
          )}
          {subscriptionExpiry && (
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>{t('pricing_next_renewal')}</span>
              <strong style={{ fontSize: '0.95rem' }}>{new Date(subscriptionExpiry).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</strong>
            </div>
          )}
          {activePlan !== 'free' && (
            <div style={{ marginLeft: 'auto' }}>
              <button 
                onClick={() => handleSubscribe(activePlan)} 
                className="btn btn-secondary" 
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem', fontWeight: 700 }}
                disabled={isProcessing}
              >
                {t('pricing_renew_subscription')}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3" style={{ gap: '2rem', marginTop: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              <span>{t('pricing_monthly_ocr')}</span>
              <strong>{activePlan === 'free' ? t('pricing_up_to_10') : t('pricing_unlimited')}</strong>
            </div>
            <div style={{ width: '100%', background: 'var(--bg-tertiary)', borderRadius: '10px', height: '6px', overflow: 'hidden' }}>
              <div style={{ width: activePlan === 'free' ? '20%' : '100%', background: 'var(--theme-primary)', height: '100%' }}></div>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              <span>{t('pricing_ai_suggestions')}</span>
              <strong>{activePlan === 'free' ? t('pricing_basic_ai') : activePlan === 'pro' ? t('pricing_advanced_ai') : t('pricing_advanced_analytics')}</strong>
            </div>
            <div style={{ width: '100%', background: 'var(--bg-tertiary)', borderRadius: '10px', height: '6px', overflow: 'hidden' }}>
              <div style={{ width: activePlan === 'free' ? '30%' : activePlan === 'pro' ? '70%' : '100%', background: 'var(--theme-secondary)', height: '100%' }}></div>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              <span>{t('pricing_ocr_capabilities')}</span>
              <strong>{activePlan === 'free' ? t('pricing_limited_ocr') : t('pricing_unlimited_ocr')}</strong>
            </div>
            <div style={{ width: '100%', background: 'var(--bg-tertiary)', borderRadius: '10px', height: '6px', overflow: 'hidden' }}>
              <div style={{ width: activePlan === 'free' ? '40%' : '100%', background: 'var(--warning)', height: '100%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* 8. PRICING PAGE & INTERACTIVE TOOLS */}
      
      {/* Dynamic CSS styles for interactive sliders, comparison table, glow borders, and accordion */}
      <style dangerouslySetInnerHTML={{__html: `
        .switcher-btn {
          padding: 0.5rem 1.25rem;
          border-radius: 9999px;
          border: none;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .switcher-btn.active {
          background: var(--primary-600);
          color: white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
        }
        .switcher-btn.inactive {
          background: transparent;
          color: var(--text-secondary);
        }
        .purple-glow-border {
          border: 2px solid var(--primary-600) !important;
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.25), inset 0 0 10px rgba(99, 102, 241, 0.1);
        }
        .most-popular-badge {
          background: linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .roi-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 5px;
          background: var(--bg-tertiary);
          outline: none;
          transition: background 450ms ease-in;
        }
        .roi-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--primary-600);
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .roi-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .comparison-th {
          padding: 1rem;
          font-weight: 700;
          font-size: 0.85rem;
          border-bottom: 2px solid var(--border-color);
        }
        .comparison-td {
          padding: 0.875rem 1rem;
          font-size: 0.8rem;
          border-bottom: 1px solid var(--border-color);
        }
        .faq-accordion-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          margin-bottom: 0.75rem;
          overflow: hidden;
          transition: border-color 0.2s ease;
        }
        .faq-accordion-card:hover {
          border-color: var(--primary-300);
        }
        .faq-question-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          color: var(--text-primary);
          font-weight: 700;
          font-size: 0.9rem;
          outline: none;
        }
        .faq-answer-content {
          padding: 0 1.25rem 1.25rem 1.25rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .footer-link-item {
          font-size: 0.75rem;
          color: var(--text-secondary);
          cursor: pointer;
          transition: color 0.2s ease;
        }
        .footer-link-item:hover {
          color: var(--primary-600);
        }
      `}} />

      {/* 1. 3 Pricing Tiers Cards Grid */}
      <div className="grid grid-cols-3" style={{ gap: '2rem', marginBottom: '4rem', position: 'relative', zIndex: 10 }}>
        
        {/* Tier 1: Free Plan */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column', border: activePlan === 'free' ? '2px solid var(--theme-primary)' : '1px solid var(--border-color)', position: 'relative', background: 'var(--bg-secondary)' }}>
          {activePlan === 'free' && <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--theme-primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>{t('pricing_active_plan')}</span>}
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em' }}>{t('pricing_starter')}</span>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0' }}>₹0 <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{t('pricing_per_month')}</span></h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', minHeight: '36px' }}>{t('pricing_free_desc')}</p>
          
          <ul style={{ fontSize: '0.8rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', flex: 1, color: 'var(--text-secondary)', textAlign: 'left' }}>
            <li>{t('pricing_free_10_scans')}</li>
            <li>{t('pricing_basic_ai_suggestions')}</li>
            <li>{t('pricing_limited_ocr')}</li>
            <li>{t('pricing_single_entity')}</li>
            <li>{t('pricing_csv_exports')}</li>
          </ul>
          
          <button 
            disabled={activePlan === 'free'} 
            onClick={handleDowngradeToFree}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '0.6rem', cursor: activePlan === 'free' ? 'not-allowed' : 'pointer' }}
          >
            {activePlan === 'free' ? t('pricing_current_plan') : t('pricing_downgrade_free')}
          </button>
        </div>

        {/* Tier 2: Pro Plan (Featured) */}
        <div className={`glass-panel ${activePlan === 'pro' ? '' : 'purple-glow-border'}`} style={{ borderRadius: 'var(--radius-xl)', padding: '2.25rem 2rem', display: 'flex', flexDirection: 'column', position: 'relative', background: 'var(--bg-secondary)', transform: 'scale(1.02)', zIndex: 5, border: activePlan === 'pro' ? '2px solid var(--theme-primary)' : '1px solid var(--border-color)' }}>
          <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)' }}>
            <span className="most-popular-badge">{t('pricing_most_popular')}</span>
          </div>
          {activePlan === 'pro' && <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--theme-primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>{t('pricing_active_plan')}</span>}
          <span style={{ fontSize: '0.8rem', color: 'var(--primary-600)', fontWeight: 700, letterSpacing: '0.05em' }}>{t('pricing_professional')}</span>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0' }}>
            ₹199 <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{t('pricing_per_month')}</span>
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', minHeight: '36px' }}>{t('pricing_pro_desc')}</p>
          
          <ul style={{ fontSize: '0.8rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', flex: 1, color: 'var(--text-secondary)', textAlign: 'left' }}>
            <li><strong>{t('pricing_unlimited')}</strong> {t('pricing_invoice_scans')}</li>
            <li><strong>{t('pricing_unlimited')}</strong> {t('pricing_ocr_extraction')}</li>
            <li>{t('pricing_advanced_audit')}</li>
            <li>{t('pricing_gstr_prefills')}</li>
            <li>{t('pricing_reminder_sync')}</li>
            <li>{t('pricing_3_profiles')}</li>
          </ul>

          <button 
            onClick={() => handleSubscribe('pro')}
            className={activePlan === 'pro' ? 'btn btn-secondary' : 'btn btn-primary'}
            style={{ width: '100%', padding: '0.6rem', background: activePlan === 'pro' ? 'transparent' : 'var(--primary-600)' }}
            disabled={activePlan === 'pro' || isProcessing}
          >
            {activePlan === 'pro' ? t('pricing_current_plan') : t('pricing_upgrade_pro')}
          </button>
        </div>

        {/* Tier 3: Business Plan */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column', border: activePlan === 'business' ? '2px solid var(--theme-primary)' : '1px solid var(--border-color)', position: 'relative', background: 'var(--bg-secondary)' }}>
          {activePlan === 'business' && <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--theme-primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>{t('pricing_active_plan')}</span>}
          <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 700, letterSpacing: '0.05em' }}>{t('pricing_business')}</span>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0' }}>
            ₹499 <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{t('pricing_per_month')}</span>
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', minHeight: '36px' }}>{t('pricing_business_desc')}</p>
          
          <ul style={{ fontSize: '0.8rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', flex: 1, color: 'var(--text-secondary)', textAlign: 'left' }}>
            <li><strong>{t('pricing_everything')}</strong> {t('pricing_in_professional')}</li>
            <li>{t('pricing_multi_user')}</li>
            <li>{t('pricing_business_analytics')}</li>
            <li>{t('pricing_vendor_blocker')}</li>
            <li>{t('pricing_api_key')}</li>
            <li>{t('pricing_pdf_exports')}</li>
          </ul>

          <button 
            onClick={() => handleSubscribe('business')}
            className={activePlan === 'business' ? 'btn btn-secondary' : 'btn btn-primary'}
            style={{ width: '100%', padding: '0.6rem' }}
            disabled={activePlan === 'business' || isProcessing}
          >
            {activePlan === 'business' ? t('pricing_current_plan') : t('pricing_upgrade_business')}
          </button>
        </div>

      </div>

      {/* 3. Interactive ROI Calculator Widget */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2.5rem', marginBottom: '4rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', position: 'relative', zIndex: 10 }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'left' }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--theme-secondary)' }}>
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span>{t('pricing_roi_calculator', 'Interactive ROI & Savings Calculator')}</span>
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '2rem', textAlign: 'left' }}>
          {t('pricing_roi_desc')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '3rem' }} className="grid">
          
          {/* Sliders Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            
            {/* Slider 1: Invoices count */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600 }}>{t('pricing_estimated_invoices')}:</span>
                <strong style={{ color: 'var(--primary-600)' }}>{invoicesCount} {t('pricing_invoices')}</strong>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1000" 
                value={invoicesCount} 
                onChange={(e) => setInvoicesCount(Number(e.target.value))}
                className="roi-slider"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                <span>0</span>
                <span>500</span>
                <span>1000</span>
              </div>
            </div>

            {/* Slider 2: Current CA Cost */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600 }}>{t('pricing_ca_cost')}:</span>
                <strong style={{ color: 'var(--primary-600)' }}>₹{caCost.toLocaleString('en-IN')}</strong>
              </div>
              <input 
                type="range" 
                min="0" 
                max="25000" 
                step="500"
                value={caCost} 
                onChange={(e) => setCaCost(Number(e.target.value))}
                className="roi-slider"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                <span>₹0</span>
                <span>₹12,500</span>
                <span>₹25,000</span>
              </div>
            </div>

            {/* Slider 3: Hours Spent */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600 }}>{t('pricing_manual_hours')}:</span>
                <strong style={{ color: 'var(--primary-600)' }}>{hoursSpent} {t('pricing_hours')}</strong>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={hoursSpent} 
                onChange={(e) => setHoursSpent(Number(e.target.value))}
                className="roi-slider"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                <span>0 hrs</span>
                <span>50 hrs</span>
                <span>100 hrs</span>
              </div>
            </div>

          </div>

          {/* ROI Outputs Area */}
          <div style={{ background: 'var(--bg-primary)', padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.5rem' }}>
            
            {/* Calculation Logics */}
            {(() => {
              // Recommended plan based on invoices count
              let recommendedPlanName = 'Free Plan';
              let monthlyPlanCost = 0;
              if (invoicesCount > 150) {
                recommendedPlanName = 'Business Plan';
                monthlyPlanCost = 499;
              } else if (invoicesCount > 10) {
                recommendedPlanName = 'Professional Plan';
                recommendedPlanName = 'Professional Plan';
                monthlyPlanCost = 199;
              }

              // Savings logic
              // Shifting to AI saves 80% CA cost and 85% time (valued at ₹400/hr)
              const monthlyCaSavings = caCost * 0.8;
              const monthlyTimeSavings = (hoursSpent * 0.85) * 400;
              const monthlyNetSavings = Math.max(0, monthlyCaSavings + monthlyTimeSavings - monthlyPlanCost);
              const annualSavings = monthlyNetSavings * 12;

              const monthlyHoursSaved = hoursSpent * 0.85;
              
              // ROI % calculation
              const totalCost = monthlyPlanCost * 12;
              const roiPercent = totalCost === 0 ? 'Infinite' : Math.round((annualSavings / totalCost) * 100);

              return (
                <>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>{t('pricing_annual_savings')}</span>
                    <strong style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--success)' }}>
                      ₹{annualSavings.toLocaleString('en-IN')}
                    </strong>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />

                  <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', textAlign: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>{t('pricing_time_saved')}</span>
                      <strong style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-600)' }}>
                        {monthlyHoursSaved.toFixed(1)} {t('pricing_hrs')}
                      </strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>{t('pricing_estimated_roi')}</span>
                      <strong style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-600)' }}>
                        {roiPercent === 'Infinite' ? 'Infinite ROI' : `${roiPercent}%`}
                      </strong>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.75rem', textAlign: 'center' }}>
                    {t('pricing_recommended_plan')}: <strong style={{ color: 'var(--primary-600)' }}>{recommendedPlanName}</strong> (₹{monthlyPlanCost}/mo)
                  </div>
                </>
              );
            })()}

          </div>

        </div>
      </div>

      {/* 4. Full Enterprise Comparison Table */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', marginBottom: '4rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', position: 'relative', zIndex: 10 }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: 0, marginBottom: '1.5rem', textAlign: 'center' }}>
          {t('pricing_comparison_title')}
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }} className="comparison-table">
            <thead>
              <tr style={{ color: 'var(--text-primary)' }}>
                <th className="comparison-th" style={{ width: '40%' }}>{t('pricing_core_capabilities')}</th>
                <th className="comparison-th" style={{ textAlign: 'center' }}>{t('pricing_free')}</th>
                <th className="comparison-th" style={{ textAlign: 'center', color: 'var(--primary-600)' }}>{t('pricing_professional')}</th>
                <th className="comparison-th" style={{ textAlign: 'center' }}>{t('pricing_business')}</th>
              </tr>
            </thead>
            <tbody>
              
              {/* Category 1: Invoice Processing */}
              <tr style={{ background: 'var(--bg-primary)' }}>
                <td className="comparison-td" style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--primary-600)' }} colSpan="4">
                  {t('pricing_cat_invoice', 'INVOICE CAPTURE & PROCESSOR')}
                </td>
              </tr>
              <tr>
                <td className="comparison-td">{t('pricing_feature_monthly_allocation', 'Monthly bill uploads allocation')}</td>
                <td className="comparison-td" style={{ textAlign: 'center' }}>{t('pricing_10_scans', '10 scans')}</td>
                <td className="comparison-td" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary-600)' }}>{t('pricing_unlimited', 'Unlimited')}</td>
                <td className="comparison-td" style={{ textAlign: 'center' }}>{t('pricing_unlimited', 'Unlimited')}</td>
              </tr>
              <tr>
                <td className="comparison-td">{t('pricing_feature_ocr', 'Gemini AI invoice extraction')}</td>
                <td className="comparison-td" style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>{t('pricing_ocr_limited', 'Limited (Header only)')}</td>
                <td className="comparison-td" style={{ textAlign: 'center', color: 'var(--success)', display: 'table-cell' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17 4 12"/></svg>
                    <span>{t('pricing_ocr_full', 'Full line item')}</span>
                  </div>
                </td>
                <td className="comparison-td" style={{ textAlign: 'center', color: 'var(--success)', display: 'table-cell' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17 4 12"/></svg>
                    <span>{t('pricing_ocr_full', 'Full line item')}</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="comparison-td">{t('pricing_feature_attachments', 'Supported upload attachments (PDF, Image, PNG)')}</td>
                <td className="comparison-td" style={{ textAlign: 'center', color: 'var(--success)' }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17 4 12"/></svg>
                </td>
                <td className="comparison-td" style={{ textAlign: 'center', color: 'var(--success)' }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17 4 12"/></svg>
                </td>
                <td className="comparison-td" style={{ textAlign: 'center', color: 'var(--success)' }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17 4 12"/></svg>
                </td>
              </tr>

              {/* Category 2: AI Capabilities */}
              <tr style={{ background: 'var(--bg-primary)' }}>
                <td className="comparison-td" style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--primary-600)' }} colSpan="4">
                  {t('pricing_cat_ai', 'AI ACCOUNTANT & INTELLIGENCE')}
                </td>
              </tr>
              <tr>
                <td className="comparison-td">{t('pricing_feature_multilingual', 'Multi-lingual AI Chat Page (English, Hindi, Tamil)')}</td>
                <td className="comparison-td" style={{ textAlign: 'center' }}>{t('pricing_basic_chatbot', 'Basic chatbot')}</td>
                <td className="comparison-td" style={{ textAlign: 'center', color: 'var(--success)', display: 'table-cell' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17 4 12"/></svg>
                    <span>{t('pricing_ai_assistant', 'AI Assistant')}</span>
                  </div>
                </td>
                <td className="comparison-td" style={{ textAlign: 'center', color: 'var(--success)', display: 'table-cell' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17 4 12"/></svg>
                    <span>{t('pricing_ai_assistant', 'AI Assistant')}</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="comparison-td">{t('pricing_feature_itc_audits', 'Input Tax Credit (ITC) audits & flags')}</td>
                <td className="comparison-td" style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </td>
                <td className="comparison-td" style={{ textAlign: 'center', color: 'var(--success)' }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17 4 12"/></svg>
                </td>
                <td className="comparison-td" style={{ textAlign: 'center', color: 'var(--success)' }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17 4 12"/></svg>
                </td>
              </tr>
              <tr>
                <td className="comparison-td">{t('pricing_feature_tax_forecast', 'Dynamic Tax Forecast Liabilities')}</td>
                <td className="comparison-td" style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </td>
                <td className="comparison-td" style={{ textAlign: 'center', color: 'var(--success)' }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17 4 12"/></svg>
                </td>
                <td className="comparison-td" style={{ textAlign: 'center', color: 'var(--success)' }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17 4 12"/></svg>
                </td>
              </tr>

              {/* Category 3: Integrations & Teams */}
              <tr style={{ background: 'var(--bg-primary)' }}>
                <td className="comparison-td" style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--primary-600)' }} colSpan="4">
                  {t('pricing_cat_team', 'TEAM COLLABORATION & INTEGRATION')}
                </td>
              </tr>
              <tr>
                <td className="comparison-td">{t('pricing_feature_entity_profiles', 'Business entity profiles in one account')}</td>
                <td className="comparison-td" style={{ textAlign: 'center' }}>{t('pricing_1_profile', '1 Profile')}</td>
                <td className="comparison-td" style={{ textAlign: 'center' }}>{t('pricing_3_profiles', '3 Profiles')}</td>
                <td className="comparison-td" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary-600)' }}>{t('pricing_unlimited_profiles', 'Unlimited Profiles')}</td>
              </tr>
              <tr>
                <td className="comparison-td">{t('pricing_feature_ca_link', 'Automated Accountant / CA credentials link')}</td>
                <td className="comparison-td" style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </td>
                <td className="comparison-td" style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </td>
                <td className="comparison-td" style={{ textAlign: 'center', color: 'var(--success)' }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17 4 12"/></svg>
                </td>
              </tr>
              <tr>
                <td className="comparison-td">{t('pricing_feature_billing_exports', 'Billing exports format support')}</td>
                <td className="comparison-td" style={{ textAlign: 'center' }}>{t('pricing_csv_only', 'CSV only')}</td>
                <td className="comparison-td" style={{ textAlign: 'center' }}>{t('pricing_csv_pdf', 'CSV & PDF reports')}</td>
                <td className="comparison-td" style={{ textAlign: 'center', color: 'var(--success)', display: 'table-cell' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17 4 12"/></svg>
                    <span>{t('pricing_csv_pdf_json', 'CSV, PDF & JSON')}</span>
                  </div>
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      {/* 5. FAQ Accordion Section */}
      <div style={{ maxWidth: '800px', margin: '0 auto 5rem auto', position: 'relative', zIndex: 10 }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, textTransform: 'none', textAlign: 'center', marginBottom: '2rem' }}>
          {t('pricing_faq_title')}
        </h3>

        <div>
          {[
            {
              q: t('pricing_faq1_q'),
              a: t('pricing_faq1_a')
            },
            {
              q: t('pricing_faq2_q'),
              a: t('pricing_faq2_a')
            },
            {
              q: t('pricing_faq3_q'),
              a: t('pricing_faq3_a')
            },
            {
              q: t('pricing_faq4_q'),
              a: t('pricing_faq4_a')
            }
          ].map((faq, idx) => {
            const isFaqOpen = !!faqExpanded[idx];
            return (
              <div key={idx} className="faq-accordion-card">
                <button 
                  onClick={() => setFaqExpanded(prev => ({ ...prev, [idx]: !isFaqOpen }))}
                  className="faq-question-btn"
                >
                  <span>{faq.q}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', transform: isFaqOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                    ▼
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isFaqOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="faq-answer-content">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Billing history table (Only visible to logged-in users) */}
      {auth.currentUser && (
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', marginBottom: '5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', position: 'relative', zIndex: 10 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.25rem', textAlign: 'left' }}>{t('pricing_billing_ledger')}</h3>
          
          {billingHistory.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, padding: '1rem 0', textAlign: 'left' }}>{t('pricing_no_payments')}</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.75rem' }}>{t('pricing_receipt_ref')}</th>
                    <th style={{ padding: '0.75rem' }}>{t('pricing_date_created')}</th>
                    <th style={{ padding: '0.75rem' }}>{t('pricing_filing_segment')}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>{t('pricing_amount_paid')}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>{t('pricing_order_id')}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>{t('pricing_provider')}</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>{t('pricing_filing_status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {billingHistory.map((txn, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>{txn.id}</td>
                      <td style={{ padding: '0.75rem' }}>{txn.date}</td>
                      <td style={{ padding: '0.75rem' }}>{txn.plan}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700 }}>{txn.amount}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontFamily: 'monospace' }}>{txn.orderId || '—'}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>{txn.provider || 'Cashfree'}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span className="badge-premium badge-excellent" style={{ 
                          fontSize: '0.65rem', 
                          background: String(txn.status || '').toUpperCase() === 'SUCCESS' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                          color: String(txn.status || '').toUpperCase() === 'SUCCESS' ? 'var(--success)' : 'var(--warning)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontWeight: 700
                        }}>
                          {String(txn.status || '').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 9. ULTRA-PROFESSIONAL DUAL-THEME FOOTER */}
      <footer style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', padding: '4rem 1.5rem 2rem 1.5rem', margin: '0 -1.5rem -2.5rem -1.5rem', position: 'relative', zIndex: 10 }} className="footer-theme">
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          


          {/* 6-Column Navigation Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '2rem', marginBottom: '3.5rem', textAlign: 'left' }}>
            
            {/* Brand Column (Spans 2 cols on wide screens) */}
            <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-600)', color: 'white', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>G</div>
                <strong style={{ fontSize: '1.05rem', fontWeight: 800 }}>GST Buddy AI</strong>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {t('pricing_footer_desc')}
              </p>
              
              {/* Badges */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>{t('pricing_ssl_badge')}</span>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-600)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>{t('pricing_iso_badge')}</span>
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '1rem', letterSpacing: '0.05em' }}>{t('pricing_footer_product')}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span onClick={() => handleMockNav('/agent')} className="footer-link-item">{t('pricing.footer_ai_accountant')}</span>
                <span onClick={() => handleMockNav('/bill-upload')} className="footer-link-item">{t('pricing.footer_invoice_intelligence')}</span>
                <span onClick={() => handleMockNav('/compliance')} className="footer-link-item">{t('pricing.footer_compliance_center')}</span>
                <span onClick={() => handleMockNav('/audit')} className="footer-link-item">{t('pricing.footer_itc_reconciliation')}</span>
                <span onClick={() => navigate('/pricing')} className="footer-link-item">{t('pricing.footer_pricing_plans')}</span>
                <span onClick={() => handleMockNav('/dashboard')} className="footer-link-item">{t('pricing.footer_tally_sync')}</span>
              </div>
            </div>

            {/* Solutions Column */}
            <div>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '1rem', letterSpacing: '0.05em' }}>{t('pricing_footer_solutions')}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span onClick={() => handleMockNav('/dashboard')} className="footer-link-item">{t('pricing.footer_for_msmes')}</span>
                <span onClick={() => handleMockNav('/dashboard')} className="footer-link-item">{t('pricing.footer_for_cas')}</span>
                <span onClick={() => handleMockNav('/dashboard')} className="footer-link-item">{t('pricing.footer_enterprise')}</span>
                <span onClick={() => handleMockNav('/dashboard')} className="footer-link-item">{t('pricing.footer_ecommerce')}</span>
                <span onClick={() => handleMockNav('/dashboard')} className="footer-link-item">{t('pricing.footer_retail')}</span>
              </div>
            </div>

            {/* Resources Column */}
            <div>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '1rem', letterSpacing: '0.05em' }}>{t('pricing_footer_resources')}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span onClick={() => handleMockNav('/support')} className="footer-link-item">{t('pricing.footer_gst_calculator')}</span>
                <span onClick={() => handleMockNav('/support')} className="footer-link-item">{t('pricing.footer_hsn_finder')}</span>
                <span onClick={() => handleMockNav('/support')} className="footer-link-item">{t('pricing.footer_einvoicing_guide')}</span>
                <span onClick={() => handleMockNav('/support')} className="footer-link-item">{t('pricing.footer_blog')}</span>
                <span onClick={() => handleMockNav('/support')} className="footer-link-item">{t('pricing.footer_api_docs')}</span>
                <span onClick={() => handleMockNav('/support')} className="footer-link-item">{t('pricing.footer_system_status')}</span>
              </div>
            </div>

            {/* Company Column */}
            <div>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '1rem', letterSpacing: '0.05em' }}>{t('pricing_footer_company')}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span onClick={() => handleMockNav('/support')} className="footer-link-item">{t('pricing.footer_about_us')}</span>
                <span onClick={() => handleMockNav('/support')} className="footer-link-item">{t('pricing.footer_careers')} <span style={{ fontSize: '0.55rem', background: 'var(--success-light)', color: 'var(--success)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontWeight: 700 }}>{t('pricing.footer_hiring')}</span></span>
                <span onClick={() => handleMockNav('/support')} className="footer-link-item">{t('pricing.footer_contact_sales')}</span>
                <span onClick={() => handleMockNav('/support')} className="footer-link-item">{t('pricing.footer_privacy')}</span>
                <span onClick={() => handleMockNav('/support')} className="footer-link-item">{t('pricing.footer_terms')}</span>
                <span onClick={() => handleMockNav('/support')} className="footer-link-item">{t('pricing.footer_security')}</span>
              </div>
            </div>

          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '2rem 0' }} />

          {/* Bottom Legal Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span>© 2026 GST Buddy AI. {t('pricing_all_rights')}</span>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>{t('made_for_india', 'Made with precision for Indian Businesses')}</span>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}

export default PricingBilling;
