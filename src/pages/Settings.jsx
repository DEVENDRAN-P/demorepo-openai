import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import { db } from '../config/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

function Settings({ user }) {
    const { t } = useTranslation();
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
    const [initialSettings, setInitialSettings] = useState({});

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
                setInitialSettings(loadedSettings);
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

            setInitialSettings(settings);
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

    const bgColor = settings.darkMode ? '#2d2d2d' : 'white';
    const textColor = settings.darkMode ? '#ffffff' : '#000000';
    const borderColor = settings.darkMode ? '#444444' : '#e5e7eb';
    const bgLight = settings.darkMode ? '#1f1f1f' : '#f9fafb';
    const textSecondary = settings.darkMode ? '#b0b0b0' : '#6b7280';

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: settings.darkMode ? '#1a1a1a' : '#f5f5f5',
            color: textColor,
            transition: 'background-color 0.3s ease, color 0.3s ease',
        }}>
            <Navbar user={user} />

            <div style={{
                maxWidth: '1000px',
                margin: '0 auto',
                padding: '2rem 1rem',
                marginTop: '2rem',
            }}>
                <div style={{
                    background: bgColor,
                    borderRadius: '0.75rem',
                    padding: '2rem 1.5rem',
                    boxShadow: settings.darkMode
                        ? '0 2px 8px rgba(0,0,0,0.5)'
                        : '0 2px 8px rgba(0,0,0,0.1)',
                    color: textColor,
                    transition: 'background-color 0.3s ease',
                }}>
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                    }}>
                        <span>⚙️ Professional Settings</span>
                    </h1>
                    <p style={{
                        color: textSecondary,
                        marginBottom: '2rem',
                        fontSize: '0.95rem',
                    }}>
                        {t('customize_preferences')}
                    </p>

                    {message && (
                        <div style={{
                            background: message.includes('✅')
                                ? settings.darkMode ? '#1e5631' : '#d1fae5'
                                : settings.darkMode ? '#5a1f1f' : '#fee2e2',
                            color: message.includes('✅')
                                ? settings.darkMode ? '#90ee90' : '#065f46'
                                : settings.darkMode ? '#ff6b6b' : '#991b1b',
                            padding: '0.75rem 1rem',
                            borderRadius: '0.375rem',
                            marginBottom: '1.5rem',
                            fontSize: '0.9rem',
                        }}>
                            {message}
                        </div>
                    )}

                    {/* Notifications Section */}
                    <div style={{
                        borderBottom: `1px solid ${borderColor}`,
                        paddingBottom: '2rem',
                        marginBottom: '2rem',
                    }}>
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}>
                            <span>🔔</span> {t('notifications')}
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Email Notifications - Always enabled */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '1rem',
                                background: bgLight,
                                borderRadius: '0.5rem',
                                border: `1px solid ${borderColor}`,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>📧</span>
                                    <div>
                                        <span style={{ fontWeight: '500' }}>{t('email_notifications')}</span>
                                        <p style={{ fontSize: '0.8rem', color: textSecondary, margin: '0.25rem 0 0 0' }}>
                                            {t('enable_notifications_info')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleToggle('emailNotifications')}
                                    style={{
                                        width: '50px',
                                        height: '28px',
                                        borderRadius: '14px',
                                        border: 'none',
                                        background: settings.emailNotifications ? '#667eea' : '#d1d5db',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        transition: 'background 0.3s ease',
                                    }}
                                >
                                    <div style={{
                                        position: 'absolute',
                                        top: '2px',
                                        left: settings.emailNotifications ? '26px' : '2px',
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: 'white',
                                        transition: 'left 0.3s ease',
                                    }} />
                                </button>
                            </div>

                            {/* Conditional Notification Options - Only if email is enabled */}
                            {settings.emailNotifications && (
                                <>
                                    {[
                                        { key: 'billingReminders', label: t('billing_reminders'), icon: '💳' },
                                        { key: 'gstFilingReminders', label: t('gst_filing_reminders'), icon: '📋' },
                                        { key: 'invoiceReminders', label: t('invoice_reminders'), icon: '📄' },
                                    ].map(({ key, label, icon }) => (
                                        <div key={key} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '1rem',
                                            background: bgLight,
                                            borderRadius: '0.5rem',
                                            border: `1px solid ${borderColor}`,
                                            marginLeft: '1.5rem',
                                            opacity: 1,
                                            transition: 'opacity 0.3s ease',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span>{icon}</span>
                                                <span style={{ fontWeight: '500' }}>{label}</span>
                                            </div>
                                            <button
                                                onClick={() => handleToggle(key)}
                                                style={{
                                                    width: '50px',
                                                    height: '28px',
                                                    borderRadius: '14px',
                                                    border: 'none',
                                                    background: settings[key] ? '#667eea' : '#d1d5db',
                                                    cursor: 'pointer',
                                                    position: 'relative',
                                                    transition: 'background 0.3s ease',
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
                        borderBottom: `1px solid ${borderColor}`,
                        paddingBottom: '2rem',
                        marginBottom: '2rem',
                    }}>
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}>
                            <span>🏢</span> {t('business_settings')}
                        </h2>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                            gap: '1.5rem',
                        }}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontWeight: '600',
                                    marginBottom: '0.5rem',
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
                                        padding: '0.75rem',
                                        border: `1px solid ${borderColor}`,
                                        borderRadius: '0.375rem',
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                        backgroundColor: bgLight,
                                        color: textColor,
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
                                    marginBottom: '0.5rem',
                                    fontSize: '0.9rem',
                                    color: textColor,
                                }}>
                                    {t('currency')}
                                </label>
                                <select
                                    value={settings.currency}
                                    onChange={(e) => handleSelectChange('currency', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: `1px solid ${borderColor}`,
                                        borderRadius: '0.375rem',
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                        backgroundColor: bgLight,
                                        color: textColor,
                                    }}
                                >
                                    <option value="INR">{t('inr')}</option>
                                    <option value="USD">{t('usd')}</option>
                                    <option value="EUR">{t('eur')}</option>
                                </select>
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    fontWeight: '600',
                                    marginBottom: '0.5rem',
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
                                        padding: '0.75rem',
                                        border: `1px solid ${borderColor}`,
                                        borderRadius: '0.375rem',
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                        backgroundColor: bgLight,
                                        color: textColor,
                                    }}
                                >
                                    <option value="april-march">{t('april_march')}</option>
                                    <option value="jan-dec">{t('jan_dec')}</option>
                                    <option value="fiscal-custom">{t('custom_fiscal')}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Appearance Section */}
                    <div>
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}>
                            <span>🎨</span> {t('appearance')}
                        </h2>


                    </div>

                    {/* Save Button */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginTop: '2rem',
                        paddingTop: '2rem',
                        borderTop: `1px solid ${borderColor}`,
                    }}>
                        <button
                            onClick={handleSaveSettings}
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
                            {loading ? t('saving') : t('save_settings')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Settings;
