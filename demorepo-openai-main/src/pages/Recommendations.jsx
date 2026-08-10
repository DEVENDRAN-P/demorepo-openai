import React, { useState, useEffect } from 'react';
import { getUserBills } from '../services/firebaseDataService';
import { getUserBusinesses } from '../utils/businessHelper';

function Recommendations({ user }) {
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

  const [bills, setBills] = useState([]);
  const [userBusinesses, setUserBusinesses] = useState([]);

  useEffect(() => {
    if (user) {
      setUserBusinesses(getUserBusinesses(user));
    }
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;
    getUserBills(user.uid)
      .then(fetched => {
        const firstBizId = userBusinesses[0]?.id || '';
        const filtered = fetched.filter(b => {
          if (!b.businessId) return activeBusinessId === firstBizId;
          return b.businessId === activeBusinessId;
        });
        setBills(filtered);
        console.log('Loaded bills count:', filtered.length);
      })
      .catch(e => console.error(e));
  }, [user?.uid, activeBusinessId, userBusinesses]);


  // Generate data-driven recommendations from actual bills
  const list = React.useMemo(() => {
    if (!bills || bills.length === 0) return [];

    const recommendations = [];
    const totalTax = bills.reduce((s, b) => s + (b.taxAmount || 0), 0);
    const totalAmount = bills.reduce((s, b) => s + (b.totalAmount || 0), 0);

    // Check for missing GSTIN on invoices
    const missingGSTIN = bills.filter(b => !b.supplierGstin && !b.gstin);
    if (missingGSTIN.length > 0) {
      recommendations.push({
        title: `${missingGSTIN.length} invoice(s) missing supplier GSTIN`,
        desc: `Invoices without a valid supplier GSTIN cannot be used for Input Tax Credit claims. Review and update the GSTIN on these invoices to preserve your ITC eligibility.`,
        category: 'ITC',
        priority: 'High',
        saving: `Up to ₹${missingGSTIN.reduce((s, b) => s + (b.taxAmount || 0), 0).toLocaleString('en-IN')} in ITC`
      });
    }

    // Check for tax anomalies (tax > 50% of amount suggests possible error)
    const highTaxBills = bills.filter(b => {
      const amt = b.taxableAmount || b.amount || 0;
      const tax = b.taxAmount || 0;
      return amt > 0 && tax / amt > 0.5;
    });
    if (highTaxBills.length > 0) {
      recommendations.push({
        title: 'Review invoices with unusually high tax',
        desc: `${highTaxBills.length} invoice(s) have tax amounts exceeding 50% of the taxable value. This may indicate a data entry error or unusual transaction that should be verified.`,
        category: 'Audit',
        priority: 'Medium',
        saving: 'Audit Safety'
      });
    }

    // ITC optimization
    if (totalTax > 0) {
      recommendations.push({
        title: 'Maximize Input Tax Credit',
        desc: `Your total tax paid across ${bills.length} invoices is ₹${totalTax.toLocaleString('en-IN')}. Ensure all eligible purchase invoices are uploaded to claim maximum ITC before the filing deadline.`,
        category: 'Tax Savings',
        priority: 'High',
        saving: `Up to ₹${totalTax.toLocaleString('en-IN')}`
      });
    }

    // Filing deadline reminder
    const now = new Date();
    const dayOfMonth = now.getDate();
    if (dayOfMonth >= 15) {
      recommendations.push({
        title: 'GSTR filing deadline approaching',
        desc: `GSTR-1 is due on the 11th and GSTR-3B on the 20th of next month. Ensure all invoices for the current period are uploaded and verified before the deadline to avoid late fees.`,
        category: 'Compliance',
        priority: dayOfMonth >= 18 ? 'High' : 'Medium',
        saving: 'Fine Prevention'
      });
    }

    // Vendor analysis
    const vendorMap = {};
    bills.forEach(b => {
      const name = b.supplierName || b.vendorName || 'Unknown';
      vendorMap[name] = (vendorMap[name] || 0) + (b.totalAmount || 0);
    });
    const topVendors = Object.entries(vendorMap).sort((a, b) => b[1] - a[1]);
    if (topVendors.length > 0) {
      const [topName, topAmount] = topVendors[0];
      const concentration = totalAmount > 0 ? Math.round((topAmount / totalAmount) * 100) : 0;
      if (concentration > 50) {
        recommendations.push({
          title: `High vendor concentration: ${topName}`,
          desc: `${concentration}% of your expenses come from a single vendor (${topName}). Consider diversifying suppliers to reduce dependency risk and potentially negotiate better GST terms.`,
          category: 'Business',
          priority: 'Medium',
          saving: 'Risk Reduction'
        });
      }
    }

    if (recommendations.length === 0) {
      recommendations.push({
        title: 'Upload more invoices',
        desc: 'Add more invoices to receive personalized tax optimization and compliance recommendations.',
        category: 'Getting Started',
        priority: 'Low',
        saving: 'N/A'
      });
    }

    return recommendations;
  }, [bills]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Tax Optimization Advisor</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Continuously audit transactions to identify missing deductions, supplier correction tasks, and compliance checks.
        </p>
      </div>

      {/* Recommendations ledger */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: 0, marginBottom: '1.5rem' }}>AI Optimization Action Checklist</h3>

        {bills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🎯</span>
            <strong style={{ display: 'block', fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Advisor Recommendations</strong>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto', lineHeight: '1.6' }}>
              Tax advisory tips, Input Tax Credit (ITC) alerts, and late fee warnings will populate dynamically after invoices are uploaded.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {list.map((rec, idx) => (
              <div key={idx} style={{ padding: '1.25rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', borderLeft: '5px solid var(--theme-primary-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.65rem', background: 'var(--bg-secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--theme-primary-light)' }}>{rec.category}</span>
                  <span className={`badge-premium ${rec.priority === 'High' ? 'badge-critical' : 'badge-good'}`} style={{ fontSize: '0.65rem' }}>
                    {rec.priority} Priority
                  </span>
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: '0.25rem 0 0.5rem 0' }}>{rec.title}</h4>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {rec.desc}
                </p>
                <div style={{ fontSize: '0.75rem', color: 'var(--theme-secondary-light)', fontWeight: 700 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', verticalAlign: 'middle' }}><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--primary-600)' }}><circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9h6a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z"/></svg> Estimated Saving: {rec.saving}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default Recommendations;
