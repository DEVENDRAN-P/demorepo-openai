#!/usr/bin/env node

/**
 * Manual Test Script for Scheduled Reminders
 * 
 * Usage:
 *   node triggerReminders.js
 * 
 * This simulates the Vercel cron job call to the scheduled reminders endpoint
 */

require("dotenv").config();
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Initialize Firebase
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

console.log("\n🔔 [MANUAL TRIGGER] Testing Scheduled Reminders...\n");

// Get transporter
function getTransporter() {
  const brevoSmtpKey = process.env.BREVO_API_KEY;
  const brevoSmtpUser = "a26ddc001@smtp-brevo.com";

  if (!brevoSmtpKey) {
    throw new Error("BREVO_API_KEY not configured");
  }

  return nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: brevoSmtpUser,
      pass: brevoSmtpKey,
    },
  });
}

// Calculate days
function calculateDaysUntilDue(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

// Generate email
function generateEmailContent(bill, daysUntilDue) {
  const dueDate = new Date(bill.gstrDeadline || bill.dueDate);
  const deadlineStr = dueDate.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let urgency = "";
  let subject = "";
  let color = "#3B82F6";

  if (daysUntilDue < 0) {
    urgency = "🚨 CRITICAL OVERDUE";
    subject = `🚨 CRITICAL: Payment Overdue - ${bill.supplierName || "Bill"}`;
    color = "#DC2626";
  } else if (daysUntilDue === 0) {
    urgency = "🚨 DUE TODAY";
    subject = `🚨 DUE TODAY: GST Filing Required - ${bill.supplierName || "Bill"}`;
    color = "#DC2626";
  } else if (daysUntilDue === 1) {
    urgency = "⏰ FINAL REMINDER";
    subject = `⏰ FINAL REMINDER: GST Filing Due Tomorrow - ${bill.supplierName || "Bill"}`;
    color = "#EA580C";
  } else if (daysUntilDue <= 3) {
    urgency = "⚡ URGENT";
    subject = `⚡ Urgent: GST Filing Due in ${daysUntilDue} Days`;
    color = "#F59E0B";
  } else if (daysUntilDue <= 7) {
    urgency = "📌 REMINDER";
    subject = `📌 GST Filing Reminder - Due in ${daysUntilDue} Days`;
    color = "#3B82F6";
  } else {
    return null;
  }

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: ${color}; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9fafb; padding: 20px; }
        .bill-details { background-color: white; padding: 15px; border-left: 4px solid ${color}; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>${urgency}</h2>
            <p>Due: ${deadlineStr}</p>
        </div>
        <div class="content">
            <p>This is an automated reminder about your GST filing deadline.</p>
            <div class="bill-details">
                <div class="detail-row"><strong>Bill:</strong> ${bill.supplierName || "N/A"}</div>
                <div class="detail-row"><strong>Invoice #:</strong> ${bill.invoiceNumber || "N/A"}</div>
                <div class="detail-row"><strong>Amount:</strong> ₹${(bill.amount || 0).toFixed(2)}</div>
                <div class="detail-row"><strong>Days Remaining:</strong> ${daysUntilDue}</div>
            </div>
            <p>Please ensure your GST filing is completed before the deadline.</p>
        </div>
    </div>
</body>
</html>
  `;

  return { subject, html: htmlBody };
}

// Check if already sent
async function hasReminderBeenSent(userId, billId, reminderType) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("emailReminders")
      .where("billId", "==", billId)
      .where("type", "==", reminderType)
      .where("sentDate", ">=", today)
      .limit(1)
      .get();

    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking history:", error);
    return false;
  }
}

// Main function
async function triggerReminders() {
  let stats = {
    usersChecked: 0,
    billsChecked: 0,
    remindersSent: 0,
    errors: [],
  };

  try {
    const transporter = getTransporter();
    const usersSnapshot = await db.collection("users").get();
    stats.usersChecked = usersSnapshot.size;

    console.log(`Found ${usersSnapshot.size} users\n`);

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const userEmail = userData.email;

      if (!userEmail) continue;

      const billsSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("bills")
        .get();

      stats.billsChecked += billsSnapshot.size;

      for (const billDoc of billsSnapshot.docs) {
        const bill = billDoc.data();
        bill.id = billDoc.id;

        const dueDate = bill.gstrDeadline || bill.dueDate;
        if (!dueDate) continue;

        const daysUntilDue = calculateDaysUntilDue(dueDate);

        if (daysUntilDue > 7) continue;

        let reminderType = null;
        if (daysUntilDue < 0) reminderType = "overdue";
        else if (daysUntilDue === 0) reminderType = "today";
        else if (daysUntilDue === 1) reminderType = "one-day";
        else if (daysUntilDue <= 3) reminderType = "three-days";
        else if (daysUntilDue <= 7) reminderType = "one-week";

        if (!reminderType) continue;

        const emailContent = generateEmailContent(bill, daysUntilDue);
        if (!emailContent) continue;

        const alreadySent = await hasReminderBeenSent(
          userId,
          bill.id,
          reminderType
        );

        if (alreadySent) {
          console.log(
            `⏭️  ${bill.supplierName} - ${reminderType} already sent`
          );
          continue;
        }

        try {
          const info = await transporter.sendMail({
            from: `"GST Buddy" <${process.env.EMAIL_FROM || "noreply@gstbuddy.app"}>`,
            to: userEmail,
            subject: emailContent.subject,
            html: emailContent.html,
          });

          console.log(
            `✅ SENT: ${emailContent.subject} → ${userEmail}`
          );

          // Record in Firestore
          await db
            .collection("users")
            .doc(userId)
            .collection("emailReminders")
            .add({
              billId: bill.id,
              type: reminderType,
              subject: emailContent.subject,
              emailSent: userEmail,
              sentDate: admin.firestore.FieldValue.serverTimestamp(),
              status: "sent",
              messageId: info.messageId,
            });

          stats.remindersSent++;
        } catch (emailError) {
          console.error(
            `❌ FAILED: ${bill.supplierName} - ${emailError.message}`
          );
          stats.errors.push({
            supplier: bill.supplierName,
            error: emailError.message,
          });
        }
      }
    }

    console.log("\n✅ Reminders Processing Complete!\n");
    console.log(`📊 Statistics:`);
    console.log(`   Users checked: ${stats.usersChecked}`);
    console.log(`   Bills checked: ${stats.billsChecked}`);
    console.log(`   Reminders sent: ${stats.remindersSent}`);
    if (stats.errors.length > 0) {
      console.log(`   Errors: ${stats.errors.length}`);
      stats.errors.forEach((err) => console.log(`     - ${err.supplier}: ${err.error}`));
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

triggerReminders();
