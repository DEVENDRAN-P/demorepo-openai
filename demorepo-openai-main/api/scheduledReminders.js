/**
 * Vercel Serverless Function - Scheduled Bill Reminders
 *
 * Route: /api/scheduledReminders
 * Trigger: Vercel Cron Job (daily at 09:00 AM IST)
 *
 * This function:
 * 1. Checks all users' bills for approaching deadlines
 * 2. Sends automatic email reminders via Brevo SMTP
 * 3. Records sent reminders in Firestore
 * 4. Returns statistics
 */

const { FieldValue } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");
const { getDb, verifyCronAuth } = require("./lib/admin");

// Initializes Firebase Admin with explicit service-account credentials and
// fails clearly if they are missing (see lib/admin.js).
const db = getDb();

/**
 * Get configured Brevo transporter
 */
function getTransporter() {
  const brevoSmtpKey = process.env.BREVO_API_KEY;
  const brevoSmtpUser = "a26ddc001@smtp-brevo.com"; // Brevo SMTP username
  const senderEmail = process.env.EMAIL_FROM || "noreply@gstbuddy.app";

  if (!brevoSmtpKey) {
    throw new Error("BREVO_API_KEY not configured in environment variables");
  }

  return nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false, // TLS
    auth: {
      user: brevoSmtpUser,
      pass: brevoSmtpKey,
    },
  });
}

/**
 * Calculate days until due date
 */
