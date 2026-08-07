import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function PaymentSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const { txn } = location.state || {
    txn: {
      id: 'TXN-0000',
      date: new Date().toISOString().split('T')[0],
      plan: 'Pro Plan',
      amount: '₹399',
      status: 'Success',
      utr: 'MOCK-REF-12345'
    }
  };

  const handleDownloadReceipt = () => {
    const content = `=========================================
          GST BUDDY AI - SUBSCRIPTION RECEIPT
=========================================
Receipt Ref    : ${txn.id}
Transaction Date: ${txn.date}
Subscription Plan: ${txn.plan}
Amount Charged : ${txn.amount}
Filing Status  : Active
UTR Identifier : ${txn.utr}
=========================================
Thank you for choosing GST Buddy AI!`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GST_Buddy_Receipt_${txn.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-2xl)', padding: '3rem 2rem', maxWidth: '480px', width: '100%', textAlign: 'center', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-xl)' }}>
        
        {/* Animated Checkmark Circle */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '3px solid var(--success)',
          color: 'var(--success)',
          fontSize: '2.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          fontWeight: 700
        }}>
          ✓
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Payment Confirmed!</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Your transaction has been processed securely. Your subscription upgrade is now active in your workspace.
        </p>

        {/* Transaction Summary Card */}
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          padding: '1.25rem',
          fontSize: '0.8rem',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Filing Tier</span>
            <strong>{txn.plan}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Amount Paid</span>
            <strong>{txn.amount}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Transaction Ref</span>
            <strong style={{ fontFamily: 'monospace' }}>{txn.id}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>UTR / Bank ID</span>
            <strong style={{ fontFamily: 'monospace' }}>{txn.utr}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Filing Date</span>
            <strong>{txn.date}</strong>
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

      </div>
    </div>
  );
}

export default PaymentSuccess;
