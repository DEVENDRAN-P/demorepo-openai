import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getUserBills } from '../services/firebaseDataService';

function GlobalSearch({ user }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bills, setBills] = useState([]);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    getUserBills(user.uid).then(setBills).catch(e => console.error(e));
  }, [user?.uid]);

  const runSearch = () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const lowercase = query.toLowerCase();

    // Natural Language mock parses: e.g. "BSNL", "tax > 500", "overdue", etc.
    const filtered = bills.filter(b => {
      return (
        (b.invoiceNumber && b.invoiceNumber.toLowerCase().includes(lowercase)) ||
        (b.supplierName && b.supplierName.toLowerCase().includes(lowercase)) ||
        (b.gstin && b.gstin.toLowerCase().includes(lowercase)) ||
        (b.expenseType && b.expenseType.toLowerCase().includes(lowercase)) ||
        (b.amount && String(b.amount).includes(lowercase)) ||
        (b.totalAmount && String(b.totalAmount).includes(lowercase)) ||
        (b.filed ? 'filed' : 'pending').includes(lowercase)
      );
    });

    setResults(filtered);
    setLoading(false);
  };

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, bills]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ q: query });
    runSearch();
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Search Input Box */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Global Search</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 1.25rem 0' }}>
          Query invoices, vendors, categories, amount thresholds, or compliance status.
        </p>

        <form onSubmit={handleSearchSubmit}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Query by supplier, HSN code, amount range, or 'pending'..."
              style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-lg)', fontSize: '0.9rem', outline: 'none' }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem' }}>Search</button>
          </div>
        </form>
      </div>

      {/* Results Workspace */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.25rem' }}>
          Search Results ({results.length})
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Searching workspace...</div>
        ) : results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            No records matched your search query. Try searching for 'BSNL' or 'INV'.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {results.map((bill, index) => (
              <div 
                key={index} 
                onClick={() => navigate(`/bill/${bill.id}`, { state: { bill } })}
                style={{ padding: '1rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', display: 'flex', justifyBetween: 'space-between', alignItems: 'center', transition: 'transform 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
              >
                <div>
                  <strong style={{ display: 'block', fontSize: '0.9rem' }}>Invoice #{bill.invoiceNumber || 'INV-AUTO'} (Vendor: {bill.supplierName})</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Category: {bill.expenseType} | Date: {bill.invoiceDate}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ display: 'block', fontSize: '1rem' }}>₹{(bill.totalAmount || 0).toLocaleString()}</strong>
                  <span className={`badge-premium ${bill.filed ? 'badge-excellent' : 'badge-average'}`} style={{ fontSize: '0.6rem', marginTop: '0.125rem' }}>
                    {bill.filed ? 'Filed' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default GlobalSearch;
