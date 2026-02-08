import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../hooks/useAuth';
import { getUserBillById, updateUserBill } from '../services/firebaseDataService';

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
            </div>
        </div>
    );
}

export default BillDetails;
