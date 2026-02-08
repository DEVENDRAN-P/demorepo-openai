import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDarkMode } from '../context/DarkModeContext';

function GSTFilingStatus({ bills = [] }) {
    const { t } = useTranslation();
    const [filingStatus, setFilingStatus] = useState([]);
    const { isDarkMode } = useDarkMode();
    const navigate = useNavigate();

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

            // If bills exist, group by deadline and show bill details
            const billDeadlines = {};

            bills.forEach((bill) => {
                if (bill.gstrDeadline) {
                    const deadline = new Date(bill.gstrDeadline);
                    const monthYear = deadline.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

                    if (!billDeadlines[monthYear]) {
                        billDeadlines[monthYear] = {
                            month: deadline.toLocaleDateString('en-US', { month: 'long' }),
                            year: deadline.getFullYear(),
                            dueDate: `${deadline.getDate()}th ${deadline.toLocaleDateString('en-US', { month: 'long' })}`,
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

    const handleBillClick = (bill) => {
        // Navigate to bill details page with bill ID
        navigate(`/bill/${bill.id}`, { state: { bill } });
    };

    return (
        <div
            style={{
                backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6',
                borderRadius: '12px',
                padding: '20px',
                color: isDarkMode ? '#e5e7eb' : '#1f2937',
                marginTop: '20px',
            }}
        >
            <h2
                style={{
                    marginTop: 0,
                    marginBottom: '20px',
                    fontSize: '20px',
                    fontWeight: '600',
                    color: isDarkMode ? '#f3f4f6' : '#1f2937',
                }}
            >
                {t('gstFilingStatus')} 📊
            </h2>

            {filingStatus.length === 0 ? (
                <p style={{ color: isDarkMode ? '#9ca3af' : '#6b7280', fontStyle: 'italic' }}>
                    {t('noFilingData') || 'Upload bills to see GST filing status'}
                </p>
            ) : (
                filingStatus.map((item, index) => (
                    <div
                        key={index}
                        style={{
                            marginBottom: '20px',
                            borderLeft: `4px solid ${item.statusColor}`,
                            backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                            padding: '15px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateX(4px)';
                            e.currentTarget.style.boxShadow = isDarkMode
                                ? '0 4px 12px rgba(0,0,0,0.3)'
                                : '0 4px 12px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateX(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        {/* Header with period and status */}
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '12px',
                            }}
                        >
                            <h3
                                style={{
                                    margin: 0,
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    color: isDarkMode ? '#f3f4f6' : '#1f2937',
                                }}
                            >
                                {item.period} {item.year}
                            </h3>
                            <span
                                style={{
                                    backgroundColor: item.statusColor,
                                    color: 'white',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                }}
                            >
                                {item.statusIcon} {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </span>
                        </div>

                        {/* Filing details */}
                        <div style={{ marginBottom: '12px' }}>
                            <p style={{ margin: '6px 0', fontSize: '14px' }}>
                                <strong>Form:</strong> {item.gstr}
                            </p>
                            <p style={{ margin: '6px 0', fontSize: '14px' }}>
                                <strong>Due Date:</strong> {item.dueDate}
                            </p>
                            <p
                                style={{
                                    margin: '6px 0',
                                    fontSize: '14px',
                                    color: item.statusColor,
                                    fontWeight: 'bold',
                                }}
                            >
                                {item.daysUntilDeadline < 0
                                    ? `${Math.abs(item.daysUntilDeadline)} days overdue`
                                    : item.daysUntilDeadline === 0
                                        ? 'Due today!'
                                        : `${item.daysUntilDeadline} days remaining`}
                            </p>
                        </div>

                        {/* Bills for this deadline */}
                        {item.bills && item.bills.length > 0 && (
                            <div
                                style={{
                                    marginTop: '12px',
                                    paddingTop: '12px',
                                    borderTop: `1px solid ${isDarkMode ? '#4b5563' : '#e5e7eb'}`,
                                }}
                            >
                                <p
                                    style={{
                                        margin: '8px 0',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        color: isDarkMode ? '#d1d5db' : '#374151',
                                    }}
                                >
                                    Bills ({item.bills.length}):
                                </p>
                                {item.bills.map((bill, billIndex) => (
                                    <div
                                        key={billIndex}
                                        onClick={() => handleBillClick(bill)}
                                        style={{
                                            marginLeft: '8px',
                                            paddingTop: '8px',
                                            paddingBottom: '8px',
                                            borderBottom:
                                                billIndex < item.bills.length - 1
                                                    ? `1px solid ${isDarkMode ? '#4b5563' : '#e5e7eb'}`
                                                    : 'none',
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = isDarkMode
                                                ? 'rgba(59, 130, 246, 0.1)'
                                                : 'rgba(59, 130, 246, 0.05)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <p
                                                    style={{
                                                        margin: '2px 0',
                                                        fontSize: '13px',
                                                        fontWeight: '500',
                                                        color: isDarkMode ? '#e5e7eb' : '#1f2937',
                                                    }}
                                                >
                                                    Invoice: {bill.invoiceNumber || 'N/A'}
                                                </p>
                                                <p
                                                    style={{
                                                        margin: '2px 0',
                                                        fontSize: '12px',
                                                        color: isDarkMode ? '#9ca3af' : '#6b7280',
                                                    }}
                                                >
                                                    {bill.supplierName || bill.vendorName || 'Unknown Supplier'}
                                                </p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <p
                                                    style={{
                                                        margin: '2px 0',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        color: isDarkMode ? '#e5e7eb' : '#1f2937',
                                                    }}
                                                >
                                                    ₹ {bill.amount?.toFixed(2) || '0.00'}
                                                </p>
                                                <p
                                                    style={{
                                                        margin: '2px 0',
                                                        fontSize: '11px',
                                                        color: '#3b82f6',
                                                        fontWeight: '600',
                                                    }}
                                                >
                                                    → View
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}

export default GSTFilingStatus;
