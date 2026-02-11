import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '../context/DarkModeContext';
import Navbar from '../components/Navbar';

// Google Material Icons
const IconEmail = ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
);

const IconChat = ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3l4 4 4-4h7a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z" />
    </svg>
);

const IconWhatsApp = ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill={color}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004c-1.022 0-2.032.218-2.992.654-5.61 2.63-7.423 8.816-3.906 13.938 1.92 2.858 5.264 4.53 8.896 4.53 5.343 0 9.788-4.308 9.988-9.682.049-.956.066-1.922.03-2.887-.006-.122-.039-.243-.06-.364-.09-1.054-.313-2.083-.716-3.058-2.615-6.325-9.412-9.587-16.08-6.761-1.83 1.123-3.295 2.67-4.226 4.39 6.168-2.236 12.324 1.367 14.288 6.937 1.964 5.57-1.04 11.9-6.93 14.158-1.843.677-3.866.77-5.835.307-6.305-1.514-10.68-7.582-9.625-14.191.23-1.502 1.008-3.09 2.176-4.265 1.168-1.175 2.692-2.087 4.263-2.524.893-.243 1.82-.367 2.775-.366z" />
    </svg>
);

const IconPhone = ({ color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
);

function Support({ user }) {
    const { t } = useTranslation();
    const { isDarkMode } = useDarkMode();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState('helpdesk');

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'contact' || tab === 'faq') {
            setActiveTab(tab);
        }
    }, [searchParams]);
    const [expandedFAQ, setExpandedFAQ] = useState(null);

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
            channel: t('email_channel'),
            info: 'devendranprabhakar2007@gmail.com',
            action: t('send_email_action')
        },
        {
            channel: t('live_chat_channel'),
            info: t('chat_hours'),
            action: t('start_chat_action')
        },
        {
            channel: t('whatsapp_channel'),
            info: '+91-7418227907',
            action: t('whatsapp_action')
        },
        {
            channel: t('call_channel'),
            info: '+91-7418227907',
            action: t('schedule_call_action')
        }
    ];

    const bgColor = isDarkMode ? '#1a1a1a' : '#f9fafb';
    const cardBg = isDarkMode ? '#2d2d2d' : '#ffffff';
    const textColor = isDarkMode ? '#e5e7eb' : '#1f2937';
    const textSecondary = isDarkMode ? '#a3a3a3' : '#6b7280';
    const borderColor = isDarkMode ? '#404040' : '#e5e7eb';
    const hoverBg = isDarkMode ? '#3a3a3a' : '#f3f4f6';

    // Handler functions for contact actions
    const handleEmailClick = (email) => {
        window.location.href = `mailto:${email}?subject=GST Buddy Support Request&body=Hello,%0D%0A%0D%0AI need assistance with...`;
    };

    const handleWhatsAppClick = (phone) => {
        const phoneNumber = phone.replace(/[-\s]/g, ''); // Remove dashes and spaces
        const message = encodeURIComponent('Hello GST Buddy Support Team, I need help with...');
        // For web - opens WhatsApp web
        window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
    };

    const handleCallClick = (phone) => {
        window.location.href = `tel:${phone}`;
    };

    const handleChatClick = () => {
        alert('Chat feature will be available soon! Please use other contact methods.');
    };

    const handleChannelClick = (item) => {
        if (item.channel === t('email_channel') || item.channel.includes('Email')) {
            handleEmailClick(item.info);
        } else if (item.channel === t('whatsapp_channel')) {
            handleWhatsAppClick(item.info);
        } else if (item.channel === t('call_channel') || item.channel.includes('Call')) {
            handleCallClick(item.info);
        } else if (item.channel === t('live_chat_channel') || item.channel.includes('Chat')) {
            handleChatClick();
        }
    };

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
                marginTop: '1.5rem',
            }}>
                {/* Header with Enhanced Design */}
                <div style={{
                    background: isDarkMode
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '1.25rem',
                    padding: '3rem 2rem',
                    color: 'white',
                    marginBottom: '2rem',
                    textAlign: 'center',
                    boxShadow: isDarkMode
                        ? '0 12px 40px rgba(102, 126, 234, 0.4)'
                        : '0 12px 40px rgba(102, 126, 234, 0.3)',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* Decorative background elements */}
                    <div style={{
                        position: 'absolute',
                        top: '-50px',
                        right: '-50px',
                        width: '200px',
                        height: '200px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '50%',
                    }} />
                    <div style={{
                        position: 'absolute',
                        bottom: '-30px',
                        left: '-30px',
                        width: '150px',
                        height: '150px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '50%',
                    }} />

                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{
                            fontSize: '3rem',
                            marginBottom: '1rem',
                            opacity: 0.95,
                        }}>
                            🎯
                        </div>
                        <h1 style={{
                            fontSize: '2.5rem',
                            fontWeight: '700',
                            marginBottom: '0.75rem',
                            letterSpacing: '-0.5px',
                        }}>
                            {t('support_center')}
                        </h1>
                        <p style={{
                            fontSize: '1.15rem',
                            opacity: 0.95,
                            color: 'white',
                            marginBottom: 0,
                            fontWeight: '500',
                        }}>
                            {t('support_subtitle')}
                        </p>
                    </div>
                </div>

                {/* Tabs - Enhanced */}
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginBottom: '2rem',
                    flexWrap: 'wrap',
                    background: isDarkMode ? '#2d2d2d' : '#f5f5f5',
                    padding: '0.5rem',
                    borderRadius: '0.75rem',
                    border: `1px solid ${borderColor}`,
                }}>
                    {[
                        { id: 'helpdesk', label: t('helpdesk_numbers'), icon: '☎️' },
                        { id: 'faq', label: t('faqs'), icon: '❓' },
                        { id: 'contact', label: t('contact_us'), icon: '✉️' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '0.875rem 1.25rem',
                                background: activeTab === tab.id
                                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                    : 'transparent',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                fontWeight: activeTab === tab.id ? '600' : '500',
                                color: activeTab === tab.id ? 'white' : textSecondary,
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={(e) => {
                                if (activeTab !== tab.id) {
                                    e.currentTarget.style.background = isDarkMode ? '#3a3a3a' : '#e5e5e5';
                                    e.currentTarget.style.color = textColor;
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== tab.id) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = textSecondary;
                                }
                            }}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Helpdesk Numbers Tab - Enhanced */}
                {activeTab === 'helpdesk' && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '2rem',
                    }}>
                        {helpdeskNumbers.map((item, index) => (
                            <div
                                key={index}
                                style={{
                                    background: cardBg,
                                    borderRadius: '1rem',
                                    padding: '2rem',
                                    boxShadow: isDarkMode
                                        ? '0 4px 12px rgba(0,0,0,0.3)'
                                        : '0 4px 12px rgba(0,0,0,0.08)',
                                    border: `1px solid ${borderColor}`,
                                    transition: 'all 0.3s ease',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.boxShadow = isDarkMode
                                        ? '0 12px 30px rgba(102, 126, 234, 0.25)'
                                        : '0 12px 30px rgba(102, 126, 234, 0.2)';
                                    e.currentTarget.style.transform = 'translateY(-8px)';
                                    e.currentTarget.style.borderColor = '#667eea';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.boxShadow = isDarkMode
                                        ? '0 4px 12px rgba(0,0,0,0.3)'
                                        : '0 4px 12px rgba(0,0,0,0.08)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.borderColor = borderColor;
                                }}
                            >
                                {/* Top accent bar */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '4px',
                                    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                                }} />

                                <div style={{ paddingTop: '0.5rem' }}>
                                    <div style={{
                                        fontSize: '2rem',
                                        marginBottom: '1rem',
                                        opacity: 0.8,
                                    }}>
                                        ☎️
                                    </div>
                                    <h3 style={{
                                        fontSize: '1.25rem',
                                        fontWeight: '700',
                                        marginBottom: '0.75rem',
                                        color: textColor,
                                        lineHeight: '1.4',
                                    }}>
                                        {item.type}
                                    </h3>
                                    <p style={{
                                        color: textSecondary,
                                        marginBottom: '1rem',
                                        fontSize: '0.95rem',
                                        lineHeight: '1.5',
                                    }}>
                                        {item.description}
                                    </p>
                                    <div style={{
                                        background: isDarkMode ? '#3a3a3a' : '#f0f4ff',
                                        padding: '1.25rem',
                                        borderRadius: '0.75rem',
                                        marginBottom: '1rem',
                                        border: `1px solid ${isDarkMode ? '#4a4a4a' : '#e0e7ff'}`,
                                    }}>
                                        <p style={{
                                            fontSize: '0.85rem',
                                            color: textSecondary,
                                            margin: '0 0 0.5rem 0',
                                            fontWeight: '500',
                                        }}>
                                            {t('phone_number') || 'Phone Number'}
                                        </p>
                                        <p style={{
                                            fontSize: '1.7rem',
                                            fontWeight: '700',
                                            color: '#667eea',
                                            margin: 0,
                                            fontFamily: 'monospace',
                                        }}>
                                            {item.number}
                                        </p>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        color: textSecondary,
                                        fontSize: '0.9rem',
                                    }}>
                                        <span>🕐</span>
                                        <span><strong>{t('hours') || 'Hours'}:</strong> {item.hours}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* FAQs Tab - Enhanced */}
                {activeTab === 'faq' && (
                    <div>
                        <div style={{
                            marginBottom: '2rem',
                            padding: '1.5rem',
                            background: isDarkMode ? '#2d2d2d' : '#f0f4ff',
                            borderRadius: '0.75rem',
                            borderLeft: '4px solid #667eea',
                        }}>
                            <p style={{
                                color: textSecondary,
                                fontSize: '0.95rem',
                                margin: 0,
                                lineHeight: '1.5',
                            }}>
                                💡 {t('faq_intro') || 'Find answers to frequently asked questions. Click a question to expand the answer.'}
                            </p>
                        </div>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                        }}>
                            {faqs.map((faq, index) => (
                                <div
                                    key={index}
                                    style={{
                                        background: cardBg,
                                        borderRadius: '1rem',
                                        overflow: 'hidden',
                                        boxShadow: isDarkMode
                                            ? '0 4px 12px rgba(0,0,0,0.3)'
                                            : '0 4px 12px rgba(0,0,0,0.08)',
                                        border: `1px solid ${borderColor}`,
                                        transition: 'all 0.3s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.boxShadow = isDarkMode
                                            ? '0 8px 20px rgba(102, 126, 234, 0.2)'
                                            : '0 8px 20px rgba(102, 126, 234, 0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.boxShadow = isDarkMode
                                            ? '0 4px 12px rgba(0,0,0,0.3)'
                                            : '0 4px 12px rgba(0,0,0,0.08)';
                                    }}
                                >
                                    <button
                                        onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                                        style={{
                                            width: '100%',
                                            padding: '1.5rem',
                                            background: expandedFAQ === index
                                                ? isDarkMode ? '#3a3a3a' : '#f8faff'
                                                : 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            fontSize: '1rem',
                                            fontWeight: '600',
                                            color: textColor,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            transition: 'all 0.3s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (expandedFAQ !== index) {
                                                e.currentTarget.style.background = isDarkMode ? '#3a3a3a' : '#f8faff';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (expandedFAQ !== index) {
                                                e.currentTarget.style.background = 'none';
                                            }
                                        }}
                                    >
                                        <span style={{ flexGrow: 1 }}>❓ {faq.question}</span>
                                        <span style={{
                                            fontSize: '1.2rem',
                                            transform: expandedFAQ === index ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.3s ease',
                                            flexShrink: 0,
                                        }}>
                                            ▼
                                        </span>
                                    </button>
                                    {expandedFAQ === index && (
                                        <div style={{
                                            padding: '1.5rem',
                                            borderTop: `1px solid ${borderColor}`,
                                            color: textSecondary,
                                            lineHeight: '1.7',
                                            fontSize: '0.95rem',
                                            background: isDarkMode ? '#2d2d2d' : '#fafbff',
                                        }}>
                                            {faq.answer}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Contact Channels Tab - Enhanced */}
                {activeTab === 'contact' && (
                    <div>
                        <div style={{
                            marginBottom: '2rem',
                            padding: '1.5rem',
                            background: isDarkMode ? '#2d2d2d' : '#f0f4ff',
                            borderRadius: '0.75rem',
                            borderLeft: '4px solid #667eea',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                        }}>
                            <span style={{ fontSize: '1.5rem' }}>📞</span>
                            <div>
                                <p style={{
                                    color: textColor,
                                    fontWeight: '600',
                                    margin: '0 0 0.25rem 0',
                                }}>
                                    {t('reach_out') || 'Reach Out to Us'}
                                </p>
                                <p style={{
                                    color: textSecondary,
                                    fontSize: '0.95rem',
                                    margin: 0,
                                    lineHeight: '1.4',
                                }}>
                                    {t('multiple_channels') || 'Choose your preferred contact method and connect with our support team'}
                                </p>
                            </div>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '2rem',
                        }}>
                            {contactChannels.map((item, index) => (
                                <div
                                    key={index}
                                    style={{
                                        background: cardBg,
                                        borderRadius: '1rem',
                                        padding: '2rem',
                                        boxShadow: isDarkMode
                                            ? '0 4px 12px rgba(0,0,0,0.3)'
                                            : '0 4px 12px rgba(0,0,0,0.08)',
                                        border: `1px solid ${borderColor}`,
                                        textAlign: 'center',
                                        transition: 'all 0.3s ease',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.boxShadow = isDarkMode
                                            ? '0 12px 30px rgba(102, 126, 234, 0.25)'
                                            : '0 12px 30px rgba(102, 126, 234, 0.2)';
                                        e.currentTarget.style.transform = 'translateY(-8px)';
                                        e.currentTarget.style.borderColor = '#667eea';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.boxShadow = isDarkMode
                                            ? '0 4px 12px rgba(0,0,0,0.3)'
                                            : '0 4px 12px rgba(0,0,0,0.08)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.borderColor = borderColor;
                                    }}
                                >
                                    {/* Top accent bar */}
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '4px',
                                        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                                    }} />

                                    <div style={{ paddingTop: '0.5rem' }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            marginBottom: '1.5rem',
                                            height: '50px',
                                            alignItems: 'center',
                                        }}>
                                            {item.channel === t('email_channel') || item.channel.includes('Email') ?
                                                <IconEmail color={isDarkMode ? '#667eea' : '#667eea'} /> :
                                                item.channel === t('whatsapp_channel') ?
                                                    <IconWhatsApp color="#25D366" /> :
                                                    item.channel === t('call_channel') || item.channel.includes('Call') ?
                                                        <IconPhone color={isDarkMode ? '#667eea' : '#667eea'} /> :
                                                        item.channel === t('live_chat_channel') || item.channel.includes('Chat') ?
                                                            <IconChat color={isDarkMode ? '#667eea' : '#667eea'} /> : null
                                            }
                                        </div>
                                        <h3 style={{
                                            fontSize: '1.15rem',
                                            fontWeight: '700',
                                            marginBottom: '0.75rem',
                                            color: textColor,
                                        }}>
                                            {item.channel === t('email_channel') ? '📧 ' + t('email_channel') :
                                                item.channel === t('whatsapp_channel') ? '💬 ' + t('whatsapp_channel') :
                                                    item.channel === t('call_channel') ? '☎️ ' + t('call_channel') :
                                                        item.channel === t('live_chat_channel') ? '💭 ' + t('live_chat_channel') : item.channel}
                                        </h3>
                                        <p style={{
                                            color: textSecondary,
                                            marginBottom: '1.5rem',
                                            fontSize: '0.95rem',
                                            fontWeight: '500',
                                            wordBreak: 'break-word',
                                            fontFamily: 'monospace',
                                        }}>
                                            {item.info}
                                        </p>
                                        <button
                                            onClick={() => handleChannelClick(item)}
                                            style={{
                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                color: 'white',
                                                padding: '0.875rem 1.75rem',
                                                border: 'none',
                                                borderRadius: '0.5rem',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                fontSize: '0.95rem',
                                                transition: 'all 0.3s ease',
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.boxShadow = isDarkMode
                                                    ? '0 6px 16px rgba(102, 126, 234, 0.4)'
                                                    : '0 6px 16px rgba(102, 126, 234, 0.35)';
                                                e.currentTarget.style.transform = 'scale(1.03)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.boxShadow = 'none';
                                                e.currentTarget.style.transform = 'scale(1)';
                                            }}
                                        >
                                            <span>→</span>
                                            {item.action}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Important Notice - Enhanced */}
                <div style={{
                    marginTop: '3rem',
                    background: isDarkMode
                        ? 'linear-gradient(135deg, #3a3a1a 0%, #4a3a2a 100%)'
                        : 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
                    border: `2px solid ${isDarkMode ? '#665a00' : '#f59e0b'}`,
                    borderRadius: '1rem',
                    padding: '2rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1.5rem',
                }}>
                    <span style={{ fontSize: '2rem', flexShrink: 0 }}>⚠️</span>
                    <div style={{ flex: 1 }}>
                        <h3 style={{
                            fontWeight: '700',
                            fontSize: '1.1rem',
                            color: isDarkMode ? '#fbbf24' : '#92400e',
                            marginBottom: '0.75rem',
                            margin: 0,
                        }}>
                            {t('important_notice')}
                        </h3>
                        <p style={{
                            color: isDarkMode ? '#d1a825' : '#b45309',
                            margin: 0,
                            fontSize: '0.95rem',
                            lineHeight: '1.6',
                        }}>
                            {t('important_notice_text')}
                        </p>
                    </div>
                </div>

                {/* Support CTA Section */}
                <div style={{
                    marginTop: '3rem',
                    background: isDarkMode
                        ? 'linear-gradient(135deg, #2d2d3d 0%, #3a3a4a 100%)'
                        : 'linear-gradient(135deg, #f0f4ff 0%, #f5f3ff 100%)',
                    borderRadius: '1rem',
                    padding: '2.5rem',
                    textAlign: 'center',
                    border: `1px solid ${borderColor}`,
                }}>
                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: textColor,
                        marginBottom: '1rem',
                        margin: '0 0 1rem 0',
                    }}>
                        {t('still_need_help') || 'Still Need Help?'}
                    </h2>
                    <p style={{
                        color: textSecondary,
                        fontSize: '1rem',
                        marginBottom: '1.5rem',
                        lineHeight: '1.6',
                        maxWidth: '600px',
                        margin: '0 auto 1.5rem auto',
                    }}>
                        {t('support_message') || 'Our support team is available 24/7 to assist you. Don\'t hesitate to reach out through any of the channels above.'}
                    </p>
                    <button
                        onClick={() => setActiveTab('contact')}
                        style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            padding: '1rem 2.5rem',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            fontWeight: '700',
                            fontSize: '1rem',
                            transition: 'all 0.3s ease',
                            boxShadow: isDarkMode
                                ? '0 8px 20px rgba(102, 126, 234, 0.3)'
                                : '0 8px 20px rgba(102, 126, 234, 0.25)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.boxShadow = isDarkMode
                                ? '0 12px 28px rgba(102, 126, 234, 0.4)'
                                : '0 12px 28px rgba(102, 126, 234, 0.35)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = isDarkMode
                                ? '0 8px 20px rgba(102, 126, 234, 0.3)'
                                : '0 8px 20px rgba(102, 126, 234, 0.25)';
                        }}
                    >
                        {t('contact_us_now') || 'Contact Us Now'} →
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Support;
