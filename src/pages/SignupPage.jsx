import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { signup, signupWithGoogle } from '../services/authService';
import { perf } from '../services/perfService';

function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    gstin: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();



  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const calculatePasswordStrength = (password) => {
    if (!password) return '';

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]+/)) strength++;
    if (password.match(/[A-Z]+/)) strength++;
    if (password.match(/[0-9]+/)) strength++;
    if (password.match(/[@$!%*?&]+/)) strength++;

    if (strength <= 1) return 'Weak';
    if (strength <= 2) return 'Fair';
    if (strength <= 3) return 'Good';
    if (strength <= 4) return 'Strong';
    return 'Very Strong';
  };

  const getStrengthColor = (strength) => {
    switch (strength) {
      case 'Weak': return 'bg-red-500';
      case 'Fair': return 'bg-orange-500';
      case 'Good': return 'bg-yellow-500';
      case 'Strong': return 'bg-green-500';
      case 'Very Strong': return 'bg-emerald-600';
      default: return 'bg-gray-300';
    }
  };

  const getStrengthTextColor = (strength) => {
    switch (strength) {
      case 'Weak': return 'text-red-500';
      case 'Fair': return 'text-orange-500';
      case 'Good': return 'text-yellow-600';
      case 'Strong': return 'text-green-600';
      case 'Very Strong': return 'text-emerald-700';
      default: return 'text-gray-500';
    }
  };

  const getStrengthPercentage = (strength) => {
    switch (strength) {
      case 'Weak': return 20;
      case 'Fair': return 40;
      case 'Good': return 60;
      case 'Strong': return 80;
      case 'Very Strong': return 100;
      default: return 0;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');

    // Real-time validation for specific fields
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }

    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // GSTIN validation (now required)
    if (!formData.gstin.trim()) {
      errors.gstin = 'GSTIN is required';
    } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstin)) {
      errors.gstin = 'Invalid GSTIN format';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    perf.clear();
    perf.start('SIGNUP_TOTAL');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Performance tracking: Firebase signup call
      perf.start('FIREBASE_SIGNUP');
      // Sign up using authService
      await signup(formData.email, formData.password, {
        name: formData.name,
        gstin: formData.gstin,
      });
      perf.end('FIREBASE_SIGNUP');

      // User is now authenticated after signup
      setSuccessMessage('Account created successfully! Redirecting to dashboard...');

      // Log performance after signup completes
      setTimeout(() => {
        perf.end('SIGNUP_TOTAL');
        perf.summary('🔐 SIGNUP PERFORMANCE', [
          'FIREBASE_SIGNUP',
          'SIGNUP_TOTAL'
        ]);
      }, 500);

      // Wait a moment for auth state to propagate, then redirect
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1500);

    } catch (err) {
      let errorMessage = 'Failed to create account. Please try again.';

      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Email already registered. Please login or use a different email.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Use at least 6 characters with mix of letters and numbers.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format.';
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMessage = 'Account creation is currently disabled. Please try again later.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      perf.start('GOOGLE_SIGNUP');
      await signupWithGoogle({});
      perf.end('GOOGLE_SIGNUP');

      setSuccessMessage('Account created successfully with Google! Redirecting to dashboard...');

      // Log performance after signup completes
      setTimeout(() => {
        perf.summary('🔐 GOOGLE SIGNUP PERFORMANCE', [
          'GOOGLE_SIGNUP'
        ]);
      }, 500);

      // Wait a moment for auth state to propagate, then redirect
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1500);

    } catch (err) {
      // IMMEDIATELY stop loading for instant user feedback
      setLoading(false);
      perf.end('GOOGLE_SIGNUP');

      // User cancelled the popup - silently ignore
      if (err.code === 'auth/popup-closed-by-user') {
        console.log('ℹ️ User cancelled Google sign-up popup');
        return;
      }

      let errorMessage = 'Google sign-up failed. Please try again.';

      // Log detailed error for debugging
      console.error('🔐 Google Sign-Up Error Details:', {
        code: err.code,
        message: err.message,
        customData: err.customData,
        email: err.email,
        credential: err.credential
      });

      if (err.code === 'auth/popup-blocked') {
        errorMessage = '❌ Pop-up was blocked. Please allow pop-ups and try again.';
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        errorMessage = '❌ An account with this email already exists.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = '❌ Network error. Check your connection.';
      } else if (err.code === 'auth/unauthorized-domain') {
        errorMessage = '❌ Domain not authorized in Firebase Console. See browser console for details.';
      } else if (err.code === 'auth/invalid-client-id') {
        errorMessage = '❌ Google configuration error. Please try again later.';
      } else if (err.message && err.message.includes('unauthorized_client')) {
        errorMessage = '❌ Domain not authorized. Add to Firebase Authentication → Settings.';
      } else if (err.message && err.message.includes('domain')) {
        errorMessage = '❌ Domain authorization error. Check Firebase console.';
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
      <div style={{
        position: 'absolute',
        top: '50%',
        right: '10%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle at center, rgba(42, 82, 152, 0.1) 0%, transparent 70%)',
        animation: 'float 30s ease-in-out infinite',
        zIndex: 0
      }}></div>

      {/* Signup Card */}
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '2rem',
        width: '100%',
        maxWidth: '550px',
        maxHeight: 'auto',
        overflowY: 'visible',
        boxShadow: '0 25px 70px rgba(30, 60, 114, 0.2)',
        position: 'relative',
        zIndex: 10,
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.6)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #3b82f6 100%)',
            boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)',
            marginBottom: '1rem'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#1e3c72',
            marginBottom: '0.3rem',
            letterSpacing: '-0.02em'
          }}>
            Create Account
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '500' }}>
            Join AI IN BUSINESS today
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-3 animate-fade-in">
          {/* Name Field */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e3c72', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Full Name *</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition transform focus:scale-105 ${fieldErrors.name ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-white'}`}
              onFocus={(e) => {
                if (!fieldErrors.name) {
                  e.target.style.borderColor = '#1e3c72';
                  e.target.style.boxShadow = '0 0 0 3px rgba(30,60,114,0.1)';
                }
              }}
              onBlur={(e) => {
                if (!fieldErrors.name) {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }
              }}
            />
            {fieldErrors.name && (
              <p className="text-red-500 text-xs mt-2 flex items-center gap-1 animate-fade-in">
                <span>⚠️</span> {fieldErrors.name}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e3c72', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span>Email Address *</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition transform focus:scale-105 ${fieldErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-white'}`}
              onFocus={(e) => {
                if (!fieldErrors.email) {
                  e.target.style.borderColor = '#1e3c72';
                  e.target.style.boxShadow = '0 0 0 3px rgba(30,60,114,0.1)';
                }
              }}
              onBlur={(e) => {
                if (!fieldErrors.email) {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }
              }}
            />
            {fieldErrors.email && (
              <p className="text-red-500 text-xs mt-2 flex items-center gap-1 animate-fade-in">
                <span>⚠️</span> {fieldErrors.email}
              </p>
            )}
          </div>

          {/* GSTIN Field */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e3c72', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="19" x2="12" y2="12" />
                <line x1="9" y1="16" x2="15" y2="16" />
              </svg>
              <span>GSTIN *</span>
            </label>
            <input
              type="text"
              name="gstin"
              value={formData.gstin}
              onChange={handleChange}
              placeholder="27AAHCT5055K1Z0"
              maxLength="15"
              className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition transform focus:scale-105 ${fieldErrors.gstin ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-white'}`}
              onFocus={(e) => {
                if (!fieldErrors.gstin) {
                  e.target.style.borderColor = '#1e3c72';
                  e.target.style.boxShadow = '0 0 0 3px rgba(30,60,114,0.1)';
                }
              }}
              onBlur={(e) => {
                if (!fieldErrors.gstin) {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }
              }}
            />
            {!fieldErrors.gstin && (
              <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                
              </p>
            )}
            {fieldErrors.gstin && (
              <p className="text-red-500 text-xs mt-2 flex items-center gap-1 animate-fade-in">
                <span>⚠️</span> {fieldErrors.gstin}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e3c72', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Password *</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition transform focus:scale-105 pr-12 ${fieldErrors.password ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-white'}`}
                onFocus={(e) => {
                  if (!fieldErrors.password) {
                    e.target.style.borderColor = '#1e3c72';
                    e.target.style.boxShadow = '0 0 0 3px rgba(30,60,114,0.1)';
                  }
                }}
                onBlur={(e) => {
                  if (!fieldErrors.password) {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: 0.6,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-red-500 text-xs mt-2 flex items-center gap-1 animate-fade-in">
                <span>⚠️</span> {fieldErrors.password}
              </p>
            )}

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="mt-3 animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-600 font-semibold">Strength:</p>
                  <span className={`text-xs font-bold ${getStrengthTextColor(passwordStrength)}`}>
                    {passwordStrength}
                  </span>
                </div>
                <div className="strength-meter">
                  <div
                    className={`strength-meter-fill ${getStrengthColor(passwordStrength)}`}
                    style={{ width: `${getStrengthPercentage(passwordStrength)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Mix uppercase, lowercase, numbers, and special characters for very strong password
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e3c72', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Confirm Password *</span>
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition transform focus:scale-105 ${fieldErrors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-white'}`}
              onFocus={(e) => {
                if (!fieldErrors.confirmPassword) {
                  e.target.style.borderColor = '#1e3c72';
                  e.target.style.boxShadow = '0 0 0 3px rgba(30,60,114,0.1)';
                }
              }}
              onBlur={(e) => {
                if (!fieldErrors.confirmPassword) {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }
              }}
            />
            {fieldErrors.confirmPassword && (
              <p className="text-red-500 text-xs mt-2 flex items-center gap-1 animate-fade-in">
                <span>⚠️</span> {fieldErrors.confirmPassword}
              </p>
            )}
            {formData.password && formData.confirmPassword && formData.password === formData.confirmPassword && (
              <p className="text-green-500 text-xs mt-2 flex items-center gap-1 animate-fade-in">
                <span>✅</span> Passwords match
              </p>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg text-sm flex items-start gap-3 animate-slide-in-up">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <div>
                <p className="font-semibold text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg text-sm flex items-start gap-3 animate-slide-in-up">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <div>
                <p className="font-semibold text-green-700">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || Object.keys(fieldErrors).length > 0}
            style={{
              width: '100%',
              padding: '0.95rem 1.4rem',
              borderRadius: '28px',
              border: 'none',
              background: (loading || Object.keys(fieldErrors).length > 0)
                ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
                : 'linear-gradient(135deg, #1459b6 0%, #1e3c72 50%, #3b82f6 100%)',
              color: 'white',
              fontSize: '1.06rem',
              fontWeight: 700,
              cursor: (loading || Object.keys(fieldErrors).length > 0) ? 'not-allowed' : 'pointer',
              boxShadow: '0 12px 36px rgba(30,60,114,0.25)',
              transition: 'all 0.25s ease',
              opacity: (loading || Object.keys(fieldErrors).length > 0) ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.8rem'
            }}
            onMouseEnter={(e) => {
              if (!loading && Object.keys(fieldErrors).length === 0) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 12px 30px rgba(59, 130, 246, 0.45)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.35)';
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid white',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }}></div>
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0' }}>
          <div style={{ flex: 1, height: '2px', background: 'linear-gradient(90deg, transparent, #e2e8f0, transparent)' }}></div>
          <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>OR</span>
          <div style={{ flex: 1, height: '2px', background: 'linear-gradient(90deg, transparent, #e2e8f0, transparent)' }}></div>
        </div>

        {/* Google Sign-Up Button */}
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={loading}
          style={{
            width: '100%',
            padding: '1.1rem',
            borderRadius: '12px',
            border: '2px solid #e2e8f0',
            background: 'white',
            color: '#1e3c72',
            fontSize: '1.05rem',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            opacity: loading ? 0.6 : 1,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.target.style.borderColor = '#3b82f6';
              e.target.style.background = '#f0f4f8';
              e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = '#e2e8f0';
            e.target.style.background = 'white';
            e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {loading ? 'Creating account with Google...' : 'Sign Up with Google'}
        </button>

        {/* Login Link */}
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.9rem', marginTop: '1rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{
            color: '#3b82f6',
            fontWeight: 'bold',
            textDecoration: 'none',
            transition: 'color 0.3s'
          }}
            onMouseEnter={(e) => e.target.style.color = '#2563eb'}
            onMouseLeave={(e) => e.target.style.color = '#3b82f6'}>
            Sign In →
          </Link>
        </p>

        {/* Terms Info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          fontSize: '0.75rem',
          color: '#64748b',
          fontWeight: '500',
          textAlign: 'center'
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Secured with Firebase
        </div>
      </div>

      {/* Add floating animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .strength-meter {
          width: 100%;
          height: 6px;
          background: #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
        }
        .strength-meter-fill {
          height: 100%;
          transition: width 0.3s ease;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}

export default SignupPage;
