import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { login } from '../services/authService';

function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    console.log('LoginPage - Auth State:', { isAuthenticated, userEmail: user?.email });
    if (isAuthenticated && user) {
      console.log('✅ User authenticated, navigating to dashboard...');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

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

  // Real-time password validation
  const validatePassword = (value) => {
    if (!value) {
      setPasswordError('Password is required');
      return false;
    }
    if (value.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (value) {
      validatePassword(value);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    // Validate form
    if (!validateEmail(email)) {
      return;
    }
    if (!validatePassword(password)) {
      return;
    }

    setLoading(true);
    console.log('🔐 Starting login process...');
    console.log('   Email:', email);

    try {
      // Sign in with Firebase Authentication - this will trigger AuthContext update
      const userCredential = await login(email, password);
      console.log('✅ Firebase login successful!');
      console.log('   User ID:', userCredential.user.uid);
      console.log('   Email:', userCredential.user.email);
      console.log('   Waiting for AuthContext to update...');

      // AuthContext's onAuthStateChanged will detect the login
      // and automatically update isAuthenticated state
      // The useEffect above will handle navigation when state updates

    } catch (err) {
      setLoading(false);
      let errorMessage = 'Login failed. Please try again.';

      if (err.code === 'auth/user-not-found') {
        errorMessage = '❌ Email not registered. Please sign up first.';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = '❌ Incorrect password. Please try again.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = '❌ Invalid email format.';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = '❌ This account has been disabled.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = '❌ Too many failed attempts. Try again later.';
      } else if (err.code === 'auth/invalid-credential') {
        errorMessage = '❌ Invalid email or password. Please check your credentials.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = '❌ Network error. Check your connection.';
      }

      setError(errorMessage);
      console.error('❌ Login error:', err.code, err.message);
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

      {/* Login Card */}
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '3rem',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 25px 70px rgba(30, 60, 114, 0.2)',
        position: 'relative',
        zIndex: 10,
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.6)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #3b82f6 100%)',
            boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)',
            marginBottom: '1.5rem'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: '#1e3c72',
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em'
          }}>
            Welcome Back
          </h1>
          <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: '500' }}>
            Sign in to AI IN BUSINESS
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ marginTop: '2rem' }}>
          {/* Email Field */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#1e3c72',
              marginBottom: '0.6rem',
              letterSpacing: '0.01em'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="your@email.com"
              required
              style={{
                width: '100%',
                padding: '1rem 1.2rem',
                border: emailError ? '2px solid #ef4444' : '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.3s ease',
                backgroundColor: emailError ? '#fef2f2' : 'white',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
              }}
              onFocus={(e) => {
                if (!emailError) {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                }
              }}
              onBlur={(e) => {
                if (!emailError) {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                }
              }}
            />
            {emailError && (
              <p style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#ef4444',
                fontSize: '0.85rem',
                marginTop: '0.5rem',
                fontWeight: '500'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {emailError}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#1e3c72',
              marginBottom: '0.6rem',
              letterSpacing: '0.01em'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '1rem 3rem 1rem 1.2rem',
                  border: passwordError ? '2px solid #ef4444' : '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  backgroundColor: passwordError ? '#fef2f2' : 'white',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                }}
                onFocus={(e) => {
                  if (!passwordError) {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                  }
                }}
                onBlur={(e) => {
                  if (!passwordError) {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '1rem',
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
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}>
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
            {passwordError && (
              <p style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#ef4444',
                fontSize: '0.85rem',
                marginTop: '0.5rem',
                fontWeight: '500'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {passwordError}
              </p>
            )}
          </div>

          {/* Forgot Password Link */}
          <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
            <Link to="/forgot-password" style={{
              color: '#3b82f6',
              fontSize: '0.9rem',
              fontWeight: '600',
              textDecoration: 'none',
              transition: 'color 0.3s'
            }}
              onMouseEnter={(e) => e.target.style.color = '#2563eb'}
              onMouseLeave={(e) => e.target.style.color = '#3b82f6'}>
              Forgot password?
            </Link>
          </div>

          {/* Error Alert */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              padding: '1rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem',
              marginBottom: '1.5rem'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <p style={{ color: '#dc2626', fontWeight: '500', fontSize: '0.9rem', margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || emailError || passwordError}
            style={{
              width: '100%',
              padding: '1.1rem',
              borderRadius: '12px',
              border: 'none',
              background: loading || emailError || passwordError
                ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
                : 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #3b82f6 100%)',
              color: 'white',
              fontSize: '1.05rem',
              fontWeight: 'bold',
              cursor: (loading || emailError || passwordError) ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 20px rgba(59, 130, 246, 0.35)',
              transition: 'all 0.3s ease',
              opacity: (loading || emailError || passwordError) ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem'
            }}
            onMouseEnter={(e) => {
              if (!loading && !emailError && !passwordError) {
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
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '2rem 0' }}>
          <div style={{ flex: 1, height: '2px', background: 'linear-gradient(90deg, transparent, #e2e8f0, transparent)' }}></div>
          <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>OR</span>
          <div style={{ flex: 1, height: '2px', background: 'linear-gradient(90deg, transparent, #e2e8f0, transparent)' }}></div>
        </div>

        {/* Sign Up Link */}
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.95rem', marginTop: '1.5rem' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{
            color: '#3b82f6',
            fontWeight: 'bold',
            textDecoration: 'none',
            transition: 'color 0.3s'
          }}
            onMouseEnter={(e) => e.target.style.color = '#2563eb'}
            onMouseLeave={(e) => e.target.style.color = '#3b82f6'}>
            Create Account →
          </Link>
        </p>

        {/* Security Info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          marginTop: '1.5rem',
          padding: '0.75rem 1.25rem',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          fontSize: '0.8rem',
          color: '#64748b',
          fontWeight: '500'
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      `}</style>
    </div>
  );
}

export default LoginPage;
