import React, { useState, useEffect } from 'react';
import { getUserBills } from '../services/firebaseDataService';
import { useTranslation } from 'react-i18next';

function AIInsights({ user }) {
  const { t } = useTranslation();
  const [bills, setBills] = useState([]);
  const [activeBusinessId, setActiveBusinessId] = useState(() => {
    return localStorage.getItem('activeBusinessId') || null;
  });

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
        setBills(filtered);
      })
      .catch(e => console.error(e));
  }, [user?.uid, activeBusinessId]);

  // Deterministic insights — computed ONLY from the user's stored invoices.
  // No hardcoded figures; every number below is derived from real data.
  const pendingCount = bills.filter(b => !b.filed).length;
  const totalTax = bills.reduce((s, b) => s + (b.taxAmount || 0), 0);
  const totalSpend = bills.reduce((s, b) => s + (b.totalAmount || 0), 0);
  const GSTIN_REGEX = /^[0-9]{2}[A-Za-z0-9]{10}[0-9A-Za-z]{2}$/;
  const validGstinCount = bills.filter(b => b.gstin && GSTIN_REGEX.test(String(b.gstin).trim()) && !String(b.gstin).toUpperCase().includes('XXXXX')).length;
  const missingGstinCount = bills.filter(b => !b.gstin || !GSTIN_REGEX.test(String(b.gstin).trim()) || String(b.gstin).toUpperCase().includes('XXXXX')).length;

  // Duplicate detection: same invoice number + same supplier
  const seen = new Map();
  const duplicateInvoiceNumbers = [];
  for (const b of bills) {
    const invNo = String(b.invoiceNumber || '').trim().toUpperCase();
    const supplier = String(b.supplierName || '').trim().toLowerCase();
    if (!invNo || !supplier) continue;
    const key = `${invNo}|${supplier}`;
    if (seen.has(key)) duplicateInvoiceNumbers.push(b.invoiceNumber);
    else seen.set(key, true);
  }
  const uniqueDuplicates = [...new Set(duplicateInvoiceNumbers)];

  const insights = [];
  if (pendingCount > 0) {
    insights.push({
      title: `${pendingCount} pending filing${pendingCount > 1 ? 's' : ''}`,
      type: 'Filing Alert',
      desc: `You have ${pendingCount} invoice${pendingCount > 1 ? 's' : ''} not yet filed. Prepare your GSTR-1/GSTR-3B drafts before the deadline to avoid late fees.`,
      impact: `Based on ${pendingCount} unfiled invoice${pendingCount > 1 ? 's' : ''} in your records.`
    });
  }
  if (missingGstinCount > 0) {
    insights.push({
      title: `${missingGstinCount} invoice${missingGstinCount > 1 ? 's' : ''} with invalid or missing supplier GSTIN`,
      type: 'ITC Risk',
      desc: `${missingGstinCount} invoice${missingGstinCount > 1 ? 's' : ''} carry a supplier GSTIN that fails the 15-character format check and may be ineligible for input tax credit.`,
      impact: `₹${totalTax.toLocaleString()} total GST recorded across your invoices.`
    });
  }
  if (uniqueDuplicates.length > 0) {
    insights.push({
      title: `${uniqueDuplicates.length} potential duplicate invoice${uniqueDuplicates.length > 1 ? 's' : ''}`,
      type: 'Data Quality',
      desc: `Invoice number${uniqueDuplicates.length > 1 ? 's' : ''} ${uniqueDuplicates.slice(0, 3).join(', ')} appear more than once for the same supplier.`,
      impact: 'Review to avoid double-counting in reports.'
    });
  }
  if (validGstinCount > 0) {
    insights.push({
      title: `${validGstinCount} invoice${validGstinCount > 1 ? 's' : ''} eligible for ITC`,
      type: 'ITC Tracking',
      desc: `${validGstinCount} invoice${validGstinCount > 1 ? 's' : ''} carry a well-formed supplier GSTIN, keeping input credit claims available.`,
      impact: `₹${totalTax.toLocaleString()} GST recorded across ${bills.length} invoices.`
    });
  }
  if (totalSpend > 0) {
    insights.push({
      title: `Recorded spend: ₹${totalSpend.toLocaleString()}`,
      type: 'Overview',
      desc: `${bills.length} invoice${bills.length > 1 ? 's' : ''} recorded with ₹${totalSpend.toLocaleString()} total value and ₹${totalTax.toLocaleString()} GST.`,
      impact: 'Figures are computed from your stored invoices.'
    });
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>{t('aiinsights_title')}</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          {t('aiinsights_subtitle')}
        </p>
      </div>

      {/* Insights lists */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: 0, marginBottom: '1.5rem' }}>{t('aiinsights_feed')}</h3>

        {bills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>💡</span>
            <strong style={{ display: 'block', fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{t('aiinsights_none')}</strong>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto', lineHeight: '1.6' }}>
              {t('aiinsights_none_desc')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {insights.map((ins, idx) => (
              <div key={idx} style={{ padding: '1.25rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', borderLeft: '5px solid var(--theme-secondary-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.65rem', background: 'var(--bg-secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--theme-secondary)' }}>{ins.type}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{t('aiinsights_updated_today')}</span>
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: '0.25rem 0 0.5rem 0' }}>{ins.title}</h4>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {ins.desc}
                </p>
                <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
                  💡 {t('aiinsights_impact')}: {ins.impact}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default AIInsights;
