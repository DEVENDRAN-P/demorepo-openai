import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/config';
import Navbar from '../components/Navbar';
import { useDarkMode } from '../context/DarkModeContext';
import { db } from '../config/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

function Settings({ user }) {
    const { t } = useTranslation();
    const { isDarkMode } = useDarkMode();
    const [settings, setSettings] = useState({
        emailNotifications: true,
        billingReminders: true,
        gstFilingReminders: true,
        invoiceReminders: true,
        businessType: 'retail',
        currency: 'INR',
        financialYear: 'april-march',
        language: 'en',
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        loadSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const loadSettings = async () => {
        if (!user?.uid) return;
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().settings) {
                const loadedSettings = userDoc.data().settings;
                setSettings(loadedSettings);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    const handleToggle = (key) => {
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSelectChange = (key, value) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));
        // If language changed, update i18n immediately
        if (key === 'language') {
            i18n.changeLanguage(value);
            localStorage.setItem('language', value);
        }
    };

    const handleSaveSettings = async () => {
        setLoading(true);
        try {
            const userRef = doc(db, 'users', user.uid);

            // Try to update, if fails then set
            try {
                await updateDoc(userRef, {
                    settings: settings,
                });
            } catch (error) {
                if (error.code === 'not-found') {
                    await setDoc(userRef, {
                        settings: settings,
                    }, { merge: true });
                } else {
                    throw error;
                }
            }

            setMessage('✅ ' + t('settings_saved'));
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error saving settings:', error);
            setMessage('❌ ' + t('error_saving_settings'));
            setTimeout(() => setMessage(''), 3000);
        } finally {
            setLoading(false);
        }
    };

    const bgColor = isDarkMode ? '#1a1a1a' : '#f8fafc';
    const cardBg = isDarkMode ? '#2d2d2d' : '#ffffff';
    const textColor = isDarkMode ? '#ffffff' : '#1f2937';
    const textSecondary = isDarkMode ? '#b0b0b0' : '#6b7280';
    const borderColor = isDarkMode ? '#404040' : '#e5e7eb';
    const accentColor = 'var(--primary-600)';

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: bgColor,
            color: textColor,
            transition: 'background-color 0.3s ease, color 0.3s ease',
        }}>
            <Navbar user={user} />

            <div style={{
                maxWidth: '1100px',
                margin: '0 auto',
                padding: '2rem 1rem',
                marginTop: '2rem',
            }}>
                {/* Header */}
                <div style={{
                    marginBottom: '3rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '12px',
                        background: `linear-gradient(135deg, ${accentColor} 0%, #764ba2 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '24px',
                        fontFamily: 'Material Icons',
                    }}>
                        <span style={{ fontFamily: 'Material Icons' }}>settings</span>
                    </div>
                    <div>
                        <h1 style={{
                            fontSize: '2.5rem',
                            fontWeight: '800',
                            margin: '0 0 0.25rem 0',
                            color: textColor,
                        }}>
                            {t('settings')}
                        </h1>
                        <p style={{
                            fontSize: '0.95rem',
                            color: textSecondary,
                            margin: '0',
                        }}>
                            {t('customize_preferences')}
                        </p>
                    </div>
                </div>

                {message && (
                    <div style={{
                        background: message.includes('✅')
                            ? isDarkMode ? '#1e5631' : '#d1fae5'
                            : isDarkMode ? '#5a1f1f' : '#fee2e2',
                        color: message.includes('✅')
                            ? isDarkMode ? '#90ee90' : '#065f46'
                            : isDarkMode ? '#ff6b6b' : '#991b1b',
                        padding: '1rem 1.25rem',
                        borderRadius: '0.75rem',
                        marginBottom: '2rem',
                        fontSize: '0.95rem',
                        border: `1px solid ${message.includes('✅') ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                    }}>
                        <span style={{ fontSize: '1.25rem' }}>
                            {message.includes('✅') ? '✓' : '!'}
                        </span>
                        {message}
                    </div>
                )}

                <div style={{
                    display: 'grid',
                    gap: '2rem',
                }}>
                    {/* Notifications Section */}
                    <div style={{
                        background: cardBg,
                        borderRadius: '1rem',
                        padding: '2rem',
                        border: `1px solid ${borderColor}`,
                        boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            marginBottom: '2rem',
                        }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '10px',
                                background: 'rgba(102, 126, 234, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: accentColor,
                                fontSize: '24px',
                                fontFamily: 'Material Icons',
                            }}>
                                <span style={{ fontFamily: 'Material Icons' }}>notifications</span>
                            </div>
                            <h2 style={{
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                margin: '0',
                                color: textColor,
                            }}>
                                {t('notifications')}
                            </h2>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {/* Email Notifications */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '1.25rem 1.5rem',
                                background: isDarkMode ? '#1f1f1f' : '#f9fafb',
                                borderRadius: '0.75rem',
                                border: `1px solid ${borderColor}`,
                                transition: 'all 0.3s ease',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '8px',
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#3b82f6',
                                        fontFamily: 'Material Icons',
                                    }}>
                                        <span style={{ fontFamily: 'Material Icons' }}>mail</span>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '600', color: textColor, marginBottom: '0.25rem' }}>
                                            {t('email_notifications')}
                                        </div>
                                        <p style={{ fontSize: '0.85rem', color: textSecondary, margin: '0' }}>
                                            {t('enable_notifications_info')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleToggle('emailNotifications')}
                                    style={{
                                        width: '56px',
                                        height: '32px',
                                        borderRadius: '16px',
                                        border: 'none',
                                        background: settings.emailNotifications ? accentColor : '#d1d5db',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        transition: 'background 0.3s ease',
                                        boxShadow: settings.emailNotifications ? '0 2px 8px var(--primary-600)' : 'none',
                                    }}
                                >
                                    <div style={{
                                        position: 'absolute',
                                        top: '3px',
                                        left: settings.emailNotifications ? '28px' : '3px',
                                        width: '26px',
                                        height: '26px',
                                        borderRadius: '50%',
                                        background: 'white',
                                        transition: 'left 0.3s ease',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    }} />
                                </button>
                            </div>

                            {/* Conditional Notification Options */}
                            {settings.emailNotifications && (
                                <>
                                    {[
                                        { key: 'billingReminders', label: t('billing_reminders'), icon: 'payment', color: '#f59e0b' },
                                        { key: 'gstFilingReminders', label: t('gst_filing_reminders'), icon: 'description', color: '#3b82f6' },
                                        { key: 'invoiceReminders', label: t('invoice_reminders'), icon: 'receipt', color: '#10b981' },
                                    ].map(({ key, label, icon, color }) => (
                                        <div key={key} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '1.25rem 1.5rem 1.25rem calc(4rem + 1.5rem)',
                                            background: isDarkMode ? '#1f1f1f' : '#f9fafb',
                                            borderRadius: '0.75rem',
                                            border: `1px solid ${borderColor}`,
                                            transition: 'all 0.3s ease',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '6px',
                                                    background: `rgba(${color === '#f59e0b' ? '245, 158, 11' : color === '#3b82f6' ? '59, 130, 246' : '16, 185, 129'}, 0.1)`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: color,
                                                    fontFamily: 'Material Icons',
                                                    fontSize: '18px',
                                                }}>
                                                    <span style={{ fontFamily: 'Material Icons' }}>{icon}</span>
                                                </div>
                                                <div style={{ fontWeight: '500', color: textColor }}>
                                                    {label}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleToggle(key)}
                                                style={{
                                                    width: '52px',
                                                    height: '28px',
                                                    borderRadius: '14px',
                                                    border: 'none',
                                                    background: settings[key] ? accentColor : '#d1d5db',
                                                    cursor: 'pointer',
                                                    position: 'relative',
                                                    transition: 'background 0.3s ease',
                                                    boxShadow: settings[key] ? '0 2px 6px var(--primary-600)' : 'none',
                                                }}
                                            >
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '2px',
                                                    left: settings[key] ? '26px' : '2px',
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    background: 'white',
                                                    transition: 'left 0.3s ease',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                }} />
                                            </button>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Business Settings Section */}
                    <div style={{
                        background: cardBg,
                        borderRadius: '1rem',
                        padding: '2rem',
                        border: `1px solid ${borderColor}`,
                        boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            marginBottom: '2rem',
                        }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '10px',
                                background: 'rgba(251, 146, 60, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fb923c',
                                fontSize: '24px',
                                fontFamily: 'Material Icons',
                            }}>
                                <span style={{ fontFamily: 'Material Icons' }}>business</span>
                            </div>
                            <h2 style={{
                                fontSize: '1.5rem',
                                fontWeight: '700',
                                margin: '0',
                                color: textColor,
                            }}>
                                {t('business_settings')}
                            </h2>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '1.5rem',
                        }}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontWeight: '600',
                                    marginBottom: '0.75rem',
                                    fontSize: '0.9rem',
                                    color: textColor,
                                }}>
                                    {t('business_type')}
                                </label>
                                <select
                                    value={settings.businessType}
                                    onChange={(e) => handleSelectChange('businessType', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        border: `1px solid ${borderColor}`,
                                        borderRadius: '0.5rem',
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                        backgroundColor: isDarkMode ? '#1f1f1f' : '#f9fafb',
                                        color: textColor,
                                        transition: 'all 0.3s ease',
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = accentColor;
                                        e.target.style.boxShadow = `0 0 0 3px rgba(102, 126, 234, 0.1)`;
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = borderColor;
                                        e.target.style.boxShadow = 'none';
                                    }}
                                >
                                    <option value="retail">{t('retail')}</option>
                                    <option value="wholesale">{t('wholesale')}</option>
                                    <option value="manufacturing">{t('manufacturing')}</option>
                                    <option value="service">{t('service')}</option>
                                    <option value="online">{t('online')}</option>
                                </select>
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    fontWeight: '600',
                                    marginBottom: '0.75rem',
                                    fontSize: '0.9rem',
                                    color: textColor,
                                }}>
                                    {t('currency')}
                                </label>
                                <select
                                    value={settings.currency}
                                    disabled
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        border: `1px solid ${borderColor}`,
                                        borderRadius: '0.5rem',
                                        fontSize: '0.95rem',
                                        cursor: 'not-allowed',
                                        backgroundColor: isDarkMode ? '#1f1f1f' : '#f9fafb',
                                        color: textColor,
                                        transition: 'all 0.3s ease',
                                    }}
                                >
                                    <option value="INR">{t('inr')}</option>
                                </select>
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    fontWeight: '600',
                                    marginBottom: '0.75rem',
                                    fontSize: '0.9rem',
                                    color: textColor,
                                }}>
                                    {t('financial_year')}
                                </label>
                                <select
                                    value={settings.financialYear}
                                    onChange={(e) => handleSelectChange('financialYear', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        border: `1px solid ${borderColor}`,
                                        borderRadius: '0.5rem',
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                        backgroundColor: isDarkMode ? '#1f1f1f' : '#f9fafb',
                                        color: textColor,
                                        transition: 'all 0.3s ease',
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = accentColor;
                                        e.target.style.boxShadow = `0 0 0 3px rgba(102, 126, 234, 0.1)`;
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = borderColor;
                                        e.target.style.boxShadow = 'none';
                                    }}
                                >
                                    <option value="april-march">{t('april_march')}</option>
                                    <option value="jan-dec">{t('jan_dec')}</option>
                                    <option value="fiscal-custom">{t('custom_fiscal')}</option>
                                </select>
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    fontWeight: '600',
                                    marginBottom: '0.75rem',
                                    fontSize: '0.9rem',
                                    color: textColor,
                                }}>
                                    {t('language')}
                                </label>
                                <select
                                    value={settings.language}
                                    onChange={(e) => handleSelectChange('language', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        border: `1px solid ${borderColor}`,
                                        borderRadius: '0.5rem',
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                        backgroundColor: isDarkMode ? '#1f1f1f' : '#f9fafb',
                                        color: textColor,
                                        transition: 'all 0.3s ease',
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = accentColor;
                                        e.target.style.boxShadow = `0 0 0 3px rgba(102, 126, 234, 0.1)`;
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = borderColor;
                                        e.target.style.boxShadow = 'none';
                                    }}
                                >
                                    <option value="en">{t('english')}</option>
                                    <option value="hi">{t('hindi')}</option>
                                    <option value="ta">{t('tamil')}</option>
                                    <option value="ml">{t('malayalam')}</option>
                                    <option value="kn">{t('kannada')}</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginTop: '3rem',
                    paddingTop: '2rem',
                }}>
                    <button
                        onClick={handleSaveSettings}
                        disabled={loading}
                        style={{
                            background: loading ? '#9ca3af' : `linear-gradient(135deg, ${accentColor} 0%, #764ba2 100%)`,
                            color: 'white',
                            padding: '1rem 3rem',
                            fontSize: '1.05rem',
                            fontWeight: '700',
                            border: 'none',
                            borderRadius: '0.75rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: loading ? 'none' : '0 6px 20px rgba(102, 126, 234, 0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            opacity: loading ? 0.6 : 1,
                            transform: loading ? 'scale(0.98)' : 'scale(1)',
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) {
                                e.currentTarget.style.boxShadow = '0 8px 30px rgba(102, 126, 234, 0.5)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!loading) {
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.35)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }
                        }}
                    >
                        <span style={{ fontFamily: 'Material Icons', fontSize: '20px' }}>
                            {loading ? 'hourglass_empty' : 'check_circle'}
                        </span>
                        {loading ? t('saving') : t('save_settings')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Settings;
