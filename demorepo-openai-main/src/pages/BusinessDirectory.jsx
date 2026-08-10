import React, { useState, useEffect } from 'react';
import { getUserBusinesses, saveUserBusinesses } from '../utils/businessHelper';

function BusinessDirectory({ user }) {
  const [businesses, setBusinesses] = useState([]);

  useEffect(() => {
    if (user) {
      setBusinesses(getUserBusinesses(user));
    }
  }, [user]);

  const [activeBusinessId, setActiveBusinessId] = useState(() => {
    const list = getUserBusinesses(user);
    return localStorage.getItem('activeBusinessId') || (list[0]?.id || '');
  });

  // Keep activeBusinessId in sync if businesses list updates
  useEffect(() => {
    if (businesses.length > 0) {
      const saved = localStorage.getItem('activeBusinessId');
      const found = businesses.find(b => b.id === saved);
      if (found) {
        setActiveBusinessId(found.id);
      } else {
        setActiveBusinessId(businesses[0].id);
        localStorage.setItem('activeBusinessId', businesses[0].id);
      }
    }
  }, [businesses]);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [sortField, setSortField] = useState('name');
  const sortOrder = 'asc';

  // Add business Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBiz, setNewBiz] = useState({
    name: '',
    gstin: '',
    state: 'Karnataka',
    type: 'Retail & Distribution',
    owner: 'Devendra Prabhakar'
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

  const handleCreateBusiness = (e) => {
    e.preventDefault();
    if (!newBiz.name || !newBiz.gstin) {
      alert('Please fill in Business Name and GSTIN.');
      return;
    }
    if (newBiz.gstin.length !== 15) {
      alert('GSTIN must be exactly 15 characters.');
      return;
    }

    const created = {
      id: newBiz.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: newBiz.name,
      gstin: newBiz.gstin.toUpperCase(),
      state: newBiz.state,
      type: newBiz.type,
      owner: newBiz.owner,
      complianceScore: 100, // new business starts at 100% compliance
      status: 'Active'
    };

    const updated = [...businesses, created];
    setBusinesses(updated);
    saveUserBusinesses(user?.uid, updated);
    setShowAddModal(false);
    setNewBiz({
      name: '',
      gstin: '',
      state: 'Karnataka',
      type: 'Retail & Distribution',
      owner: 'Devendra Prabhakar'
    });
  };

  // Search & Filter Logic
  const filtered = businesses.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.gstin.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = stateFilter === 'all' || b.state === stateFilter;
    return matchesSearch && matchesState;
  });

  // Sort Logic
  const sorted = [...filtered].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    }

    valA = String(valA).toLowerCase();
    valB = String(valB).toLowerCase();

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });


  const team = [
    { name: user?.name || user?.displayName || 'Business Owner', role: 'Administrator / CFO', email: user?.email || '', status: 'Active' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Business Directory</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            Switch active workspace workspaces, check GST compliance scores, and administer multi-entity operations.
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
          🏢 Add New Business
        </button>
      </div>

      {/* Search & Filters */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1.25rem', marginBottom: '2rem' }}>
        <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.375rem' }}>Search Entities</label>
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by company name or GSTIN..."
              style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.375rem' }}>State Jurisdiction</label>
            <select 
              value={stateFilter} 
              onChange={(e) => setStateFilter(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="all">All States</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Delhi">Delhi</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.375rem' }}>Filing Sort Criteria</label>
            <select 
              value={sortField} 
              onChange={(e) => setSortField(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="name">Company Name</option>
              <option value="complianceScore">Compliance Score</option>
              <option value="state">Location State</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Cards Grid */}
      <div className="grid grid-cols-3" style={{ gap: '1.5rem', marginBottom: '2.5rem' }}>
        {sorted.map((biz) => {
          const isSelected = activeBusinessId === biz.id;
          return (
            <div 
              key={biz.id}
              onClick={() => handleSelectBusiness(biz.id)}
              style={{
                background: isSelected ? 'rgba(99, 102, 241, 0.04)' : 'var(--bg-secondary)',
                borderRadius: 'var(--radius-xl)',
                padding: '1.5rem',
                border: isSelected ? '2px solid var(--theme-secondary)' : '1px solid var(--border-color)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              className="glass-panel"
            >
              {isSelected && (
                <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--success)', color: 'white', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 800 }}>ACTIVE</span>
              )}
              
              <div>
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>{biz.name}</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>GSTIN</span>
                <code style={{ fontSize: '0.8rem', color: 'var(--theme-secondary-light)', display: 'block', marginBottom: '0.5rem', fontFamily: 'monospace' }}>{biz.gstin}</code>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.775rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Location:</span>
                  <strong>{biz.state}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Category:</span>
                  <strong>{biz.type}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Owner:</span>
                  <strong>{biz.owner}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Compliance:</span>
                  <strong style={{ 
                    fontSize: '0.85rem',
                    color: biz.complianceScore >= 90 ? 'var(--success)' : biz.complianceScore >= 80 ? 'var(--warning)' : 'var(--error)' 
                  }}>
                    {biz.complianceScore}%
                  </strong>
                </div>
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); handleSelectBusiness(biz.id); }}
                className="btn btn-outline" 
                style={{ width: '100%', padding: '0.45rem', fontSize: '0.75rem', marginTop: '0.5rem' }}
                disabled={isSelected}
              >
                {isSelected ? 'Activated Workspace' : 'Activate Workspace'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Team management */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '1.25rem' }}>Team Access Directory</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {team.map((t, idx) => (
            <div key={idx} style={{ padding: '1rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem' }}>{t.name}</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.email} | Access: {t.role}</span>
              </div>
              <span className="badge-premium badge-excellent" style={{ fontSize: '0.65rem' }}>{t.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Business Modal Dialog */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '2rem', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '480px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: 0, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>🏢 Register New Business</h3>
            
            <form onSubmit={handleCreateBusiness} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Business Shop Name</label>
                <input 
                  type="text" 
                  value={newBiz.name} 
                  onChange={(e) => setNewBiz({ ...newBiz, name: e.target.value })}
                  placeholder="e.g. Global Tech Ventures Ltd"
                  style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>GSTIN Identifier (15-chars)</label>
                <input 
                  type="text" 
                  value={newBiz.gstin} 
                  onChange={(e) => setNewBiz({ ...newBiz, gstin: e.target.value.toUpperCase() })}
                  maxLength={15}
                  placeholder="e.g. 29ABCDE1234F2Z5"
                  style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace' }}
                />
              </div>

              <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>State Jurisdiction</label>
                  <select 
                    value={newBiz.state} 
                    onChange={(e) => setNewBiz({ ...newBiz, state: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="Karnataka">Karnataka</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Delhi">Delhi</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Category Segment</label>
                  <select 
                    value={newBiz.type} 
                    onChange={(e) => setNewBiz({ ...newBiz, type: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="Retail & Distribution">Retail & Distribution</option>
                    <option value="IT Services & Consulting">IT Services & Consulting</option>
                    <option value="Transport & Warehouse">Transport & Warehouse</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}>Register Business</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default BusinessDirectory;
