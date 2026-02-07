import React, { useState, useEffect } from 'react';

function GSTFilingStatus({ bills = [] }) {
    const [filingStatus, setFilingStatus] = useState([]);

    useEffect(() => {
        calculateFilingStatus();
    }, [bills]);

    const calculateFilingStatus = () => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Get deadlines for current and next quarters
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
    };

    return (
        <div style={{
            background: 'white',
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
                    color: '#1f2937',
                    margin: 0,
                }}>
                    GST Filing Status
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
                            background: item.statusColor === '#ef4444' ? '#fef2f2' :
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
                                    color: '#6b7280',
                                    margin: '0 0 0.25rem 0',
                                }}>
                                    {item.period} {item.year}
                                </p>
                                <h3 style={{
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    color: '#1f2937',
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
                            background: 'white',
                            padding: '0.75rem',
                            borderRadius: '0.375rem',
                            marginBottom: '0.75rem',
                        }}>
                            <p style={{
                                fontSize: '0.8rem',
                                color: '#6b7280',
                                margin: '0 0 0.25rem 0',
                            }}>
                                Due Date
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
                                color: '#6b7280',
                                margin: '0 0 0.25rem 0',
                            }}>
                                Status
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
                                        ? `Overdue by ${Math.abs(item.daysUntilDeadline)} days`
                                        : `${item.daysUntilDeadline} days left`
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
                borderTop: '1px solid #e5e7eb',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '1rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>⚠️</span>
                    <span>Overdue</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#f97316', fontWeight: 'bold' }}>🔴</span>
                    <span>Urgent (≤3 days)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#eab308', fontWeight: 'bold' }}>🟡</span>
                    <span>Warning (4-7 days)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>🟢</span>
                    <span>Upcoming (&gt;7 days)</span>
                </div>
            </div>
        </div>
    );
}

export default GSTFilingStatus;
