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
    switch(strength) {
      case 'Weak': return 'bg-red-500';
      case 'Fair': return 'bg-orange-500';
      case 'Good': return 'bg-yellow-500';
      case 'Strong': return 'bg-green-500';
      case 'Very Strong': return 'bg-emerald-600';
      default: return 'bg-gray-300';
    }
  };

  const getStrengthTextColor = (strength) => {
    switch(strength) {
      case 'Weak': return 'text-red-500';
      case 'Fair': return 'text-orange-500';
      case 'Good': return 'text-yellow-600';
      case 'Strong': return 'text-green-600';
      case 'Very Strong': return 'text-emerald-700';
      default: return 'text-gray-500';
    }
  };

  const getStrengthPercentage = (strength) => {
    switch(strength) {
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
      // Sign up using authService
      await signup(formData.email, formData.password, {
        name: formData.name,
        shopName: formData.shopName,
        gstin: formData.gstin,
      });
      
      setSuccessMessage('Account created successfully! A verification email has been sent. Redirecting to dashboard...');
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

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
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-white opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-white opacity-10 rounded-full translate-x-1/2 translate-y-1/2 animate-pulse"></div>

      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto relative z-10 animate-slide-in-up">
        {/* Header */}
        <div className="text-center mb-8 animate-slide-in-down">
          <div className="inline-block mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-3xl">🚀</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 mb-2">
            {t('app_name')}
          </h1>
          <p className="text-gray-600 text-sm">Create your account to get started</p>
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
              className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-4 focus:ring-purple-200 focus:border-purple-600 outline-none transition transform focus:scale-105 ${
                fieldErrors.name ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-white'
              }`}
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
              className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-4 focus:ring-purple-200 focus:border-purple-600 outline-none transition transform focus:scale-105 ${
                fieldErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-white'
              }`}
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
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-4 focus:ring-purple-200 focus:border-purple-600 outline-none transition transform focus:scale-105 bg-gray-50 hover:bg-white"
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
              className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-4 focus:ring-purple-200 focus:border-purple-600 outline-none transition transform focus:scale-105 ${
                fieldErrors.gstin ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-white'
              }`}
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
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-4 focus:ring-purple-200 focus:border-purple-600 outline-none transition transform focus:scale-105 pr-12 ${
                  fieldErrors.password ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-white'
                }`}
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
              className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-4 focus:ring-purple-200 focus:border-purple-600 outline-none transition transform focus:scale-105 ${
                fieldErrors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-white'
              }`}
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
            className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition transform hover:scale-105 hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 group relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              {loading ? (
                <>
                  <span className="animate-spin inline-block">⏳</span>
                  Creating account...
                </>
              ) : (
                <>
                  <span>✓</span> Create Account
                </>
              )}
            </span>
          </button>
        </form>

        {/* Divider */}
        <div className="mt-8 flex items-center gap-3">
          <div className="flex-1 border-t-2 border-gray-300"></div>
          <span className="text-gray-500 text-xs font-semibold">OR</span>
          <div className="flex-1 border-t-2 border-gray-300"></div>
        </div>

        {/* Login Link */}
        <p className="text-center text-gray-600 mt-6 text-sm animate-fade-in">
          Already have an account?{' '}
          <Link to="/login" className="text-purple-600 font-bold hover:text-pink-500 transition inline-flex items-center gap-1">
            Login here <span>→</span>
          </Link>
        </p>

        {/* Terms Info */}
        <p className="text-xs text-gray-500 text-center mt-4">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}

export default SignupPage;
