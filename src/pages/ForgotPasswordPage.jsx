import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
import { perf } from '../services/perfService';

function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [emailError, setEmailError] = useState('');
    const navigate = useNavigate();

    // Real-time email validation
    const validateEmail = (value) => {
        if (!value) {
            setEmailError('Email is required');
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            setEmailError('Invalid email format');
            return false;
        }
        setEmailError('');
        return true;
    };

    const handleEmailChange = (e) => {
        const value = e.target.value;
        setEmail(value);
        if (value) {
            validateEmail(value);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        perf.clear();
        perf.start('PASSWORD_RESET_TOTAL');

        if (!validateEmail(email)) {
            return;
        }

        setLoading(true);

        try {
            perf.start('FIREBASE_RESET_EMAIL');
            await sendPasswordResetEmail(auth, email);
            perf.end('FIREBASE_RESET_EMAIL');

            setSuccessMessage('✅ Password reset email sent! Check your inbox for instructions.');
            setEmail('');

            // Log performance
            setTimeout(() => {
                perf.end('PASSWORD_RESET_TOTAL');
                perf.summary('🔐 PASSWORD RESET PERFORMANCE', [
                    'FIREBASE_RESET_EMAIL',
                    'PASSWORD_RESET_TOTAL'
                ]);
            }, 500);

            // Redirect after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setLoading(false);
            let errorMessage = 'Failed to send reset email. Please try again.';

            if (err.code === 'auth/user-not-found') {
                errorMessage = '❌ No account found with this email address.';
            } else if (err.code === 'auth/invalid-email') {
                errorMessage = '❌ Invalid email format.';
            } else if (err.code === 'auth/too-many-requests') {
                errorMessage = '❌ Too many attempts. Try again later.';
            } else if (err.code === 'auth/network-request-failed') {
                errorMessage = '❌ Network error. Check your internet connection.';
            }

            setError(errorMessage);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Animated floating background orbs */}
            <div style={{
                position: 'absolute',
                top: '-100px',
                left: '-100px',
                width: '600px',
                height: '600px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
                animation: 'float 20s ease-in-out infinite',
                zIndex: 0
            }}></div>
            <div style={{
                position: 'absolute',
                bottom: '-150px',
                right: '-150px',
                width: '700px',
                height: '700px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at center, rgba(30, 60, 114, 0.15) 0%, transparent 70%)',
                animation: 'float 25s ease-in-out infinite reverse',
                zIndex: 0
            }}></div>

            {/* Main Container */}
            <div style={{
                position: 'relative',
                zIndex: 10,
                width: '100%',
                maxWidth: '450px'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
                    padding: '2.5rem',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                    {/* Header */}
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '2rem'
                    }}>
                        <h1 style={{
                            fontSize: '1.875rem',
                            fontWeight: 'bold',
                            color: '#1e293b',
                            margin: '0 0 0.5rem 0'
                        }}>
                            Reset Password
                        </h1>
                        <p style={{
                            color: '#64748b',
                            fontSize: '0.875rem',
                            margin: 0
                        }}>
                            Enter your email and we'll send you a link to reset your password
                        </p>
                    </div>

                    {/* Success Message */}
                    {successMessage && (
                        <div style={{
                            padding: '1rem',
                            borderRadius: '8px',
                            background: '#f0fdf4',
                            border: '1px solid #86efac',
                            color: '#166534',
                            marginBottom: '1.5rem',
                            fontSize: '0.875rem'
                        }}>
                            {successMessage}
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            padding: '1rem',
                            borderRadius: '8px',
                            background: '#fef2f2',
                            border: '1px solid #fca5a5',
                            color: '#991b1b',
                            marginBottom: '1.5rem',
                            fontSize: '0.875rem'
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Reset Form */}
                    <form onSubmit={handleResetPassword} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.5rem'
                    }}>
                        {/* Email Input */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#1e293b',
                                marginBottom: '0.5rem'
                            }}>
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={handleEmailChange}
                                placeholder="you@example.com"
                                disabled={loading || !!successMessage}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    border: emailError ? '2px solid #ef4444' : '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    transition: 'all 0.3s ease',
                                    boxSizing: 'border-box',
                                    backgroundColor: loading ? '#f1f5f9' : 'white',
                                    cursor: loading ? 'not-allowed' : 'text',
                                    outline: 'none'
                                }}
                                onFocus={(e) => {
                                    if (!loading && !successMessage) {
                                        e.target.style.borderColor = '#3b82f6';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                                    }
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = emailError ? '#ef4444' : '#e2e8f0';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                            {emailError && (
                                <p style={{
                                    fontSize: '0.75rem',
                                    color: '#ef4444',
                                    marginTop: '0.25rem',
                                    margin: '0.25rem 0 0 0'
                                }}>
                                    {emailError}
                                </p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || !!successMessage}
                            style={{
                                width: '100%',
                                padding: '0.875rem',
                                background: loading || successMessage ? '#cbd5e1' : 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: loading || successMessage ? 'not-allowed' : 'pointer',
                                transition: 'all 0.3s ease',
                                opacity: loading || successMessage ? 0.7 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                            onMouseOver={(e) => {
                                if (!loading && !successMessage) {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 10px 25px rgba(59, 130, 246, 0.4)';
                                }
                            }}
                            onMouseOut={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = 'none';
                            }}
                        >
                            {loading ? (
                                <>
                                    <span style={{
                                        display: 'inline-block',
                                        width: '1rem',
                                        height: '1rem',
                                        border: '2px solid rgba(255, 255, 255, 0.3)',
                                        borderTop: '2px solid white',
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite'
                                    }} />
                                    Sending...
                                </>
                            ) : successMessage ? (
                                '✅ Redirecting to login...'
                            ) : (
                                'Send Reset Link'
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div style={{
                        position: 'relative',
                        margin: '2rem 0',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: 0,
                            right: 0,
                            height: '1px',
                            background: '#e2e8f0'
                        }}></div>
                        <span style={{
                            position: 'relative',
                            background: 'white',
                            padding: '0 1rem',
                            color: '#94a3b8',
                            fontSize: '0.875rem'
                        }}>
                            or
                        </span>
                    </div>

                    {/* Back to Login Link */}
                    <div style={{
                        textAlign: 'center'
                    }}>
                        <Link to="/login" style={{
                            color: '#3b82f6',
                            textDecoration: 'none',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            transition: 'color 0.3s ease'
                        }}
                            onMouseOver={(e) => e.target.style.color = '#1e40af'}
                            onMouseOut={(e) => e.target.style.color = '#3b82f6'}
                        >
                            Back to Login
                        </Link>
                    </div>
                </div>

                {/* Footer */}
                <p style={{
                    textAlign: 'center',
                    marginTop: '2rem',
                    color: '#64748b',
                    fontSize: '0.75rem'
                }}>
                    By resetting your password, you agree to our <Link to="#" style={{ color: '#3b82f6', textDecoration: 'none' }}>Terms of Service</Link>
                </p>
            </div>

            <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(20px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}

export default ForgotPasswordPage;
