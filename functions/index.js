/**
 * Firebase Cloud Functions for GSTBuddy
 *
 * Deploy with: firebase deploy --only functions
 *
 * Environment variables needed:
 * - SENDGRID_API_KEY: Your SendGrid API key
 * - EMAIL_FROM: From email address (e.g., noreplygstbuddy@gmail.com)
 *
 * Set with: firebase functions:config:set sendgrid.api_key="YOUR_KEY" email.from="noreplygstbuddy@gmail.com"
 * Or in .env.local for emulator
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

// Export all functions
module.exports = {
  // Email reminder functions
  sendReminderEmail: emailReminders.sendReminderEmail,
  sendManualReminder: emailReminders.sendManualReminder,

  // Scheduled reminder functions
  scheduledBillReminder: scheduledReminders.scheduledBillReminder,
  triggerBillReminders: scheduledReminders.triggerBillReminders,
};
