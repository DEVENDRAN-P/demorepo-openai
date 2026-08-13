import React, { useState, useEffect } from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import { getUserProfile, saveUserProfile, getUserSettings, saveUserSettings } from '../services/firebaseDataService';
import { useTranslation } from 'react-i18next';

function Settings({ user }) {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { t, i18n } = useTranslation();
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
    companyRegistrationNo: '',
    directorDIN: ''
  });

  // AI & Automation States
  const [aiConfig, setAiConfig] = useState({
    confidenceThreshold: 85,
    autoApproveHighConfidence: true,
    ocrEngine: 'tesseract-v5',
    reminderSchedule: '3days_before'
  });

  // API key management is a server-side Business-plan feature. Keys are never
  // generated in the browser — a client-side key manager would be fake and
  // misleading. 2FA is not implemented server-side yet, so its toggle stays
  // disabled rather than pretending to enable it.
  const [twoFactorEnabled] = useState(false);

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
    setSaveIndicator(t('settings_saving'));
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
      setSaveIndicator('✅ ' + t('settings_saved'));
      setTimeout(() => setSaveIndicator(''), 4000);
    } catch (err) {
      console.error(err);
      setSaveIndicator('❌ ' + t('settings_save_error'));
      setTimeout(() => setSaveIndicator(''), 4000);
    } finally {
      setLoading(false);
    }
  };

  // Load saved automation rules from Firestore (real persistence)
  useEffect(() => {
    if (!user?.uid) return;
    getUserSettings()
      .then((s) => {
        if (!s) return;
        setAiConfig((prev) => ({
          confidenceThreshold: s.aiConfidenceThreshold ?? prev.confidenceThreshold,
          autoApproveHighConfidence:
            s.autoApproveHighConfidence !== undefined ? s.autoApproveHighConfidence : prev.autoApproveHighConfidence,
          ocrEngine: s.ocrEngine || prev.ocrEngine,
          reminderSchedule: s.reminderSchedule || prev.reminderSchedule,
        }));
      })
      .catch((err) => console.error('Error loading automation settings:', err));
  }, [user?.uid]);

  const handleSaveAiRules = async () => {
    try {
      await saveUserSettings({
        aiConfidenceThreshold: aiConfig.confidenceThreshold,
        autoApproveHighConfidence: aiConfig.autoApproveHighConfidence,
        ocrEngine: aiConfig.ocrEngine,
        reminderSchedule: aiConfig.reminderSchedule,
      });
      setIsDirty(false);
      setSaveIndicator('✅ ' + t('settings_ai_saved'));
    } catch (err) {
      console.error(err);
      setSaveIndicator('❌ ' + t('settings_ai_save_error'));
    } finally {
      setTimeout(() => setSaveIndicator(''), 3000);
    }
  };

  const tabItems = [
    { id: 'business', label: t('settings_tab_business', 'Business & GST Registry'), iconKey: 'business' },
    { id: 'appearance', label: t('settings_tab_appearance', 'Appearance & Branding'), iconKey: 'appearance' },
    { id: 'security', label: t('settings_tab_security', 'Security & 2FA'), iconKey: 'security' },
    { id: 'automation', label: t('settings_tab_automation', 'AI & Automation Rules'), iconKey: 'automation' },
    { id: 'api', label: t('settings_tab_api', 'API Access & Integration'), iconKey: 'api' }
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
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="m10.29 3.86 8.47 14.71c.77 1.34-.19 3-1.73 3H3.64c-1.54 0-2.5-1.66-1.73-3L10.29 3.86Z"/>
              <line x1="12" x2="12" y1="9" y2="13"/>
              <line x1="12" x2="12.01" y1="17" y2="17"/>
            </svg>
            <span>{t('settings_unsaved_changes', 'You have unsaved changes in your settings forms.')}</span>
          </span>
          <button onClick={handleSaveProfile} className="btn btn-primary" style={{ padding: '0.375rem 1rem', fontSize: '0.75rem', background: 'var(--theme-accent)', border: 'none' }}>
            {t('save_changes')}
          </button>
        </div>
      )}

      {/* Title Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>{t('enterprise_settings', 'Enterprise Settings')}</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
          {t('settings_subtitle', 'Administer profile details, configure AI parsing filters, schedule automations, and manage API integrations.')}
        </p>
      </div>

      {/* Layout Split: Tab menu vs Workspace */}
      <div className="settings-grid">
        
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
                borderLeft: activeTab === tab.id ? '3px solid var(--theme-secondary)' : '3px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {tab.iconKey === 'business' && (
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
                  <line x1="9" y1="22" x2="9" y2="16"/><line x1="15" y1="22" x2="15" y2="16"/>
                  <line x1="9" y1="16" x2="15" y2="16"/>
                  <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01"/>
                </svg>
              )}
              {tab.iconKey === 'appearance' && (
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="6" r="1.5"/><circle cx="16" cy="10" r="1.5"/>
                  <circle cx="12" cy="18" r="1.5"/><circle cx="8" cy="10" r="1.5"/>
                </svg>
              )}
              {tab.iconKey === 'security' && (
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              )}
              {tab.iconKey === 'automation' && (
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              )}
              {tab.iconKey === 'api' && (
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="7.5" cy="15.5" r="5.5"/>
                  <path d="m11.5 11.5 9-9M17 3l4 4M15 5l2 2"/>
                </svg>
              )}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right Side Workspace Forms */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-xl)', padding: '2.5rem' }}>
          
          {/* Tab 1: Business Profile & GST */}
          {activeTab === 'business' && (
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>{t('settings_business_registry')}</h3>
              
              <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>{t('settings_owner_name')}</label>
                  <input 
                    type="text" 
                    value={profile.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>{t('settings_shop_name')}</label>
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
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>{t('settings_gstin')}</label>
                  <input 
                    type="text" 
                    value={profile.gstin}
                    onChange={(e) => handleInputChange('gstin', e.target.value.toUpperCase())}
                    maxLength={15}
                    style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>{t('settings_filing_frequency')}</label>
                  <select 
                    value={profile.filingFrequency} 
                    onChange={(e) => handleInputChange('filingFrequency', e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="monthly">{t('settings_monthly_returns')}</option>
                    <option value="quarterly">{t('settings_quarterly_returns')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2" style={{ gap: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>{t('settings_cin')}</label>
                  <input 
                    type="text" 
                    value={profile.companyRegistrationNo}
                    onChange={(e) => handleInputChange('companyRegistrationNo', e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>{t('settings_din')}</label>
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
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>{t('settings_registered_address')}</label>
                  <input 
                    type="text" 
                    value={profile.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>{t('settings_primary_phone')}</label>
                  <input 
                    type="text" 
                    value={profile.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: 'fit-content', padding: '0.6rem 1.5rem', marginTop: '1rem', marginLeft: 'auto' }}>
                {t('settings_save_registry')}
              </button>
            </form>
          )}

          {/* Tab 2: Appearance & Branding */}
          {activeTab === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>{t('settings_appearance_title')}</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9rem' }}>{t('settings_dark_theme')}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('settings_dark_theme_desc')}</span>
                  </div>
                  <button onClick={toggleDarkMode} className="btn btn-outline" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isDarkMode ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="5"/>
                          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                        </svg>
                        <span>{t('switch_light_mode', 'Switch Light Mode')}</span>
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                        </svg>
                        <span>{t('switch_dark_mode', 'Switch Dark Mode')}</span>
                      </span>
                    )}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9rem' }}>{t('settings_language_pref')}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('settings_language_pref_desc')}</span>
                  </div>
                  <select 
                    value={i18n.language} 
                    onChange={(e) => {
                      i18n.changeLanguage(e.target.value);
                      localStorage.setItem('language', e.target.value);
                    }}
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer', minWidth: '150px' }}
                  >
                    <option value="en">🇬🇧 English (UK)</option>
                    <option value="hi">🇮🇳 हिंदी (Hindi)</option>
                    <option value="ta">🇮🇳 தமிழ் (Tamil)</option>
                    <option value="ml">🇮🇳 മലയാളം (Malayalam)</option>
                    <option value="kn">🇮🇳 ಕನ್ನಡ (Kannada)</option>
                  </select>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>{t('settings_branding')}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.9rem' }}>{t('settings_upload_logo')}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('settings_upload_logo_desc')}</span>
                    </div>
                    <button className="btn btn-outline" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }} onClick={() => alert(t('settings_branding_alert'))}>{t('settings_upload_svg')}</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Security & 2FA */}
          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>{t('settings_2fa')}</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9rem' }}>{t('settings_enable_otp')}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('settings_enable_otp_desc')}</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={twoFactorEnabled} 
                    disabled
                    style={{ width: '42px', height: '20px', cursor: 'not-allowed', opacity: 0.5 }}
                  />
                  <span style={{ fontSize: '0.675rem', color: 'var(--text-tertiary)', display: 'block', marginTop: '0.25rem' }}>{t('settings_coming_soon_otp')}</span>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>{t('settings_sessions')}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '1rem', lineHeight: '1.5' }}>
                  {t('settings_sessions_desc')}
                </p>
              </div>
            </div>
          )}

          {/* Tab 4: AI & Automation Rules */}
          {activeTab === 'automation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>{t('settings_ai_parsing')}</h3>
              
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>{t('settings_confidence_threshold')}: {aiConfig.confidenceThreshold}%</label>
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
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>{t('settings_confidence_desc')}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.9rem' }}>{t('settings_auto_approve')}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('settings_auto_approve_desc')}</span>
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
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.375rem' }}>{t('settings_reminder_schedule')}</label>
                <select 
                  value={aiConfig.reminderSchedule} 
                  onChange={(e) => {
                    setAiConfig({ ...aiConfig, reminderSchedule: e.target.value });
                    setIsDirty(true);
                  }}
                  style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="5days_before">{t('settings_reminder_5d')}</option>
                  <option value="3days_before">{t('settings_reminder_3d')}</option>
                  <option value="1day_before">{t('settings_reminder_1d')}</option>
                </select>
              </div>

              <button onClick={handleSaveAiRules} className="btn btn-primary" style={{ width: 'fit-content', marginLeft: 'auto', padding: '0.5rem 1rem' }}>
                {t('settings_save_ai_rules')}
              </button>
            </div>
          )}

          {/* Tab 5: API Access & Integrations */}
          {activeTab === 'api' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>{t('settings_api_tokens')}</h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.25rem' }}>
                  <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '1.5rem 1rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    {t('settings_api_access')}
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>{t('settings_integrations')}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1.25rem', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyBetween: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <div>
                      <strong>{t('settings_tally')}</strong>
                      <span style={{ display: 'block', fontSize: '0.675rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>{t('settings_tally_desc')}</span>
                    </div>
                    <button disabled className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.725rem', alignSelf: 'center', opacity: 0.5, cursor: 'not-allowed' }}>{t('coming_soon')}</button>
                  </div>
                  <div style={{ display: 'flex', justifyBetween: 'space-between' }}>
                    <div>
                      <strong>{t('settings_zoho')}</strong>
                      <span style={{ display: 'block', fontSize: '0.675rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>{t('settings_zoho_desc')}</span>
                    </div>
                    <button disabled className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.725rem', alignSelf: 'center', opacity: 0.5, cursor: 'not-allowed' }}>{t('coming_soon')}</button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

export default Settings;
