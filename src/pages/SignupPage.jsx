import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { signup } from '../services/authService';

function SignupPage() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    shopName: '',
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

    // GSTIN validation (if provided)
    if (formData.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstin)) {
      errors.gstin = 'Invalid GSTIN format';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      console.log('📝 Creating account for:', formData.email);

      // Sign up using authService
      const result = await signup(formData.email, formData.password, {
        name: formData.name,
        shopName: formData.shopName,
        gstin: formData.gstin,
      });

      console.log('✅ Account created successfully!');
      console.log('   User ID:', result.user.uid);
      console.log('   Email:', result.user.email);

      // User is now authenticated after signup
      setSuccessMessage('Account created successfully! Redirecting to dashboard...');

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
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
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
        padding: '3rem',
        width: '100%',
        maxWidth: '550px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 70px rgba(30, 60, 114, 0.2)',
        position: 'relative',
        zIndex: 10,
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.6)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: '#1e3c72',
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em'
          }}>
            Create Account
          </h1>
          <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: '500' }}>
            Join AI IN BUSINESS today
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4 animate-fade-in">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span>👤</span> Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition transform focus:scale-105 ${fieldErrors.name ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-white'
                }`}
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
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span>✉️</span> Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition transform focus:scale-105 ${fieldErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-white'
                }`}
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

          {/* Shop Name Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span>🏪</span> Shop/Business Name
            </label>
            <input
              type="text"
              name="shopName"
              value={formData.shopName}
              onChange={handleChange}
              placeholder="My Shop Name"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg outline-none transition transform focus:scale-105 bg-gray-50 hover:bg-white"
              onFocus={(e) => {
                e.target.style.borderColor = '#1e3c72';
                e.target.style.boxShadow = '0 0 0 3px rgba(30,60,114,0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* GSTIN Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span>📋</span> GSTIN (Optional)
            </label>
            <input
              type="text"
              name="gstin"
              value={formData.gstin}
              onChange={handleChange}
              placeholder="27AAHCT5055K1Z0"
              maxLength="15"
              className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition transform focus:scale-105 ${fieldErrors.gstin ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-white'
                }`}
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
            {fieldErrors.gstin && (
              <p className="text-red-500 text-xs mt-2 flex items-center gap-1 animate-fade-in">
                <span>⚠️</span> {fieldErrors.gstin}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">Format: 27AAHCT5055K1Z0</p>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span>🔐</span> Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition transform focus:scale-105 pr-12 ${fieldErrors.password ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-white'
                  }`}
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
                className="absolute right-4 top-3.5 text-gray-500 hover:text-purple-600 transition text-xl hover:scale-110 active:scale-95"
              >
                {showPassword ? '🙈' : '👁️'}
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
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span>✓</span> Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              className={`w-full px-4 py-3 border-2 rounded-lg outline-none transition transform focus:scale-105 ${fieldErrors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-white'
                }`}
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
              <span className="text-2xl flex-shrink-0">🚨</span>
              <div>
                <p className="font-semibold text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg text-sm flex items-start gap-3 animate-slide-in-up">
              <span className="text-2xl flex-shrink-0 animate-checkmark">✅</span>
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
              padding: '1.1rem',
              borderRadius: '12px',
              border: 'none',
              background: (loading || Object.keys(fieldErrors).length > 0)
                ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
                : 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #3b82f6 100%)',
              color: 'white',
              fontSize: '1.05rem',
              fontWeight: 'bold',
              cursor: (loading || Object.keys(fieldErrors).length > 0) ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 20px rgba(59, 130, 246, 0.35)',
              transition: 'all 0.3s ease',
              opacity: (loading || Object.keys(fieldErrors).length > 0) ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem'
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '2rem 0' }}>
          <div style={{ flex: 1, height: '2px', background: 'linear-gradient(90deg, transparent, #e2e8f0, transparent)' }}></div>
          <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>OR</span>
          <div style={{ flex: 1, height: '2px', background: 'linear-gradient(90deg, transparent, #e2e8f0, transparent)' }}></div>
        </div>

        {/* Login Link */}
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.95rem', marginTop: '1.5rem' }}>
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
          marginTop: '1.5rem',
          padding: '0.75rem 1.25rem',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          fontSize: '0.8rem',
          color: '#64748b',
          fontWeight: '500',
          textAlign: 'center'
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
