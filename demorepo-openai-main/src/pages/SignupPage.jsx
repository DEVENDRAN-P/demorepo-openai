import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { signup, login, loginWithGoogle } from '../services/authService';
import { perf } from '../services/perfService';

// Professional SVG Icons
const IconUser = ({ size = 18, color = "#4f46e5" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconBriefcase = ({ size = 18, color = "#4f46e5" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const IconPhone = ({ size = 18, color = "#4f46e5" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const IconMail = ({ size = 18, color = "#4f46e5" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const IconClipboard = ({ size = 18, color = "#4f46e5" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

const IconLock = ({ size = 18, color = "#4f46e5" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);



function SignupPage({ isLoginInitial = false }) {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [isLogin, setIsLogin] = useState(isLoginInitial);
  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    email: '',
    phone: '',
    gstin: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    setIsLogin(isLoginInitial);
  }, [isLoginInitial]);

  useEffect(() => {
    const plan = localStorage.getItem('selectedPlan') || 'free';
    setSelectedPlan(plan);
  }, []);

  const redirectAfterAuth = useCallback(() => {
    const authRedirect = localStorage.getItem('authRedirect');
    if (authRedirect) {
      localStorage.removeItem('authRedirect');
      navigate(authRedirect, { replace: true });
      return;
    }
    const plan = localStorage.getItem('selectedPlan') || 'free';
    if (plan === 'free') {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/checkout', { replace: true });
    }
  }, [navigate]);

  // Redirect if already logged in and onboarding plan checks match
  useEffect(() => {
    if (isAuthenticated && user) {
      redirectAfterAuth();
    }
  }, [isAuthenticated, user, redirectAfterAuth]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');

    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Full Name is required';
    }
    
    if (!formData.businessName.trim()) {
      errors.businessName = 'Business Name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(formData.phone.trim())) {
      errors.phone = 'Phone number must be exactly 10 digits';
    }

    if (formData.gstin.trim()) {
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstin.trim().toUpperCase())) {
        errors.gstin = 'Invalid GSTIN format';
      }
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!validateForm()) return;

    setLoading(true);
    perf.clear();
    perf.start('SIGNUP_TOTAL');

    try {
      perf.start('FIREBASE_SIGNUP');
      await signup(formData.email, formData.password, {
        name: formData.name,
        businessName: formData.businessName,
        phone: formData.phone,
        gstin: formData.gstin.toUpperCase(),
      });
      perf.end('FIREBASE_SIGNUP');

      setSuccessMessage('Account created successfully! Preparing onboarding...');
      perf.end('SIGNUP_TOTAL');

      setTimeout(() => {
        redirectAfterAuth();
      }, 1500);

    } catch (err) {
      let errorMessage = 'Failed to create account. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Email already registered. Please login instead.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use at least 6 characters.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = () => {
    const nextState = !isLogin;
    setIsLogin(nextState);
    navigate(nextState ? '/login' : '/signup');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError('Invalid email format');
      return;
    }
    if (!formData.password) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    perf.clear();
    perf.start('LOGIN_TOTAL');

    try {
      perf.start('FIREBASE_AUTH');
      await login(formData.email.trim(), formData.password);
      perf.end('FIREBASE_AUTH');

      setSuccessMessage('Logged in successfully! Redirecting...');
      perf.end('LOGIN_TOTAL');

      setTimeout(() => {
        redirectAfterAuth();
      }, 1500);

    } catch (err) {
      let errorMessage = 'Login failed. Please try again.';

      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        errorMessage = '❌ Invalid email or password. Please check your credentials.';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = '❌ Incorrect password. Please try again.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = '❌ Invalid email format.';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = '❌ This account has been disabled.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = '❌ Too many failed attempts. Try again later.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = '❌ Network error. Check your connection.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      await loginWithGoogle();
      setSuccessMessage(isLogin ? 'Logged in with Google successfully!' : 'Signed up with Google successfully!');

      setTimeout(() => {
        redirectAfterAuth();
      }, 1500);

    } catch (err) {
      setLoading(false);
      if (err.code === 'auth/popup-closed-by-user') return;
      setError('Google Sign In failed. Please try again.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      background: 'radial-gradient(circle at center, #0f1026 0%, #070514 100%)',
      position: 'relative',
      color: '#f8fafc',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Signup Panel */}
      <div style={{
        background: 'rgba(30, 27, 75, 0.45)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: '20px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(20px)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'white', margin: '0 0 0.5rem 0' }}>
            {isLogin ? 'Welcome Back' : 'Create Your Account'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
            {isLogin ? 'Sign in to AI GST & Compliance Buddy' : 'Setup compliance tracking in less than 2 minutes.'}
          </p>
        </div>

        {/* Selected Plan Banner */}
        <div style={{
          background: 'rgba(99, 102, 241, 0.12)',
          color: '#a5b4fc',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          fontSize: '0.85rem'
        }}>
          <div>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, display: 'block', opacity: 0.8, letterSpacing: '0.05em' }}>Selected Plan</span>
            <strong style={{ fontSize: '0.95rem' }}>
              {selectedPlan === 'free' ? 'Free Tier (₹0/mo)' : selectedPlan === 'pro' ? 'Pro Plan (₹199/mo)' : 'Business Plan (₹499/mo)'}
            </strong>
          </div>
          <button 
            type="button"
            onClick={() => navigate('/pricing')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#38bdf8',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Change Plan
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {successMessage && (
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            {successMessage}
          </div>
        )}

        <form onSubmit={isLogin ? handleLogin : handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Full Name */}
          {!isLogin && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#c7d2fe', marginBottom: '0.5rem' }}>
                <IconUser size={16} /> Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Devendran P."
                required={!isLogin}
                style={{ width: '100%', padding: '0.85rem 1.1rem', background: '#070514', border: fieldErrors.name ? '1px solid #f87171' : '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '10px', fontSize: '0.95rem', color: 'white', outline: 'none' }}
              />
              {fieldErrors.name && <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.35rem' }}>{fieldErrors.name}</p>}
            </div>
          )}

          {/* Business Name */}
          {!isLogin && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#c7d2fe', marginBottom: '0.5rem' }}>
                <IconBriefcase size={16} /> Business Name *
              </label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="e.g. Kirana Retail Traders"
                required={!isLogin}
                style={{ width: '100%', padding: '0.85rem 1.1rem', background: '#070514', border: fieldErrors.businessName ? '1px solid #f87171' : '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '10px', fontSize: '0.95rem', color: 'white', outline: 'none' }}
              />
              {fieldErrors.businessName && <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.35rem' }}>{fieldErrors.businessName}</p>}
            </div>
          )}

          {/* Email Address */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#c7d2fe', marginBottom: '0.5rem' }}>
              <IconMail size={16} /> Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. devendran@business.com"
              required
              style={{ width: '100%', padding: '0.85rem 1.1rem', background: '#070514', border: fieldErrors.email ? '1px solid #f87171' : '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '10px', fontSize: '0.95rem', color: 'white', outline: 'none' }}
            />
            {fieldErrors.email && <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.35rem' }}>{fieldErrors.email}</p>}
          </div>

          {/* Phone Number */}
          {!isLogin && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#c7d2fe', marginBottom: '0.5rem' }}>
                <IconPhone size={16} /> Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                required={!isLogin}
                style={{ width: '100%', padding: '0.85rem 1.1rem', background: '#070514', border: fieldErrors.phone ? '1px solid #f87171' : '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '10px', fontSize: '0.95rem', color: 'white', outline: 'none' }}
              />
              {fieldErrors.phone && <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.35rem' }}>{fieldErrors.phone}</p>}
            </div>
          )}

          {/* GSTIN (Optional) */}
          {!isLogin && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#c7d2fe', marginBottom: '0.5rem' }}>
                <IconClipboard size={16} /> GSTIN (Optional)
              </label>
              <input
                type="text"
                name="gstin"
                value={formData.gstin}
                onChange={handleChange}
                placeholder="e.g. 27AAHCT5055K1Z0"
                maxLength="15"
                style={{ width: '100%', padding: '0.85rem 1.1rem', background: '#070514', border: fieldErrors.gstin ? '1px solid #f87171' : '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '10px', fontSize: '0.95rem', color: 'white', outline: 'none' }}
              />
              {fieldErrors.gstin && <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.35rem' }}>{fieldErrors.gstin}</p>}
            </div>
          )}

          {/* Password */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#c7d2fe', margin: 0 }}>
                <IconLock size={16} /> Password *
              </label>
              {isLogin && (
                <Link to="/forgot-password" style={{ color: '#38bdf8', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 500 }}>
                  Forgot password?
                </Link>
              )}
            </div>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Min 6 characters"
              required
              style={{ width: '100%', padding: '0.85rem 1.1rem', background: '#070514', border: fieldErrors.password ? '1px solid #f87171' : '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '10px', fontSize: '0.95rem', color: 'white', outline: 'none' }}
            />
            {fieldErrors.password && <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.35rem' }}>{fieldErrors.password}</p>}
          </div>

          {/* Confirm Password */}
          {!isLogin && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#c7d2fe', marginBottom: '0.5rem' }}>
                <IconLock size={16} /> Confirm Password *
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Retype password"
                required={!isLogin}
                style={{ width: '100%', padding: '0.85rem 1.1rem', background: '#070514', border: fieldErrors.confirmPassword ? '1px solid #f87171' : '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '10px', fontSize: '0.95rem', color: 'white', outline: 'none' }}
              />
              {fieldErrors.confirmPassword && <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.35rem' }}>{fieldErrors.confirmPassword}</p>}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '1rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: 'white',
              border: 'none',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: loading ? 'default' : 'pointer',
              marginTop: '1rem',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)'
            }}
          >
            {loading ? (isLogin ? 'Signing In...' : 'Creating Account...') : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        {/* Google Register */}
        <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }}></div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{isLogin ? 'OR SIGN IN WITH' : 'OR REGISTER WITH'}</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }}></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.85rem',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.58 15.02 1 12 1 7.35 1 3.37 3.68 1.48 7.6l3.87 3C6.27 7.55 8.91 5.04 12 5.04z"/>
            <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.27H12v4.51h6.44c-.28 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-2 3.73-4.94 3.73-8.69z"/>
            <path fill="#FBBC05" d="M5.35 14.4c-.25-.75-.39-1.56-.39-2.4s.14-1.65.39-2.4l-3.87-3C.68 8.24 0 10.04 0 12s.68 3.76 1.48 5.4l3.87-3z"/>
            <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.7-2.87c-1.03.69-2.35 1.1-4.26 1.1-3.09 0-5.73-2.51-6.65-5.56l-3.87 3C3.37 20.32 7.35 23 12 23z"/>
          </svg>
          {isLogin ? 'Sign In with Google' : 'Google Sign In'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8', marginTop: '1.75rem', marginBottom: 0 }}>
          {isLogin ? (
            <>
              Don't have an account? <Link to="/signup" onClick={handleToggleMode} style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>Create Account →</Link>
            </>
          ) : (
            <>
              Already have an account? <Link to="/login" onClick={handleToggleMode} style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>Log In</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default SignupPage;
