import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getUserBills } from '../services/firebaseDataService';

function ExpenseAnalytics({ user }) {
  const [bills, setBills] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
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

  useEffect(() => {
    if (!user?.uid) return;
    getUserBills(user.uid)
      .then(fetched => {
        const filtered = fetched.filter(b => {
          if (!b.businessId) return activeBusinessId === 'apex_retailers';
          return b.businessId === activeBusinessId;
        });
        setBills(filtered);

        // Group by category
        const groups = {};
        filtered.forEach(b => {
          const cat = b.expenseType || 'Others';
          groups[cat] = (groups[cat] || 0) + (b.amount || 0);
        });

        const colors = ['#6366f1', '#14b8a6', '#f59e0b', '#10b981', '#ec4899'];
        const list = Object.entries(groups).map(([name, value], idx) => ({
          name,
          value,
          color: colors[idx % colors.length]
        }));
        setCategoryData(list);
      })
      .catch(e => console.error(e));
  }, [user?.uid, activeBusinessId]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Expense Analytics Workspace</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Evaluate category spending variance, top suppliers, and cost optimizations.
        </p>
      </div>

      {/* Main Charts */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* Pie Category */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.5rem' }}>Category Distribution</h3>
          {categoryData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No expense data.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => e.name}>
                  {categoryData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar values */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.5rem' }}>Expenses By Category Value</h3>
          {categoryData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No expense data.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" style={{ fontSize: '0.75rem' }} />
                <YAxis stroke="var(--text-secondary)" style={{ fontSize: '0.75rem' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }} />
                <Bar dataKey="value" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>

      {/* Top Expenses List */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.5rem' }}>Top Invoice Outlays</h3>
        
        {bills.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No invoices.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {bills.slice(0, 5).map((bill, index) => (
              <div key={index} style={{ padding: '1rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', display: 'flex', justifyBetween: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.9rem' }}>{bill.supplierName || 'Unknown Vendor'}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Category: {bill.expenseType || 'Others'} | Date: {bill.invoiceDate}</span>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>₹{(bill.totalAmount || 0).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default ExpenseAnalytics;
