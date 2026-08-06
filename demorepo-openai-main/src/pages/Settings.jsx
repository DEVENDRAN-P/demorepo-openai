import React, { useState, useEffect } from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import { getUserProfile, saveUserProfile } from '../services/firebaseDataService';

function Settings({ user }) {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [activeTab, setActiveTab] = useState('business');

  // Form states & dirty checking
  const [isDirty, setIsDirty] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState('');
  const [loading, setLoading] = useState(false);

  // Form Data States
  const [profile, setProfile] = useState({
    name: '',
    shopName: '',
    phone: '',
    address: '',
    city: '',
    state: 'Karnataka',
    pincode: '',
    gstin: '',
    filingFrequency: 'monthly',
    companyRegistrationNo: 'U72200KA2024PTC182390',
    directorDIN: 'DIN-09823122, DIN-08723910'
  });

  // AI & Automation States
  const [aiConfig, setAiConfig] = useState({
    confidenceThreshold: 85,
    autoApproveHighConfidence: true,
    ocrEngine: 'tesseract-v5',
    reminderSchedule: '3days_before'
  });

  // API Key State
  const [apiKeys, setApiKeys] = useState([
    { name: 'Production Client Token', key: 'gst_live_8fbc2e309ad9211ec189283f', status: 'Active', created: '2026-06-15' }
  ]);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  // 2FA Security states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    getUserProfile()
      .then(prof => {
        if (prof) {
          setProfile(prev => ({
            ...prev,
            name: prof.name || '',
            shopName: prof.shopName || '',
            phone: prof.phone || '',
            address: prof.address || '',
            city: prof.city || '',
            state: prof.state || 'Karnataka',
            pincode: prof.pincode || '',
            gstin: prof.gstin || ''
          }));
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [user?.uid]);

  const handleInputChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setSaveIndicator('Saving settings profile changes...');
    try {
      await saveUserProfile({
        name: profile.name,
        shopName: profile.shopName,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        pincode: profile.pincode,
        gstin: profile.gstin
      });
      setIsDirty(false);
      setSaveIndicator('✅ Profile settings updated successfully!');
      setTimeout(() => setSaveIndicator(''), 4000);
    } catch (err) {
      console.error(err);
      setSaveIndicator('❌ Error updating settings profile.');
      setTimeout(() => setSaveIndicator(''), 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateApiKey = () => {
    if (!newKeyName.trim()) return;
    const randomHex = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const newKey = {
      name: newKeyName,
      key: `gst_live_${randomHex}`,
      status: 'Active',
      created: new Date().toISOString().split('T')[0]
    };
    setApiKeys([...apiKeys, newKey]);
    setNewKeyName('');
    setShowNewKeyModal(false);
    setSaveIndicator('✅ New API Access Token generated!');
    setTimeout(() => setSaveIndicator(''), 3000);
  };

  const handleDeleteApiKey = (keyToDelete) => {
    if (window.confirm('Revoke this API Key immediately? All integrations calling this token will fail.')) {
      setApiKeys(apiKeys.filter(k => k.key !== keyToDelete));
      setSaveIndicator('ℹ️ API Token revoked successfully.');
      setTimeout(() => setSaveIndicator(''), 3000);
    }
  };

  const tabItems = [
    { id: 'business', label: '🏢 Business & GST Registry' },
    { id: 'appearance', label: '🎨 Appearance & Branding' },
    { id: 'security', label: '🔒 Security & 2FA' },
    { id: 'automation', label: '⚡ AI & Automation Rules' },
    { id: 'api', label: '🔑 API Access & Integration' }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Toast Save Notifications */}
      {saveIndicator && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: saveIndicator.includes('❌') ? 'var(--error)' : saveIndicator.includes('✅') ? 'var(--success)' : 'var(--theme-primary)',
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

      {/* Unsaved Changes Banner */}
      {isDirty && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid var(--theme-accent)',
          padding: '0.75rem 1.5rem',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '1.5rem',
          fontSize: '0.825rem'
        }}>
          <span>⚠️ You have unsaved changes in your settings forms.</span>
          <button onClick={handleSaveProfile} className="btn btn-primary" style={{ padding: '0.375rem 1rem', fontSize: '0.75rem', background: 'var(--theme-accent)', border: 'none' }}>
            Save Changes
          </button>
        </div>
      )}

      {/* Title Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Enterprise Settings</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          Administer profile details, configure AI parsing filters, schedule automations, and manage API integrations.
        </p>
      </div>

      {/* Layout Split: Tab menu vs Workspace */}
      <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2.5rem', alignItems: 'start' }}>
        
        {/* Left Side Tab Navigation */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {tabItems.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '0.75rem 1rem',
                border: 'none',
                background: activeTab === tab.id ? 'var(--bg-tertiary)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderRadius: 'var(--radius-md)',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none',
                borderLeft: activeTab === tab.id ? '3px solid var(--theme-secondary)' : '3px solid transparent'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right Side Workspace Forms */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2.5rem' }}>
          
          {/* Tab 1: Business Profile & GST */}
          {activeTab === 'business' && (
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Business Registry Information</h3>
              
              <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>Owner Full Name</label>
                  <input 
                    type="text" 
                    value={profile.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>Business Shop Name</label>
                  <input 
                    type="text" 
                    value={profile.shopName}
                    onChange={(e) => handleInputChange('shopName', e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>GSTIN Identifier ID</label>
                  <input 
                    type="text" 
                    value={profile.gstin}
                    onChange={(e) => handleInputChange('gstin', e.target.value.toUpperCase())}
                    maxLength={15}
                    style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>Filing Interval Frequency</label>
                  <select 
                    value={profile.filingFrequency} 
                    onChange={(e) => handleInputChange('filingFrequency', e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="monthly">Monthly returns (GSTR-1, GSTR-3B)</option>
                    <option value="quarterly">Quarterly filing returns (QRMP scheme)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>Company Corporate Reg Number (CIN)</label>
                  <input 
                    type="text" 
                    value={profile.companyRegistrationNo}
                    onChange={(e) => handleInputChange('companyRegistrationNo', e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>Director DIN identifiers</label>
                  <input 
                    type="text" 
                    value={profile.directorDIN}
                    onChange={(e) => handleInputChange('directorDIN', e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3" style={{ gap: '1.25rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>Registered Office Address</label>
                  <input 
                    type="text" 
                    value={profile.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>Primary Phone</label>
                  <input 
                    type="text" 
                    value={profile.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: 'fit-content', padding: '0.6rem 1.5rem', marginTop: '1rem', marginLeft: 'auto' }}>
                Save Registry Profile
              </button>
            </form>
          )}

          {/* Tab 2: Appearance & Branding */}
          {activeTab === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Appearance Settings</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9rem' }}>Application Dark Theme</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Toggle theme rendering elements across the workspace.</span>
                  </div>
                  <button onClick={toggleDarkMode} className="btn btn-outline" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}>
                    {isDarkMode ? '🌞 Switch Light Mode' : '🌙 Switch Dark Mode'}
                  </button>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Branding Options</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.9rem' }}>Upload Brand Custom Logo</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Replace the default sidebar and navbar logos.</span>
                    </div>
                    <button className="btn btn-outline" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }} onClick={() => alert('Branding uploads require an Enterprise SaaS subscription tier.')}>Upload SVG</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Security & 2FA */}
          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Two-Factor Authentication (2FA)</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9rem' }}>Enable OTP Authentication</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Require a verification code sent to your phone at login.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={twoFactorEnabled} 
                    onChange={(e) => {
                      setTwoFactorEnabled(e.target.checked);
                      setSaveIndicator(e.target.checked ? '✅ Two-Factor Authentication enabled!' : 'ℹ️ Two-Factor Authentication disabled.');
                      setTimeout(() => setSaveIndicator(''), 3000);
                    }}
                    style={{ width: '42px', height: '20px', cursor: 'pointer' }}
                  />
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Connected Devices & Sessions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyBetween: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <div>
                      <strong>Google Chrome (Windows 11) - Current Session</strong>
                      <span style={{ display: 'block', fontSize: '0.675rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>IP Address: 192.168.1.45 | Location: Bangalore, India</span>
                    </div>
                    <span className="badge-premium badge-excellent" style={{ alignSelf: 'center', fontSize: '0.65rem' }}>Active</span>
                  </div>
                  <div style={{ display: 'flex', justifyBetween: 'space-between' }}>
                    <div>
                      <strong>Apple Safari (iPhone iOS 17)</strong>
                      <span style={{ display: 'block', fontSize: '0.675rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>IP Address: 103.45.22.112 | Location: Bangalore, India</span>
                    </div>
                    <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.675rem', alignSelf: 'center' }} onClick={() => alert('Session terminated successfully.')}>Revoke</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: AI & Automation Rules */}
          {activeTab === 'automation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>AI Parsing Configuration</h3>
              
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>OCR Confidence Threshold: {aiConfig.confidenceThreshold}%</label>
                <input 
                  type="range" 
                  min={50} 
                  max={99} 
                  value={aiConfig.confidenceThreshold}
                  onChange={(e) => {
                    setAiConfig({ ...aiConfig, confidenceThreshold: parseInt(e.target.value) });
                    setIsDirty(true);
                  }}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>Invoices with extraction confidence scores below this limit will be flagged for manual vetting.</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.9rem' }}>Auto-Approve Vetted Invoices</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Automatically sync high-confidence items directly to the ledger database.</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={aiConfig.autoApproveHighConfidence} 
                  onChange={(e) => {
                    setAiConfig({ ...aiConfig, autoApproveHighConfidence: e.target.checked });
                    setIsDirty(true);
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>Email Reminder Dispatch Schedule</label>
                <select 
                  value={aiConfig.reminderSchedule} 
                  onChange={(e) => {
                    setAiConfig({ ...aiConfig, reminderSchedule: e.target.value });
                    setIsDirty(true);
                  }}
                  style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="5days_before">5 Days prior to filing due date</option>
                  <option value="3days_before">3 Days prior to filing due date</option>
                  <option value="1day_before">1 Day prior to filing due date (Urgent)</option>
                </select>
              </div>

              <button onClick={() => {
                setIsDirty(false);
                setSaveIndicator('✅ AI and automation configurations saved!');
                setTimeout(() => setSaveIndicator(''), 3000);
              }} className="btn btn-primary" style={{ width: 'fit-content', marginLeft: 'auto', padding: '0.5rem 1rem' }}>
                Save AI Rules
              </button>
            </div>
          )}

          {/* Tab 5: API Access & Integrations */}
          {activeTab === 'api' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>API Access Tokens</h3>
                  <button onClick={() => setShowNewKeyModal(true)} className="btn btn-primary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>+ Generate Token</button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.25rem' }}>
                  {apiKeys.length === 0 ? (
                    <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '1rem 0' }}>No API keys active in this workspace.</div>
                  ) : (
                    apiKeys.map(k => (
                      <div key={k.key} style={{ display: 'flex', justifyBetween: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', fontSize: '0.8rem', gap: '1rem' }}>
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.85rem' }}>{k.name}</strong>
                          <code style={{ display: 'block', fontSize: '0.725rem', color: 'var(--theme-secondary-light)', marginTop: '0.25rem' }}>{k.key}</code>
                          <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>Created: {k.created}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'center', marginLeft: 'auto' }}>
                          <button onClick={() => { navigator.clipboard.writeText(k.key); alert('API Key copied!'); }} className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.675rem' }}>Copy</button>
                          <button onClick={() => handleDeleteApiKey(k.key)} className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.675rem', borderColor: 'var(--error)', color: 'var(--error)' }}>Revoke</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Corporate Integrations</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1.25rem', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyBetween: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <div>
                      <strong>Tally Prime ERP Integration</strong>
                      <span style={{ display: 'block', fontSize: '0.675rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>Auto-sync vetted invoices directly into accounting ledgers.</span>
                    </div>
                    <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.725rem', alignSelf: 'center' }} onClick={() => alert('Tally Prime connection request initiated.')}>Connect</button>
                  </div>
                  <div style={{ display: 'flex', justifyBetween: 'space-between' }}>
                    <div>
                      <strong>Zoho Books Workspace Sync</strong>
                      <span style={{ display: 'block', fontSize: '0.675rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>Sync real-time tax credits between platforms.</span>
                    </div>
                    <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.725rem', alignSelf: 'center' }} onClick={() => alert('Zoho Books connection request initiated.')}>Connect</button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* New API Token Modal */}
      {showNewKeyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '400px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 0, marginBottom: '1rem' }}>Generate API Key</h3>
            
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>API Key Name</label>
            <input 
              type="text" 
              value={newKeyName} 
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. Tally Sync Token"
              style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '1.25rem', outline: 'none' }}
            />

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowNewKeyModal(false); setNewKeyName(''); }} className="btn btn-outline" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}>Cancel</button>
              <button onClick={handleGenerateApiKey} className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}>Generate</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Settings;
