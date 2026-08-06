import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../config/firebase';

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

  // Simulated Checkout Sandbox Modal States
  const [showSimulatedModal, setShowSimulatedModal] = useState(false);
  const [simulatedOrderDetails, setSimulatedOrderDetails] = useState(null);

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
        console.warn("⚠️ User is not authenticated. Redirecting to login.");
        setLoadingState(false);
        navigate('/');
        return;
      }

      const token = await currentUser.getIdToken(true);
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch active subscription status
      const statusRes = await fetch(getApiUrl('/api/subscription/status'), { headers });
      if (statusRes.ok) {
        const statusData = await safeParseJson(statusRes);
        setActivePlan(statusData.subscriptionPlan);
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
        setErrorMsg('Authentication required. Please sign in to upgrade.');
        setIsProcessing(false);
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
        body: JSON.stringify({ planId })
      });

      if (!response.ok) {
        const errorData = await safeParseJson(response);
        throw new Error(errorData.error || errorData.message || 'Failed to create payment transaction.');
      }

      const orderData = await safeParseJson(response);

      // Detect if we have a dummy/placeholder key ID
      const keyId = orderData.key_id;
      const isDummyKey = !keyId || keyId.includes("dummy") || keyId === "rzp_test_dummykey123" || keyId.includes("YOUR");

      if (isDummyKey) {
        console.log("ℹ️ Dummy Razorpay key detected. Launching simulated checkout gateway.");
        setSimulatedOrderDetails({
          order_id: orderData.order_id,
          planId,
          amount: orderData.amount,
          token
        });
        setShowSimulatedModal(true);
        setIsProcessing(false);
        return;
      }

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
                planId: planId
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
                  amount: planId === 'pro' ? '₹299' : '₹999',
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

  const handleSimulatedPaymentSuccess = async () => {
    if (!simulatedOrderDetails) return;
    setShowSimulatedModal(false);
    setIsProcessing(true);
    setSuccessMsg('Verifying simulated payment signature...');
    
    try {
      const mockResponse = {
        razorpay_order_id: simulatedOrderDetails.order_id,
        razorpay_payment_id: `pay_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        razorpay_signature: "mock_signature_for_testing",
        planId: simulatedOrderDetails.planId
      };
      
      const verifyRes = await fetch(getApiUrl('/api/payment/verify'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${simulatedOrderDetails.token}`
        },
        body: JSON.stringify(mockResponse)
      });
      
      if (!verifyRes.ok) {
        const verifyError = await safeParseJson(verifyRes);
        throw new Error(verifyError.error || verifyError.message || 'Payment signature verification failed.');
      }
      
      setSuccessMsg('Simulated payment verified! Active subscription updated successfully.');
      await fetchSubscriptionAndBillingData();
      
      navigate('/payment-success', {
        state: {
          txn: {
            id: mockResponse.razorpay_payment_id,
            date: new Date().toISOString().split('T')[0],
            plan: simulatedOrderDetails.planId === 'pro' ? 'Pro Plan' : 'Business Plan',
            amount: simulatedOrderDetails.planId === 'pro' ? '₹299' : '₹999',
            status: 'SUCCESS',
            utr: mockResponse.razorpay_payment_id
          }
        }
      });
    } catch (err) {
      console.error('Simulated verification exception:', err);
      setErrorMsg(`Simulated verification failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setSimulatedOrderDetails(null);
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
                className="btn btn-outline" 
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

      {/* Subscription Cards Grid */}
      <div className="grid grid-cols-3" style={{ gap: '2rem', marginBottom: '3rem' }}>
        
        {/* Free Plan */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column', border: activePlan === 'free' ? '2px solid var(--theme-secondary)' : '1px solid var(--border-color)', position: 'relative' }}>
          {activePlan === 'free' && <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--theme-secondary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>CURRENT PLAN</span>}
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>STARTER PLAN</span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.5rem 0' }}>Free <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ forever</span></h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', minHeight: '36px' }}>Ideal for solo-entrepreneurs and micro-shops filing nil or few monthly returns.</p>
          
          <ul style={{ fontSize: '0.8rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', flex: 1 }}>
            <li>10 invoice scans/month</li>
            <li>Basic AI suggestions</li>
            <li>Limited OCR</li>
          </ul>
          
          <button 
            disabled={true} 
            className="btn btn-outline"
            style={{ width: '100%', padding: '0.6rem' }}
          >
            {activePlan === 'free' ? 'Active Plan' : 'Free Tier'}
          </button>
        </div>

        {/* Pro Plan */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column', border: activePlan === 'pro' ? '2px solid var(--theme-secondary)' : '1px solid var(--border-color)', position: 'relative' }}>
          {activePlan === 'pro' && <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--theme-secondary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>CURRENT PLAN</span>}
          <span style={{ fontSize: '0.8rem', color: 'var(--theme-primary-light)', fontWeight: 700 }}>PROFESSIONAL</span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.5rem 0' }}>₹299 <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ month</span></h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', minHeight: '36px' }}>Standard SaaS framework for small businesses requiring regular auditing and bulk processing.</p>
          
          <ul style={{ fontSize: '0.8rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', flex: 1 }}>
            <li>Unlimited invoice scans</li>
            <li>Unlimited OCR</li>
            <li>Advanced AI insights</li>
            <li>GST report export</li>
            <li>Priority support</li>
          </ul>

          <button 
            onClick={() => handleSubscribe('pro')}
            className="btn btn-primary"
            style={{ 
              width: '100%', 
              padding: '0.6rem', 
              background: activePlan === 'pro' ? 'var(--bg-tertiary)' : 'var(--theme-primary)', 
              color: activePlan === 'pro' ? 'var(--text-secondary)' : 'white' 
            }}
            disabled={activePlan === 'pro' || isProcessing}
          >
            {activePlan === 'pro' ? 'Active Plan' : 'Upgrade to Pro'}
          </button>
        </div>

        {/* Business Plan */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column', border: activePlan === 'business' ? '2px solid var(--theme-secondary)' : '1px solid var(--border-color)', position: 'relative' }}>
          {activePlan === 'business' && <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--theme-secondary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>CURRENT PLAN</span>}
          <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 700 }}>BUSINESS PLAN</span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.5rem 0' }}>₹999 <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ month</span></h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', minHeight: '36px' }}>For merchants and corporate entities with high billing volumes and complex GST structures.</p>
          
          <ul style={{ fontSize: '0.8rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', flex: 1 }}>
            <li><strong>Everything</strong> in Pro</li>
            <li>Team members access</li>
            <li>Analytics dashboard</li>
            <li>Bulk invoice processing</li>
            <li>API access</li>
            <li>Admin tools</li>
          </ul>

          <button 
            onClick={() => handleSubscribe('business')}
            className="btn btn-primary"
            style={{ 
              width: '100%', 
              padding: '0.6rem', 
              background: activePlan === 'business' ? 'var(--bg-tertiary)' : 'var(--success)', 
              color: activePlan === 'business' ? 'var(--text-secondary)' : 'white' 
            }}
            disabled={activePlan === 'business' || isProcessing}
          >
            {activePlan === 'business' ? 'Active Plan' : 'Get Business'}
          </button>
        </div>

      </div>

      {/* Billing history table */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.25rem' }}>Billing Statement Ledger</h3>
        
        {billingHistory.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, padding: '1rem 0' }}>No invoice payments found. Upgrade your subscription to start transactions.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
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
        )}
      </div>

      {showSimulatedModal && simulatedOrderDetails && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          backdropFilter: 'blur(4px)',
          padding: '1rem'
        }}>
          <div style={{
            background: '#1e1b4b',
            color: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            border: '2px solid #6366f1',
            overflow: 'hidden',
            padding: '2.25rem',
            fontFamily: 'Inter, sans-serif'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <span style={{ background: '#6366f1', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em' }}>SANDBOX GATEWAY</span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.75rem 0 0.25rem 0', color: '#f8fafc' }}>Simulated Razorpay Checkout</h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>Placeholder API Key detected. Testing in simulated checkout mode.</p>
            </div>

            <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.75rem', border: '1px solid #334155', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: '#94a3b8' }}>Selected Plan:</span>
                <strong style={{ color: '#f8fafc' }}>{simulatedOrderDetails.planId === 'pro' ? 'Pro Plan' : 'Business Plan'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: '#94a3b8' }}>Amount:</span>
                <strong style={{ color: '#38bdf8', fontSize: '1rem' }}>₹{simulatedOrderDetails.amount / 100}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Order ID:</span>
                <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>{simulatedOrderDetails.order_id}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                onClick={handleSimulatedPaymentSuccess} 
                style={{ padding: '0.75rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Simulate Successful Payment
              </button>
              <button 
                onClick={() => {
                  setShowSimulatedModal(false);
                  setSimulatedOrderDetails(null);
                  setErrorMsg("Simulated payment cancelled by user.");
                }} 
                style={{ padding: '0.75rem 1rem', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', fontWeight: 'medium', fontSize: '0.9rem', cursor: 'pointer' }}
              >
                Cancel Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PricingBilling;
