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
  const [profileColor, setProfileColor] = useState(localStorage.getItem('profileColor') || 'indigo');

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
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage('❌ File size must be less than 5MB');
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
        : 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
      indigo: isDarkMode
        ? 'linear-gradient(135deg, #355c7d 0%, #2d5a7d 100%)'
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      amber: isDarkMode
        ? 'linear-gradient(135deg, #b45309 0%, #92400e 100%)'
        : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    };
    return colors[profileColor] || colors.indigo;
  };

  const getTextColor = () => {
    return profileColor === 'amber' ? '#1f2937' : 'white';
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
        <div style={{
          background: getProfileGradient(),
          borderRadius: '1rem',
          padding: '2rem',
          color: getTextColor(),
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ flex: '0 0 auto' }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: '3px solid rgba(255, 255, 255, 0.5)',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.border = '3px solid white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.border = '3px solid rgba(255, 255, 255, 0.5)';
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
                  gap: '0.25rem',
                }}>
                  <div style={{ fontSize: '2.5rem' }}>📸</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)' }}>Add Photo</div>
                </div>
              )}
              <div style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                background: 'rgba(0,0,0,0.5)',
                padding: '0.5rem',
                borderRadius: '50%',
                fontSize: '0.9rem',
              }}>
                📷
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePicChange}
              style={{ display: 'none' }}
            />
            {previewPic && (
              <button
                onClick={handleRemoveProfilePic}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ef4444';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                🗑️ Remove Picture
              </button>
            )}
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: 'bold',
              margin: '0 0 0.5rem 0',
            }}>
              {formData.name || 'User Profile'}
            </h1>
            <p style={{
              fontSize: '1.05rem',
              opacity: 0.9,
              margin: '0 0 0.75rem 0',
            }}>
              {formData.shopName || 'Your Shop'}
            </p>
            <div style={{
              display: 'flex',
              gap: '1.5rem',
              flexWrap: 'wrap',
            }}>
              <div>
                <p style={{ margin: '0 0 0.25rem 0', opacity: 0.8, fontSize: '0.85rem' }}>Email</p>
                <p style={{ margin: 0, fontWeight: '600' }}>{formData.email}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 0.25rem 0', opacity: 0.8, fontSize: '0.85rem' }}>GSTIN</p>
                <p style={{ margin: 0, fontWeight: '600' }}>{formData.gstin || 'Not listed'}</p>
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

        {/* Profile Color Selector */}
        <div style={{
          background: isDarkMode ? '#2a2a2a' : 'white',
          color: isDarkMode ? '#e5e7eb' : '#000',
          borderRadius: '1rem',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
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
            🎨 Profile Color Theme
          </h3>
          <div style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
          }}>
            {[
              { name: 'Teal', color: 'teal', bgColor: '#14b8a6' },
              { name: 'Indigo', color: 'indigo', bgColor: '#667eea' },
              { name: 'Amber', color: 'amber', bgColor: '#f59e0b' },
            ].map((option) => (
              <button
                key={option.color}
                onClick={() => {
                  setProfileColor(option.color);
                  localStorage.setItem('profileColor', option.color);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: profileColor === option.color ? '3px solid var(--primary-600)' : `2px solid ${option.bgColor}`,
                  background: option.bgColor,
                  color: option.color === 'amber' ? '#1f2937' : 'white',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: profileColor === option.color ? '600' : '500',
                  fontSize: '0.9rem',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {option.name}
              </button>
            ))}
          </div>
        </div>

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
            <span>✏️</span>
            Edit Profile Information
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
                <span>👤</span> Personal Information
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
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
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
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    placeholder="Enter your mobile number"
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
                <span>🏢</span> Business Information
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
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
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
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
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
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    placeholder="Enter your business address"
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
                <span>⚙️</span> Preferences
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
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
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
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                {loading ? '💾 Saving...' : '💾 Save Changes'}
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
            <span>💡</span> Pro Tips
          </h3>
          <ul style={{
            margin: 0,
            paddingLeft: '1.5rem',
            color: '#4338ca',
            lineHeight: '1.6',
            fontSize: '0.95rem',
          }}>
            <li>Keep your profile information up to date for accurate GST reports</li>
            <li>Your GSTIN is important for GST filing and cannot be easily changed</li>
            <li>Upload a professional profile picture for better identification</li>
            <li>Choose your preferred language to get all notifications in that language</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Profile;
