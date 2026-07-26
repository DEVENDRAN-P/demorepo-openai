/**
 * Password Reset Service
 * Handles password reset email sending with proper configuration
 */

import { sendPasswordResetEmail as firebaseSendPasswordResetEmail, auth } from '../config/firebase';

/**
 * Send password reset email with proper configuration
 * @param {string} email - User's email address
 * @returns {Promise} Promise that resolves when email is sent
 */
export const sendPasswordResetEmail = async (email) => {
  try {
    // Get the origin URL for the reset link
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    
    // Configure action code settings
    const actionCodeSettings = {
      // URL where the app will handle the password reset
      url: `${origin}/login`,
      // Handle code in app instead of redirecting to auth domain
      handleCodeInApp: true,
    };

    console.log('📧 Sending password reset email to:', email);
    console.log('🔗 Reset link will redirect to:', actionCodeSettings.url);

    // Send the password reset email
    await firebaseSendPasswordResetEmail(auth, email, actionCodeSettings);

    console.log('✅ Password reset email sent successfully');

    return {
      success: true,
      message: `Password reset email sent to ${email}. Please check your inbox and spam folder.`,
    };
  } catch (error) {
    console.error('❌ Password reset error:', error.code, error.message);

    let errorMessage = 'Failed to send reset email. Please try again.';

    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email address.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email format.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many attempts. Please try again later.';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'Network error. Check your internet connection.';
    } else if (error.code === 'auth/missing-client-identifier') {
      errorMessage = 'Firebase configuration error. Please contact support.';
    }

    throw new Error(errorMessage);
  }
};

/**
 * Verify password reset code
 * @param {string} code - Reset code from email link
 * @returns {Promise} Promise that resolves with email
 */
export const verifyPasswordResetCode = async (code) => {
  try {
    const email = await auth.verifyPasswordResetCode(code);
    return {
      success: true,
      email,
    };
  } catch (error) {
    console.error('❌ Code verification error:', error.code, error.message);

    let errorMessage = 'Invalid or expired reset code.';

    if (error.code === 'auth/expired-action-code') {
      errorMessage = 'Password reset link has expired. Please request a new one.';
    } else if (error.code === 'auth/invalid-action-code') {
      errorMessage = 'Invalid reset link. Please request a new one.';
    }

    throw new Error(errorMessage);
  }
};

/**
 * Confirm password reset with new password
 * @param {string} code - Reset code from email link
 * @param {string} newPassword - New password
 * @returns {Promise} Promise that resolves when password is reset
 */
export const confirmPasswordReset = async (code, newPassword) => {
  try {
    await auth.confirmPasswordReset(code, newPassword);
    return {
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
    };
  } catch (error) {
    console.error('❌ Password confirmation error:', error.code, error.message);

    let errorMessage = 'Failed to reset password. Please try again.';

    if (error.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak. Use at least 6 characters.';
    } else if (error.code === 'auth/expired-action-code') {
      errorMessage = 'Password reset link has expired. Please request a new one.';
    } else if (error.code === 'auth/invalid-action-code') {
      errorMessage = 'Invalid reset link. Please request a new one.';
    }

    throw new Error(errorMessage);
  }
};

/**
 * Check if Firebase is properly configured for email
 * @returns {boolean} True if email is available
 */
export const isPasswordResetAvailable = () => {
  // Check if auth domain is configured
  const authDomain = process.env.REACT_APP_FIREBASE_AUTH_DOMAIN;
  
  if (!authDomain) {
    console.warn('⚠️ Firebase Auth Domain not configured');
    return false;
  }

  return true;
};

/**
 * Get Firebase email template configuration instructions
 * @returns {object} Configuration info
 */
export const getEmailTemplateInfo = () => {
  return {
    message: 'To enable password reset emails:',
    steps: [
      '1. Go to Firebase Console: https://console.firebase.google.com',
      '2. Select project: finalopenai-fc9c5',
      '3. Go to Authentication → Templates',
      '4. Find "Password reset" template',
      '5. Customize the email template (optional)',
      '6. Make sure "SMTP settings" are configured (optional, uses Firebase default)',
    ],
    note: 'Firebase sends emails from noreply@[PROJECT-ID].firebaseapp.com by default',
  };
};
