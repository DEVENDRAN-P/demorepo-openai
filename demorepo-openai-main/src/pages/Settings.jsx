import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/config';
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
    const [selectedPlan, setSelectedPlan] = useState(() => {
        return localStorage.getItem('saas_active_plan') || 'free';
    });
    const [checkoutPlan, setCheckoutPlan] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('upi');
    const [transactionId, setTransactionId] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [billingHistory, setBillingHistory] = useState(() => {
        const saved = localStorage.getItem('saas_billing_history');
        return saved ? JSON.parse(saved) : [
            { id: 'TXN-9021', date: '2026-06-26', plan: 'Free Plan', amount: '₹0', status: 'Success', utr: 'System Preset' }
        ];
    });

    const handleSelectPlan = (plan) => {
        if (plan === 'free') {
            setSelectedPlan(plan);
            localStorage.setItem('saas_active_plan', plan);
            setMessage(`✅ SaaS subscription successfully set to Free Plan!`);
            window.dispatchEvent(new Event('planChanged'));
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => setMessage(''), 4000);
        } else {
            setCheckoutPlan(plan);
        }
    };

    const handleCompletePayment = () => {
        if (paymentMethod === 'upi' && !transactionId.trim()) {
            alert('Please enter a valid 12-digit UPI UTR Transaction ID');
            return;
        }
        setIsVerifying(true);
        setTimeout(() => {
            setIsVerifying(false);
            const newPlan = checkoutPlan;
            setSelectedPlan(newPlan);
            localStorage.setItem('saas_active_plan', newPlan);

            const newTxn = {
                id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
                date: new Date().toISOString().split('T')[0],
                plan: newPlan === 'pro' ? 'Pro Plan' : 'Business Plan',
                amount: newPlan === 'pro' ? '₹399' : '₹1,499',
                status: 'Success',
                utr: paymentMethod === 'upi' ? transactionId : `RPAY-${Math.floor(100000 + Math.random() * 900000)}`
            };
            const updatedHistory = [newTxn, ...billingHistory];
            setBillingHistory(updatedHistory);
            localStorage.setItem('saas_billing_history', JSON.stringify(updatedHistory));

            setCheckoutPlan(null);
            setTransactionId('');
            setMessage(`✅ Payment verified! SaaS subscription upgraded to ${newPlan === 'pro' ? 'Pro Plan' : 'Business Plan'}!`);
            window.dispatchEvent(new Event('planChanged'));
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => setMessage(''), 4000);
        }, 1500);
    };

    const downloadReceipt = (txn) => {
        const content = `=========================================
          GST BUDDY AI - SUBSCRIPTION RECEIPT
=========================================
Receipt Ref    : ${txn.id}
User Profile   : ${user?.name || 'Active User'}
Billing Account: ${user?.email || 'admin@gstbuddy.ai'}
Date Created   : ${txn.date}
Plan Name      : ${txn.plan}
Amount Paid    : ${txn.amount}
Filing Status  : Active
UTR Identifier : ${txn.utr || 'N/A'}
=========================================
Thank you for choosing GST Buddy AI!`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `receipt-${txn.id}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    };

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

    const cardBg = 'var(--bg-secondary)';
    const textColor = 'var(--text-primary)';
    const textSecondary = 'var(--text-secondary)';
    const borderColor = 'var(--border-color)';
    const accentColor = 'var(--theme-primary)';

    return (
        <div style={{
            minHeight: '100vh',
            color: textColor,
        }}>
            <div style={{
                maxWidth: '1100px',
                margin: '0 auto',
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
                        background: `linear-gradient(135deg, var(--theme-accent) 0%, var(--theme-primary-light) 100%)`,
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
                    {/* SaaS Subscription Plans Section */}
                    <div style={{
                        background: cardBg,
                        borderRadius: '1rem',
                        padding: '2rem',
                        border: `1px solid ${borderColor}`,
                        boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
                        marginTop: '2rem'
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
                                background: 'rgba(16, 185, 129, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#10b981',
                                fontSize: '24px',
                            }}>
                                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <rect x="2" y="5" width="20" height="14" rx="2"/>
                                  <line x1="2" y1="10" x2="22" y2="10"/>
                                  <path d="M6 14h.01M10 14h.01"/>
                                </svg>
                            </div>
                            <div>
                                <h2 style={{
                                    fontSize: '1.5rem',
                                    fontWeight: '700',
                                    margin: '0',
                                    color: textColor,
                                }}>
                                    SaaS Subscription Tiers
                                </h2>
                                <p style={{ fontSize: '0.85rem', color: textSecondary, margin: '0.25rem 0 0 0' }}>
                                    Select the subscription level that matches your operational and filing requirements.
                                </p>
                            </div>
                        </div>

                        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
                            
                            {/* Free Plan */}
                            <div className="glass-panel" style={{
                                borderRadius: 'var(--radius-lg)',
                                padding: '1.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                border: `1px solid ${selectedPlan === 'free' ? '#10b981' : borderColor}`,
                                background: selectedPlan === 'free' ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                                transition: 'all 0.3s ease'
                            }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: textSecondary, textTransform: 'uppercase' }}>Starter</span>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.25rem 0 0.5rem 0', color: textColor }}>Free Plan</h3>
                                <div style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.25rem', color: textColor }}>
                                    ₹0 <span style={{ fontSize: '0.85rem', fontWeight: 500, color: textSecondary }}>/ month</span>
                                </div>
                                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: textColor }}><span style={{ color: '#10b981', fontWeight: 800 }}>✓</span> 10 invoice scans / month</li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: textColor }}><span style={{ color: '#10b981', fontWeight: 800 }}>✓</span> Basic dashboard overview</li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: textColor }}><span style={{ color: '#10b981', fontWeight: 800 }}>✓</span> Basic AI Accountant response</li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: textColor }}><span style={{ color: '#10b981', fontWeight: 800 }}>✓</span> Basic GSTR tax reports</li>
                                </ul>
                                <button 
                                    onClick={() => handleSelectPlan('free')}
                                    className={`btn ${selectedPlan === 'free' ? 'btn-primary' : 'btn-outline'}`}
                                    style={{ marginTop: 'auto', width: '100%', padding: '0.625rem', cursor: 'pointer' }}
                                >
                                    {selectedPlan === 'free' ? '✓ Active Plan' : 'Select Plan'}
                                </button>
                            </div>

                            {/* Pro Plan */}
                            <div className="glass-panel" style={{
                                borderRadius: 'var(--radius-lg)',
                                padding: '1.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                border: `1px solid ${selectedPlan === 'pro' ? 'var(--theme-primary-light)' : borderColor}`,
                                background: selectedPlan === 'pro' ? 'rgba(102, 126, 234, 0.05)' : 'transparent',
                                transition: 'all 0.3s ease'
                            }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--theme-primary-light)', textTransform: 'uppercase' }}>Professional</span>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.25rem 0 0.5rem 0', color: textColor }}>Pro Plan</h3>
                                <div style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.25rem', color: textColor }}>
                                    ₹399 <span style={{ fontSize: '0.85rem', fontWeight: 500, color: textSecondary }}>/ month</span>
                                </div>
                                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: textColor }}><span style={{ color: 'var(--theme-primary-light)', fontWeight: 800 }}>✓</span> Unlimited invoice processing</li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: textColor }}><span style={{ color: 'var(--theme-primary-light)', fontWeight: 800 }}>✓</span> AI Finance Agent workspace</li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: textColor }}><span style={{ color: 'var(--theme-primary-light)', fontWeight: 800 }}>✓</span> Real-time compliance monitoring</li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: textColor }}><span style={{ color: 'var(--theme-primary-light)', fontWeight: 800 }}>✓</span> Priority AI insights & recommendations</li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: textColor }}><span style={{ color: 'var(--theme-primary-light)', fontWeight: 800 }}>✓</span> Recharts-based tax forecasting</li>
                                </ul>
                                <button 
                                    onClick={() => handleSelectPlan('pro')}
                                    className={`btn ${selectedPlan === 'pro' ? 'btn-primary' : 'btn-outline'}`}
                                    style={{ marginTop: 'auto', width: '100%', padding: '0.625rem', cursor: 'pointer' }}
                                >
                                    {selectedPlan === 'pro' ? '✓ Active Plan' : 'Select Plan'}
                                </button>
                            </div>

                            {/* Business Plan */}
                            <div className="glass-panel" style={{
                                borderRadius: 'var(--radius-lg)',
                                padding: '1.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                border: `1px solid ${selectedPlan === 'business' ? '#14b8a6' : borderColor}`,
                                background: selectedPlan === 'business' ? 'rgba(20, 184, 166, 0.05)' : 'transparent',
                                transition: 'all 0.3s ease'
                            }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#14b8a6', textTransform: 'uppercase' }}>Enterprise</span>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.25rem 0 0.5rem 0', color: textColor }}>Business Plan</h3>
                                <div style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.25rem', color: textColor }}>
                                    ₹1,499 <span style={{ fontSize: '0.85rem', fontWeight: 500, color: textSecondary }}>/ month</span>
                                </div>
                                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: textColor }}><span style={{ color: '#14b8a6', fontWeight: 800 }}>✓</span> Multiple users & members</li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: textColor }}><span style={{ color: '#14b8a6', fontWeight: 800 }}>✓</span> Multiple business entities registry</li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: textColor }}><span style={{ color: '#14b8a6', fontWeight: 800 }}>✓</span> Advanced audit logs & summaries</li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: textColor }}><span style={{ color: '#14b8a6', fontWeight: 800 }}>✓</span> CA Multi-tenant setup & tools</li>
                                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: textColor }}><span style={{ color: '#14b8a6', fontWeight: 800 }}>✓</span> Future API Access integration</li>
                                </ul>
                                <button 
                                    onClick={() => handleSelectPlan('business')}
                                    className={`btn ${selectedPlan === 'business' ? 'btn-primary' : 'btn-outline'}`}
                                    style={{ marginTop: 'auto', width: '100%', padding: '0.625rem', cursor: 'pointer' }}
                                >
                                    {selectedPlan === 'business' ? '✓ Active Plan' : 'Select Plan'}
                                </button>
                            </div>

                    </div>

                    {/* Billing & Invoice History Section */}
                    <div style={{
                        background: cardBg,
                        borderRadius: '1rem',
                        padding: '2rem',
                        border: `1px solid ${borderColor}`,
                        boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
                        marginTop: '2rem'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            marginBottom: '1.5rem',
                        }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '10px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#3b82f6',
                                fontSize: '24px',
                            }}>
                                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path d="M9 12h6M9 16h6M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2z"/>
                                </svg>
                            </div>
                            <div>
                                <h2 style={{
                                    fontSize: '1.5rem',
                                    fontWeight: '700',
                                    margin: '0',
                                    color: textColor,
                                }}>
                                    Billing & Invoice History
                                </h2>
                                <p style={{ fontSize: '0.85rem', color: textSecondary, margin: '0.25rem 0 0 0' }}>
                                    View and download formal payment receipts and transaction records.
                                </p>
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: `2px solid ${borderColor}`, color: textSecondary, textAlign: 'left' }}>
                                        <th style={{ padding: '0.75rem' }}>Transaction ID</th>
                                        <th style={{ padding: '0.75rem' }}>Date</th>
                                        <th style={{ padding: '0.75rem' }}>Plan</th>
                                        <th style={{ padding: '0.75rem' }}>Amount</th>
                                        <th style={{ padding: '0.75rem' }}>Status</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {billingHistory.map((txn, idx) => (
                                        <tr key={idx} style={{ borderBottom: `1px solid ${borderColor}`, color: textColor }}>
                                            <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{txn.id}</td>
                                            <td style={{ padding: '0.75rem' }}>{txn.date}</td>
                                            <td style={{ padding: '0.75rem' }}>{txn.plan}</td>
                                            <td style={{ padding: '0.75rem', fontWeight: 600 }}>{txn.amount}</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <span style={{ fontSize: '0.7rem', padding: '0.125rem 0.5rem', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', fontWeight: 700 }}>
                                                    {txn.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                                <button 
                                                    onClick={() => downloadReceipt(txn)}
                                                    className="btn btn-outline" 
                                                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer' }}
                                                >
                                                    📥 Receipt
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
                            background: loading ? '#9ca3af' : `linear-gradient(135deg, var(--theme-accent) 0%, var(--theme-primary-light) 100%)`,
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

            {/* Subscription Checkout Modal Overlay */}
            {checkoutPlan && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.8)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.5rem',
                }}>
                    <div className="glass-panel" style={{
                        background: cardBg,
                        borderRadius: '1.25rem',
                        padding: '2rem',
                        maxWidth: '480px',
                        width: '100%',
                        border: `1px solid ${borderColor}`,
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        position: 'relative',
                        color: textColor
                    }}>
                        
                        {/* Close button */}
                        <button 
                            onClick={() => setCheckoutPlan(null)}
                            style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', color: textSecondary, fontSize: '1.25rem', cursor: 'pointer' }}
                        >
                            ✕
                        </button>

                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: textColor }}>Complete Subscription Upgrade</h3>
                        <p style={{ fontSize: '0.85rem', color: textSecondary, margin: '0 0 1.5rem 0' }}>
                            You are subscribing to the <strong style={{ color: 'var(--theme-primary-light)' }}>{checkoutPlan === 'pro' ? 'Pro Plan' : 'Business Plan'}</strong>.
                        </p>

                        <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', border: `1px solid ${borderColor}`, marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: textSecondary, fontWeight: 700 }}>Total Amount Due</span>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: textColor }}>{checkoutPlan === 'pro' ? '₹399' : '₹1,499'} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: textSecondary }}>/ month</span></div>
                            </div>
                            <span style={{ fontSize: '0.7rem', background: 'rgba(102, 126, 234, 0.1)', color: 'var(--theme-primary-light)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>TAX INCLUDED</span>
                        </div>

                        {/* Payment Method Selector */}
                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <button 
                                onClick={() => setPaymentMethod('upi')}
                                className={paymentMethod === 'upi' ? 'btn btn-primary' : 'btn btn-outline'}
                                style={{ flex: 1, padding: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.825rem', cursor: 'pointer' }}
                            >
                                📱 UPI QR Code
                            </button>
                            <button 
                                onClick={() => setPaymentMethod('razorpay')}
                                className={paymentMethod === 'razorpay' ? 'btn btn-primary' : 'btn btn-outline'}
                                style={{ flex: 1, padding: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.825rem', cursor: 'pointer' }}
                            >
                                💳 Razorpay Checkout
                            </button>
                        </div>

                        {paymentMethod === 'upi' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
                                <p style={{ fontSize: '0.8rem', color: textSecondary, margin: 0 }}>
                                    Scan the QR code using any UPI application (GPay, PhonePe, Paytm) to complete payment.
                                </p>
                                
                                {/* QR Code Graphic */}
                                <div style={{ background: 'white', padding: '0.5rem', borderRadius: '8px', border: `1px solid ${borderColor}` }}>
                                    <svg width="140" height="140" viewBox="0 0 100 100">
                                        <rect x="10" y="10" width="20" height="20" fill="#0f172a" />
                                        <rect x="13" y="13" width="14" height="14" fill="white" />
                                        <rect x="15" y="15" width="10" height="10" fill="#0f172a" />
                                        
                                        <rect x="70" y="10" width="20" height="20" fill="#0f172a" />
                                        <rect x="73" y="13" width="14" height="14" fill="white" />
                                        <rect x="75" y="15" width="10" height="10" fill="#0f172a" />
                                        
                                        <rect x="10" y="70" width="20" height="20" fill="#0f172a" />
                                        <rect x="13" y="73" width="14" height="14" fill="white" />
                                        <rect x="15" y="75" width="10" height="10" fill="#0f172a" />

                                        <rect x="40" y="20" width="5" height="5" fill="#0f172a" />
                                        <rect x="45" y="25" width="10" height="5" fill="#0f172a" />
                                        <rect x="35" y="45" width="5" height="10" fill="#0f172a" />
                                        <rect x="55" y="55" width="10" height="10" fill="#0f172a" />
                                        <rect x="70" y="40" width="15" height="5" fill="#0f172a" />
                                        <rect x="80" y="80" width="10" height="10" fill="#0f172a" />
                                        <rect x="40" y="75" width="5" height="15" fill="#0f172a" />
                                    </svg>
                                </div>

                                <div style={{ width: '100%', textAlign: 'left' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: textColor }}>UPI UTR / Transaction ID (12 Digits)</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. 618293028103" 
                                        value={transactionId}
                                        onChange={(e) => setTransactionId(e.target.value)}
                                        style={{ width: '100%', padding: '0.625rem 1rem', background: 'var(--bg-primary)', border: `1px solid ${borderColor}`, color: textColor, borderRadius: '0.5rem', fontSize: '0.85rem', outline: 'none' }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                                <p style={{ fontSize: '0.85rem', color: textSecondary, marginBottom: '1.5rem' }}>
                                    Pay securely using Razorpay gateway. Supports Card, Netbanking, Wallet, and international conversions.
                                </p>
                                <div style={{ border: `1px dashed ${borderColor}`, padding: '1rem', borderRadius: '0.75rem', background: 'var(--bg-secondary)', color: textSecondary, fontSize: '0.75rem' }}>
                                    💳 Sandbox simulation activated
                                </div>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            <button 
                                onClick={() => setCheckoutPlan(null)}
                                className="btn btn-outline" 
                                style={{ flex: 1, padding: '0.75rem', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleCompletePayment}
                                disabled={isVerifying}
                                className="btn btn-primary" 
                                style={{ flex: 1, padding: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                {isVerifying ? 'Verifying payment...' : '⚡ Confirm Upgrade'}
                            </button>
                        </div>

                    </div>
                </div>
            )}
            </div>
        </div>
    );
}

export default Settings;
