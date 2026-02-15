/**
 * DEPRECATED: This file is no longer used.
 *
 * The application now uses Brevo SMTP for email delivery via the Express
 * server in api/server.js (POST /api/sendEmail endpoint).
 *
 * See BREVO_EMAIL_SETUP.md for current email configuration.
 *
 * Migration path:
 * Old: api/sendEmail.js (Vercel serverless) → SendGrid API
 * New: api/server.js (Express.js) → Brevo SMTP
 *
 * For email implementation, use src/services/emailReminderService.js
 */

// This module is deprecated. Use the Brevo SMTP server instead.
module.exports = {
  deprecated: true,
  message: "Use api/server.js with Brevo SMTP instead",
  documentation: "See BREVO_EMAIL_SETUP.md",
};
