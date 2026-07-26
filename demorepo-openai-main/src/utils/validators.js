/**
 * Input Validation Utilities
 * Sanitize and validate user inputs
 */

/**
 * Sanitize string input to prevent XSS attacks
 * @param {string} input - Raw user input
 * @returns {string} - Sanitized input
 */
export const sanitizeString = (input) => {
  if (typeof input !== 'string') return '';

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - true if valid email
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - { valid: boolean, errors: string[] }
 */
export const validatePassword = (password) => {
  const errors = [];

  if (!password) {
    errors.push('Password is required');
  } else {
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - true if valid phone number
 */
export const validatePhone = (phone) => {
  const phoneRegex = /^[0-9]{10,}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

/**
 * Validate file size
 * @param {File} file - File to validate
 * @param {number} maxSizeMB - Maximum size in MB
 * @returns {object} - { valid: boolean, error: string }
 */
export const validateFileSize = (file, maxSizeMB = 10) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size must not exceed ${maxSizeMB}MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`,
    };
  }

  return {
    valid: true,
    error: null,
  };
};

/**
 * Validate file type
 * @param {File} file - File to validate
 * @param {string[]} allowedTypes - Allowed MIME types
 * @returns {object} - { valid: boolean, error: string }
 */
export const validateFileType = (file, allowedTypes = []) => {
  if (allowedTypes.length === 0) {
    return { valid: true, error: null };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  return {
    valid: true,
    error: null,
  };
};

/**
 * Validate GST number (Indian)
 * @param {string} gstNumber - GST number to validate
 * @returns {boolean} - true if valid GST number
 */
export const validateGSTNumber = (gstNumber) => {
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(gstNumber.toUpperCase());
};

/**
 * Validate PAN number (Indian)
 * @param {string} panNumber - PAN number to validate
 * @returns {boolean} - true if valid PAN number
 */
export const validatePANNumber = (panNumber) => {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(panNumber.toUpperCase());
};

/**
 * Sanitize number input
 * @param {any} input - Input to sanitize
 * @returns {number} - Sanitized number or 0
 */
export const sanitizeNumber = (input) => {
  const num = Number(input);
  return isNaN(num) ? 0 : num;
};

/**
 * Validate numeric range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {boolean} - true if in range
 */
export const isInRange = (value, min, max) => {
  const num = sanitizeNumber(value);
  return num >= min && num <= max;
};

/**
 * Batch validate form data
 * @param {object} formData - Form data to validate
 * @param {object} rules - Validation rules
 * @returns {object} - { valid: boolean, errors: object }
 */
export const validateForm = (formData, rules) => {
  const errors = {};

  for (const [field, rule] of Object.entries(rules)) {
    const value = formData[field];

    if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      errors[field] = `${field} is required`;
      continue;
    }

    if (rule.type === 'email' && value && !validateEmail(value)) {
      errors[field] = 'Invalid email format';
      continue;
    }

    if (rule.type === 'phone' && value && !validatePhone(value)) {
      errors[field] = 'Invalid phone number';
      continue;
    }

    if (rule.minLength && value && value.length < rule.minLength) {
      errors[field] = `${field} must be at least ${rule.minLength} characters`;
      continue;
    }

    if (rule.maxLength && value && value.length > rule.maxLength) {
      errors[field] = `${field} must not exceed ${rule.maxLength} characters`;
      continue;
    }

    if (rule.pattern && value && !rule.pattern.test(value)) {
      errors[field] = rule.patternMessage || `${field} format is invalid`;
      continue;
    }

    if (rule.custom && !rule.custom(value)) {
      errors[field] = rule.customMessage || `${field} is invalid`;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

export default {
  sanitizeString,
  validateEmail,
  validatePassword,
  validatePhone,
  validateFileSize,
  validateFileType,
  validateGSTNumber,
  validatePANNumber,
  sanitizeNumber,
  isInRange,
  validateForm,
};
