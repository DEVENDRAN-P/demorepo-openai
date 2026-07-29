import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getUserBills } from '../services/firebaseDataService';

const INITIAL_BUSINESSES = [
  { id: 'apex_retailers', name: 'Apex Retailers', gstin: '29ABCDE1234F2Z5', state: 'Karnataka', type: 'Retail & Distribution', complianceScore: 94 },
  { id: 'nexgen_solutions', name: 'NexGen Software Solutions', gstin: '27XYZAB5678C1Z0', state: 'Maharashtra', type: 'IT Services & Consulting', complianceScore: 88 },
  { id: 'phoenix_logistics', name: 'Phoenix Logistics', gstin: '07AAACP1234A1Z9', state: 'Delhi', type: 'Transport & Warehouse', complianceScore: 76 }
];

function GlobalSearch({ user }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [loading, setLoading] = useState(false);

  // Raw Database Source States
  const [bills, setBills] = useState([]);
  const [businesses, setBusinesses] = useState([]);

  // Filtered Grouped Result States
  const [matchedInvoices, setMatchedInvoices] = useState([]);
  const [matchedBusinesses, setMatchedBusinesses] = useState([]);
  const [matchedVendors, setMatchedVendors] = useState([]);
  const [matchedActivities, setMatchedActivities] = useState([]);

  // Static mock activities to search
  const recentActivities = [
    { title: "Invoice INV-9821-20 uploaded", type: "Invoice", date: "Today, 10:24 AM" },
    { title: "Generated GSTR-1 Return Draft Summary", type: "GST return", date: "Yesterday, 4:18 PM" },
    { title: "UPI payment of Pro plan verified", type: "Billing", date: "Jul 26, 2026" },
    { title: "Switched workspace to NexGen Solutions", type: "Workspace", date: "Jul 25, 2026" }
  ];

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    getUserBills(user.uid)
      .then(fetched => {
        setBills(fetched);
        
        // Fetch businesses from localStorage or fall back
        const savedBiz = localStorage.getItem('saas_businesses');
        const bizList = savedBiz ? JSON.parse(savedBiz) : INITIAL_BUSINESSES;
        setBusinesses(bizList);
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, [user?.uid]);

  const executeIntelligentSearch = () => {
    if (!query.trim()) {
      setMatchedInvoices([]);
      setMatchedBusinesses([]);
      setMatchedVendors([]);
      setMatchedActivities([]);
      return;
    }

    const lowercase = query.toLowerCase();

    // 1. Search Invoices
    const invoicesRes = bills.filter(b => 
      (b.invoiceNumber && b.invoiceNumber.toLowerCase().includes(lowercase)) ||
      (b.supplierName && b.supplierName.toLowerCase().includes(lowercase)) ||
      (b.gstin && b.gstin.toLowerCase().includes(lowercase)) ||
      (b.expenseType && b.expenseType.toLowerCase().includes(lowercase)) ||
      (b.notes && b.notes.toLowerCase().includes(lowercase))
    );

    // 2. Search Registered Businesses
    const businessRes = businesses.filter(b => 
      b.name.toLowerCase().includes(lowercase) || 
      b.gstin.toLowerCase().includes(lowercase) ||
      b.state.toLowerCase().includes(lowercase)
    );

    // 3. Search Vendors (unique suppliers/merchants from bills)
    const uniqueVendors = [];
    const seenVendorGstin = new Set();
    
    bills.forEach(b => {
      if (b.supplierName && b.gstin && !seenVendorGstin.has(b.gstin)) {
        seenVendorGstin.add(b.gstin);
        uniqueVendors.push({
          name: b.supplierName,
          gstin: b.gstin,
          category: b.expenseType || 'Others'
        });
      }
    });

    const vendorsRes = uniqueVendors.filter(v => 
      v.name.toLowerCase().includes(lowercase) ||
      v.gstin.toLowerCase().includes(lowercase) ||
      v.category.toLowerCase().includes(lowercase)
    );

    // 4. Search Workspace Activities
    const activitiesRes = recentActivities.filter(act => 
      act.title.toLowerCase().includes(lowercase) ||
      act.type.toLowerCase().includes(lowercase)
    );

    setMatchedInvoices(invoicesRes);
    setMatchedBusinesses(businessRes);
    setMatchedVendors(vendorsRes);
    setMatchedActivities(activitiesRes);
  };

  useEffect(() => {
    executeIntelligentSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, bills, businesses]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ q: query });
    executeIntelligentSearch();
  };

  const totalResults = matchedInvoices.length + matchedBusinesses.length + matchedVendors.length + matchedActivities.length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Search Input Box */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Intelligent Workspace Search</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 1.25rem 0' }}>
          Query across invoices, entities, vendor registries, GSTIN codes, and recent audit activity logs.
        </p>

        <form onSubmit={handleSearchSubmit}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type query terms (e.g. 'Apex', '29ABCDE', 'invoice', 'raw material')..."
              style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-lg)', fontSize: '0.9rem', outline: 'none' }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem' }}>Search</button>
          </div>
        </form>
      </div>

      {query.trim() && (
        <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Found <strong>{totalResults}</strong> matching results for "{query}"
        </div>
      )}

      {/* Results Groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent mb-2"></div>
            <div>Querying Firestore ledgers...</div>
          </div>
        ) : !query.trim() ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }} className="glass-panel">
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🔎</span>
            <strong>Enter search terms</strong>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>GSTINs, invoices, vendor merchants, billing payments, and workspace activities.</p>
          </div>
        ) : totalResults === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }} className="glass-panel">
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📭</span>
            <strong>No results matched</strong>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>Check spelling filters or try a different search phrase (e.g. 'BSNL', 'Apex').</p>
          </div>
        ) : (
          <>
            {/* Group 1: Invoices */}
            {matchedInvoices.length > 0 && (
              <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginTop: 0, marginBottom: '1rem', color: 'var(--theme-primary-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🧾 Matching Invoices ({matchedInvoices.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {matchedInvoices.map((bill, index) => (
                    <div 
                      key={index} 
                      onClick={() => navigate(`/bill/${bill.id}`)}
                      style={{ padding: '0.85rem 1.25rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.15s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                    >
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.85rem' }}>Invoice #{bill.invoiceNumber || 'INV-TEMP'} ({bill.supplierName})</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Category: {bill.expenseType} | Date: {bill.invoiceDate}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ display: 'block', fontSize: '0.9rem' }}>₹{(bill.totalAmount || 0).toLocaleString()}</strong>
                        <span className={`badge-premium ${bill.filed ? 'badge-excellent' : 'badge-average'}`} style={{ fontSize: '0.6rem', marginTop: '0.125rem' }}>
                          {bill.filed ? 'Filed' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Group 2: Businesses */}
            {matchedBusinesses.length > 0 && (
              <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginTop: 0, marginBottom: '1rem', color: 'var(--theme-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🏢 Registered Workspaces ({matchedBusinesses.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {matchedBusinesses.map((biz, index) => (
                    <div 
                      key={index} 
                      onClick={() => navigate(`/business`)}
                      style={{ padding: '0.85rem 1.25rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.15s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                    >
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.85rem' }}>{biz.name}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>State: {biz.state} | GSTIN: {biz.gstin}</span>
                      </div>
                      <span className="badge-premium badge-excellent" style={{ fontSize: '0.65rem' }}>Compliance: {biz.complianceScore}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Group 3: Vendors */}
            {matchedVendors.length > 0 && (
              <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginTop: 0, marginBottom: '1rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  👥 Verified Vendor Merchants ({matchedVendors.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {matchedVendors.map((vendor, index) => (
                    <div 
                      key={index}
                      onClick={() => navigate(`/invoices`)}
                      style={{ padding: '0.85rem 1.25rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    >
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.85rem' }}>{vendor.name}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>GSTIN: {vendor.gstin}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', background: 'var(--bg-tertiary)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                        {vendor.category}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Group 4: Activities */}
            {matchedActivities.length > 0 && (
              <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginTop: 0, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📋 Action Activities ({matchedActivities.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {matchedActivities.map((act, index) => (
                    <div 
                      key={index} 
                      style={{ padding: '0.85rem 1.25rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.85rem' }}>{act.title}</strong>
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-tertiary)' }}>Log Category: {act.type}</span>
                      </div>
                      <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>{act.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}

export default GlobalSearch;
export { INITIAL_BUSINESSES };
