import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getUserBills, getUserActivityLogs } from '../services/firebaseDataService';
import { getUserBusinesses } from '../utils/businessHelper';
import { useTranslation } from 'react-i18next';

const buildActivityTitle = (log) => {
  const action = log.action || 'activity';
  const inv = log.details?.invoiceNumber;
  if (inv) return `${action} — Invoice #${inv}`;
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatLogDate = (ts) => {
  if (!ts) return '';
  const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
};

function GlobalSearch({ user }) {
  const { t } = useTranslation();
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

  // Real activity log entries (loaded from Firestore on mount)
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    getUserBills()
      .then(fetched => {
        setBills(fetched);
        
        // Businesses come from the user's own data (businessHelper)
        setBusinesses(getUserBusinesses(user));
        // Activities come from the user's real Firestore activity log
        getUserActivityLogs()
          .then((logs) => {
            setActivities((logs || []).map((l) => ({
              title: buildActivityTitle(l),
              type: l.action || 'activity',
              date: formatLogDate(l.timestamp),
            })));
          })
          .catch(() => setActivities([]));
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const activitiesRes = activities.filter(act => 
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
  }, [query, bills, businesses, activities]);

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
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>{t('globalsearch_title')}</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 1.25rem 0' }}>
          {t('globalsearch_subtitle')}
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
            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem' }}>{t('globalsearch_search')}</button>
          </div>
        </form>
      </div>

      {query.trim() && (
        <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {t('globalsearch_found')} <strong>{totalResults}</strong> {t('globalsearch_results')} "{query}"
        </div>
      )}

      {/* Results Groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent mb-2"></div>
            <div>{t('globalsearch_querying')}</div>
          </div>
        ) : !query.trim() ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }} className="glass-panel">
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🔎</span>
            <strong>{t('globalsearch_enter_terms')}</strong>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>{t('globalsearch_enter_terms_desc')}</p>
          </div>
        ) : totalResults === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }} className="glass-panel">
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📭</span>
            <strong>{t('globalsearch_no_results')}</strong>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>{t('globalsearch_no_results_desc')}</p>
          </div>
        ) : (
          <>
            {/* Group 1: Invoices */}
            {matchedInvoices.length > 0 && (
              <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginTop: 0, marginBottom: '1rem', color: 'var(--theme-primary-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1zM16 8H8m8 4H8m6 4H8"/></svg> {t('globalsearch_matching_invoices')} ({matchedInvoices.length})</span>
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
                          {bill.filed ? t('globalsearch_filed') : t('globalsearch_pending')}
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
                  🏢 {t('globalsearch_workspaces')} ({matchedBusinesses.length})
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
                  👥 {t('globalsearch_vendors')} ({matchedVendors.length})
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
                  📋 {t('globalsearch_activities')} ({matchedActivities.length})
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
