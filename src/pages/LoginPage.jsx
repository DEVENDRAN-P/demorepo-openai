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
    if (isAuthenticated && user) {
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

    try {
      // Sign in with Firebase Authentication using authService
      await login(email, password);
      
      // The AuthContext will automatically update the user state
      // and redirect will happen via the useEffect above
    } catch (err) {
      let errorMessage = 'Login failed. Please try again.';

      if (err.code === 'auth/user-not-found') {
        errorMessage = 'Email not registered. Please create an account first.';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format.';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later.';
      }

      setError(errorMessage);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-white opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-white opacity-10 rounded-full translate-x-1/2 translate-y-1/2 animate-pulse"></div>

      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10 animate-slide-in-up">
        {/* Header */}
        <div className="text-center mb-8 animate-slide-in-down">
          <div className="inline-block mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-3xl">📊</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 mb-2">
            {t('app_name')}
          </h1>
          <p className="text-gray-600 text-sm">GST Filing Made Simple</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 animate-fade-in">
          {/* Email Field */}
          <div className="group">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span>✉️</span> Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="you@example.com"
              required
              className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-4 focus:ring-purple-200 focus:border-purple-600 outline-none transition transform focus:scale-105 ${
                emailError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-white'
              }`}
            />
            {emailError && (
              <p className="text-red-500 text-xs mt-2 flex items-center gap-1 animate-fade-in">
                <span>⚠️</span> {emailError}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="group">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span>🔐</span> Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                required
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-4 focus:ring-purple-200 focus:border-purple-600 outline-none transition transform focus:scale-105 pr-12 ${
                  passwordError ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50 hover:bg-white'
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
            {passwordError && (
              <p className="text-red-500 text-xs mt-2 flex items-center gap-1 animate-fade-in">
                <span>⚠️</span> {passwordError}
              </p>
            )}
          </div>

          {/* Forgot Password Link */}
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs text-purple-600 font-semibold hover:text-pink-500 transition">
              Forgot password?
            </Link>
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || emailError || passwordError}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition transform hover:scale-105 hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 group relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              {loading ? (
                <>
                  <span className="animate-spin inline-block">⏳</span>
                  Logging in...
                </>
              ) : (
                <>
                  <span>✓</span> Login
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

        {/* Sign Up Link */}
        <p className="text-center text-gray-600 mt-6 text-sm animate-fade-in">
          Don't have an account?{' '}
          <Link to="/signup" className="text-purple-600 font-bold hover:text-pink-500 transition inline-flex items-center gap-1">
            Create one now <span>→</span>
          </Link>
        </p>

        {/* Security Info */}
        <p className="text-xs text-gray-500 text-center mt-4 flex items-center justify-center gap-1">
          🔒 Your data is protected by Firebase
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