function calculateDaysUntilDue(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

/**
 * Generate email content based on urgency
 */
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
    subject = `⚡ Urgent: GST Filing Due in ${daysUntilDue} Days - ${bill.supplierName || "Bill"}`;
    color = "#F59E0B";
  } else if (daysUntilDue <= 7) {
    urgency = "📌 REMINDER";
    subject = `📌 GST Filing Reminder - Due in ${daysUntilDue} Days`;
    color = "#3B82F6";
  } else {
    return null; // No reminder needed for bills with >7 days
  }

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .bill-details { background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid ${color}; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .label { font-weight: 600; color: #6b7280; }
        .value { text-align: right; color: #1f2937; }
        .action-button { background-color: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin: 0;">${urgency}</h2>
            <p style="margin: 10px 0 0 0; font-size: 14px;">Due: ${deadlineStr}</p>
        </div>

        <div class="content">
            <p>Hello,</p>

            <p>This is an automated reminder about your GST filing deadline.</p>

            <div class="bill-details">
                <div class="detail-row">
                    <span class="label">Bill</span>
                    <span class="value">${bill.supplierName || "N/A"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Invoice #</span>
                    <span class="value">${bill.invoiceNumber || "N/A"}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Amount</span>
                    <span class="value">₹${(bill.amount || 0).toFixed(2)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Tax Amount</span>
                    <span class="value">₹${(bill.taxAmount || 0).toFixed(2)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Due Date</span>
                    <span class="value" style="color: ${color}; font-weight: bold;">${deadlineStr}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Days Remaining</span>
                    <span class="value" style="color: ${color}; font-weight: bold;">${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}</span>
                </div>
            </div>

            <p><strong>Action Required:</strong> Please ensure your GST filing is completed before the deadline.</p>

            <a href="https://gstbuddy.app/bills" class="action-button">View Bill Details</a>

            <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">
                This is an automated reminder. Please do not reply to this email.<br>
                If you have any questions, visit the GST Buddy dashboard.
            </p>
        </div>

        <div class="footer">
            <p>GST Buddy © 2024 | Automatic Reminder System</p>
        </div>
    </div>
</body>
</html>
  `;

  const textBody = `
${urgency}
Due: ${deadlineStr}

Bill Details:
- Bill: ${bill.supplierName || "N/A"}
- Invoice #: ${bill.invoiceNumber || "N/A"}
- Amount: ₹${(bill.amount || 0).toFixed(2)}
- Tax Amount: ₹${(bill.taxAmount || 0).toFixed(2)}
- Due Date: ${deadlineStr}
- Days Remaining: ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}

Action Required: Please ensure your GST filing is completed before the deadline.

View Bill Details: https://gstbuddy.app/bills

---
This is an automated reminder. Please do not reply to this email.
  `;

  return {
    subject,
    html: htmlBody,
    text: textBody,
  };
}

/**
 * Check if reminder was already sent today for this bill
 */
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
    console.error("Error checking reminder history:", error);
    return false;
  }
}

/**
 * Main Vercel Serverless Function Handler
 */
module.exports = async (req, res) => {
  // Only allow GET and POST
  if (!["GET", "POST"].includes(req.method)) {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify authorization (Vercel Cron or Admin Key). Fails closed — there is
  // deliberately no environment bypass because this endpoint sends real emails.
  if (!verifyCronAuth(req)) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or missing authorization",
    });
  }

  console.log("🔔 [SCHEDULED REMINDERS] Starting bill reminder check...");
  console.log(`   Time: ${new Date().toISOString()}`);
  console.log(`   Method: ${req.method}`);

  let stats = {
    usersChecked: 0,
    billsChecked: 0,
    remindersQueued: 0,
    remindersSent: 0,
    emailErrors: 0,
    errors: [],
  };

  try {
    const transporter = getTransporter();

    // Get all users
    const usersSnapshot = await db.collection("users").get();
    stats.usersChecked = usersSnapshot.size;

    console.log(`   📊 Found ${usersSnapshot.size} users`);

    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const userEmail = userData.email;

      if (!userEmail) {
        console.log(`   ⚠️  User ${userId} has no email`);
        continue;
      }

      try {
        // Get user's bills
        const billsSnapshot = await db
          .collection("users")
          .doc(userId)
          .collection("bills")
          .get();

        stats.billsChecked += billsSnapshot.size;

        // Process each bill
        for (const billDoc of billsSnapshot.docs) {
          const bill = billDoc.data();
          bill.id = billDoc.id;

          // Check if bill has a deadline
          const dueDate = bill.gstrDeadline || bill.dueDate;
          if (!dueDate) {
            continue;
          }

          const daysUntilDue = calculateDaysUntilDue(dueDate);

          // Only send reminders for bills due within 7 days
          if (daysUntilDue > 7) {
            continue;
          }

          // Determine reminder type
          let reminderType = null;
          if (daysUntilDue < 0) reminderType = "overdue";
          else if (daysUntilDue === 0) reminderType = "today";
          else if (daysUntilDue === 1) reminderType = "one-day";
          else if (daysUntilDue <= 3) reminderType = "three-days";
          else if (daysUntilDue <= 7) reminderType = "one-week";

          if (!reminderType) continue;

          // Generate email content
          const emailContent = generateEmailContent(bill, daysUntilDue);
          if (!emailContent) continue;

          stats.remindersQueued++;

          // Check if already sent
          const alreadySent = await hasReminderBeenSent(
            userId,
            bill.id,
            reminderType
          );

          if (alreadySent) {
            console.log(
              `   ⏭️  ${bill.supplierName}: ${reminderType} already sent today`
            );
            continue;
          }

          try {
            // Send email
            const info = await transporter.sendMail({
              from: `"GST Buddy" <${process.env.EMAIL_FROM || "noreply@gstbuddy.app"}>`,
              to: userEmail,
              subject: emailContent.subject,
              html: emailContent.html,
              replyTo: "support@gstbuddy.app",
            });

            console.log(
              `   ✅ Email sent to ${userEmail} for ${bill.supplierName}`
            );

            // Record reminder in Firestore
            await db
              .collection("users")
              .doc(userId)
              .collection("emailReminders")
              .add({
                billId: bill.id,
                type: reminderType,
                subject: emailContent.subject,
                emailSent: userEmail,
                sentDate: FieldValue.serverTimestamp(),
                status: "sent",
                messageId: info.messageId,
              });

            // Update bill
            await db
              .collection("users")
              .doc(userId)
              .collection("bills")
              .doc(bill.id)
              .update({
                reminderSent: true,
                reminderSentDate: FieldValue.serverTimestamp(),
              });

            stats.remindersSent++;
          } catch (emailError) {
            stats.emailErrors++;
            const error = {
              userId,
              billId: bill.id,
              supplier: bill.supplierName,
              error: emailError.message,
            };
            stats.errors.push(error);
            console.error(`   ❌ Failed to send email:`, error);
          }
        }
      } catch (userError) {
        console.error(`   ❌ Error processing user ${userId}:`, userError);
        stats.errors.push({
          userId,
          error: userError.message,
        });
      }
    }

    console.log("✅ [SCHEDULED REMINDERS] Job completed!");
    console.log(`   Users checked: ${stats.usersChecked}`);
    console.log(`   Bills checked: ${stats.billsChecked}`);
    console.log(`   Reminders sent: ${stats.remindersSent}`);
    if (stats.errors.length > 0) {
      console.log(`   Errors: ${stats.errors.length}`);
    }

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("❌ [SCHEDULED REMINDERS] Fatal error:", error);
    stats.errors.push({ fatal: true, error: error.message });

    return res.status(500).json({
      success: false,
      error: error.message,
      stats,
    });
  }
};
