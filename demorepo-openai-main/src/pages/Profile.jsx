import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { getRecentWorkspaceActivity } from '../services/firebaseDataService';
import { validateGSTNumber, validatePhone } from '../utils/validators';

/* ============================================================
   Icons (Lucide-style inline SVGs — matches existing codebase)
   ============================================================ */

const Icon = ({ children, size = 18, strokeWidth = 2, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

const CameraIcon = (p) => (
  <Icon {...p}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </Icon>
);

const TrashIcon = (p) => (
  <Icon {...p}>
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </Icon>
);

const UserIcon = (p) => (
  <Icon {...p}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Icon>
);

const BuildingIcon = (p) => (
  <Icon {...p}>
    <rect width="16" height="20" x="4" y="2" rx="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01" />
    <path d="M16 6h.01" />
    <path d="M12 6h.01" />
    <path d="M12 10h.01" />
    <path d="M12 14h.01" />
    <path d="M16 10h.01" />
    <path d="M16 14h.01" />
    <path d="M8 10h.01" />
    <path d="M8 14h.01" />
  </Icon>
);

const MailIcon = (p) => (
  <Icon {...p}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </Icon>
);

const PhoneIcon = (p) => (
  <Icon {...p}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </Icon>
);

const HashIcon = (p) => (
  <Icon {...p}>
    <line x1="4" x2="20" y1="9" y2="9" />
    <line x1="4" x2="20" y1="15" y2="15" />
    <line x1="10" x2="8" y1="3" y2="21" />
    <line x1="16" x2="14" y1="3" y2="21" />
  </Icon>
);

const CreditCardIcon = (p) => (
  <Icon {...p}>
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </Icon>
);

const ClockIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </Icon>
);

const GlobeIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </Icon>
);

const LightbulbIcon = (p) => (
  <Icon {...p}>
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6" />
    <path d="M10 22h4" />
  </Icon>
);

const LockIcon = (p) => (
  <Icon {...p}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Icon>
);

const CheckCircleIcon = (p) => (
  <Icon {...p}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </Icon>
);

const AlertCircleIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </Icon>
);

const HistoryIcon = (p) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </Icon>
);

const BotIcon = (p) => (
  <Icon {...p}>
    <rect x="4" y="8" width="16" height="12" rx="2" />
    <path d="M12 8V4" />
    <circle cx="12" cy="3" r="1" />
    <path d="M8 14h.01M16 14h.01" />
  </Icon>
);

