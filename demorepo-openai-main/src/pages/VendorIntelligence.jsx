import React, { useState, useEffect } from 'react';
import { getUserBills } from '../services/firebaseDataService';

function VendorIntelligence({ user }) {
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

  // Compute vendor risk profiles
  const vendorProfiles = {};
  bills.forEach(bill => {
    const name = bill.supplierName || 'Unknown';
    const gstin = bill.gstin || 'N/A';
    
    if (!vendorProfiles[name]) {
      vendorProfiles[name] = {
        name,
        gstin,
        totalInvoices: 0,
        totalValue: 0,
        complianceRate: 100,
        risk: 'Low',
        errors: 0
      };
    }

    vendorProfiles[name].totalInvoices += 1;
    vendorProfiles[name].totalValue += bill.totalAmount || 0;
    
    const isError = !bill.gstin || bill.gstin.includes('XXXXX') || Math.abs((bill.amount || 0) + (bill.taxAmount || 0) - (bill.totalAmount || 0)) > 2;
    if (isError) {
      vendorProfiles[name].errors += 1;
      vendorProfiles[name].complianceRate = Math.round(((vendorProfiles[name].totalInvoices - vendorProfiles[name].errors) / vendorProfiles[name].totalInvoices) * 100);
      vendorProfiles[name].risk = vendorProfiles[name].complianceRate < 80 ? 'High' : 'Medium';
    }
  });

  const list = Object.values(vendorProfiles);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Vendor Intelligence Dashboard</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Evaluate vendor risk ratings, Input Tax Credit (ITC) reconciliation history, and invoice statistics.
        </p>
      </div>

      {/* Grid ledger */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: 0, marginBottom: '1.5rem' }}>Active Vendor Profiles</h3>

        {list.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
            No vendor data available. Upload purchase invoices to compile profiles automatically.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {list.map((ven, idx) => (
              <div key={idx} style={{ padding: '1.25rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', justifyBetween: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>{ven.name}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>GSTIN: {ven.gstin}</span>
                </div>

                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)', display: 'block' }}>Invoices</span>
                    <strong style={{ fontSize: '1.1rem' }}>{ven.totalInvoices}</strong>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)', display: 'block' }}>Total Volume</span>
                    <strong style={{ fontSize: '1.1rem' }}>₹{Math.round(ven.totalValue).toLocaleString()}</strong>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)', display: 'block' }}>Filing Compliance</span>
                    <strong style={{ fontSize: '1.1rem', color: ven.complianceRate >= 90 ? 'var(--success)' : 'var(--warning)' }}>{ven.complianceRate}%</strong>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)', display: 'block' }}>Risk Index</span>
                    <span className={`badge-premium ${ven.risk === 'High' ? 'badge-critical' : ven.risk === 'Medium' ? 'badge-average' : 'badge-excellent'}`} style={{ fontSize: '0.65rem', marginTop: '0.125rem' }}>
                      {ven.risk}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default VendorIntelligence;
