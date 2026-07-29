import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function PricingBilling({ user }) {
  const navigate = useNavigate();
  const [activePlan, setActivePlan] = useState(() => {
    return localStorage.getItem('saas_active_plan') || 'free';
  });

  const [checkoutPlan, setCheckoutPlan] = useState(null); // 'pro' or 'business'
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi', 'card', 'netbanking'
  const [upiUtr, setUpiUtr] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [billingHistory, setBillingHistory] = useState(() => {
    const saved = localStorage.getItem('saas_billing_history');
    return saved ? JSON.parse(saved) : [
      { id: 'TXN-9021', date: '2026-06-26', plan: 'Free Plan', amount: '₹0', status: 'Success', utr: 'System Preset' }
    ];
  });

  useEffect(() => {
    const handlePlanChanged = () => {
      setActivePlan(localStorage.getItem('saas_active_plan') || 'free');
    };
    window.addEventListener('planChanged', handlePlanChanged);
    return () => window.removeEventListener('planChanged', handlePlanChanged);
  }, []);

  const handleSelectPlan = (planId) => {
    if (planId === 'free') {
      setActivePlan('free');
      localStorage.setItem('saas_active_plan', 'free');
      window.dispatchEvent(new Event('planChanged'));
      alert('Subscription downgraded to Free Plan.');
    } else {
      setCheckoutPlan(planId);
    }
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    if (paymentMethod === 'upi' && !upiUtr.trim()) {
      alert('Please enter your 12-digit UPI UTR number.');
      return;
    }
    if (paymentMethod === 'card' && (!cardNumber || !cardExpiry || !cardCvv)) {
      alert('Please fill in card details.');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      const newPlan = checkoutPlan;
      localStorage.setItem('saas_active_plan', newPlan);
      window.dispatchEvent(new Event('planChanged'));

      const newTxn = {
        id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().split('T')[0],
        plan: newPlan === 'pro' ? 'Pro Plan' : 'Business Plan',
        amount: newPlan === 'pro' ? '₹399' : '₹1,499',
        status: 'Success',
        utr: paymentMethod === 'upi' ? upiUtr : `RPAY-${Math.floor(100000 + Math.random() * 900000)}`
      };

      const updatedHistory = [newTxn, ...billingHistory];
      setBillingHistory(updatedHistory);
      localStorage.setItem('saas_billing_history', JSON.stringify(updatedHistory));

      setCheckoutPlan(null);
      setUpiUtr('');
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');

      // Redirect to Payment Success page
      navigate('/payment-success', { state: { txn: newTxn } });
    }, 1500);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Pricing & Subscriptions</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Select plan frameworks, upgrade limits, and audit past subscription billing statements.
        </p>
      </div>

      {/* Plan Usage Limits Panel */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1rem 0' }}>Current Subscription Usage</h3>
        <div className="grid grid-cols-3" style={{ gap: '2rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              <span>Monthly Invoices OCR</span>
              <strong>{activePlan === 'free' ? '4 / 5' : activePlan === 'pro' ? '12 / 100' : '88 / Unlimited'}</strong>
            </div>
            <div style={{ width: '100%', background: 'var(--bg-tertiary)', borderRadius: '10px', height: '6px', overflow: 'hidden' }}>
              <div style={{ width: activePlan === 'free' ? '80%' : activePlan === 'pro' ? '12%' : '5%', background: 'var(--theme-primary)', height: '100%' }}></div>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              <span>Connected Businesses</span>
              <strong>{activePlan === 'free' ? '1 / 1' : activePlan === 'pro' ? '3 / 3' : '3 / Unlimited'}</strong>
            </div>
            <div style={{ width: '100%', background: 'var(--bg-tertiary)', borderRadius: '10px', height: '6px', overflow: 'hidden' }}>
              <div style={{ width: activePlan === 'free' ? '100%' : activePlan === 'pro' ? '100%' : '10%', background: 'var(--theme-secondary)', height: '100%' }}></div>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              <span>AI Queries Credit</span>
              <strong>{activePlan === 'free' ? '15 / 20' : activePlan === 'pro' ? '82 / 500' : '452 / Unlimited'}</strong>
            </div>
            <div style={{ width: '100%', background: 'var(--bg-tertiary)', borderRadius: '10px', height: '6px', overflow: 'hidden' }}>
              <div style={{ width: activePlan === 'free' ? '75%' : activePlan === 'pro' ? '16%' : '2%', background: 'var(--warning)', height: '100%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Cards */}
      <div className="grid grid-cols-3" style={{ gap: '2rem', marginBottom: '3rem' }}>
        
        {/* Free Plan */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column', border: activePlan === 'free' ? '2px solid var(--theme-secondary)' : '1px solid var(--border-color)', position: 'relative' }}>
          {activePlan === 'free' && <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--theme-secondary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>CURRENT PLAN</span>}
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>STARTER PLAN</span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.5rem 0' }}>Free <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ forever</span></h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', minHeight: '36px' }}>Ideal for solo-entrepreneurs and micro-shops filing nil or few monthly returns.</p>
          
          <ul style={{ fontSize: '0.8rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', flex: 1 }}>
            <li>Up to 5 invoice uploads/month</li>
            <li>Single business workspace</li>
            <li>Basic AI accountant assistance</li>
            <li>Standard PDF form generation</li>
          </ul>
          
          <button 
            disabled={activePlan === 'free'} 
            onClick={() => handleSelectPlan('free')}
            className={`btn ${activePlan === 'free' ? 'btn-outline' : 'btn-primary'}`}
            style={{ width: '100%', padding: '0.6rem' }}
          >
            {activePlan === 'free' ? 'Active Plan' : 'Select Free'}
          </button>
        </div>

        {/* Pro Plan */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column', border: activePlan === 'pro' ? '2px solid var(--theme-secondary)' : '1px solid var(--border-color)', position: 'relative' }}>
          {activePlan === 'pro' && <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--theme-secondary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>CURRENT PLAN</span>}
          <span style={{ fontSize: '0.8rem', color: 'var(--theme-primary-light)', fontWeight: 700 }}>PROFESSIONAL</span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.5rem 0' }}>₹399 <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ month</span></h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', minHeight: '36px' }}>Standard SaaS framework for small businesses requiring regular auditing and bulk processing.</p>
          
          <ul style={{ fontSize: '0.8rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', flex: 1 }}>
            <li>Up to 100 invoice uploads/month</li>
            <li>Connect up to 3 businesses</li>
            <li>Advanced Llama 3.3 Accountant Agent</li>
            <li>Priority OCR extraction queue</li>
            <li>Dedicated Email Reminders</li>
          </ul>

          <button 
            onClick={() => handleSelectPlan('pro')}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.6rem', background: activePlan === 'pro' ? 'var(--bg-tertiary)' : 'var(--theme-primary)', color: activePlan === 'pro' ? 'var(--text-secondary)' : 'white' }}
            disabled={activePlan === 'pro'}
          >
            {activePlan === 'pro' ? 'Active Plan' : 'Upgrade to Pro'}
          </button>
        </div>

        {/* Enterprise Plan */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column', border: activePlan === 'enterprise' ? '2px solid var(--theme-secondary)' : '1px solid var(--border-color)', position: 'relative' }}>
          {activePlan === 'enterprise' && <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--theme-secondary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>CURRENT PLAN</span>}
          <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 700 }}>ENTERPRISE</span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.5rem 0' }}>₹1,499 <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ month</span></h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', minHeight: '36px' }}>For merchants and corporate entities with high billing volumes and complex GST structures.</p>
          
          <ul style={{ fontSize: '0.8rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', flex: 1 }}>
            <li><strong>Unlimited</strong> invoice uploads</li>
            <li><strong>Unlimited</strong> businesses & branches</li>
            <li>Flagship Accountant Agent terminal access</li>
            <li>Legal Agreement review & clause extract</li>
            <li>Simulated API Keys access</li>
            <li>Premium support channels</li>
          </ul>

          <button 
            onClick={() => handleSelectPlan('enterprise')}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.6rem', background: activePlan === 'enterprise' ? 'var(--bg-tertiary)' : 'var(--success)', color: activePlan === 'enterprise' ? 'var(--text-secondary)' : 'white' }}
            disabled={activePlan === 'enterprise'}
          >
            {activePlan === 'enterprise' ? 'Active Plan' : 'Get Enterprise'}
          </button>
        </div>

      </div>

      {/* Billing history table */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.25rem' }}>Billing Statement Ledger</h3>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem' }}>Invoice Reference</th>
              <th style={{ padding: '0.75rem' }}>Date Created</th>
              <th style={{ padding: '0.75rem' }}>Filing Segment</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Amount Paid</th>
              <th style={{ padding: '0.75rem', textAlign: 'center' }}>Bank UTR / Ref</th>
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
                  <span className="badge-premium badge-excellent" style={{ fontSize: '0.65rem' }}>{txn.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Checkout Dialog Modal */}
      {checkoutPlan && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)',
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: '520px',
            boxShadow: 'var(--shadow-2xl)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Secure Billing Gateway</h3>
              <button 
                onClick={() => setCheckoutPlan(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer', outline: 'none' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handlePaymentSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Selected Plan</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginTop: '0.25rem', border: '1px solid var(--border-color)' }}>
                  <strong>{checkoutPlan === 'pro' ? 'Pro Plan (Professional SaaS)' : 'Enterprise Plan (Corporate OS)'}</strong>
                  <strong style={{ color: 'var(--theme-secondary-light)' }}>{checkoutPlan === 'pro' ? '₹399' : '₹1,499'}</strong>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Select Method</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" onClick={() => setPaymentMethod('upi')} className={`btn ${paymentMethod === 'upi' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1, padding: '0.45rem', fontSize: '0.75rem' }}>UPI QR Code</button>
                  <button type="button" onClick={() => setPaymentMethod('card')} className={`btn ${paymentMethod === 'card' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1, padding: '0.45rem', fontSize: '0.75rem' }}>Debit/Credit Card</button>
                  <button type="button" onClick={() => setPaymentMethod('netbanking')} className={`btn ${paymentMethod === 'netbanking' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1, padding: '0.45rem', fontSize: '0.75rem' }}>Net Banking</button>
                </div>
              </div>

              {/* UPI Payment Flow */}
              {paymentMethod === 'upi' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Scan BHIM UPI QR Code</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Use any UPI App (GPay, PhonePe, Paytm) to scan & pay.</span>
                  </div>
                  
                  {/* Beautiful Simulated QR Code */}
                  <div style={{
                    width: '130px',
                    height: '130px',
                    background: '#ffffff',
                    padding: '8px',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    border: '1px solid #d1d5db'
                  }}>
                    {/* Simulated SVG QR layout */}
                    <svg width="100" height="100" viewBox="0 0 100 100" fill="black">
                      <rect x="0" y="0" width="25" height="25" fill="black"/>
                      <rect x="5" y="5" width="15" height="15" fill="white"/>
                      <rect x="8" y="8" width="9" height="9" fill="black"/>
                      <rect x="75" y="0" width="25" height="25" fill="black"/>
                      <rect x="80" y="5" width="15" height="15" fill="white"/>
                      <rect x="83" y="8" width="9" height="9" fill="black"/>
                      <rect x="0" y="75" width="25" height="25" fill="black"/>
                      <rect x="5" y="80" width="15" height="15" fill="white"/>
                      <rect x="8" y="83" width="9" height="9" fill="black"/>
                      {/* Random QR clusters */}
                      <rect x="35" y="10" width="10" height="5"/>
                      <rect x="35" y="25" width="5" height="15"/>
                      <rect x="45" y="45" width="15" height="15"/>
                      <rect x="15" y="45" width="15" height="5"/>
                      <rect x="65" y="35" width="10" height="25"/>
                      <rect x="30" y="65" width="25" height="10"/>
                      <rect x="65" y="75" width="20" height="10"/>
                    </svg>
                    <span style={{ fontSize: '0.55rem', color: '#111827', fontWeight: 800, marginTop: '2px' }}>GST BUDDY AI</span>
                  </div>

                  <div style={{ width: '100%' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Transaction UTR (12-digit Ref ID)</label>
                    <input 
                      type="text" 
                      value={upiUtr}
                      onChange={(e) => setUpiUtr(e.target.value.replace(/[^0-9]/g, ''))}
                      maxLength={12}
                      placeholder="e.g. 123456789012"
                      style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>
              )}

              {/* Card Payment Flow */}
              {paymentMethod === 'card' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Card Number</label>
                    <input 
                      type="text" 
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/[^0-9]/g, '').match(/.{1,4}/g)?.join(' ') || '')}
                      maxLength={19}
                      placeholder="4000 1234 5678 9010"
                      style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Expiry Date</label>
                      <input 
                        type="text" 
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        maxLength={5}
                        style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>CVV</label>
                      <input 
                        type="password" 
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                        maxLength={3}
                        placeholder="•••"
                        style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Net Banking Flow */}
              {paymentMethod === 'netbanking' && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Select Bank</label>
                  <select style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
                    <option value="sbi">State Bank of India</option>
                    <option value="hdfc">HDFC Bank</option>
                    <option value="icici">ICICI Bank</option>
                    <option value="axis">Axis Bank</option>
                    <option value="kotak">Kotak Mahindra Bank</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.25rem' }}>
                <button type="button" onClick={() => setCheckoutPlan(null)} className="btn btn-outline" style={{ flex: 1, padding: '0.5rem' }} disabled={isProcessing}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, padding: '0.5rem' }} disabled={isProcessing}>
                  {isProcessing ? 'Verifying Gateway...' : `Pay ${checkoutPlan === 'pro' ? '₹399' : '₹1,499'}`}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default PricingBilling;
