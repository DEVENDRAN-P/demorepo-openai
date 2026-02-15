import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import { db } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useDarkMode } from '../context/DarkModeContext';

function Profile({ user, setUser }) {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const fileInputRef = useRef(null);
  const [profilePic, setProfilePic] = useState(user?.profilePic || null);
  const [previewPic, setPreviewPic] = useState(user?.profilePic || null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [profileColor] = useState(localStorage.getItem('profileColor') || 'indigo');

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    shopName: user?.shopName || '',
    gstin: user?.gstin || '',
    address: user?.address || '',
    mobileNumber: user?.mobileNumber || '',
    language: i18n.language,
  });

  const handleProfilePicChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (JPG, JPEG, PNG only)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setMessage('❌ Only JPG, JPEG, and PNG files are allowed');
        setTimeout(() => setMessage(''), 3000);
        return;
      }

      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setMessage('❌ File size must be less than 2MB');
        setTimeout(() => setMessage(''), 3000);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewPic(reader.result);
        setProfilePic(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfilePic = () => {
    setProfilePic(null);
    setPreviewPic(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getProfileGradient = () => {
    const colors = {
      teal: isDarkMode
        ? 'linear-gradient(135deg, #0d6b6b 0%, #0a4d4d 100%)'
        : 'linear-gradient(135deg, var(--theme-secondary) 0%, var(--theme-secondary-dark) 100%)',
      indigo: isDarkMode
        ? 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)'
        : 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-primary-light) 100%)',
      amber: isDarkMode
        ? 'linear-gradient(135deg, #b45309 0%, #92400e 100%)'
        : 'linear-gradient(135deg, var(--theme-accent) 0%, var(--theme-accent-dark) 100%)',
    };
    return colors[profileColor] || colors.indigo;
  };

  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updatedUser = { ...user, ...formData, profilePic };

      // Save to Firestore if user has uid
      if (user?.uid) {
        await setDoc(doc(db, 'users', user.uid), {
          name: formData.name,
          shopName: formData.shopName,
          gstin: formData.gstin,
          address: formData.address,
          mobileNumber: formData.mobileNumber,
          profilePic: profilePic,
          language: formData.language,
          email: user.email,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }

      // Save to localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      i18n.changeLanguage(formData.language);
      localStorage.setItem('language', formData.language);

      setMessage('✅ Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('❌ Error updating profile');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: isDarkMode ? '#1a1a1a' : '#f3f4f6', color: isDarkMode ? '#e5e7eb' : '#000' }}>
      <Navbar user={user} />

      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '2rem 1rem',
        marginTop: '1rem',
      }}>
        {/* Profile Header Card */}
        <div 
          className="profile-card"
          style={{
            background: getProfileGradient(),
            borderRadius: '1rem',
            padding: '2rem',
            color: '#FFFFFF',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '2.5rem',
            flexWrap: 'wrap',
            boxShadow: 'var(--shadow-theme)',
          }}>
          <div style={{ flex: '0 0 auto' }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: '4px solid rgba(255, 255, 255, 0.6)',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
                e.currentTarget.style.border = '4px solid rgba(255, 255, 255, 0.9)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.border = '4px solid rgba(255, 255, 255, 0.6)';
              }}
            >
              {previewPic ? (
                <img
                  src={previewPic}
                  alt="Profile"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div style={{
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  width: '100%',
                  gap: '0.5rem',
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>Add Photo</div>
                </div>
              )}
              {/* Hover overlay with text */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.3s ease',
                borderRadius: '50%',
              }} className="profile-hover-overlay">
                <span style={{ color: 'white', fontWeight: '600', fontSize: '0.85rem' }}>Update Profile Photo</span>
              </div>
              {/* Camera edit icon overlay */}
              <div style={{
                position: 'absolute',
                bottom: '4px',
                right: '4px',
                background: 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-primary-light) 100%)',
                padding: '0.5rem',
                borderRadius: '50%',
                border: '2px solid white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-md)',
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleProfilePicChange}
              style={{ display: 'none' }}
            />
            {/* Change Photo and Remove buttons */}
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              marginTop: '1rem',
              justifyContent: 'center',
            }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '0.6rem 1.25rem',
                  background: 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-primary-light) 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  boxShadow: 'var(--shadow-lg)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-xl)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                }}
              >
                Change Photo
              </button>
              {previewPic && (
                <button
                  onClick={handleRemoveProfilePic}
                  style={{
                    padding: '0.6rem 1.25rem',
                    background: 'transparent',
                    color: '#fca5a5',
                    border: '1px solid #fca5a5',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fee2e2';
                    e.currentTarget.style.color = '#dc2626';
                    e.currentTarget.style.borderColor = '#dc2626';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#fca5a5';
                    e.currentTarget.style.borderColor = '#fca5a5';
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '250px', paddingLeft: '0.5rem' }} className="profile-info">
            <h1 className="profile-name" style={{
              fontSize: '1.875rem',
              fontWeight: 'bold',
              margin: '0 0 0.5rem 0',
              color: '#FFFFFF',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}>
              {formData.name || 'User Profile'}
            </h1>
            <p style={{
              fontSize: '1.1rem',
              opacity: 0.9,
              margin: '0 0 1rem 0',
              color: '#FFFFFF',
            }}>
              {formData.shopName || 'Your Shop'}
            </p>
            <div className="profile-details" style={{
              display: 'flex',
              gap: '2rem',
              flexWrap: 'wrap',
            }}>
              <div>
                <p style={{ margin: '0 0 0.25rem 0', opacity: 0.75, fontSize: '0.8rem', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</p>
                <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem', color: '#FFFFFF' }}>{formData.email}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 0.25rem 0', opacity: 0.75, fontSize: '0.8rem', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>GSTIN</p>
                <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem', color: '#FFFFFF' }}>{formData.gstin || 'Not listed'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div style={{
            background: message.includes('✅') ? '#d1fae5' : '#fee2e2',
            color: message.includes('✅') ? '#065f46' : '#991b1b',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
            border: `1px solid ${message.includes('✅') ? '#a7f3d0' : '#fca5a5'}`,
          }}>
            {message}
          </div>
        )}

        {/* Profile Form Card */}
        <div style={{
          background: isDarkMode ? '#2a2a2a' : 'white',
          color: isDarkMode ? '#e5e7eb' : '#000',
          borderRadius: '1rem',
          padding: '2rem 1.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: isDarkMode ? '#e5e7eb' : '#1f2937',
          }}>
            <span><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></span>
            {t('edit_profile_information')}
          </h2>

          <form onSubmit={handleSubmit} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}>
            {/* Personal Information Section */}
            <div>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '600',
                marginBottom: '1rem',
                color: isDarkMode ? '#d1d5db' : '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <span><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span> Personal Information
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem',
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: isDarkMode ? '#d1d5db' : '#374151',
                    marginBottom: '0.5rem',
                  }}>{t('Name')} *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: `1px solid ${isDarkMode ? '#444' : '#d1d5db'}`,
                      borderRadius: '0.375rem',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      background: isDarkMode ? '#3a3a3a' : '#fff',
                      color: isDarkMode ? '#e5e7eb' : '#000',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--theme-primary)'}
                    onBlur={(e) => e.target.style.borderColor = isDarkMode ? '#444' : '#d1d5db'}
                    required
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: isDarkMode ? '#d1d5db' : '#374151',
                    marginBottom: '0.5rem',
                  }}>{t('email')} *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: `1px solid ${isDarkMode ? '#444' : '#d1d5db'}`,
                      borderRadius: '0.375rem',
                      fontSize: '1rem',
                      background: isDarkMode ? '#3a3a3a' : '#f3f4f6',
                      color: isDarkMode ? '#9ca3af' : '#6b7280',
                      cursor: 'not-allowed',
                    }}
                  />
                  <p style={{ fontSize: '0.75rem', color: isDarkMode ? '#9ca3af' : '#9ca3af', margin: '0.25rem 0 0 0' }}>
                    Email cannot be changed
                  </p>
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: isDarkMode ? '#d1d5db' : '#374151',
                    marginBottom: '0.5rem',
                  }}>{t('mobile_number')}</label>
                  <input
                    type="tel"
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--theme-primary)'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    placeholder={t('enter_mobile_number')}
                  />
                </div>
              </div>
            </div>

            {/* Business Information Section */}
            <div style={{
              borderTop: '1px solid #e5e7eb',
              paddingTop: '1.5rem',
            }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '600',
                marginBottom: '1rem',
                color: isDarkMode ? '#d1d5db' : '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <span><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg></span> Business Information
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem',
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: isDarkMode ? '#d1d5db' : '#374151',
                    marginBottom: '0.5rem',
                  }}>{t('shop_name')} *</label>
                  <input
                    type="text"
                    name="shopName"
                    value={formData.shopName}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--theme-primary)'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    required
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: isDarkMode ? '#d1d5db' : '#374151',
                    marginBottom: '0.5rem',
                  }}>{t('gstin')} *</label>
                  <input
                    type="text"
                    name="gstin"
                    value={formData.gstin}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--theme-primary)'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    required
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: isDarkMode ? '#d1d5db' : '#374151',
                    marginBottom: '0.5rem',
                  }}>Shop Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      minHeight: '100px',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--theme-primary)'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    placeholder={t('enter_business_address')}
                  />
                </div>
              </div>
            </div>

            {/* Preferences Section */}
            <div style={{
              borderTop: '1px solid #e5e7eb',
              paddingTop: '1.5rem',
            }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '600',
                marginBottom: '1rem',
                color: isDarkMode ? '#d1d5db' : '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <span><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span> Preferences
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem',
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: isDarkMode ? '#d1d5db' : '#374151',
                    marginBottom: '0.5rem',
                  }}>{t('language')}</label>
                  <select
                    name="language"
                    value={formData.language}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--theme-primary)'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  >
                    <option value="en">🇬🇧 English</option>
                    <option value="ta">🇮🇳 Tamil (தமிழ்)</option>
                    <option value="hi">🇮🇳 Hindi (हिंदी)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              paddingTop: '1.5rem',
              borderTop: '1px solid #e5e7eb',
            }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-primary-light) 100%)',
                  color: 'white',
                  padding: '0.875rem 2.5rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  width: '100%',
                  maxWidth: '350px',
                  minHeight: '48px',
                  opacity: loading ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.boxShadow = '0 6px 25px rgba(102, 126, 234, 0.6)';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {loading ? ' Saving...' : ' Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Tips Card */}
        <div style={{
          marginTop: '2rem',
          background: '#f0f4ff',
          border: '1px solid #c7d2fe',
          borderRadius: '0.75rem',
          padding: '1.5rem',
        }}>
          <h3 style={{
            fontSize: '1rem',
            fontWeight: '600',
            marginBottom: '0.75rem',
            color: '#4338ca',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span>💡</span> {t('pro_tips')}
          </h3>
          <ul style={{
            margin: 0,
            paddingLeft: '1.5rem',
            color: '#4338ca',
            lineHeight: '1.6',
            fontSize: '0.95rem',
          }}>
            <li>{t('tip_profile_updated')}</li>
            <li>{t('tip_gstin_important')}</li>
            <li>{t('tip_profile_pic')}</li>
            <li>{t('tip_language_preference')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Profile;
