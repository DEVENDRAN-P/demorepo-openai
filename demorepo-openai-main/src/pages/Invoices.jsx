import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserBills } from '../services/firebaseDataService';

function Invoices({ user }) {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeBusinessId, setActiveBusinessId] = useState(() => {
    return localStorage.getItem('activeBusinessId') || 'apex_retailers';
  });

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    const handleBusinessChanged = (e) => {
      if (e.detail?.businessId) {
        setActiveBusinessId(e.detail.businessId);
      }
    };
    window.addEventListener('businessChanged', handleBusinessChanged);
    return () => window.removeEventListener('businessChanged', handleBusinessChanged);
  }, []);

  const loadInvoices = () => {
    if (!user?.uid) return;
    setLoading(true);
    getUserBills(user.uid)
      .then(fetched => {
        const filtered = fetched.filter(b => {
          if (!b.businessId) return activeBusinessId === 'apex_retailers';
          return b.businessId === activeBusinessId;
        });
        setBills(filtered);
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, activeBusinessId]);

  // Apply filters
  const filteredBills = bills.filter(bill => {
    const matchSearch = 
      (bill.invoiceNumber && bill.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (bill.supplierName && bill.supplierName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (bill.gstin && bill.gstin.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'filed' && bill.filed) || 
      (statusFilter === 'pending' && !bill.filed);

    const matchType = 
      typeFilter === 'all' || 
      (bill.invoiceType && bill.invoiceType.toLowerCase() === typeFilter.toLowerCase());

    const matchCategory = 
      categoryFilter === 'all' || 
      (bill.expenseType && bill.expenseType.toLowerCase() === categoryFilter.toLowerCase());

    return matchSearch && matchStatus && matchType && matchCategory;
  });

  const handleExportCSV = () => {
    let headers = 'Invoice Number,Supplier,Date,Taxable Value,GST Tax,Grand Total,Status\n';
    let rows = filteredBills.map(b => 
      `"${b.invoiceNumber || ''}","${b.supplierName || ''}","${b.invoiceDate || ''}",${b.amount || 0},${b.taxAmount || 0},${b.totalAmount || 0},"${b.filed ? 'Filed' : 'Pending'}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GST_Buddy_Invoices_${activeBusinessId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(filteredBills, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GST_Buddy_Invoices_${activeBusinessId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Invoices Ledger</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            Audit transaction items, filter classifications, and export structured ledgers.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleExportCSV} className="btn btn-outline" style={{ fontSize: '0.825rem' }}>Export CSV</button>
          <button onClick={handleExportJSON} className="btn btn-outline" style={{ fontSize: '0.825rem' }}>Export JSON</button>
          <button onClick={() => navigate('/bill-upload')} className="btn btn-primary" style={{ fontSize: '0.825rem' }}>📥 Upload Invoice</button>
        </div>
      </div>

      {/* Filter workspace */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '2rem' }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.375rem' }}>Search Ledger</label>
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Invoice #, vendor..."
              style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.375rem' }}>Filing Status</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="all">All Invoices</option>
              <option value="pending">Pending Returns</option>
              <option value="filed">Filed Returns</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.375rem' }}>Invoice Type</label>
            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="all">All Types</option>
              <option value="purchase">Purchase</option>
              <option value="sales">Sales</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.375rem' }}>Category</label>
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="all">All Categories</option>
              <option value="raw material">Raw Material</option>
              <option value="utilities">Utilities</option>
              <option value="office supplies">Office Supplies</option>
              <option value="travel">Travel</option>
              <option value="services">Services</option>
            </select>
          </div>

        </div>
      </div>

      {/* Ledger Table */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading ledger...</div>
        ) : filteredBills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No matching invoices found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem' }}>Invoice Number</th>
                <th style={{ padding: '0.75rem' }}>Supplier Name</th>
                <th style={{ padding: '0.75rem' }}>GSTIN</th>
                <th style={{ padding: '0.75rem' }}>Date</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Taxable Val</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>GST Tax</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Grand Total</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Filing</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((bill, index) => (
                <tr 
                  key={index} 
                  onClick={() => navigate(`/bill/${bill.id}`, { state: { bill } })}
                  style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background-color 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{bill.invoiceNumber || 'INV-AUTO'}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{bill.supplierName || 'Unknown'}</td>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{bill.gstin || 'N/A'}</td>
                  <td style={{ padding: '0.75rem' }}>{bill.invoiceDate ? new Date(bill.invoiceDate).toLocaleDateString() : 'N/A'}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{(bill.amount || 0).toLocaleString()}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{(bill.taxAmount || 0).toLocaleString()}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700 }}>₹{(bill.totalAmount || 0).toLocaleString()}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <span className={`badge-premium ${bill.filed ? 'badge-excellent' : 'badge-average'}`} style={{ fontSize: '0.65rem' }}>
                      {bill.filed ? 'Filed' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}

export default Invoices;
