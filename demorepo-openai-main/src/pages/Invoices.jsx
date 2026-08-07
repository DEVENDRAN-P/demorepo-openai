import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserBills, updateUserBill, deleteUserBill } from '../services/firebaseDataService';
import { clearAndReseedInvoices } from '../services/seederService';

function Invoices({ user }) {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeBusinessId, setActiveBusinessId] = useState(() => {
    return localStorage.getItem('activeBusinessId') || 'apex_retailers';
  });

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState('invoiceDate');
  const [sortOrder, setSortOrder] = useState('desc');

  // Table selection & Pagination States
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected Invoice Modal State
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [saveIndicator, setSaveIndicator] = useState('');

  useEffect(() => {
    const handleBusinessChanged = (e) => {
      if (e.detail?.businessId) {
        setActiveBusinessId(e.detail.businessId);
        setCurrentPage(1);
        setSelectedIds([]);
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

  // Apply search & filters
  const filteredBills = bills.filter(bill => {
    const matchSearch = 
      (bill.invoiceNumber && bill.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (bill.supplierName && bill.supplierName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (bill.gstin && bill.gstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (bill.notes && bill.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'filed' && bill.filed) || 
      (statusFilter === 'pending' && !bill.filed) ||
      (statusFilter === 'approved' && bill.status === 'approved');

    const matchCategory = 
      categoryFilter === 'all' || 
      (bill.expenseType && bill.expenseType.toLowerCase() === categoryFilter.toLowerCase()) ||
      (bill.category && bill.category.toLowerCase() === categoryFilter.toLowerCase());

    return matchSearch && matchStatus && matchCategory;
  });

  // Apply sorting
  const sortedBills = [...filteredBills].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    // Handle undefined/nulls
    if (valA === undefined || valA === null) valA = '';
    if (valB === undefined || valB === null) valB = '';

    // Numeric comparison
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    }

    // String/Date comparison
    valA = String(valA).toLowerCase();
    valB = String(valB).toLowerCase();

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedBills.length / itemsPerPage) || 1;
  const paginatedBills = sortedBills.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Selection handlers
  const handleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pageIds = paginatedBills.map(b => b.id);
      setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
    } else {
      const pageIds = paginatedBills.map(b => b.id);
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    }
  };

  // Bulk Actions
  const handleBulkFile = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`File all ${selectedIds.length} selected returns to the GST Portal?`)) return;
    
    setLoading(true);
    try {
      for (const id of selectedIds) {
        await updateUserBill(id, { filed: true, status: 'filed', filedDate: new Date().toISOString() });
      }
      setSaveIndicator(`Successfully filed ${selectedIds.length} returns!`);
      setSelectedIds([]);
      loadInvoices();
      setTimeout(() => setSaveIndicator(''), 4000);
    } catch (e) {
      console.error(e);
      alert('Error during bulk return filing.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected invoices permanently? This cannot be undone.`)) return;

    setLoading(true);
    try {
      for (const id of selectedIds) {
        await deleteUserBill(id);
      }
      setSaveIndicator(`Successfully deleted ${selectedIds.length} invoices.`);
      setSelectedIds([]);
      loadInvoices();
      setTimeout(() => setSaveIndicator(''), 4000);
    } catch (e) {
      console.error(e);
      alert('Error during bulk deletion.');
    } finally {
      setLoading(false);
    }
  };

  // Single Actions
  const handleMarkAsFiledSingle = async (id, e) => {
    e.stopPropagation();
    try {
      await updateUserBill(id, { filed: true, status: 'filed', filedDate: new Date().toISOString() });
      setSaveIndicator('Invoice filed successfully.');
      loadInvoices();
      if (previewInvoice?.id === id) {
        setPreviewInvoice(prev => ({ ...prev, filed: true, status: 'filed' }));
      }
      setTimeout(() => setSaveIndicator(''), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  // Export handlers
  const handleExportCSV = () => {
    let headers = 'Invoice Number,Supplier,GSTIN,Date,Taxable Value,GST Tax,Grand Total,Status\n';
    let rows = sortedBills.map(b => 
      `"${b.invoiceNumber || ''}","${b.supplierName || ''}","${b.gstin || ''}","${b.invoiceDate || ''}",${b.amount || 0},${b.taxAmount || 0},${b.totalAmount || 0},"${b.filed ? 'Filed' : 'Pending'}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GST_Buddy_Invoices_${activeBusinessId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetReseed = async () => {
    if (!user?.uid) return;
    if (!window.confirm("This will clear all current invoices and restore the default 8 demo invoices. Continue?")) return;
    
    setLoading(true);
    try {
      await clearAndReseedInvoices(user.uid);
      setSaveIndicator("Demo data reseeded successfully!");
      loadInvoices();
      window.dispatchEvent(new Event('billUpdated'));
      setTimeout(() => setSaveIndicator(''), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to reset and reseed invoices.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Save Notification Toast */}
      {saveIndicator && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'var(--success)',
          color: 'white',
          padding: '0.85rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 9999,
          fontWeight: 600,
          animation: 'slideIn 0.3s ease'
        }}>
          {saveIndicator}
        </div>
      )}

      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Invoices Ledger</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            Vetted corporate purchases and sales ledger. Verify classifications and export files.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={handleResetReseed} className="btn btn-outline" style={{ fontSize: '0.825rem', borderColor: 'var(--theme-primary)', color: 'var(--theme-primary)' }}><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }}><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l.56-.56"/></svg> Reset & Reseed</button>
          <button onClick={handleExportCSV} className="btn btn-outline" style={{ fontSize: '0.825rem' }}>Export CSV</button>
          <button onClick={() => navigate('/bill-upload')} className="btn btn-primary" style={{ fontSize: '0.825rem' }}><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg> Upload Invoice</button>
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
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Invoice #, supplier, notes..."
              style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.375rem' }}>Filing Status</label>
            <select 
              value={statusFilter} 
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="all">All Invoices</option>
              <option value="pending">Pending Returns</option>
              <option value="filed">Filed Returns</option>
              <option value="approved">Approved / Vetted</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.375rem' }}>Category</label>
            <select 
              value={categoryFilter} 
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="all">All Categories</option>
              <option value="raw material">Raw Material</option>
              <option value="utilities">Utilities</option>
              <option value="office supplies">Office Supplies</option>
              <option value="services">Services</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.375rem' }}>Sort By</label>
            <select 
              value={sortField} 
              onChange={(e) => setSortField(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="invoiceDate">Filing Date</option>
              <option value="totalAmount">Invoice Value</option>
              <option value="supplierName">Supplier Name</option>
              <option value="invoiceNumber">Invoice Number</option>
            </select>
          </div>

        </div>
      </div>

      {/* Bulk Actions Panel */}
      {selectedIds.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid var(--theme-primary)',
          padding: '0.75rem 1.5rem',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '1.25rem',
          fontSize: '0.85rem'
        }}>
          <span><strong>{selectedIds.length}</strong> invoices selected</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleBulkFile} className="btn btn-primary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>File Selected</button>
            <button onClick={handleBulkDelete} className="btn btn-outline" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', borderColor: 'var(--error)', color: 'var(--error)' }}>Delete Selected</button>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '2rem 0' }}>
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="skeleton-bar" style={{ height: '40px', width: '100%' }}></div>
            ))}
          </div>
        ) : sortedBills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
              <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto' }}>
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </span>
            <strong style={{ fontSize: '1rem', display: 'block', color: 'var(--text-primary)' }}>No Invoices Registered</strong>
            <span style={{ fontSize: '0.8rem', display: 'block', marginTop: '0.25rem' }}>Upload invoice documents to see records in this directory workspace.</span>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem', width: '40px' }}>
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll} 
                      checked={paginatedBills.length > 0 && paginatedBills.every(b => selectedIds.includes(b.id))}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th onClick={() => handleToggleSort('invoiceNumber')} style={{ padding: '0.75rem', cursor: 'pointer' }}>
                    Invoice Number {sortField === 'invoiceNumber' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th onClick={() => handleToggleSort('supplierName')} style={{ padding: '0.75rem', cursor: 'pointer' }}>
                    Supplier Name {sortField === 'supplierName' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th onClick={() => handleToggleSort('invoiceDate')} style={{ padding: '0.75rem', cursor: 'pointer' }}>
                    Date {sortField === 'invoiceDate' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th onClick={() => handleToggleSort('totalAmount')} style={{ padding: '0.75rem', textAlign: 'right', cursor: 'pointer' }}>
                    Grand Total {sortField === 'totalAmount' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Classification</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Filing Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBills.map((bill, index) => {
                  const isSelected = selectedIds.includes(bill.id);
                  return (
                    <tr 
                      key={bill.id || index} 
                      onClick={() => setPreviewInvoice(bill)}
                      style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background-color 0.2s', backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.04)' : 'transparent' }}
                      onMouseEnter={(e) => { if(!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
                      onMouseLeave={(e) => { if(!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <td style={{ padding: '0.75rem' }} onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={isSelected} 
                          onChange={() => handleSelectRow(bill.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{bill.invoiceNumber || 'INV-TEMP'}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{bill.supplierName || 'Unknown'}</td>
                      <td style={{ padding: '0.75rem' }}>{bill.invoiceDate ? new Date(bill.invoiceDate).toLocaleDateString() : 'N/A'}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700 }}>₹{(bill.totalAmount || 0).toLocaleString()}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.75rem', background: 'var(--bg-tertiary)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                          {bill.expenseType || 'Others'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span className={`badge-premium ${bill.filed ? 'badge-excellent' : 'badge-average'}`} style={{ fontSize: '0.65rem' }}>
                          {bill.filed ? 'Filed' : 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                          {!bill.filed && (
                            <button onClick={(e) => handleMarkAsFiledSingle(bill.id, e)} className="btn btn-outline" style={{ padding: '0.2rem 0.45rem', fontSize: '0.7rem' }}>File</button>
                          )}
                          <button onClick={() => navigate(`/bill/${bill.id}`)} className="btn btn-outline" style={{ padding: '0.2rem 0.45rem', fontSize: '0.7rem' }}>Edit</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <span>Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedBills.length)} of {sortedBills.length} records</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(p => p - 1)} 
                  className="btn btn-outline" 
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                >
                  Previous
                </button>
                <button 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(p => p + 1)} 
                  className="btn btn-outline" 
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Invoice Details Preview Modal */}
      {previewInvoice && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9990,
          backdropFilter: 'blur(4px)',
          padding: '1.5rem'
        }} onClick={() => setPreviewInvoice(null)}>
          <div style={{
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: '650px',
            boxShadow: 'var(--shadow-2xl)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--theme-primary)', fontWeight: 700 }}>Invoice Details Vetting</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{previewInvoice.invoiceNumber || 'INV-TEMP'}</h3>
              </div>
              <button 
                onClick={() => setPreviewInvoice(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer', outline: 'none' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '70vh', overflowY: 'auto' }}>
              
              <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block' }}>Supplier Name</span>
                  <strong style={{ fontSize: '0.95rem' }}>{previewInvoice.supplierName || 'N/A'}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block' }}>Supplier GSTIN</span>
                  <strong style={{ fontSize: '0.95rem', fontFamily: 'monospace' }}>{previewInvoice.gstin || 'N/A'}</strong>
                </div>
              </div>

              <div className="grid grid-cols-3" style={{ gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block' }}>Taxable Value</span>
                  <span style={{ fontWeight: 700 }}>₹{(previewInvoice.amount || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block' }}>GST Tax Amount</span>
                  <span style={{ fontWeight: 700 }}>₹{(previewInvoice.taxAmount || 0).toLocaleString()} ({previewInvoice.taxPercent}%)</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block' }}>Grand Total</span>
                  <span style={{ fontWeight: 800, color: 'var(--theme-primary)' }}>₹{(previewInvoice.totalAmount || 0).toLocaleString()}</span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Expense Classification</span>
                <span style={{ background: 'var(--bg-tertiary)', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600 }}>
                  {previewInvoice.expenseType || 'Others'} (Category: {previewInvoice.category || 'Standard'})
                </span>
              </div>

              {previewInvoice.notes && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block' }}>Audit Notes</span>
                  <p style={{ fontSize: '0.8rem', margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{previewInvoice.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2" style={{ gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block' }}>Extraction Confidence</span>
                  <span style={{ textTransform: 'capitalize', fontWeight: 600, color: previewInvoice.extractionConfidence === 'high' ? 'var(--success)' : 'var(--warning)' }}>
                    ● {previewInvoice.extractionConfidence || 'Medium'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block' }}>Filing Deadline</span>
                  <span style={{ fontWeight: 600 }}>{previewInvoice.gstrDeadline || 'N/A'}</span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', background: 'var(--bg-secondary)' }}>
              <button onClick={() => setPreviewInvoice(null)} className="btn btn-outline" style={{ fontSize: '0.8rem' }}>Close</button>
              {!previewInvoice.filed && (
                <button onClick={(e) => { handleMarkAsFiledSingle(previewInvoice.id, e); }} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>File return</button>
              )}
              <button onClick={() => { setPreviewInvoice(null); navigate(`/bill/${previewInvoice.id}`); }} className="btn btn-primary" style={{ fontSize: '0.8rem', background: 'var(--theme-secondary)' }}>Edit Invoice</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Invoices;
