/**
 * DEPRECATED: Firebase Cloud Functions for GSTBuddy
 *
 * This directory contains deprecated Firebase Cloud Functions that use SendGrid.
 *
 * Current approach:
 * - Use api/server.js (Express.js) instead
 * - Use Brevo SMTP for email delivery
 * - See BREVO_EMAIL_SETUP.md
 *
 * These functions are kept for backward compatibility only.
 * Do not deploy new versions of these functions.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Import and export all functions
const emailReminders = require("./emailReminders");
const scheduledReminders = require("./scheduledReminders");

// Export all functions (DEPRECATED - do not use)
module.exports = {
  // Email reminder functions (DEPRECATED)
  sendReminderEmail: emailReminders.sendReminderEmail,
  sendManualReminder: emailReminders.sendManualReminder,

  // Scheduled reminder functions (DEPRECATED)
  scheduledBillReminder: scheduledReminders.scheduledBillReminder,
  triggerBillReminders: scheduledReminders.triggerBillReminders,
};
