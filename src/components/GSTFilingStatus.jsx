import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '../context/DarkModeContext';

function GSTFilingStatus({ bills = [] }) {
    const { t } = useTranslation();
    const [filingStatus, setFilingStatus] = useState([]);
    const { isDarkMode } = useDarkMode();

    useEffect(() => {
        const calculateFilingStatus = () => {
            const now = new Date();
            const currentYear = now.getFullYear();

            // If no bills uploaded, show static deadlines
            if (!bills || bills.length === 0) {
                const deadlines = [
                    { month: 'April', dueDate: '13th May', deadline: new Date(currentYear, 4, 13), gstr: 'GSTR-1', period: 'April' },
                    { month: 'May', dueDate: '13th June', deadline: new Date(currentYear, 5, 13), gstr: 'GSTR-1', period: 'May' },
                    { month: 'June', dueDate: '13th July', deadline: new Date(currentYear, 6, 13), gstr: 'GSTR-1', period: 'June' },
                    { month: 'July', dueDate: '13th August', deadline: new Date(currentYear, 7, 13), gstr: 'GSTR-1', period: 'July' },
                    { month: 'August', dueDate: '13th September', deadline: new Date(currentYear, 8, 13), gstr: 'GSTR-1', period: 'August' },
                    { month: 'September', dueDate: '13th October', deadline: new Date(currentYear, 9, 13), gstr: 'GSTR-1', period: 'September' },
                ];

                const status = deadlines.map(item => {
                    const daysUntilDeadline = Math.floor((item.deadline - now) / (1000 * 60 * 60 * 24));
                    let status = 'upcoming';
                    let statusColor = '#3b82f6';
                    let statusIcon = '📅';

                    if (daysUntilDeadline < 0) {
                        status = 'overdue';
                        statusColor = '#ef4444';
                        statusIcon = '⚠️';
                    } else if (daysUntilDeadline <= 3) {
                        status = 'urgent';
                        statusColor = '#f97316';
                        statusIcon = '🔴';
                    } else if (daysUntilDeadline <= 7) {
                        status = 'warning';
                        statusColor = '#eab308';
                        statusIcon = '🟡';
                    } else {
                        status = 'upcoming';
                        statusColor = '#10b981';
                        statusIcon = '🟢';
                    }

                    return {
                        ...item,
                        status,
                        statusColor,
                        statusIcon,
                        daysUntilDeadline,
                    };
                });

                setFilingStatus(status);
                return;
            }

            // If bills exist, extract deadlines from bills and group by month
            const billDeadlines = {};

            bills.forEach((bill) => {
                if (bill.gstrDeadline) {
                    const deadline = new Date(bill.gstrDeadline);
                    const monthYear = deadline.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

                    if (!billDeadlines[monthYear]) {
                        billDeadlines[monthYear] = {
                            month: deadline.toLocaleDateString('en-US', { month: 'long' }),
                            year: deadline.getFullYear(),
                            dueDate: deadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
                            deadline: deadline,
                            gstr: 'GSTR-1',
                            period: deadline.toLocaleDateString('en-US', { month: 'long' }),
                            bills: []
                        };
                    }
                    billDeadlines[monthYear].bills.push(bill);
                }
            });

            // Convert to array and calculate status
            const filings = Object.values(billDeadlines).map(item => {
                const daysUntilDeadline = Math.floor((item.deadline - now) / (1000 * 60 * 60 * 24));
                let status = 'upcoming';
                let statusColor = '#3b82f6';
                let statusIcon = '📅';

                if (daysUntilDeadline < 0) {
                    status = 'overdue';
                    statusColor = '#ef4444';
                    statusIcon = '⚠️';
                } else if (daysUntilDeadline <= 3) {
                    status = 'urgent';
                    statusColor = '#f97316';
                    statusIcon = '🔴';
                } else if (daysUntilDeadline <= 7) {
                    status = 'warning';
                    statusColor = '#eab308';
                    statusIcon = '🟡';
                } else {
                    status = 'upcoming';
                    statusColor = '#10b981';
                    statusIcon = '🟢';
                }

                return {
                    ...item,
                    status,
                    statusColor,
                    statusIcon,
                    daysUntilDeadline,
                };
            });

            setFilingStatus(filings);
        };

        calculateFilingStatus();
    }, [bills]);

    return (
        <div style={{
            background: isDarkMode ? '#2a2a2a' : 'white',
            color: isDarkMode ? '#e5e7eb' : '#000',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.5rem',
            }}>
                <span style={{ fontSize: '1.5rem' }}>📋</span>
                <h2 style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: isDarkMode ? '#e5e7eb' : '#1f2937',
                    margin: 0,
                }}>
                    {t('gst_status')}
                </h2>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
            }}>
                {filingStatus.map((item, index) => (
                    <div
                        key={index}
                        style={{
                            border: `2px solid ${item.statusColor}`,
                            borderRadius: '0.5rem',
                            padding: '1rem',
                            background: isDarkMode
                                ? item.statusColor === '#ef4444' ? '#4b1b1a' :
                                    item.statusColor === '#f97316' ? '#4a2b1a' :
                                        item.statusColor === '#eab308' ? '#4a3d1a' :
                                            '#1a3a2a'
                                : item.statusColor === '#ef4444' ? '#fef2f2' :
                                    item.statusColor === '#f97316' ? '#fffbeb' :
                                        item.statusColor === '#eab308' ? '#fffbeb' :
                                            '#f0fdf4',
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'start',
                            marginBottom: '0.75rem',
                        }}>
                            <div>
                                <p style={{
                                    fontSize: '0.85rem',
                                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                                    margin: '0 0 0.25rem 0',
                                }}>
                                    {item.period} {item.year}
                                </p>
                                <h3 style={{
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    color: isDarkMode ? '#e5e7eb' : '#1f2937',
                                    margin: 0,
                                }}>
                                    {item.gstr}
                                </h3>
                            </div>
                            <span style={{ fontSize: '1.25rem' }}>
                                {item.statusIcon}
                            </span>
                        </div>

                        <div style={{
                            background: isDarkMode ? '#3a3a3a' : 'white',
                            padding: '0.75rem',
                            borderRadius: '0.375rem',
                            marginBottom: '0.75rem',
                        }}>
                            <p style={{
                                fontSize: '0.8rem',
                                color: isDarkMode ? '#9ca3af' : '#6b7280',
                                margin: '0 0 0.25rem 0',
                            }}>
                                {t('due_date')}
                            </p>
                            <p style={{
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                color: item.statusColor,
                                margin: 0,
                            }}>
                                {item.dueDate}
                            </p>
                        </div>

                        <div>
                            <p style={{
                                fontSize: '0.8rem',
                                color: isDarkMode ? '#9ca3af' : '#6b7280',
                                margin: '0 0 0.25rem 0',
                            }}>
                                {t('status')}
                            </p>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}>
                                <span style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: item.statusColor,
                                }}></span>
                                <span style={{
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    color: item.statusColor,
                                    textTransform: 'capitalize',
                                }}>
                                    {item.daysUntilDeadline < 0
                                        ? `${t('overdue_by')} ${Math.abs(item.daysUntilDeadline)} ${t('days_left')}`
                                        : `${item.daysUntilDeadline} ${t('days_left')}`
                                    }
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div style={{
                marginTop: '1.5rem',
                paddingTop: '1.5rem',
                borderTop: `1px solid ${isDarkMode ? '#404040' : '#e5e7eb'}`,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '1rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>⚠️</span>
                    <span>{t('overdue')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#f97316', fontWeight: 'bold' }}>🔴</span>
                    <span>{t('urgent')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#eab308', fontWeight: 'bold' }}>🟡</span>
                    <span>{t('warning')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>🟢</span>
                    <span>{t('upcoming')}</span>
                </div>
            </div>
        </div>
    );
}

export default GSTFilingStatus;
