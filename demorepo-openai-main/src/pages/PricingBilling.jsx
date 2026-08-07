import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { auth } from '../config/firebase';
import { motion, AnimatePresence } from 'framer-motion';

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

  // Switcher & Slider States for Section 8
  const [isYearly, setIsYearly] = useState(false);
  const [invoicesCount, setInvoicesCount] = useState(150);
  const [caCost, setCaCost] = useState(5000);
  const [hoursSpent, setHoursSpent] = useState(20);
  const [faqExpanded, setFaqExpanded] = useState({});



  // 1. Dynamic Script Loader helper for Razorpay SDK
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

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
        setActivePlan(statusData.subscriptionPlan);
        localStorage.setItem('saas_active_plan', statusData.subscriptionPlan || 'free');
        window.dispatchEvent(new Event('planChanged'));
        setSubscriptionStatus(statusData.subscriptionStatus);
        setSubscriptionStart(statusData.subscriptionStart);
        setSubscriptionExpiry(statusData.subscriptionExpiry);
      } else {
        const errText = await statusRes.text().catch(() => "");
        console.error('Failed to fetch subscription status from API.', statusRes.status, errText);
      }

      // Fetch payment history logs
      const historyRes = await fetch(getApiUrl('/api/payment/history'), { headers });
      if (historyRes.ok) {
        const historyData = await safeParseJson(historyRes);
        const formattedHistory = historyData.map(txn => ({
          id: txn.paymentId,
          date: txn.createdAt.split('T')[0],
          plan: txn.plan === 'pro' ? 'Pro Plan' : 'Business Plan',
          amount: `₹${txn.amount}`,
          status: txn.status,
          utr: txn.razorpayPaymentId || 'N/A'
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
    // Preload Razorpay Checkout script in the background to ensure zero lag on button click
    loadRazorpayScript().catch(err => console.warn("Failed to preload Razorpay SDK:", err));

    // Check for pending checkout actions after login redirect
    const currentUser = auth.currentUser;
    if (currentUser) {
      const pendingPlan = localStorage.getItem('pending_subscribe_plan');
      if (pendingPlan) {
        const pendingYearly = localStorage.getItem('pending_subscribe_yearly') === 'true';
        localStorage.removeItem('pending_subscribe_plan');
        localStorage.removeItem('pending_subscribe_yearly');
        
        setIsYearly(pendingYearly);
        // Delay order generation slightly to allow firebase session details and scripts to settle
        setTimeout(() => {
          handleSubscribe(pendingPlan);
        }, 800);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 3. Initiate payment order and open Razorpay Checkout SDK
  const handleSubscribe = async (planId) => {
    if (planId === 'free') {
      alert('You are already on the Free Plan. Downgrade takes effect at the end of billing cycle.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        // Save the chosen plan and yearly commitment to localStorage so we don't lose it after login
        localStorage.setItem('authRedirect', '/pricing');
        localStorage.setItem('pending_subscribe_plan', planId);
        localStorage.setItem('pending_subscribe_yearly', isYearly ? 'true' : 'false');
        
        setIsProcessing(false);
        navigate('/login');
        return;
      }

      // Load Razorpay checkout script
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        setErrorMsg('Unable to load Razorpay payment SDK. Please verify network connectivity.');
        setIsProcessing(false);
        return;
      }

      // Create Order API endpoint call
      const token = await currentUser.getIdToken(true);
      const response = await fetch(getApiUrl('/api/payment/create-order'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId, isYearly })
      });

      if (!response.ok) {
        const errorData = await safeParseJson(response);
        throw new Error(errorData.error || errorData.message || 'Failed to create payment transaction.');
      }

      const orderData = await safeParseJson(response);

      // Configure Razorpay Checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'GST Buddy AI',
        description: `Upgrade to ${planId === 'pro' ? 'Pro Plan' : 'Business Plan'}`,
        image: 'https://cdn-icons-png.flaticon.com/512/2933/2933116.png', // Modern corporate compliance logo placeholder
        order_id: orderData.order_id,
        prefill: {
          name: user?.name || user?.displayName || '',
          email: user?.email || '',
          contact: user?.phone || ''
        },
        notes: {
          uid: currentUser.uid,
          planId: planId
        },
        theme: {
          color: '#6366f1' // Professional Indigo Theme Accent
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            console.log('Payment checkout process cancelled by user.');
          }
        },
        handler: async function (paymentResponse) {
          try {
            setIsProcessing(true);
            setSuccessMsg('Verifying payment signature with secure servers...');

            // Call verify API endpoint
            const verifyRes = await fetch(getApiUrl('/api/payment/verify'), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                planId: planId,
                isYearly: isYearly
              })
            });

            if (!verifyRes.ok) {
              const verifyError = await safeParseJson(verifyRes);
              throw new Error(verifyError.error || verifyError.message || 'Payment signature verification failed.');
            }

            setSuccessMsg('Payment verified! Active subscription updated successfully.');
            
            // Reload billing statement and status details
            await fetchSubscriptionAndBillingData();

            // Redirect to success route
            navigate('/payment-success', {
              state: {
                txn: {
                  id: paymentResponse.razorpay_payment_id,
                  date: new Date().toISOString().split('T')[0],
                  plan: planId === 'pro' ? 'Pro Plan' : 'Business Plan',
                  amount: planId === 'pro' ? '₹199' : '₹499',
                  status: 'SUCCESS',
                  utr: paymentResponse.razorpay_payment_id
                }
              }
            });

          } catch (verifyErr) {
            console.error('Signature validation exception:', verifyErr);
            setErrorMsg(`Verification failed: ${verifyErr.message}`);
          } finally {
            setIsProcessing(false);
          }
        }
      };

      const rzpObj = new window.Razorpay(options);
      
      rzpObj.on('payment.failed', function (failDetails) {
        console.error('Razorpay Payment failed event:', failDetails.error);
        setErrorMsg(`Payment failed: ${failDetails.error.description || 'Transaction declined'}`);
        setIsProcessing(false);
      });

      rzpObj.open();

    } catch (checkoutErr) {
      console.error('Checkout error:', checkoutErr);
      setErrorMsg(`Checkout error: ${checkoutErr.message}`);
      setIsProcessing(false);
    }
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
      const verifyRes = await fetch(getApiUrl('/api/payment/verify'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          razorpay_order_id: "downgrade_order_" + Date.now(),
          razorpay_payment_id: "downgrade_payment_" + Date.now(),
          razorpay_signature: "reset_signature",
          planId: "free"
        })
      });
      if (!verifyRes.ok) {
        throw new Error('Failed to downgrade subscription.');
      }
      setSuccessMsg('Successfully downgraded to the Free Tier!');
      await fetchSubscriptionAndBillingData();
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
        <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Retrieving active subscription details...</p>
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
          <h3 style={{ color: 'white', fontWeight: 800, fontSize: '1.2rem', margin: 0 }}>Gateway Processing...</h3>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Do not refresh the page or click back.</p>
        </div>
      )}

      {/* Header section */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Pricing & Subscriptions</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Select plan frameworks, upgrade limits, and audit past subscription billing statements.
        </p>
      </div>

      {/* Status Notifications */}
      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><strong>Error:</strong> {errorMsg}</span>
          <button onClick={() => setErrorMsg('')} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem' }}>&times;</button>
        </div>
      )}

      {successMsg && (
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid rgba(34, 197, 94, 0.2)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><strong>Success:</strong> {successMsg}</span>
          <button onClick={() => setSuccessMsg('')} style={{ background: 'transparent', border: 'none', color: '#22c55e', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem' }}>&times;</button>
        </div>
      )}

      {/* Subscription Active Badge & Usage Limits Panel */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '2.5rem', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Current Subscription Status</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status:</span>
            <span style={{ 
              background: subscriptionStatus === 'active' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
              color: subscriptionStatus === 'active' ? '#22c55e' : '#ef4444', 
              padding: '0.25rem 0.75rem', 
              borderRadius: '9999px', 
              fontSize: '0.75rem', 
              fontWeight: 700,
              textTransform: 'uppercase'
            }}>
              {subscriptionStatus === 'active' ? 'Active' : 'Expired'}
            </span>
          </div>
        </div>
        
        <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '2rem', border: '1px solid var(--border-color)', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>Active Tier</span>
            <strong style={{ fontSize: '1.15rem', color: 'var(--theme-primary-light)' }}>
              {activePlan === 'free' ? 'Free Plan' : activePlan === 'pro' ? 'Pro Plan' : 'Business Plan'}
            </strong>
          </div>
          {subscriptionStart && (
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>Billing Start</span>
              <strong style={{ fontSize: '0.95rem' }}>{new Date(subscriptionStart).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</strong>
            </div>
          )}
          {subscriptionExpiry && (
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>Next Renewal Date</span>
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
                Renew Subscription
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3" style={{ gap: '2rem', marginTop: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              <span>Monthly Invoices OCR</span>
              <strong>{activePlan === 'free' ? 'Up to 10 scans' : 'Unlimited'}</strong>
            </div>
            <div style={{ width: '100%', background: 'var(--bg-tertiary)', borderRadius: '10px', height: '6px', overflow: 'hidden' }}>
              <div style={{ width: activePlan === 'free' ? '20%' : '100%', background: 'var(--theme-primary)', height: '100%' }}></div>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              <span>AI accountant suggestions</span>
              <strong>{activePlan === 'free' ? 'Basic AI Suggestions' : activePlan === 'pro' ? 'Advanced AI Insights' : 'Advanced Insights & Analytics'}</strong>
            </div>
            <div style={{ width: '100%', background: 'var(--bg-tertiary)', borderRadius: '10px', height: '6px', overflow: 'hidden' }}>
              <div style={{ width: activePlan === 'free' ? '30%' : activePlan === 'pro' ? '70%' : '100%', background: 'var(--theme-secondary)', height: '100%' }}></div>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              <span>OCR capabilities</span>
              <strong>{activePlan === 'free' ? 'Limited OCR' : 'Unlimited OCR'}</strong>
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

      {/* 1. Animated Billing Switcher */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.35rem', borderRadius: '9999px', border: '1px solid var(--border-color)', gap: '0.25rem' }}>
          <button 
            onClick={() => setIsYearly(false)}
            className={`switcher-btn ${!isYearly ? 'active' : 'inactive'}`}
            style={{ background: !isYearly ? 'var(--primary-600)' : 'transparent', color: !isYearly ? 'white' : 'var(--text-secondary)' }}
          >
            Monthly Billing
          </button>
          <button 
            onClick={() => setIsYearly(true)}
            className={`switcher-btn ${isYearly ? 'active' : 'inactive'}`}
            style={{ background: isYearly ? 'var(--primary-600)' : 'transparent', color: isYearly ? 'white' : 'var(--text-secondary)' }}
          >
            Yearly Billing
          </button>
        </div>
        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700, background: 'var(--success-light)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
            SAVE 20%
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>on annual commitments</span>
        </div>
      </div>

      {/* 2. 3 Pricing Tiers Cards Grid */}
      <div className="grid grid-cols-3" style={{ gap: '2rem', marginBottom: '4rem', position: 'relative', zIndex: 10 }}>
        
        {/* Tier 1: Free Plan */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column', border: activePlan === 'free' ? '2px solid var(--theme-primary)' : '1px solid var(--border-color)', position: 'relative', background: 'var(--bg-secondary)' }}>
          {activePlan === 'free' && <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--theme-primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>ACTIVE PLAN</span>}
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em' }}>STARTER</span>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0' }}>₹0 <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ month</span></h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', minHeight: '36px' }}>Ideal for solo-entrepreneurs and micro-shops filing nil or few monthly returns.</p>
          
          <ul style={{ fontSize: '0.8rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', flex: 1, color: 'var(--text-secondary)', textAlign: 'left' }}>
            <li>10 invoice scans / month</li>
            <li>Basic AI accountant suggestions</li>
            <li>Limited OCR capabilities</li>
            <li>Single business entity profile</li>
            <li>Standard CSV billing exports</li>
          </ul>
          
          <button 
            disabled={activePlan === 'free'} 
            onClick={handleDowngradeToFree}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '0.6rem', cursor: activePlan === 'free' ? 'not-allowed' : 'pointer' }}
          >
            {activePlan === 'free' ? 'Active Starter Plan' : 'Downgrade to Free'}
          </button>
        </div>

        {/* Tier 2: Pro Plan (Featured) */}
        <div className={`glass-panel ${activePlan === 'pro' ? '' : 'purple-glow-border'}`} style={{ borderRadius: 'var(--radius-xl)', padding: '2.25rem 2rem', display: 'flex', flexDirection: 'column', position: 'relative', background: 'var(--bg-secondary)', transform: 'scale(1.02)', zIndex: 5, border: activePlan === 'pro' ? '2px solid var(--theme-primary)' : '1px solid var(--border-color)' }}>
          <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)' }}>
            <span className="most-popular-badge">MOST POPULAR</span>
          </div>
          {activePlan === 'pro' && <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--theme-primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>ACTIVE PLAN</span>}
          <span style={{ fontSize: '0.8rem', color: 'var(--primary-600)', fontWeight: 700, letterSpacing: '0.05em' }}>PROFESSIONAL</span>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0' }}>
            ₹{isYearly ? '159' : '199'} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ month</span>
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', minHeight: '36px' }}>Standard SaaS framework for growing small businesses requiring regular auditing and bulk processing.</p>
          
          <ul style={{ fontSize: '0.8rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', flex: 1, color: 'var(--text-secondary)', textAlign: 'left' }}>
            <li><strong>Unlimited</strong> invoice scans</li>
            <li><strong>Unlimited</strong> OCR extraction</li>
            <li>Advanced AI tax audit & insights</li>
            <li>Direct GSTR-1 & GSTR-3B draft pre-fills</li>
            <li>Email & WhatsApp reminder sync</li>
            <li>Up to 3 business entity profiles</li>
          </ul>

          <button 
            onClick={() => handleSubscribe('pro')}
            className={activePlan === 'pro' ? 'btn btn-secondary' : 'btn btn-primary'}
            style={{ width: '100%', padding: '0.6rem', background: activePlan === 'pro' ? 'transparent' : 'var(--primary-600)' }}
            disabled={activePlan === 'pro' || isProcessing}
          >
            {activePlan === 'pro' ? 'Active Professional Plan' : isYearly ? 'Upgrade Yearly (₹1,908/yr)' : 'Upgrade to Pro'}
          </button>
        </div>

        {/* Tier 3: Business Plan */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column', border: activePlan === 'business' ? '2px solid var(--theme-primary)' : '1px solid var(--border-color)', position: 'relative', background: 'var(--bg-secondary)' }}>
          {activePlan === 'business' && <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--theme-primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>ACTIVE PLAN</span>}
          <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 700, letterSpacing: '0.05em' }}>BUSINESS</span>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0' }}>
            ₹{isYearly ? '399' : '499'} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ month</span>
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', minHeight: '36px' }}>For merchants, CAs, and corporate entities with high billing volumes and complex GST structures.</p>
          
          <ul style={{ fontSize: '0.8rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', flex: 1, color: 'var(--text-secondary)', textAlign: 'left' }}>
            <li><strong>Everything</strong> in Professional</li>
            <li>Multi-user CA & team permissions access</li>
            <li>Interactive Business Health & Profit analytics</li>
            <li>Automatic non-filing vendor blocker</li>
            <li>Dedicated priority API access key</li>
            <li>Custom PDF exports & audit logs</li>
          </ul>

          <button 
            onClick={() => handleSubscribe('business')}
            className={activePlan === 'business' ? 'btn btn-secondary' : 'btn btn-primary'}
            style={{ width: '100%', padding: '0.6rem' }}
            disabled={activePlan === 'business' || isProcessing}
          >
            {activePlan === 'business' ? 'Active Business Plan' : isYearly ? 'Get Business Yearly (₹4,788/yr)' : 'Get Business Plan'}
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
          Estimate the direct fiscal return on investment and hours saved by shifting your tax compliance workflows to GST Buddy AI.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '3rem' }} className="grid">
          
          {/* Sliders Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            
            {/* Slider 1: Invoices count */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600 }}>Estimated Invoices per Month:</span>
                <strong style={{ color: 'var(--primary-600)' }}>{invoicesCount} Invoices</strong>
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
                <span style={{ fontWeight: 600 }}>Current Professional Accountant / CA Cost (Monthly):</span>
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
                <span style={{ fontWeight: 600 }}>Manual Hours Spent on Invoices & Filing (Monthly):</span>
                <strong style={{ color: 'var(--primary-600)' }}>{hoursSpent} Hours</strong>
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
                monthlyPlanCost = isYearly ? 399 : 499;
              } else if (invoicesCount > 10) {
                recommendedPlanName = 'Professional Plan';
                recommendedPlanName = 'Professional Plan';
                monthlyPlanCost = isYearly ? 159 : 199;
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
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Estimated Annual Savings</span>
                    <strong style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--success)' }}>
                      ₹{annualSavings.toLocaleString('en-IN')}
                    </strong>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', textAlign: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Time Saved (Monthly)</span>
                      <strong style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-600)' }}>
                        {monthlyHoursSaved.toFixed(1)} Hrs
                      </strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Estimated ROI</span>
                      <strong style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-600)' }}>
                        {roiPercent === 'Infinite' ? 'Infinite ROI' : `${roiPercent}%`}
                      </strong>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.75rem', textAlign: 'center' }}>
                    Recommended plan: <strong style={{ color: 'var(--primary-600)' }}>{recommendedPlanName}</strong> (₹{monthlyPlanCost}/mo)
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
          Platform Feature Matrix Comparison
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }} className="comparison-table">
            <thead>
              <tr style={{ color: 'var(--text-primary)' }}>
                <th className="comparison-th" style={{ width: '40%' }}>Core Capabilities</th>
                <th className="comparison-th" style={{ textAlign: 'center' }}>Free</th>
                <th className="comparison-th" style={{ textAlign: 'center', color: 'var(--primary-600)' }}>Professional</th>
                <th className="comparison-th" style={{ textAlign: 'center' }}>Business</th>
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
                <td className="comparison-td">{t('pricing_feature_ocr', 'Groq AI OCR line-item extraction')}</td>
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
                    <span>{t('pricing_llama_assistant', 'Llama 3.3 Assistant')}</span>
                  </div>
                </td>
                <td className="comparison-td" style={{ textAlign: 'center', color: 'var(--success)', display: 'table-cell' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17 4 12"/></svg>
                    <span>{t('pricing_llama_assistant', 'Llama 3.3 Assistant')}</span>
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
          Frequently Asked Questions
        </h3>

        <div>
          {[
            {
              q: "Can I cancel my subscription or change plans at any time?",
              a: "Yes, you can upgrade, downgrade, or cancel your active subscription plan at any point. Upgrades apply instantly, while downgrades take effect at the end of your current billing cycle so you do not lose any features you paid for."
            },
            {
              q: "How does the 20% discount on yearly plans work?",
              a: "When you select Yearly Billing, you are billed for 12 months upfront at a 20% discount. For example, the Professional tier is reduced from ₹199/mo to ₹159/mo, billed as ₹1,908 annually."
            },
            {
              q: "Is Razorpay payment gateway secure?",
              a: "Absolutely. All subscription payments are processed securely through Razorpay, which is fully PCI-DSS compliant. GST Buddy AI never holds or processes your credit card numbers or banking secrets."
            },
            {
              q: "How accurate is the AI Bill OCR extraction?",
              a: "Our AI bill extraction uses Llama 3.3 70B via Groq to parse invoices. It achieves 99% accuracy on standard invoices, identifying supplier names, GSTINs, tax lines, categories, and totals automatically."
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
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.25rem', textAlign: 'left' }}>Billing Statement Ledger</h3>
          
          {billingHistory.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, padding: '1rem 0', textAlign: 'left' }}>No invoice payments found. Upgrade your subscription to start transactions.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.75rem' }}>Receipt reference</th>
                    <th style={{ padding: '0.75rem' }}>Date Created</th>
                    <th style={{ padding: '0.75rem' }}>Filing Segment</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Amount Paid</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Razorpay Payment ID</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Filing Status</th>
                  </tr>
                </thead>
                <tbody>
                  {billingHistory.map((txn, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>{txn.id}</td>
                      <td style={{ padding: '0.75rem' }}>{txn.date}</td>
                      <td style={{ padding: '0.75rem' }}>{txn.plan}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700 }}>{txn.amount}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontFamily: 'monospace' }}>{txn.utr}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span className="badge-premium badge-excellent" style={{ 
                          fontSize: '0.65rem', 
                          background: txn.status === 'SUCCESS' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                          color: txn.status === 'SUCCESS' ? 'var(--success)' : 'var(--warning)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontWeight: 700
                        }}>
                          {txn.status}
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
                Automating finance compliance, invoice extraction, and returns drafting using Groq Llama 3.3.
              </p>
              
              {/* Badges */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>256-Bit SSL Secured</span>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-600)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>ISO 27001 Certified</span>
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '1rem', letterSpacing: '0.05em' }}>Product</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span onClick={() => handleMockNav('/agent')} className="footer-link-item">AI Accountant</span>
                <span onClick={() => handleMockNav('/bill-upload')} className="footer-link-item">Invoice Intelligence</span>
                <span onClick={() => handleMockNav('/compliance')} className="footer-link-item">Compliance Center</span>
                <span onClick={() => handleMockNav('/audit')} className="footer-link-item">ITC Reconciliation</span>
                <span onClick={() => navigate('/pricing')} className="footer-link-item">Pricing Plans</span>
                <span onClick={() => handleMockNav('/dashboard')} className="footer-link-item">Tally & Zoho Sync</span>
              </div>
            </div>

            {/* Solutions Column */}
            <div>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '1rem', letterSpacing: '0.05em' }}>Solutions</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span onClick={() => handleMockNav('/dashboard')} className="footer-link-item">For MSMEs</span>
                <span onClick={() => handleMockNav('/dashboard')} className="footer-link-item">For CAs & Tax Pros</span>
                <span onClick={() => handleMockNav('/dashboard')} className="footer-link-item">Enterprise & Corporates</span>
                <span onClick={() => handleMockNav('/dashboard')} className="footer-link-item">E-commerce Sellers</span>
                <span onClick={() => handleMockNav('/dashboard')} className="footer-link-item">Retail & Wholesale</span>
              </div>
            </div>

            {/* Resources Column */}
            <div>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '1rem', letterSpacing: '0.05em' }}>Resources</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span onClick={() => handleMockNav('/support')} className="footer-link-item">GST Rate Calculator</span>
                <span onClick={() => handleMockNav('/support')} className="footer-link-item">HSN Code Finder</span>
                <span onClick={() => handleMockNav('/support')} className="footer-link-item">E-Invoicing Guide</span>
                <span onClick={() => handleMockNav('/support')} className="footer-link-item">Blog & Tax News</span>
                <span onClick={() => handleMockNav('/support')} className="footer-link-item">API Documentation</span>
                <span onClick={() => handleMockNav('/support')} className="footer-link-item">Live System Status</span>
              </div>
            </div>

            {/* Company Column */}
            <div>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '1rem', letterSpacing: '0.05em' }}>Company</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span onClick={() => handleMockNav('/support')} className="footer-link-item">About Us</span>
                <span onClick={() => handleMockNav('/support')} className="footer-link-item">Careers <span style={{ fontSize: '0.55rem', background: 'var(--success-light)', color: 'var(--success)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontWeight: 700 }}>HIRING</span></span>
                <span onClick={() => handleMockNav('/support')} className="footer-link-item">Contact Sales</span>
                <span onClick={() => handleMockNav('/support')} className="footer-link-item">Privacy Policy</span>
                <span onClick={() => handleMockNav('/support')} className="footer-link-item">Terms of Service</span>
                <span onClick={() => handleMockNav('/support')} className="footer-link-item">Security & Trust</span>
              </div>
            </div>

          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '2rem 0' }} />

          {/* Bottom Legal Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span>© 2026 GST Buddy AI. Built for the NxtWave BUILDATHON. All rights reserved.</span>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span>GSTIN: 29ABCDE1234F2Z5</span>
              <span>•</span>
              <span style={{ fontWeight: 600 }}>{t('made_for_india', 'Made with precision for Indian Businesses')}</span>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}

export default PricingBilling;
