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

function CheckoutPage() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [planAmount, setPlanAmount] = useState(299);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const plan = localStorage.getItem('selectedPlan') || 'pro';
    setSelectedPlan(plan);
    setPlanAmount(plan === 'pro' ? 299 : 999);
  }, []);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
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

  const handlePayment = async () => {
    setIsProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setErrorMsg('Authentication error. Please sign in again.');
        setIsProcessing(false);
        return;
      }

      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        setErrorMsg('Unable to load Razorpay Payment SDK. Verify your internet connection.');
        setIsProcessing(false);
        return;
      }

      const token = await currentUser.getIdToken(true);
      
      // 1. Create Order
      setSuccessMsg('Creating secure order with payment gateway...');
      const response = await fetch(getApiUrl('/api/payment/create-order'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId: selectedPlan })
      });

      if (!response.ok) {
        const errorData = await safeParseJson(response);
        throw new Error(errorData.error || errorData.message || 'Order creation failed.');
      }

      const orderData = await safeParseJson(response);
      const keyId = orderData.key_id;

      setSuccessMsg('Opening checkout portal...');
      
      // 2. Open Razorpay Popup
      const options = {
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'GST Buddy AI',
        description: `Upgrade to ${selectedPlan === 'pro' ? 'Pro Plan' : 'Business Plan'}`,
        image: 'https://cdn-icons-png.flaticon.com/512/2933/2933116.png',
        order_id: orderData.id,
        prefill: {
          email: currentUser.email || "",
          contact: currentUser.phoneNumber || "",
          method: 'upi' // Enforces UPI options display
        },
        notes: {
          uid: currentUser.uid,
          planId: selectedPlan
        },
        theme: {
          color: '#6366f1'
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            setErrorMsg('Payment process cancelled by user.');
          }
        },
        handler: async function (paymentResponse) {
          try {
            setIsProcessing(true);
            setSuccessMsg('Verifying transaction details securely...');

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
                planId: selectedPlan
              })
            });

            if (!verifyRes.ok) {
              const verifyError = await safeParseJson(verifyRes);
              throw new Error(verifyError.error || verifyError.message || 'Signature verification failed.');
            }

            setSuccessMsg('Payment successfully verified!');
            localStorage.removeItem('selectedPlan'); // Clean stored selection

            setTimeout(() => {
              navigate('/dashboard', { replace: true });
            }, 1500);

          } catch (verifyErr) {
            console.error('Verification error:', verifyErr);
            setErrorMsg(`Verification failed: ${verifyErr.message}`);
          } finally {
            setIsProcessing(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (failDetails) {
        console.error('Payment failure event:', failDetails.error);
        setErrorMsg(`Payment failed: ${failDetails.error.description || 'Transaction declined'}`);
        setIsProcessing(false);
      });

      rzp.open();

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
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Complete Subscription</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '2rem' }}>
          Secure Checkout gateway integration via Razorpay
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
          marginBottom: '2rem',
          textAlign: 'left'
        }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#818cf8', fontWeight: 700, letterSpacing: '0.05em' }}>Order Summary</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              GST Buddy {selectedPlan === 'pro' ? 'Pro' : 'Business'}
            </strong>
            <span style={{ fontSize: '1.15rem', color: '#38bdf8', fontWeight: 800 }}>
              ₹{planAmount}/mo
            </span>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Tiers benefits included:</span>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <li>✓ Unlimited Invoices OCR extraction</li>
              <li>✓ AI Compliance Score Advisor</li>
              <li>✓ GSTR-1 & GSTR-3B filings support</li>
              <li>✓ Business Health Analytics Ledger</li>
              {selectedPlan === 'business' && <li>✓ Multiple Business profiles & API access</li>}
            </ul>
          </div>
        </div>

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
            {isProcessing ? <LoadingSpinner /> : `Pay ₹${planAmount}`}
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
            Cancel & Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;
