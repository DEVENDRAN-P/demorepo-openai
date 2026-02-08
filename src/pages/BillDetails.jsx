import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../hooks/useAuth';
import { getUserBillById, updateUserBill } from '../services/firebaseDataService';
import { 
  getBillReminderStatus, 
  getBillReminderHistory,
  recordReminderEmailSent,
} from '../services/billReminderService';
import { sendReminderEmail } from '../services/emailReminderService';

function BillDetails() {
    const { billId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { isDarkMode } = useDarkMode();
    const { user } = useAuth();
    const [bill, setBill] = useState(location.state?.bill || null);
    const [loading, setLoading] = useState(!bill);
    const [editing, setEditing] = useState(false);
    const [editData, setEditData] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [reminderStatus, setReminderStatus] = useState(null);
    const [reminderHistory, setReminderHistory] = useState([]);
    const [sendingEmail, setSendingEmail] = useState(false);

    const loadBill = useCallback(async () => {
        try {
            setLoading(true);
            const billData = await getUserBillById(billId);
            if (billData) {
                setBill(billData);
                setEditData(billData);
            } else {
                setError('Bill not found');
            }
        } catch (err) {
            setError(err.message || 'Failed to load bill');
        } finally {
            setLoading(false);
        }
    }, [billId]);

    useEffect(() => {
        if (!bill && billId && user) {
            loadBill();
        }
    }, [billId, user, bill, loadBill]);

    const handleEdit = () => {
        setEditData({ ...bill });
        setEditing(true);
    };

    const handleUpdate = async () => {
        try {
            setLoading(true);
            await updateUserBill(billId, editData);
            setBill(editData);
            setEditing(false);
            setSuccess('Bill updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message || 'Failed to update bill');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setEditData(bill);
        setEditing(false);
    };

    const handleInputChange = (field, value) => {
        setEditData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Load reminder status and history
    const loadReminderStatus = useCallback(async () => {
        if (!user?.uid || !billId) return;
        
        try {
            const status = await getBillReminderStatus(user.uid, billId);
            setReminderStatus(status);

            if (status.hasReminder) {
                const history = await getBillReminderHistory(user.uid, billId);
                setReminderHistory(history);
            }
        } catch (err) {
            console.error('Error loading reminder status:', err);
        }
    }, [user?.uid, billId]);

    // Load reminders when bill changes
    useEffect(() => {
        if (bill && user?.uid) {
            loadReminderStatus();
        }
    }, [bill, user?.uid, loadReminderStatus]);

    // Send reminder email
    const handleSendReminderEmail = async () => {
        if (!user?.uid || !billId || (!bill?.supplierEmail && !user?.email)) {
            setError('Cannot send email: User email not configured');
            return;
        }

        try {
            setSendingEmail(true);
            setError('');

            // Prepare email data
            const recipientEmail = bill.supplierEmail || user.email;
            const deadline = new Date(bill.gstrDeadline);
            const now = new Date();
            const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

            const emailData = {
                email: recipientEmail,
                subject: `GST Filing Reminder: Invoice #${bill.invoiceNumber}`,
                body: `Dear,\n\nThis is a reminder for GST filing:\n\nInvoice Number: ${bill.invoiceNumber}\nSupplier: ${bill.supplierName || 'N/A'}\nAmount: ₹${bill.amount?.toFixed(2) || '0.00'}\nDeadline: ${deadline.toLocaleDateString()}\n\n${daysUntilDeadline === 0 ? 'The deadline is TODAY!' : daysUntilDeadline === 1 ? 'The deadline is TOMORROW!' : `The deadline is in ${daysUntilDeadline} days.`}\n\nPlease complete your GST filing at your earliest convenience.\n\nBest regards,\nGST Buddy Team`,
            };

            // Show sending alert
            setSuccess('📧 Sending reminder email...');

            // Send email
            const result = await sendReminderEmail(emailData);

            if (result.success) {
                // Record the email send
                await recordReminderEmailSent(user.uid, billId, recipientEmail, 'manual');

                // Update reminder status
                await loadReminderStatus();

                // Show success message
                setSuccess(`✅ Reminder email sent successfully to ${recipientEmail}!`);
                setTimeout(() => setSuccess(''), 4000);
            } else {
                setError(`❌ Failed to send email: ${result.error || 'Unknown error'}`);
            }
        } catch (err) {
            setError(`❌ Error: ${err.message || 'Failed to send reminder email'}`);
        } finally {
            setSendingEmail(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                color: isDarkMode ? '#e5e7eb' : '#1f2937',
            }}>
                Loading bill details...
            </div>
        );
    }

    if (!bill) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                flexDirection: 'column',
                gap: '20px',
                color: isDarkMode ? '#e5e7eb' : '#1f2937',
            }}>
                <p style={{ fontSize: '18px' }}>Bill not found</p>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                    }}
                >
                    ← Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: isDarkMode ? '#111827' : '#f9fafb',
            padding: '20px',
        }}>
            <div style={{
                maxWidth: '900px',
                margin: '0 auto',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '30px',
                }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
                            color: isDarkMode ? '#e5e7eb' : '#1f2937',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                        }}
                    >
                        ← Back
                    </button>
                    {!editing && (
                        <button
                            onClick={handleEdit}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            ✎ Edit
                        </button>
                    )}
                </div>

                {/* Messages */}
                {error && (
                    <div style={{
                        padding: '12px 16px',
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        borderRadius: '6px',
                        marginBottom: '20px',
                    }}>
                        {error}
                    </div>
                )}
                {success && (
                    <div style={{
                        padding: '12px 16px',
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                        borderRadius: '6px',
                        marginBottom: '20px',
                    }}>
                        {success}
                    </div>
                )}

                {/* Reminder Alert Box */}
                {reminderStatus?.hasReminder && (
                    <div style={{
                        padding: '16px 20px',
                        backgroundColor: reminderStatus.reminderType === 'overdue' 
                            ? '#fee2e2' 
                            : reminderStatus.reminderType === 'today' || reminderStatus.reminderType === 'tomorrow'
                            ? '#fef3c7'
                            : '#e0f2fe',
                        borderLeft: `4px solid ${
                            reminderStatus.reminderType === 'overdue' ? '#dc2626' :
                            reminderStatus.reminderType === 'today' || reminderStatus.reminderType === 'tomorrow' ? '#f59e0b' :
                            '#0284c7'
                        }`,
                        borderRadius: '6px',
                        marginBottom: '20px',
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                        }}>
                            <div>
                                <h3 style={{
                                    margin: '0 0 8px 0',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    color: reminderStatus.reminderType === 'overdue' 
                                        ? '#991b1b' 
                                        : reminderStatus.reminderType === 'today' || reminderStatus.reminderType === 'tomorrow'
                                        ? '#92400e'
                                        : '#0c4a6e',
                                }}>
                                    {reminderStatus.reminderType === 'overdue' ? '🚨 OVERDUE - URGENT' :
                                     reminderStatus.reminderType === 'today' ? '⏰ DUE TODAY' :
                                     reminderStatus.reminderType === 'tomorrow' ? '⏰ DUE TOMORROW' :
                                     reminderStatus.reminderType === 'three-days' ? '📅 DUE SOON' :
                                     '📅 UPCOMING DEADLINE'}
                                </h3>
                                <p style={{
                                    margin: '0 0 8px 0',
                                    fontSize: '14px',
                                    color: reminderStatus.reminderType === 'overdue' 
                                        ? '#991b1b' 
                                        : reminderStatus.reminderType === 'today' || reminderStatus.reminderType === 'tomorrow'
                                        ? '#92400e'
                                        : '#0c4a6e',
                                }}>
                                    {reminderStatus.daysText}
                                </p>
                                <p style={{
                                    margin: '0 0 8px 0',
                                    fontSize: '13px',
                                    color: reminderStatus.reminderType === 'overdue' 
                                        ? '#991b1b' 
                                        : reminderStatus.reminderType === 'today' || reminderStatus.reminderType === 'tomorrow'
                                        ? '#92400e'
                                        : '#0c4a6e',
                                }}>
                                    🗓️ Deadline: {reminderStatus.deadline}
                                </p>
                                {reminderStatus.lastSentEmail && (
                                    <p style={{
                                        margin: '0',
                                        fontSize: '12px',
                                        color: reminderStatus.reminderType === 'overdue' 
                                            ? '#991b1b' 
                                            : reminderStatus.reminderType === 'today' || reminderStatus.reminderType === 'tomorrow'
                                            ? '#92400e'
                                            : '#0c4a6e',
                                    }}>
                                        ✅ Last reminder sent to: {reminderStatus.lastSentEmail}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={handleSendReminderEmail}
                                disabled={sendingEmail}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: reminderStatus.reminderType === 'overdue' 
                                        ? '#dc2626'
                                        : reminderStatus.reminderType === 'today' || reminderStatus.reminderType === 'tomorrow'
                                        ? '#f59e0b'
                                        : '#0284c7',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: sendingEmail ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    whiteSpace: 'nowrap',
                                    opacity: sendingEmail ? 0.7 : 1,
                                }}
                            >
                                {sendingEmail ? '📧 Sending...' : '📧 Send Reminder'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Bill Details */}
                <div style={{
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    borderRadius: '12px',
                    padding: '30px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}>
                    <h1 style={{
                        marginTop: 0,
                        marginBottom: '30px',
                        fontSize: '28px',
                        fontWeight: '700',
                        color: isDarkMode ? '#f3f4f6' : '#1f2937',
                    }}>
                        Bill Details
                    </h1>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '20px',
                        marginBottom: '30px',
                    }}>
                        {/* Invoice Number */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: isDarkMode ? '#d1d5db' : '#4b5563',
                                marginBottom: '6px',
                            }}>
                                Invoice Number
                            </label>
                            {editing ? (
                                <input
                                    type="text"
                                    value={editData.invoiceNumber || ''}
                                    onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                                        color: isDarkMode ? '#e5e7eb' : '#1f2937',
                                        border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                    }}
                                />
                            ) : (
                                <p style={{
                                    margin: 0,
                                    padding: '10px 12px',
                                    backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                                    borderRadius: '6px',
                                    color: isDarkMode ? '#e5e7eb' : '#1f2937',
                                }}>
                                    {bill.invoiceNumber || 'N/A'}
                                </p>
                            )}
                        </div>

                        {/* Invoice Date */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: isDarkMode ? '#d1d5db' : '#4b5563',
                                marginBottom: '6px',
                            }}>
                                Invoice Date
                            </label>
                            {editing ? (
                                <input
                                    type="date"
                                    value={editData.invoiceDate?.split('T')[0] || ''}
                                    onChange={(e) => handleInputChange('invoiceDate', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                                        color: isDarkMode ? '#e5e7eb' : '#1f2937',
                                        border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                    }}
                                />
                            ) : (
                                <p style={{
                                    margin: 0,
                                    padding: '10px 12px',
                                    backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                                    borderRadius: '6px',
                                    color: isDarkMode ? '#e5e7eb' : '#1f2937',
                                }}>
                                    {bill.invoiceDate ? new Date(bill.invoiceDate).toLocaleDateString() : 'N/A'}
                                </p>
                            )}
                        </div>

                        {/* Supplier Name */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: isDarkMode ? '#d1d5db' : '#4b5563',
                                marginBottom: '6px',
                            }}>
                                Supplier Name
                            </label>
                            {editing ? (
                                <input
                                    type="text"
                                    value={editData.supplierName || ''}
                                    onChange={(e) => handleInputChange('supplierName', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                                        color: isDarkMode ? '#e5e7eb' : '#1f2937',
                                        border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                    }}
                                />
                            ) : (
                                <p style={{
                                    margin: 0,
                                    padding: '10px 12px',
                                    backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                                    borderRadius: '6px',
                                    color: isDarkMode ? '#e5e7eb' : '#1f2937',
                                }}>
                                    {bill.supplierName || bill.vendorName || 'N/A'}
                                </p>
                            )}
                        </div>

                        {/* Amount */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: isDarkMode ? '#d1d5db' : '#4b5563',
                                marginBottom: '6px',
                            }}>
                                Amount (₹)
                            </label>
                            {editing ? (
                                <input
                                    type="number"
                                    value={editData.amount || ''}
                                    onChange={(e) => handleInputChange('amount', parseFloat(e.target.value))}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                                        color: isDarkMode ? '#e5e7eb' : '#1f2937',
                                        border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                    }}
                                />
                            ) : (
                                <p style={{
                                    margin: 0,
                                    padding: '10px 12px',
                                    backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                                    borderRadius: '6px',
                                    color: isDarkMode ? '#e5e7eb' : '#1f2937',
                                }}>
                                    ₹ {bill.amount?.toFixed(2) || '0.00'}
                                </p>
                            )}
                        </div>

                        {/* GST Percentage */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: isDarkMode ? '#d1d5db' : '#4b5563',
                                marginBottom: '6px',
                            }}>
                                GST Percentage (%)
                            </label>
                            {editing ? (
                                <input
                                    type="number"
                                    value={editData.gstPercentage || ''}
                                    onChange={(e) => handleInputChange('gstPercentage', parseFloat(e.target.value))}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                                        color: isDarkMode ? '#e5e7eb' : '#1f2937',
                                        border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                    }}
                                />
                            ) : (
                                <p style={{
                                    margin: 0,
                                    padding: '10px 12px',
                                    backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                                    borderRadius: '6px',
                                    color: isDarkMode ? '#e5e7eb' : '#1f2937',
                                }}>
                                    {bill.gstPercentage || 'N/A'} %
                                </p>
                            )}
                        </div>

                        {/* GST Deadline */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: isDarkMode ? '#d1d5db' : '#4b5563',
                                marginBottom: '6px',
                            }}>
                                GST Filing Deadline
                            </label>
                            <p style={{
                                margin: 0,
                                padding: '10px 12px',
                                backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                                borderRadius: '6px',
                                color: isDarkMode ? '#e5e7eb' : '#1f2937',
                            }}>
                                {bill.gstrDeadline ? new Date(bill.gstrDeadline).toLocaleDateString() : 'N/A'}
                            </p>
                        </div>
                    </div>

                    {/* Additional Fields */}
                    <div style={{
                        marginBottom: '30px',
                    }}>
                        <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: isDarkMode ? '#d1d5db' : '#4b5563',
                            marginBottom: '6px',
                        }}>
                            Notes
                        </label>
                        {editing ? (
                            <textarea
                                value={editData.notes || ''}
                                onChange={(e) => handleInputChange('notes', e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                                    color: isDarkMode ? '#e5e7eb' : '#1f2937',
                                    border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    minHeight: '100px',
                                    fontFamily: 'inherit',
                                }}
                            />
                        ) : (
                            <p style={{
                                margin: 0,
                                padding: '10px 12px',
                                backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                                borderRadius: '6px',
                                color: isDarkMode ? '#e5e7eb' : '#1f2937',
                                whiteSpace: 'pre-wrap',
                            }}>
                                {bill.notes || 'No notes'}
                            </p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    {editing && (
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            justifyContent: 'flex-end',
                        }}>
                            <button
                                onClick={handleCancel}
                                disabled={loading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
                                    color: isDarkMode ? '#e5e7eb' : '#1f2937',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    opacity: loading ? 0.6 : 1,
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdate}
                                disabled={loading}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    opacity: loading ? 0.6 : 1,
                                }}
                            >
                                {loading ? 'Saving...' : '✓ Save Changes'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Reminder History */}
                {reminderHistory && reminderHistory.length > 0 && (
                    <div style={{
                        marginTop: '20px',
                        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                        borderRadius: '12px',
                        padding: '30px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}>
                        <h2 style={{
                            marginTop: 0,
                            marginBottom: '20px',
                            fontSize: '20px',
                            fontWeight: '700',
                            color: isDarkMode ? '#f3f4f6' : '#1f2937',
                        }}>
                            📧 Reminder Email History
                        </h2>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                        }}>
                            {reminderHistory.map((reminder, index) => (
                                <div 
                                    key={reminder.id || index}
                                    style={{
                                        padding: '12px 16px',
                                        backgroundColor: isDarkMode ? '#374151' : '#f9fafb',
                                        borderRadius: '6px',
                                        borderLeft: '4px solid #10b981',
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}>
                                        <div>
                                            <p style={{
                                                margin: '0 0 4px 0',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                color: isDarkMode ? '#e5e7eb' : '#1f2937',
                                            }}>
                                                ✅ Email sent to {reminder.emailSent}
                                            </p>
                                            <p style={{
                                                margin: 0,
                                                fontSize: '12px',
                                                color: isDarkMode ? '#9ca3af' : '#6b7280',
                                            }}>
                                                {reminder.sentDate?.toLocaleDateString()} at {reminder.sentDate?.toLocaleTimeString()}
                                            </p>
                                        </div>
                                        <span style={{
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#10b981',
                                            backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                        }}>
                                            {reminder.type === 'manual' ? '🤚 Manual' : '⏰ Automatic'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default BillDetails;
