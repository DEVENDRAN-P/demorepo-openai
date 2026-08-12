import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../config/firebase';
import { invalidatePlanCache } from '../services/subscriptionService';

const getApiUrl = (path) => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    if (window.location.port !== '5000') {
      return `http://localhost:5000${path}`;
    }
  }
  return path;
};

function PaymentSuccess() {
  const location = useLocation();
  const navigate = useNavigate();

  // CHECKING | SUCCESS | PENDING | FAILED
  const [status, setStatus] = useState('CHECKING');
  const [payment, setPayment] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const verifyPayment = async () => {
      const params = new URLSearchParams(location.search);
      const orderId = params.get('order_id') || params.get('cf_order_id') || params.get('orderId');

      if (!orderId) {
        if (!cancelled) {
          setStatus('FAILED');
          setMessage('No order information was found. Please check your payment status in the dashboard.');
        }
        return;
      }

      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          if (!cancelled) {
            setStatus('FAILED');
            setMessage('Please sign in to check your payment status.');
          }
          return;
        }

        const token = await currentUser.getIdToken(true);

        // The backend queries Cashfree, verifies order/amount/status, and only
        // activates the subscription when Cashfree reports SUCCESS.
        const res = await fetch(getApiUrl('/api/payment/verify'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ orderId })
        });

        const data = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (!res.ok) {
          setStatus('FAILED');
          setMessage(data.details || data.error || data.message || 'Payment status could not be verified. Please contact support if funds were deducted.');
          return;
        }

        if (data.status === 'SUCCESS') {
          setStatus('SUCCESS');
          setPayment(data.payment || null);
          // Real plan change: drop the shared cache and notify every component.
          invalidatePlanCache();
          window.dispatchEvent(new Event('planChanged'));
        } else if (data.status === 'PENDING') {
          setStatus('PENDING');
          setMessage(data.message || 'Your payment is being processed.');
        } else {
          setStatus('FAILED');
          setMessage(data.message || 'Payment failed. Your plan has not been upgraded.');
        }
      } catch (err) {
        console.error('Payment verification error:', err);
        if (!cancelled) {
          setStatus('FAILED');
          setMessage('Payment status could not be verified right now. Your plan will be activated automatically once Cashfree confirms the payment.');
        }
      }
    };

    verifyPayment();
    return () => { cancelled = true; };
  }, [location.search]);

  const planLabel = (plan) => {
    if (plan === 'pro') return 'Pro Plan';
    if (plan === 'business') return 'Business Plan';
    return plan || '—';
  };

  const formatAmount = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

  const handleDownloadReceipt = () => {
    const ref = payment?.paymentId || payment?.orderId || '—';
    const content = `=========================================
          GST BUDDY AI - SUBSCRIPTION RECEIPT
=========================================
Payment ID     : ${payment?.paymentId || '—'}
Order ID       : ${payment?.orderId || '—'}
Date           : ${new Date().toISOString().split('T')[0]}
Subscription Plan: ${planLabel(payment?.plan)}
Amount Charged : ${formatAmount(payment?.amount)}
Payment Status : ACTIVE
Payment Method : Cashfree
=========================================
Thank you for choosing GST Buddy AI!`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GST_Buddy_Receipt_${ref}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ---------------- CHECKING ----------------
  if (status === 'CHECKING') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-2xl)', padding: '3rem 2rem', maxWidth: '480px', width: '100%', textAlign: 'center', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-xl)' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            border: '5px solid var(--bg-tertiary)', borderTop: '5px solid var(--theme-primary)',
            animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem'
          }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>Verifying your payment...</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            We are securely confirming your transaction with Cashfree. This usually takes a few seconds.
          </p>
        </div>
      </div>
    );
  }

  const isSuccess = status === 'SUCCESS';
  const isPending = status === 'PENDING';

  const iconBg = isSuccess ? 'rgba(34, 197, 94, 0.1)' : isPending ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)';
  const iconColor = isSuccess ? 'var(--success)' : isPending ? '#f59e0b' : '#ef4444';
  const iconText = isSuccess ? '✓' : isPending ? '⏳' : '✕';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-2xl)', padding: '3rem 2rem', maxWidth: '480px', width: '100%', textAlign: 'center', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-xl)' }}>

        {/* Status Icon */}
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: iconBg, border: `3px solid ${iconColor}`,
          color: iconColor, fontSize: '2.2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem', fontWeight: 700
        }}>
          {iconText}
        </div>

        {isSuccess && (
          <>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Payment Confirmed!</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Your payment was verified with Cashfree and your subscription is now active.
            </p>

            {/* Transaction Summary Card */}
            <div style={{
              background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)', padding: '1.25rem',
              fontSize: '0.8rem', textAlign: 'left',
              display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Filing Tier</span>
                <strong>{planLabel(payment?.plan)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Amount Paid</span>
                <strong>{formatAmount(payment?.amount)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Payment ID</span>
                <strong style={{ fontFamily: 'monospace' }}>{payment?.paymentId || '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Order ID</span>
                <strong style={{ fontFamily: 'monospace' }}>{payment?.orderId || '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Payment Method</span>
                <strong>{payment?.provider === 'cashfree' ? 'Cashfree' : payment?.provider || 'Cashfree'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Date</span>
                <strong>{new Date().toISOString().split('T')[0]}</strong>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ padding: '0.75rem', width: '100%', fontWeight: 700 }}>
                Go to Executive Dashboard
              </button>
              <button onClick={handleDownloadReceipt} className="btn btn-outline" style={{ padding: '0.75rem', width: '100%' }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg> Download Statement Receipt
              </button>
            </div>
          </>
        )}

        {isPending && (
          <>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>Your payment is being processed.</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              {message || 'We are waiting for confirmation from Cashfree. Your plan will be activated automatically as soon as the payment is confirmed.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => { setStatus('CHECKING'); setPayment(null); }}
                className="btn btn-primary"
                style={{ padding: '0.75rem', width: '100%', fontWeight: 700 }}
              >
                Check Status Again
              </button>
              <button onClick={() => navigate('/dashboard')} className="btn btn-outline" style={{ padding: '0.75rem', width: '100%' }}>
                Go to Dashboard
              </button>
            </div>
          </>
        )}

        {!isSuccess && !isPending && (
          <>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>Payment failed</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              {message || 'Your plan has not been upgraded.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button onClick={() => navigate('/pricing')} className="btn btn-primary" style={{ padding: '0.75rem', width: '100%', fontWeight: 700 }}>
                Try Again
              </button>
              <button onClick={() => navigate('/dashboard')} className="btn btn-outline" style={{ padding: '0.75rem', width: '100%' }}>
                Go to Dashboard
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default PaymentSuccess;
