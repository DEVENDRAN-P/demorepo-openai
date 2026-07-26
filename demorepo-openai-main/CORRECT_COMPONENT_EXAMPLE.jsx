/**
 * CORRECT Example Component - Email Data Isolation
 * 
 * Use this as a template for all pages that fetch email-specific data
 * The KEY is the [user?.email] dependency in useEffect
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
    setupEmailDataListener,
    saveEmailData,
    deleteEmailData,
    updateEmailData,
} from '@/services/userDatabaseService';

/**
 * Correct Pattern for Email-Based Data
 */
export function CorrectEmailDataComponent() {
    const { user, loading } = useAuth();
    const [bills, setBills] = useState({});
    const [componentLoading, setComponentLoading] = useState(true);
    const [error, setError] = useState(null);

    // ========================================
    // CRITICAL: Setup listener with email dependency
    // ========================================
    useEffect(() => {
        // 1. Check if user is loaded and has email
        if (!user?.email) {
            console.log('🔄 Waiting for user...');
            setBills({}); // Clear old data
            setComponentLoading(false);
            return;
        }

        console.log(`📡 Setting up listener for: ${user.email}`);
        setComponentLoading(true);
        setError(null);

        // 2. Setup real-time listener
        const unsubscribe = setupEmailDataListener(
            'bills',
            (data) => {
                console.log(`✅ Data received for ${user.email}:`, data);
                setBills(data || {});
                setComponentLoading(false);
            }
        );

        // 3. Cleanup function - IMPORTANT!
        return () => {
            console.log(`🔌 Cleaning up listener for: ${user.email}`);
            if (unsubscribe) {
                unsubscribe(); // Unsubscribe from listener
            }
        };
    }, [user?.email]); // ← KEY DEPENDENCY: Re-run when email changes!

    // Handle add bill
    const handleAddBill = async (billData) => {
        try {
            console.log(`💾 Saving bill for: ${user.email}`);
            const billId = await saveEmailData('bills', {
                ...billData,
                date: new Date().toISOString().split('T')[0],
            });

            console.log(`✅ Bill saved with ID: ${billId}`);
            // Note: Listener will automatically update bills state
        } catch (err) {
            console.error('❌ Error saving bill:', err);
            setError(`Failed to save bill: ${err.message}`);
        }
    };

    // Handle delete bill
    const handleDeleteBill = async (billId) => {
        try {
            console.log(`🗑️  Deleting bill: ${billId}`);
            await deleteEmailData('bills', billId);

            console.log(`✅ Bill deleted`);
            // Note: Listener will automatically update bills state
        } catch (err) {
            console.error('❌ Error deleting bill:', err);
            setError(`Failed to delete bill: ${err.message}`);
        }
    };

    // Handle update bill
    const handleUpdateBill = async (billId, updates) => {
        try {
            console.log(`✏️  Updating bill: ${billId}`);
            await updateEmailData('bills', billId, updates);

            console.log(`✅ Bill updated`);
            // Note: Listener will automatically update bills state
        } catch (err) {
            console.error('❌ Error updating bill:', err);
            setError(`Failed to update bill: ${err.message}`);
        }
    };

    // ========================================
    // Render
    // ========================================

    // Still loading auth context
    if (loading) {
        return (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-blue-600">🔄 Loading authentication...</p>
            </div>
        );
    }

    // No user logged in
    if (!user?.email) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
                <p className="text-red-600">❌ Please log in first</p>
            </div>
        );
    }

    // Component loading
    if (componentLoading) {
        return (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-yellow-600">
                    🔄 Loading bills for {user.email}...
                </p>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
                <p className="text-red-600">❌ {error}</p>
            </div>
        );
    }

    // Success state
    const billCount = Object.keys(bills).length;

    return (
        <div className="p-4">
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-green-700">
                    ✅ Connected to {user.email}
                </p>
                <p className="text-sm text-green-600">
                    {billCount} bill(s) loaded
                </p>
            </div>

            {/* Bills List */}
            {billCount === 0 ? (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded text-center">
                    <p className="text-gray-600">No bills yet</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {Object.entries(bills).map(([billId, bill]) => (
                        <div
                            key={billId}
                            className="p-4 bg-white border border-gray-200 rounded flex justify-between items-center"
                        >
                            <div>
                                <p className="font-semibold">{bill.description}</p>
                                <p className="text-sm text-gray-600">
                                    Amount: ₹{bill.amount} | Date: {bill.date}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Email: {bill.email}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() =>
                                        handleUpdateBill(billId, {
                                            status: bill.status === 'paid' ? 'pending' : 'paid',
                                        })
                                    }
                                    className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                    {bill.status === 'paid' ? 'Unpay' : 'Pay'}
                                </button>
                                <button
                                    onClick={() => handleDeleteBill(billId)}
                                    className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Bill Form */}
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded">
                <h3 className="font-semibold mb-3">Add New Bill</h3>

                <button
                    onClick={() =>
                        handleAddBill({
                            description: `Test Bill ${Date.now()}`,
                            amount: Math.floor(Math.random() * 10000),
                        })
                    }
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                    Add Sample Bill
                </button>
            </div>

            {/* Debug Info */}
            <div className="mt-6 p-3 bg-gray-100 rounded text-xs font-mono">
                <p className="font-semibold mb-2">📊 Debug Info:</p>
                <p>User Email: {user.email}</p>
                <p>User ID: {user.uid}</p>
                <p>Bills Count: {billCount}</p>
                <p>Component Loading: {componentLoading ? 'Yes' : 'No'}</p>
            </div>
        </div>
    );
}

/**
 * KEY POINTS:
 * 
 * 1. ✅ useEffect dependency includes [user?.email]
 *    - This re-runs the listener when user changes
 *    - Old listener is cleaned up automatically
 * 
 * 2. ✅ Clear data when no user
 *    - setBills({}) prevents showing old data
 * 
 * 3. ✅ Always unsubscribe in return
 *    - return () => unsubscribe() prevents memory leaks
 * 
 * 4. ✅ Use setupEmailDataListener instead of onEmailDataChange
 *    - Better error handling
 *    - Proper scoping
 * 
 * 5. ✅ Real-time updates automatically trigger re-render
 *    - Don't need to refetch manually
 *    - Changes appear instantly
 */

export default CorrectEmailDataComponent;
