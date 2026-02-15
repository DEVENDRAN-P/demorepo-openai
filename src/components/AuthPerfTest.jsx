import React, { useState } from 'react';
import { login, signup } from '../services/authService';

/**
 * Performance Test Page - Check login/signup speed
 */
function AuthPerfTest() {
    const [testResults, setTestResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [testEmail] = useState(`test-${Date.now()}@example.com`);
    const [testPassword] = useState('Test@12345');

    const addResult = (label, duration, status = 'success') => {
        setTestResults(prev => [...prev, {
            label,
            duration: `${duration.toFixed(2)}ms`,
            status,
            timestamp: new Date().toLocaleTimeString()
        }]);
    };

    const testSignup = async () => {
        setLoading(true);
        setTestResults([]);

        try {
            const startTime = performance.now();
            await signup(testEmail, testPassword, {
                name: 'Test User',
                shopName: 'Test Shop',
                gstin: '27AABCT1234H1Z0'
            });
            const duration = performance.now() - startTime;
            addResult('Signup Total', duration);
        } catch (error) {
            addResult('Signup Failed', 0, 'error');
        } finally {
            setLoading(false);
        }
    };

    const testLogin = async () => {
        setLoading(true);
        setTestResults([]);

        try {
            const startTime = performance.now();
            await login(testEmail, testPassword);
            const duration = performance.now() - startTime;
            addResult('Login Total', duration);
        } catch (error) {
            addResult('Login Failed', 0, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
            <h1>🔐 Auth Performance Test</h1>

            <div style={{ marginBottom: '2rem' }}>
                <p><strong>Test Email:</strong> {testEmail}</p>
                <p><strong>Test Password:</strong> {testPassword}</p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <button
                    onClick={testSignup}
                    disabled={loading}
                    style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.5 : 1
                    }}
                >
                    {loading ? '⏳ Testing...' : '📝 Test Signup'}
                </button>
                <button
                    onClick={testLogin}
                    disabled={loading}
                    style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.5 : 1
                    }}
                >
                    {loading ? '⏳ Testing...' : '🔑 Test Login'}
                </button>
            </div>

            {testResults.length > 0 && (
                <div style={{
                    backgroundColor: '#f3f4f6',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb'
                }}>
                    <h2 style={{ marginTop: 0 }}>📊 Results:</h2>
                    {testResults.map((result, idx) => (
                        <div
                            key={idx}
                            style={{
                                padding: '0.75rem',
                                marginBottom: '0.5rem',
                                backgroundColor: result.status === 'error' ? '#fee2e2' : '#ecfdf5',
                                borderLeft: `4px solid ${result.status === 'error' ? '#ef4444' : '#10b981'}`,
                                borderRadius: '0.25rem'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span><strong>{result.label}</strong></span>
                                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{result.timestamp}</span>
                            </div>
                            <div style={{ marginTop: '0.25rem', fontSize: '1.125rem', fontWeight: '600' }}>
                                {result.duration}
                            </div>
                        </div>
                    ))}
                    <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#dbeafe', borderRadius: '0.25rem' }}>
                        <strong>⚡ Performance Notes:</strong>
                        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem' }}>
                            <li>&lt; 500ms: ⚡ Excellent</li>
                            <li>500-1500ms: 👍 Good</li>
                            <li>1500-3000ms: ⚠️ Acceptable</li>
                            <li>&gt; 3000ms: 🐌 Slow</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AuthPerfTest;
