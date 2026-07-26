#!/usr/bin/env node

/**
 * Manual Test Script for Scheduled Bill Reminders
 *
 * Usage:
 *   npm install (if not already done)
 *   node scripts/testReminders.js
 *
 * This script:
 * 1. Loads environment variables
 * 2. Connects to Firebase
 * 3. Fetches all users and their bills
 * 4. Shows which reminders would be sent
 * 5. Optionally sends test emails
 *
 * Requirements:
 * - Firebase project credentials in .env
 * - Brevo SMTP credentials in .env
 * - node_modules installed
 */

require("dotenv").config();
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.cyan}===== ${msg} =====${colors.reset}\n`),
};

/**
 * Initialize Firebase Admin
 */
const initializeFirebase = () => {
  try {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    log.success("Firebase initialized");
    return true;
  } catch (error) {
    log.error(`Firebase initialization failed: ${error.message}`);
    return false;
  }
};

/**
 * Check Brevo credentials
 */
const checkBrevoConfig = () => {
  const brevoKey = process.env.BREVO_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;

  if (!brevoKey) {
    log.error("BREVO_API_KEY not set in environment");
    return false;
  }
  if (!emailFrom) {
    log.error("EMAIL_FROM not set in environment");
    return false;
  }

  log.success("Brevo credentials configured");
  log.info(`Email from: ${emailFrom}`);
  return true;
};

/**
 * Calculate days until due
 */
const calculateDaysUntilDue = (dueDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
};

/**
 * Determine reminder type based on days until due
 */
const getReminderType = (daysUntilDue) => {
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue === 0) return "today";
  if (daysUntilDue === 1) return "one-day";
  if (daysUntilDue <= 3) return "three-days";
  if (daysUntilDue <= 7) return "one-week";
  return null;
};

/**
 * Get emoji for reminder type
 */
const getEmoji = (type) => {
  const emojis = {
    "one-week": "📌",
    "three-days": "⚡",
    "one-day": "⏰",
    today: "🚨",
    overdue: "🚨",
  };
  return emojis[type] || "📧";
};

/**
 * Analyze bills and show which reminders would be sent
 */
const analyzeBills = async () => {
  log.section("Bill Analysis");

  const db = admin.firestore();
  let totalUsers = 0;
  let totalBills = 0;
  let billsNeedingReminders = [];

  try {
    const usersSnapshot = await db.collection("users").get();
    totalUsers = usersSnapshot.size;

    log.info(`Found ${totalUsers} users`);

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      log.info(`\nUser: ${userData.email || userId}`);

      const billsSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("bills")
        .get();

      totalBills += billsSnapshot.size;
      log.info(`  Bills: ${billsSnapshot.size}`);

      for (const billDoc of billsSnapshot.docs) {
        const bill = billDoc.data();
        const dueDate = bill.gstrDeadline || bill.dueDate;

        if (!dueDate) {
          log.warning(`  No due date: ${bill.supplierName || bill.invoiceNumber}`);
          continue;
        }

        const daysUntilDue = calculateDaysUntilDue(dueDate);
        const reminderType = getReminderType(daysUntilDue);

        if (reminderType) {
          const emoji = getEmoji(reminderType);
          billsNeedingReminders.push({
            userId,
            email: userData.email,
            billId: billDoc.id,
            supplier: bill.supplierName || "Unknown",
            invoiceNumber: bill.invoiceNumber || "N/A",
            amount: bill.amount || 0,
            daysUntilDue,
            reminderType,
            emoji,
            dueDate,
          });

          log.success(
            `  ${emoji} ${bill.supplierName || bill.invoiceNumber} (${daysUntilDue} days)`
          );
        } else {
          log.info(
            `  No reminder needed: ${bill.supplierName || bill.invoiceNumber} (${daysUntilDue} days)`
          );
        }
      }
    }
  } catch (error) {
    log.error(`Failed to analyze bills: ${error.message}`);
    return null;
  }

  return {
    totalUsers,
    totalBills,
    billsNeedingReminders,
  };
};

/**
 * Test email sending
 */
const testEmailSending = async (billData) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: "a26ddc001@smtp-brevo.com",
        pass: process.env.BREVO_API_KEY,
      },
    });

    // Test connection
    await transporter.verify();
    log.success("Brevo SMTP connection verified");

    // Send test email
    const testEmail = billData.email;
    const info = await transporter.sendMail({
      from: `"GST Buddy" <${process.env.EMAIL_FROM}>`,
      to: testEmail,
      subject: `${billData.emoji} TEST: Reminder for ${billData.supplier}`,
      html: `
        <h2>${billData.emoji} Test Reminder Email</h2>
        <p>This is a test email from the reminder system.</p>
        <p><strong>Bill Details:</strong></p>
        <ul>
          <li>Supplier: ${billData.supplier}</li>
          <li>Invoice: ${billData.invoiceNumber}</li>
          <li>Amount: ₹${billData.amount.toFixed(2)}</li>
          <li>Days Until Due: ${billData.daysUntilDue}</li>
          <li>Reminder Type: ${billData.reminderType}</li>
        </ul>
        <p>If you received this, the reminder system is working correctly!</p>
      `,
    });

    log.success(
      `Test email sent to ${testEmail} (Message ID: ${info.messageId})`
    );
    return true;
  } catch (error) {
    log.error(`Failed to send test email: ${error.message}`);
    return false;
  }
};

/**
 * Main execution
 */
const main = async () => {
  console.log(
    `${colors.bright}${colors.cyan}
