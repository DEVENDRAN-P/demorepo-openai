import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';

function Support({ user }) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('helpdesk');
    const [expandedFAQ, setExpandedFAQ] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        const isDark = localStorage.getItem('darkMode') === 'true';
        setIsDarkMode(isDark);
        const handleStorageChange = () => {
            setIsDarkMode(localStorage.getItem('darkMode') === 'true');
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const helpdeskNumbers = [
        {
            type: t('government_gst_helpdesk'),
            number: '1800-103-4786',
            hours: '9:30 AM - 5:30 PM (Mon-Fri)',
            description: t('official_gst_helpdesk'),
        },
        {
            type: t('gst_technical_support'),
            number: '1800-103-4787',
            hours: '9:30 AM - 5:30 PM (Mon-Fri)',
            description: t('gst_technical_support_desc'),
        },
        {
            type: t('gstn_customer_support'),
            number: '1800-020-0061',
            hours: '24/7',
            description: t('gstn_customer_support_desc'),
        },
        {
            type: t('income_tax_helpline'),
            number: '1800-103-0025',
            hours: '9:00 AM - 5:00 PM (Mon-Fri)',
            description: t('income_tax_helpline_desc'),
        }
    ];

    const faqs = [
        {
            question: t('gst_registration_question'),
            answer: t('gst_registration_answer')
        },
        {
            question: t('gst_deadlines_question'),
            answer: t('gst_deadlines_answer')
        },
        {
            question: t('gst_calculation_question'),
            answer: t('gst_calculation_answer')
        },
        {
            question: t('gst_documents_question'),
            answer: t('gst_documents_answer')
        },
        {
            question: t('gst_difference_question'),
            answer: t('gst_difference_answer')
        },
        {
            question: t('itc_question'),
            answer: t('itc_answer')
        },
        {
            question: t('gstr9_question'),
            answer: t('gstr9_answer')
        },
        {
            question: t('appeal_question'),
            answer: t('appeal_answer')
        }
    ];

    const contactChannels = [
        {
            channel: t('email_channel'),
            info: 'support@gstbuddy.ai',
            action: t('send_email_action')
        },
        {
            channel: t('live_chat_channel'),
            info: t('chat_hours'),
            action: t('start_chat_action')
        },
        {
            channel: 'WhatsApp',
            info: '+91-9876543210',
            action: t('whatsapp_action')
        },
        {
            channel: t('call_channel'),
            info: '+91-XXXX-XXXXXX',
            action: t('schedule_call_action')
        }
    ];

    const bgColor = isDarkMode ? '#1a1a1a' : '#f9fafb';
    const cardBg = isDarkMode ? '#2d2d2d' : '#ffffff';
    const textColor = isDarkMode ? '#e5e7eb' : '#1f2937';
    const textSecondary = isDarkMode ? '#a3a3a3' : '#6b7280';
    const borderColor = isDarkMode ? '#404040' : '#e5e7eb';
    const hoverBg = isDarkMode ? '#3a3a3a' : '#f3f4f6';

    return (
        <div style={{
            minHeight: '100vh',
            background: bgColor,
            color: textColor,
        }}>
            <Navbar user={user} />

            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '2rem 1rem',
                marginTop: '2rem',
            }}>
                {/* Header */}
                <div style={{
                    background: isDarkMode
                        ? 'linear-gradient(135deg, #4c51bf 0%, #6b3ba0 100%)'
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '1rem',
                    padding: '3rem 2rem',
                    color: 'white',
                    marginBottom: '2rem',
                    textAlign: 'center',
                    boxShadow: isDarkMode
                        ? '0 10px 30px rgba(75, 81, 191, 0.3)'
                        : '0 10px 30px rgba(102, 126, 234, 0.3)',
                }}>
                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: 'bold',
                        marginBottom: '0.5rem',
                    }}>
                        {t('support_center')}
                    </h1>
                    <p style={{
                        fontSize: '1.1rem',
                        opacity: 0.9,
                    }}>
                        {t('support_subtitle')}
                    </p>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    marginBottom: '2rem',
                    borderBottom: `2px solid ${borderColor}`,
                    overflowX: 'auto',
                    flexWrap: 'wrap',
                }}>
                    {[
                        { id: 'helpdesk', label: t('helpdesk_numbers') },
                        { id: 'faq', label: t('faqs') },
                        { id: 'contact', label: t('contact_us') }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '1rem 1.5rem',
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === tab.id ? '3px solid #667eea' : 'none',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                fontWeight: activeTab === tab.id ? '600' : '500',
                                color: activeTab === tab.id ? '#667eea' : textSecondary,
                                transition: 'all 0.3s ease',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Helpdesk Numbers Tab */}
                {activeTab === 'helpdesk' && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '1.5rem',
                    }}>
                        {helpdeskNumbers.map((item, index) => (
                            <div
                                key={index}
                                style={{
                                    background: cardBg,
                                    borderRadius: '0.75rem',
                                    padding: '2rem',
                                    boxShadow: isDarkMode
                                        ? '0 2px 8px rgba(0,0,0,0.3)'
                                        : '0 2px 8px rgba(0,0,0,0.1)',
                                    border: `1px solid ${borderColor}`,
                                    transition: 'all 0.3s ease',
                                    cursor: 'pointer',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.boxShadow = isDarkMode
                                        ? '0 8px 20px rgba(102, 126, 234, 0.15)'
                                        : '0 8px 20px rgba(102, 126, 234, 0.2)';
                                    e.currentTarget.style.transform = 'translateY(-5px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.boxShadow = isDarkMode
                                        ? '0 2px 8px rgba(0,0,0,0.3)'
                                        : '0 2px 8px rgba(0,0,0,0.1)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                <h3 style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 'bold',
                                    marginBottom: '0.75rem',
                                    color: textColor,
                                }}>
                                    {item.type}
                                </h3>
                                <p style={{
                                    color: textSecondary,
                                    marginBottom: '0.75rem',
                                    fontSize: '0.95rem',
                                }}>
                                    {item.description}
                                </p>
                                <div style={{
                                    background: isDarkMode ? '#404040' : '#f0f4ff',
                                    padding: '1rem',
                                    borderRadius: '0.5rem',
                                    marginBottom: '0.75rem',
                                }}>
                                    <p style={{
                                        fontSize: '1.5rem',
                                        fontWeight: 'bold',
                                        color: '#667eea',
                                        margin: 0,
                                    }}>
                                        {item.number}
                                    </p>
                                </div>
                                <p style={{
                                    color: textSecondary,
                                    fontSize: '0.85rem',
                                    margin: 0,
                                }}>
                                    <strong>Hours:</strong> {item.hours}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* FAQs Tab */}
                {activeTab === 'faq' && (
                    <div>
                        {faqs.map((faq, index) => (
                            <div
                                key={index}
                                style={{
                                    background: cardBg,
                                    borderRadius: '0.75rem',
                                    marginBottom: '1rem',
                                    overflow: 'hidden',
                                    boxShadow: isDarkMode
                                        ? '0 1px 3px rgba(0,0,0,0.3)'
                                        : '0 1px 3px rgba(0,0,0,0.1)',
                                    border: `1px solid ${borderColor}`,
                                }}
                            >
                                <button
                                    onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                                    style={{
                                        width: '100%',
                                        padding: '1.5rem',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        color: textColor,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = hoverBg;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'none';
                                    }}
                                >
                                    {faq.question}
                                    <span style={{
                                        fontSize: '1.2rem',
                                        transform: expandedFAQ === index ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.3s ease',
                                    }}>
                                        ▼
                                    </span>
                                </button>
                                {expandedFAQ === index && (
                                    <div style={{
                                        padding: '0 1.5rem 1.5rem 1.5rem',
                                        borderTop: `1px solid ${borderColor}`,
                                        color: textSecondary,
                                        lineHeight: '1.6',
                                    }}>
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Contact Channels Tab */}
                {activeTab === 'contact' && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '1.5rem',
                    }}>
                        {contactChannels.map((item, index) => (
                            <div
                                key={index}
                                style={{
                                    background: cardBg,
                                    borderRadius: '0.75rem',
                                    padding: '2rem',
                                    boxShadow: isDarkMode
                                        ? '0 2px 8px rgba(0,0,0,0.3)'
                                        : '0 2px 8px rgba(0,0,0,0.1)',
                                    border: `1px solid ${borderColor}`,
                                    textAlign: 'center',
                                }}
                            >
                                <h3 style={{
                                    fontSize: '1.1rem',
                                    fontWeight: '600',
                                    marginBottom: '0.5rem',
                                    color: textColor,
                                }}>
                                    {item.channel}
                                </h3>
                                <p style={{
                                    color: textSecondary,
                                    marginBottom: '1rem',
                                    fontSize: '0.95rem',
                                }}>
                                    {item.info}
                                </p>
                                <button
                                    style={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        padding: '0.75rem 1.5rem',
                                        border: 'none',
                                        borderRadius: '0.375rem',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        transition: 'all 0.3s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.boxShadow = isDarkMode
                                            ? '0 4px 12px rgba(102, 126, 234, 0.3)'
                                            : '0 4px 12px rgba(102, 126, 234, 0.4)';
                                        e.currentTarget.style.transform = 'scale(1.02)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                >
                                    {item.action}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Important Notice */}
                <div style={{
                    marginTop: '3rem',
                    background: isDarkMode ? '#3a3a1a' : '#fef3c7',
                    border: `1px solid ${isDarkMode ? '#665a00' : '#fcd34d'}`,
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                }}>
                    <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                    <div>
                        <h3 style={{
                            fontWeight: '600',
                            color: isDarkMode ? '#fbbf24' : '#92400e',
                            marginBottom: '0.5rem',
                        }}>
                            {t('important_notice')}
                        </h3>
                        <p style={{
                            color: isDarkMode ? '#d1a825' : '#b45309',
                            margin: 0,
                            fontSize: '0.95rem',
                            lineHeight: '1.5',
                        }}>
                            {t('important_notice_text')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Support;
