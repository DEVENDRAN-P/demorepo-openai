import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../config/firebase';
import { useTranslation } from 'react-i18next';

const getApiUrl = (path) => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    if (window.location.port !== '5000') {
      return `http://localhost:5000${path}`;
    }
  }
  return path;
};

// Simple Loading Spinner component
const LoadingSpinner = () => (
  <div style={{
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255,255,255,0.1)',
    borderTop: '4px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }}></div>
);

// Dynamic loader for the official Cashfree Web SDK (v3)
const loadCashfreeScript = () => {
  return new Promise((resolve) => {
    if (window.Cashfree) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const safeParseJson = async (response) => {
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const responseText = await response.text();
    throw new Error(`Server returned non-JSON response: ${responseText.substring(0, 180)}`);
  }
  return await response.json();
};

function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [planAmount, setPlanAmount] = useState(199);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const plan = localStorage.getItem('selectedPlan') || 'pro';
    const normalized = plan === 'business' ? 'business' : 'pro';
    setSelectedPlan(normalized);
    setPlanAmount(normalized === 'pro' ? 199 : 499);

    // Prefill the mobile number from the authenticated profile when available.
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.phoneNumber) {
      setPhone(currentUser.phoneNumber);
    }

    // Never create duplicate subscriptions: if the user already holds this
    // plan, block checkout (the server remains the source of truth).
    if (currentUser) {
      currentUser.getIdToken()
        .then(token => fetch(getApiUrl('/api/subscription/status'), {
          headers: { Authorization: `Bearer ${token}` }
        }))
        .then(res => (res.ok ? res.json() : Promise.resolve({})))
        .then(data => {
          const current = data?.subscription?.subscriptionPlan || 'free';
          if (current === normalized && current !== 'free') {
            setAlreadySubscribed(true);
          }
        })
        .catch(() => { /* non-fatal: fall back to allowing checkout */ });
    }
  }, []);

  const validatePhone = (value) => {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    return digits.length === 10 && /^[6-9]/.test(digits);
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Cashfree requires a customer phone number for order creation.
    if (!validatePhone(phone)) {
      setPhoneError('A valid 10-digit Indian mobile number is required to continue with payment.');
      setIsProcessing(false);
      return;
    }
    setPhoneError('');

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setErrorMsg('Authentication error. Please sign in again.');
        setIsProcessing(false);
        return;
      }

      const isScriptLoaded = await loadCashfreeScript();
      if (!isScriptLoaded) {
        setErrorMsg('Unable to load the Cashfree payment SDK. Please check your internet connection and try again.');
        setIsProcessing(false);
        return;
      }

      const token = await currentUser.getIdToken(true);

      // 1. Create the Cashfree order (server-side; price determined by backend)
      setSuccessMsg('Creating a secure order with Cashfree...');
      const response = await fetch(getApiUrl('/api/payment/create-order'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan: selectedPlan, phone })
      });

      if (!response.ok) {
        const errorData = await safeParseJson(response);
        if (errorData.code === 'PHONE_REQUIRED') {
          setPhoneError(errorData.error || 'A mobile number is required to continue.');
          setIsProcessing(false);
          return;
        }
        throw new Error(errorData.details || errorData.message || errorData.error || 'Order creation failed.');
      }

      const orderData = await safeParseJson(response);

      // 2. Open the official Cashfree Checkout with the payment session ID.
      // The mode is returned by the backend (sandbox vs production) — the
      // secret key never touches the browser.
      setSuccessMsg('Opening Cashfree Checkout...');
      const cashfree = window.Cashfree({
        mode: orderData.cashfreeEnv === 'production' ? 'production' : 'sandbox'
      });

      const checkoutResult = await cashfree.checkout({
        paymentSessionId: orderData.paymentSessionId,
        redirectTarget: '_self'
      });

      // With redirectTarget '_self' the browser navigates to the hosted
      // checkout page (which offers UPI, cards, netbanking — whatever is
      // enabled on the Cashfree account) and returns via the return_url.
      if (checkoutResult && checkoutResult.error) {
        console.error('Cashfree checkout error:', checkoutResult.error);
        setErrorMsg(checkoutResult.error.message || 'Checkout could not be opened. Please try again.');
        setIsProcessing(false);
      } else if (checkoutResult && checkoutResult.redirect) {
        setSuccessMsg('Redirecting to Cashfree Checkout...');
      } else {
        setIsProcessing(false);
      }

    } catch (err) {
      console.error('Checkout error:', err);
      setErrorMsg(`Checkout error: ${err.message}`);
      setIsProcessing(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Checkout Card */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '24px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(20px)',
        textAlign: 'center'
      }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>{t('checkout_complete_subscription')}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '2rem' }}>
          {t('checkout_secure_checkout')}
        </p>

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.8rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)', fontSize: '0.8rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            {successMsg}
          </div>
        )}

        {/* Invoice Summary */}
        <div style={{
          background: 'var(--bg-tertiary)',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid var(--border-color)',
          marginBottom: '1.5rem',
          textAlign: 'left'
        }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#818cf8', fontWeight: 700, letterSpacing: '0.05em' }}>{t('checkout_order_summary')}</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              GST Buddy {selectedPlan === 'pro' ? 'Pro' : 'Business'}
            </strong>
            <span style={{ fontSize: '1.15rem', color: '#38bdf8', fontWeight: 800 }}>
              ₹{planAmount}/mo
            </span>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>{t('checkout_tier_benefits')}:</span>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <li>✓ {t('checkout_benefit_unlimited')}</li>
              <li>✓ {t('checkout_benefit_compliance')}</li>
              <li>✓ {t('checkout_benefit_gstr')}</li>
              <li>✓ {t('checkout_benefit_health')}</li>
              {selectedPlan === 'business' && <li>✓ {t('checkout_benefit_multi')}</li>}
            </ul>
          </div>
        </div>

        {/* Phone number — required by Cashfree for order creation */}
        <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
            {t('checkout_mobile_required')}
          </label>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={13}
            placeholder="10-digit Indian mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{
              width: '100%',
              padding: '0.8rem 1rem',
              borderRadius: '10px',
              border: `1px solid ${phoneError ? 'rgba(239, 68, 68, 0.5)' : 'var(--border-color)'}`,
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              outline: 'none'
            }}
          />
          {phoneError && (
            <p style={{ color: '#f87171', fontSize: '0.75rem', margin: '0.4rem 0 0 0' }}>{phoneError}</p>
          )}
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', margin: '0.4rem 0 0 0' }}>
            {t('checkout_number_privacy')}
          </p>
        </div>

        {alreadySubscribed ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid rgba(34, 197, 94, 0.2)', fontSize: '0.85rem', textAlign: 'left' }}>
              {t('checkout_already_subscribed', { plan: selectedPlan === 'pro' ? 'Pro' : 'Business' })}
            </div>
            <button
              onClick={() => navigate('/pricing')}
              style={{
                padding: '1rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: 'white',
                border: 'none',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)'
              }}
            >
              {t('checkout_go_pricing')}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button
              onClick={handlePayment}
              disabled={isProcessing}
              style={{
                padding: '1rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: 'white',
                border: 'none',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: isProcessing ? 'default' : 'pointer',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem'
              }}
            >
              {isProcessing ? <LoadingSpinner /> : `Pay ₹${planAmount} via Cashfree`}
            </button>

            <button
              onClick={() => navigate('/pricing')}
              disabled={isProcessing}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                padding: '0.75rem',
                borderRadius: '12px',
                fontSize: '0.9rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              {t('checkout_cancel_back')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CheckoutPage;