╔══════════════════════════════════════════╗
║  Scheduled Bill Reminders - Test Script  ║
║                                          ║
║  This will analyze your bills and show   ║
║  which reminders would be sent today.    ║
╚══════════════════════════════════════════╝${colors.reset}\n`
  );

  // Step 1: Check configuration
  log.section("1. Configuration Check");
  const hasBrevo = checkBrevoConfig();
  const hasFirebase = initializeFirebase();

  if (!hasBrevo || !hasFirebase) {
    log.error("Configuration incomplete. Please set environment variables.");
    process.exit(1);
  }

  // Step 2: Analyze bills
  const analysis = await analyzeBills();
  if (!analysis) {
    process.exit(1);
  }

  // Step 3: Summary
  log.section("Summary");
  log.info(`Total Users: ${analysis.totalUsers}`);
  log.info(`Total Bills: ${analysis.totalBills}`);
  log.info(
    `Bills Needing Reminders: ${analysis.billsNeedingReminders.length}`
  );

  if (analysis.billsNeedingReminders.length === 0) {
    log.warning("No bills require reminders at this time");
    process.exit(0);
  }

  // Step 4: Show reminder details
  log.section("Reminders That Would Be Sent");
  analysis.billsNeedingReminders.forEach((bill, index) => {
    console.log(`\n${index + 1}. ${bill.emoji} ${bill.supplier}`);
    console.log(
      `   Recipient: ${bill.email}`
    );
    console.log(
      `   Type: ${bill.reminderType} (${bill.daysUntilDue} days)`
    );
    console.log(`   Invoice: ${bill.invoiceNumber}`);
    console.log(`   Amount: ₹${bill.amount.toFixed(2)}`);
  });

  // Step 5: Optional test email
  console.log(
    `\n${colors.yellow}Note: This is a preview only. No emails have been sent yet.${colors.reset}\n`
  );

  if (process.argv.includes("--send-test")) {
    log.section("Sending Test Email");
    if (analysis.billsNeedingReminders.length > 0) {
      const firstBill = analysis.billsNeedingReminders[0];
      const success = await testEmailSending(firstBill);

      if (!success) {
        process.exit(1);
      }
    }
  } else {
    log.info(
      "To send a test email, run: node scripts/testReminders.js --send-test"
    );
  }

  // Step 6: Done
  log.success("Analysis complete!");
  console.log(
    `\n${colors.bright}To actually send reminders, deploy to Vercel or manually call the /api/reminders endpoint.${colors.reset}\n`
  );

  process.exit(0);
};

// Run the script
main().catch((error) => {
  log.error(`Unexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
