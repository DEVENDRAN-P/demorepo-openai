import React, { useState, useEffect } from 'react';

const BUSINESSES = [
  { id: 'apex_retailers', name: 'Apex Retailers', gstin: '29ABCDE1234F2Z5', state: 'Karnataka', type: 'Retail & Distribution' },
  { id: 'nexgen_solutions', name: 'NexGen Software Solutions', gstin: '27XYZAB5678C1Z0', state: 'Maharashtra', type: 'IT Services & Consulting' },
  { id: 'phoenix_logistics', name: 'Phoenix Logistics', gstin: '07AAACP1234A1Z9', state: 'Delhi', type: 'Transport & Warehouse' }
];

function BusinessManagement() {
  const [activeBusinessId, setActiveBusinessId] = useState(() => {
    return localStorage.getItem('activeBusinessId') || 'apex_retailers';
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

  const handleSelectBusiness = (id) => {
    setActiveBusinessId(id);
    localStorage.setItem('activeBusinessId', id);
    window.dispatchEvent(new CustomEvent('businessChanged', { detail: { businessId: id } }));
  };

  const team = [
    { name: 'Devendra Prabhakar', role: 'Administrator / CFO', email: 'devendranprabhakar2007@gmail.com', status: 'Active' },
    { name: 'Staff Member', role: 'Billing Accountant', email: 'billing@gstbuddy.ai', status: 'Active' }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Business Management</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Select active entity workspace, modify GSTIN registry records, and administer role accesses.
        </p>
      </div>

      {/* Business switcher */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.25rem' }}>Active Entity Workspace</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {BUSINESSES.map((b, idx) => {
            const isSelected = activeBusinessId === b.id;
            return (
              <div 
                key={idx} 
                onClick={() => handleSelectBusiness(b.id)}
                style={{
                  padding: '1.25rem',
                  background: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                  borderRadius: 'var(--radius-lg)',
                  border: isSelected ? '2px solid var(--theme-secondary)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyBetween: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <div>
                  <strong style={{ display: 'block', fontSize: '1rem' }}>{b.name}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>GSTIN: {b.gstin} | State: {b.state} | Segment: {b.type}</span>
                </div>
                {isSelected ? (
                  <span style={{ color: 'var(--success)', fontWeight: 800 }}>✓ ACTIVE WORKSPACE</span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Switch Workspace</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Team management */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.25rem' }}>Team Roles & Access Control</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {team.map((t, idx) => (
            <div key={idx} style={{ padding: '1rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', display: 'flex', justifyBetween: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem' }}>{t.name}</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.email} | Role: {t.role}</span>
              </div>
              <span className="badge-premium badge-excellent" style={{ fontSize: '0.65rem' }}>{t.status}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default BusinessManagement;