const UploadIcon = (p) => (
  <Icon {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" x2="12" y1="3" y2="15" />
  </Icon>
);

const FileTextIcon = (p) => (
  <Icon {...p}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M10 9H8" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </Icon>
);

const SaveIcon = (p) => (
  <Icon {...p}>
    <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
    <path d="M7 3v4a1 1 0 0 0 1 1h7" />
  </Icon>
);

const PenLineIcon = (p) => (
  <Icon {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Icon>
);

const ShieldCheckIcon = (p) => (
  <Icon {...p}>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </Icon>
);

/* ============================================================
   Profile Page — GST Buddy AI (uses App.css .profile-* system)
   ============================================================ */

function Profile({ user }) {
  const { t, i18n } = useTranslation();
  const { setUser } = useAuth(); // setUser comes from AuthContext (fix: was an undefined prop)
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const isOnboarding = searchParams.get('onboarding') === 'true';
  const fileInputRef = useRef(null);
  const formRef = useRef(null); // used by the header 'Edit Profile' action

  const [profilePic, setProfilePic] = useState(user?.profilePic || null);
  const [previewPic, setPreviewPic] = useState(user?.profilePic || null);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }
  // Save action state derived from the real API outcome: 'idle' | 'saving' | 'success' | 'error'
  const [saveState, setSaveState] = useState('idle');

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    shopName: user?.shopName || '',
    gstin: user?.gstin || '',
    address: user?.address || '',
    mobileNumber: user?.mobileNumber || '',
    language: i18n.language,
  });

  const [errors, setErrors] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState(false);

  /* ---- Recent Workspace: REAL data aggregated from the authenticated user's
     Firestore collections (users/{uid}/bills, documents, agentRuns,
     activityLogs). No demo/mock/seeded data — the service only reads the
     currently authenticated user's own records. ---- */
  useEffect(() => {
    let mounted = true;
    setActivityLoading(true);
    setActivityError(false);
    getRecentWorkspaceActivity(5)
      .then((items) => {
        if (mounted) setRecentActivity(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (mounted) setActivityError(true);
      })
      .finally(() => {
        if (mounted) setActivityLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  /* ---- Auto-dismiss alert ---- */
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  /* ---- Helpers ---- */
  /* Milliseconds for a Firestore Timestamp or ISO/date string; 0 if missing. */
  const tsToMs = (ts) => {
    if (!ts) return 0;
    try {
      const d = ts?.toDate ? ts.toDate() : new Date(ts);
      const ms = d.getTime();
      return Number.isNaN(ms) ? 0 : ms;
    } catch {
      return 0;
    }
  };

  const formatTimestamp = (ts) => {
    const ms = tsToMs(ts);
    if (!ms) return '';
    const d = new Date(ms);
    const today = new Date();
    const dateLabel = d.toDateString() === today.toDateString()
      ? t('today')
      : d.toLocaleDateString();
    return `${dateLabel}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  /* ---- Profile photo ---- */
  const handleProfilePicChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: t('profile_error_file_type') });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: t('profile_error_file_size') });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewPic(reader.result);
      setProfilePic(reader.result);
      setSaveState('idle');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveProfilePic = () => {
    setProfilePic(null);
    setPreviewPic(null);
    setSaveState('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ---- Form ---- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    setSaveState('idle');
  };

  /* ---- Discard unsaved edits and revert to the last saved values ---- */
  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      shopName: user?.shopName || '',
      gstin: user?.gstin || '',
      address: user?.address || '',
      mobileNumber: user?.mobileNumber || '',
      language: user?.language || i18n.language,
    });
    setErrors({});
    setMessage(null);
    setSaveState('idle');
    setPreviewPic(user?.profilePic || null);
    setProfilePic(user?.profilePic || null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = () => {
    const nextErrors = {};
    if (!formData.name?.trim()) nextErrors.name = t('profile_error_name_required');
    if (!formData.shopName?.trim()) nextErrors.shopName = t('profile_error_shop_required');
    if (!formData.gstin?.trim()) {
      nextErrors.gstin = t('profile_error_gstin_required');
    } else if (!validateGSTNumber(formData.gstin)) {
      nextErrors.gstin = t('profile_error_gstin_invalid');
    }
    if (formData.mobileNumber && !validatePhone(formData.mobileNumber)) {
      nextErrors.mobileNumber = t('profile_error_mobile_invalid');
    }
    return nextErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setMessage({ type: 'error', text: t('profile_fix_highlighted_fields', 'Please fix the highlighted errors before saving.') });
      // Form-level error mapping: scroll smoothly to the first invalid field and focus it
      setTimeout(() => {
        const firstError = formRef.current?.querySelector('[aria-invalid="true"]') || document.querySelector('.profile-input-invalid');
        if (firstError) {
          firstError.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
          firstError.focus({ preventScroll: true });
        }
      }, 50);
      return;
    }

    setSaveState('saving');
    try {
      const updatedUser = { ...user, ...formData, profilePic };

      // Save to Firestore if user has uid (contract unchanged)
      if (user?.uid) {
        await setDoc(
          doc(db, 'users', user.uid),
          {
            name: formData.name,
            shopName: formData.shopName,
            gstin: formData.gstin,
            address: formData.address,
            mobileNumber: formData.mobileNumber,
            profilePic: profilePic,
            language: formData.language,
            email: user.email,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      }

      // Save to localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser); // now works via context
      i18n.changeLanguage(formData.language);
      localStorage.setItem('language', formData.language);

      setSaveState('success');
      setMessage({ type: 'success', text: t('profile_updated') });
      if (isOnboarding) {
        setTimeout(() => {
          navigate('/dashboard');
        }, 1200);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setSaveState('error');
      setMessage({ type: 'error', text: t('profile_update_error') });
    }
  };

  // Human-friendly save button label derived from real save state
  const saveLabel =
    saveState === 'saving' ? t('saving') :
    saveState === 'success' ? t('changes_saved') :
    saveState === 'error' ? t('unable_save') :
    t('save_changes');

  const planTier = (localStorage.getItem('saas_active_plan') || 'Free').toUpperCase();

  const lastAuthenticated = formatTimestamp(user?.lastLogin);

  /* ============================================================
     Render
     ============================================================ */
  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* ---- Page header ---- */}
        <div className="profile-page-header">
          <div>
            <h1>{t('profile')}</h1>
            <p>{t('profile_manage_subtitle')}</p>
          </div>
          <button
            type="button"
            className="profile-btn profile-btn-secondary"
            onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            <PenLineIcon size={15} />
            {t('edit_profile')}
          </button>
        </div>

        {/* Onboarding Banner Alert */}
        {isOnboarding && (
          <div style={{
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textAlign: 'left',
            color: 'var(--text-primary)'
          }}>
            <span style={{ fontSize: '1.5rem' }}>✨</span>
            <div>
              <strong style={{ display: 'block', fontSize: '0.95rem', marginBottom: '0.25rem', color: 'var(--theme-primary-light)' }}>{t('profile_welcome_title')}</strong>
              <span style={{ fontSize: '0.825rem', opacity: 0.9, lineHeight: '1.4' }}>
                {t('profile_welcome_desc')}
              </span>
            </div>
          </div>
        )}

        {/* ---- Alert ---- */}
        {message && (
          <div className={`profile-alert ${message.type}`} role="alert">
            {message.type === 'success' ? <CheckCircleIcon size={18} /> : <AlertCircleIcon size={18} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* ---- Summary card ---- */}
        <div className="profile-card profile-summary-card">
          <div className="profile-summary-left">
            <div className="profile-avatar-column">
              <div className="profile-avatar-wrap">
                <div
                  className="profile-avatar"
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  aria-label={previewPic ? t('update_profile_photo_aria') : t('add_profile_photo_aria')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                  }}
                >
                  {previewPic ? (
                    <img src={previewPic} alt="Profile" />
                  ) : (
                    <div className="profile-avatar-empty">
                      <CameraIcon size={20} />
                      <span>{t('add_photo')}</span>
                    </div>
                  )}
                  <div className="profile-avatar-overlay">
                    <CameraIcon size={16} />
                    <span>{t('update_photo')}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="profile-avatar-badge"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={t('upload_profile_photo_aria')}
                >
                  <CameraIcon size={13} />
                </button>
              </div>
              <div className="profile-avatar-actions">
                <button
                  type="button"
                  className="profile-avatar-link"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <CameraIcon size={14} />
                  {t('change_photo')}
                </button>
                {previewPic && (
                  <button type="button" className="profile-avatar-link profile-avatar-remove" onClick={handleRemoveProfilePic}>
                    <TrashIcon size={14} />
                    {t('remove')}
                  </button>
                )}
              </div>
            </div>

            <div className="profile-identity">
              <h2>{formData.name || t('user_profile')}</h2>
              <div className="profile-identity-role">{t('cfo_administrator')}</div>
              <div className="profile-business">
                <BuildingIcon size={14} />
                <span className="profile-business-name">{formData.shopName || t('your_shop')}</span>
              </div>
              <span className="profile-account-type">
                <ShieldCheckIcon size={13} />
                {t('gst_business_account')}
              </span>
            </div>
          </div>

          {/* Summary chips */}
          <div className="profile-summary-chips">
            <div className="profile-chip">
              <div className="profile-chip-icon"><MailIcon size={16} /></div>
              <div style={{ minWidth: 0 }}>
                <div className="profile-chip-label">{t('email')}</div>
                <div className="profile-chip-value">{formData.email || '—'}</div>
              </div>
            </div>
            <div className="profile-chip">
              <div className="profile-chip-icon"><PhoneIcon size={16} /></div>
              <div style={{ minWidth: 0 }}>
                <div className="profile-chip-label">{t('mobile_number')}</div>
                <div className="profile-chip-value">{formData.mobileNumber || t('not_configured')}</div>
              </div>
            </div>
            <div className="profile-chip">
              <div className="profile-chip-icon"><HashIcon size={16} /></div>
              <div style={{ minWidth: 0 }}>
                <div className="profile-chip-label">{t('gstin')}</div>
                <div className="profile-chip-value">{formData.gstin || t('not_registered')}</div>
              </div>
            </div>
            <div className="profile-chip">
              <div className="profile-chip-icon"><CreditCardIcon size={16} /></div>
              <div style={{ minWidth: 0 }}>
                <div className="profile-chip-label">{t('saas_plan')}</div>
                <div className="profile-chip-value">{planTier} {t('tier')}</div>
              </div>
            </div>
            <div className="profile-chip">
              <div className="profile-chip-icon"><ClockIcon size={16} /></div>
              <div style={{ minWidth: 0 }}>
                <div className="profile-chip-label">{t('last_authenticated')}</div>
                <div className="profile-chip-value">{lastAuthenticated || '—'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleProfilePicChange}
          style={{ display: 'none' }}
        />

        {/* ---- Form grid ---- */}
        <form ref={formRef} className="profile-form-grid" onSubmit={handleSubmit} noValidate>
          {/* Personal Information */}
          <div className="profile-card profile-personal-card">
            <div className="profile-card-header">
              <div className="profile-card-title-icon"><UserIcon size={18} /></div>
                <div>
                  <div className="profile-card-title">{t('personal_information')}</div>
                  <div className="profile-card-subtitle">{t('manage_account_contact')}</div>
                </div>
              </div>

              <div className="profile-field">
                <label className="profile-field-label" htmlFor="profile-name">
                  {t('full_name')} <span className="profile-field-required">*</span>
                </label>
                <div className="profile-input-wrap">
                  <span className="profile-input-icon"><UserIcon size={16} /></span>
                  <input
                    id="profile-name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={t('placeholder_full_name')}
                    className={errors.name ? 'profile-input-invalid' : ''}
                    aria-invalid={errors.name ? true : undefined}
                    aria-describedby={errors.name ? 'profile-name-error' : undefined}
                    required
                  />
                </div>
                {errors.name && (
                  <div className="profile-input-error" id="profile-name-error">
                    <AlertCircleIcon size={13} />
                    {errors.name}
                  </div>
                )}
              </div>

              <div className="profile-field">
                <label className="profile-field-label" htmlFor="profile-email">
                  {t('email_address')} <span className="profile-field-required">*</span>
                  <span className="profile-readonly-pill"><LockIcon size={11} /> {t('read_only')}</span>
                </label>
                <div className="profile-input-wrap has-lock">
                  <span className="profile-input-icon"><MailIcon size={16} /></span>
                  <input
                    id="profile-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    readOnly
                    tabIndex={-1}
                    aria-readonly="true"
                    title={t('email_readonly')}
                    className="profile-input-disabled"
                  />
                  <span className="profile-input-lock"><LockIcon size={15} /></span>
                </div>
                <div className="profile-input-hint">
                  <LockIcon size={12} />
                  {t('email_readonly')}
                </div>
              </div>

              <div className="profile-field">
                <label className="profile-field-label" htmlFor="profile-mobile">
                  {t('mobile_number')}
                </label>
                <div className="profile-input-wrap">
                  <span className="profile-input-icon"><PhoneIcon size={16} /></span>
                  <input
                    id="profile-mobile"
                    type="tel"
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    placeholder={t('enter_mobile_number')}
                    className={errors.mobileNumber ? 'profile-input-invalid' : ''}
                    aria-invalid={errors.mobileNumber ? true : undefined}
                    aria-describedby={errors.mobileNumber ? 'profile-mobile-error' : undefined}
                  />
                </div>
                {errors.mobileNumber && (
                  <div className="profile-input-error" id="profile-mobile-error">
                    <AlertCircleIcon size={13} />
                    {errors.mobileNumber}
                  </div>
                )}
              </div>
            </div>

            {/* Business Information */}
            <div className="profile-card profile-business-card">
              <div className="profile-card-header">
                <div className="profile-card-title-icon"><BuildingIcon size={18} /></div>
                <div>
                  <div className="profile-card-title">{t('business_information')}</div>
                  <div className="profile-card-subtitle">{t('business_registered_info')}</div>
                </div>
              </div>

              <div className="profile-field">
                <label className="profile-field-label" htmlFor="profile-shop">
                  {t('business_shop_name')} <span className="profile-field-required">*</span>
                </label>
                <div className="profile-input-wrap">
                  <span className="profile-input-icon"><BuildingIcon size={16} /></span>
                  <input
                    id="profile-shop"
                    type="text"
                    name="shopName"
                    value={formData.shopName}
                    onChange={handleChange}
                    placeholder={t('your_business_name_placeholder')}
                    className={errors.shopName ? 'profile-input-invalid' : ''}
                    aria-invalid={errors.shopName ? true : undefined}
                    aria-describedby={errors.shopName ? 'profile-shop-error' : undefined}
                    required
                  />
                </div>
                {errors.shopName && (
                  <div className="profile-input-error" id="profile-shop-error">
                    <AlertCircleIcon size={13} />
                    {errors.shopName}
                  </div>
                )}
              </div>

              <div className="profile-field">
                <label className="profile-field-label" htmlFor="profile-gstin">
                  {t('gstin')} <span className="profile-field-required">*</span>
                </label>
                <div className="profile-input-wrap">
                  <span className="profile-input-icon"><HashIcon size={16} /></span>
                  <input
                    id="profile-gstin"
                    type="text"
                    name="gstin"
                    value={formData.gstin}
                    onChange={handleChange}
                    placeholder={t('placeholder_gstin')}
                    className={errors.gstin ? 'profile-input-invalid' : ''}
                    aria-invalid={errors.gstin ? true : undefined}
                    aria-describedby={errors.gstin ? 'profile-gstin-error' : undefined}
                    maxLength={15}
                    required
                  />
                </div>
                {errors.gstin ? (
                  <div className="profile-input-error" id="profile-gstin-error">
                    <AlertCircleIcon size={13} />
                    {errors.gstin}
                  </div>
                ) : (
                  <div className="profile-input-hint">
                    <ShieldCheckIcon size={12} />
                    {t('gstin_linked_hint')}
                  </div>
                )}
              </div>

              <div className="profile-field">
                <label className="profile-field-label" htmlFor="profile-address">
                  {t('business_address')}
                </label>
                <div className="profile-input-wrap">
                  <textarea
                    id="profile-address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder={t('enter_business_address')}
                    style={{ minHeight: '88px', resize: 'vertical' }}
                  />
                  <span className="profile-input-icon">
                    <BuildingIcon size={16} />
                  </span>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="profile-card profile-preferences-card">
              <div className="profile-card-header">
                <div className="profile-card-title-icon"><GlobeIcon size={18} /></div>
                <div>
                  <div className="profile-card-title">{t('preferences')}</div>
                  <div className="profile-card-subtitle">{t('customize_preferences')}</div>
                </div>
              </div>

              <div className="profile-field">
                <label className="profile-field-label" htmlFor="profile-language">
                  {t('language')}
                </label>
                <div className="profile-input-wrap">
                  <span className="profile-input-icon"><GlobeIcon size={16} /></span>
                  <select
                    id="profile-language"
                    name="language"
                    value={formData.language}
                    onChange={handleChange}
                  >
                    <option value="en">English</option>
                    <option value="ta">Tamil (தமிழ்)</option>
                    <option value="hi">Hindi (हिंदी)</option>
                    <option value="ml">Malayalam (മലയാളം)</option>
                    <option value="kn">Kannada (ಕನ್ನಡ)</option>
                  </select>
                </div>
                <div className="profile-input-hint">
                  <GlobeIcon size={12} />
                  {t('choose_language_hint')}
                </div>
              </div>
            </div>

            {/* ---- Recent Workspace ---- */}
            <div className="profile-card profile-activity-card">
              <div className="profile-card-header">
                <div className="profile-card-title-icon"><HistoryIcon size={18} /></div>
                <div>
                  <div className="profile-card-title">{t('recent_workspace_title')}</div>
                  <div className="profile-card-subtitle">{t('recent_workspace_subtitle')}</div>
                </div>
              </div>

              {activityLoading ? (
                <div className="profile-tip-text" style={{ padding: '0.5rem 0' }}>
                  {t('recent_workspace_loading')}
                </div>
              ) : activityError ? (
                <div className="profile-tip-text" style={{ padding: '0.5rem 0' }}>
                  {t('recent_workspace_error')}
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="profile-tip-text" style={{ padding: '0.5rem 0' }}>
                  {t('no_recent_activity')}<br />
                  {t('upload_first_invoice_workspace')}
                </div>
              ) : (
                <div>
                  {recentActivity.map((item, idx) => {
                    const isInvoice = item.kind === 'invoice';
                    const isAgent = item.kind === 'agent';
                    const isDocument = item.kind === 'document';
                    const isClickable = !!item.link;
                    const iconClass = isInvoice ? 'upload' : isAgent ? 'agent' : isDocument ? 'doc' : 'file';
                    const amountText = item.amount > 0
                      ? `₹${Number(item.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                      : '';
                    return (
                      <div
                        key={item.id || `${item.kind}-${idx}`}
                        className="profile-activity-item"
                        onClick={isClickable ? () => navigate(item.link) : undefined}
                        style={isClickable ? { cursor: 'pointer' } : undefined}
                        role={isClickable ? 'button' : undefined}
                        tabIndex={isClickable ? 0 : undefined}
                        onKeyDown={isClickable ? (e) => {
                          if (e.key === 'Enter') navigate(item.link);
                        } : undefined}
                      >
                        <div className={`profile-activity-icon ${iconClass}`}>
                          {isInvoice ? (
                            <UploadIcon size={16} />
                          ) : isAgent ? (
                            <BotIcon size={16} />
                          ) : isDocument ? (
                            <FileTextIcon size={16} />
                          ) : (
                            <ClockIcon size={16} />
                          )}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="profile-activity-desc">
                            {item.title}
                          </div>
                          <div className="profile-activity-detail">
                            {[item.subtitle, amountText].filter(Boolean).join(' · ')}
                          </div>
                          <div className="profile-activity-time">
                            {formatTimestamp(item.timestamp)}
                            {item.status ? ` · ${item.status}` : ''}
                          </div>
                        </div>
                        {isClickable ? (
                          <span style={{ color: 'var(--primary-600)', fontSize: '0.75rem' }}>→</span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Profile & GST Tips */}
            <div className="profile-card profile-tips-card">
              <div className="profile-card-header">
                <div className="profile-card-title-icon"><LightbulbIcon size={18} /></div>
                <div>
                  <div className="profile-card-title">{t('profile_gst_tips')}</div>
                  <div className="profile-card-subtitle">{t('keep_accurate')}</div>
                </div>
              </div>

              <div className="profile-tip-item">
                <div className="profile-tip-icon indigo"><BuildingIcon size={14} /></div>
                <div className="profile-tip-text">{t('tip_profile_updated')}</div>
              </div>
              <div className="profile-tip-item">
                <div className="profile-tip-icon violet"><ShieldCheckIcon size={14} /></div>
                <div className="profile-tip-text">{t('tip_gstin_important')}</div>
              </div>
              <div className="profile-tip-item">
                <div className="profile-tip-icon"><CameraIcon size={14} /></div>
                <div className="profile-tip-text">{t('tip_profile_pic')}</div>
              </div>
              <div className="profile-tip-item">
                <div className="profile-tip-icon"><GlobeIcon size={14} /></div>
                <div className="profile-tip-text">{t('tip_language_preference')}</div>
              </div>
            </div>

          {/* Save bar */}
          <div className="profile-save-bar-wrap">
            <div className="profile-save-bar">
              <span
                className={`profile-save-status ${saveState === 'success' ? 'success' : saveState === 'error' ? 'error' : ''}`}
                aria-live="polite"
              >
                {saveState === 'success' ? <CheckCircleIcon size={14} /> : null}
                {saveState === 'error' ? <AlertCircleIcon size={14} /> : null}
                {saveState === 'saving' ? t('saving_changes') : ''}
                {saveState === 'success' ? t('changes_saved') : ''}
                {saveState === 'error' ? t('unable_save') : ''}
                {saveState === 'idle' ? t('changes_saved_idle') : ''}
              </span>
              <button
                type="button"
                className="profile-btn profile-btn-secondary"
                onClick={handleCancel}
                disabled={saveState === 'saving'}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="profile-btn profile-btn-primary"
                disabled={saveState === 'saving'}
              >
                {saveState === 'saving' ? (
                  <span className="spinner spinner-inverse" style={{ width: 14, height: 14, borderWidth: 2 }} />
                ) : (
                  <SaveIcon size={16} />
                )}
                {saveLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Profile;
