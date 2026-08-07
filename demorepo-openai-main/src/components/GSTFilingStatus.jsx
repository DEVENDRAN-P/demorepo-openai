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

            // If no bills uploaded, show nothing (empty)
            if (!bills || bills.length === 0) {
                setFilingStatus([]);
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
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '12px',
                padding: '20px',
                color: 'var(--text-primary)',
                marginTop: '20px',
                border: '1px solid var(--border-color)',
            }}
        >
            <h2
                style={{
                    marginTop: 0,
                    marginBottom: '20px',
                    fontSize: '20px',
                    fontWeight: '800',
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.3px',
                }}
            >
                {t('gstFilingStatus') || 'GST Filing Status'}
            </h2>

            {filingStatus.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    {t('noFilingData') || 'Upload bills to see GST filing status'}
                </p>
            ) : (
                filingStatus.map((item, index) => (
                    <div
                        key={index}
                        style={{
                            marginBottom: '20px',
                            borderLeft: `4px solid ${item.statusColor}`,
                            backgroundColor: 'var(--bg-primary)',
                            padding: '15px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            border: '1px solid var(--border-color)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateX(4px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
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
                                {item.status === 'overdue' ? <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--error)', display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> :
                         item.status === 'urgent' ? <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', marginRight: '4px', verticalAlign: 'middle' }}></span> :
                         item.status === 'warning' ? <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#eab308', marginRight: '4px', verticalAlign: 'middle' }}></span> :
                         item.status === 'upcoming' ? <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', marginRight: '4px', verticalAlign: 'middle' }}></span> :
                         <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        } {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
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
                                    borderTop: '1px solid var(--border-color)',
                                }}
                            >
                                <p
                                    style={{
                                        margin: '8px 0',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        color: 'var(--text-secondary)',
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
                                                    ? '1px solid var(--border-color)'
                                                    : 'none',
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
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
                                                        color: 'var(--text-primary)',
                                                    }}
                                                >
                                                    Invoice: {bill.invoiceNumber || 'N/A'}
                                                </p>
                                                <p
                                                    style={{
                                                        margin: '2px 0',
                                                        fontSize: '12px',
                                                        color: 'var(--text-secondary)',
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
                                                        color: 'var(--text-primary)',
                                                    }}
                                                >
                                                    ₹ {bill.amount?.toFixed(2) || '0.00'}
                                                </p>
                                                <p
                                                    style={{
                                                        margin: '2px 0',
                                                        fontSize: '11px',
                                                        color: 'var(--theme-secondary)',
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
