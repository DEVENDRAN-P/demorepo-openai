/**
 * Consolidated Reminders Serverless Function.
 *
 * This single Vercel function replaces the former separate endpoints:
 *   - /api/reminders           (scheduled reminders — GET/POST)
 *   - /api/scheduledReminders  (alias → scheduled task)
 *   - /api/checkOverdueBills   (alias → overdue task)
 *
 * The task is selected via the `task` query parameter (set by the rewrites
 * and crons in the root vercel.json) or inferred from the request path.
 *
 * Tasks:
 *   - scheduled — scans all users' bills for deadlines within 7 days and
 *                 emails reminders (due today / overdue / 1–7 days).
 *   - overdue   — finds bills that are past due and emails an urgent
 *                 overdue notification.
 *
 * Both tasks are triggered by Vercel Cron and require CRON_SECRET auth
 * (verifyCronAuth). Fails closed — there is deliberately no environment
 * bypass because these endpoints send real emails to real users.
 */

const { FieldValue } = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");
const { getDb, verifyCronAuth } = require("../lib/admin");

// Initializes Firebase Admin with explicit service-account credentials and
// fails clearly if they are missing (see lib/admin.js).
const db = getDb();

/**
 * Configure Brevo SMTP transporter
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
 * Calculate days until due date (negative = overdue)
 */
function calculateDaysUntilDue(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

// ===========================================================================
// TASK: scheduled reminders
// ===========================================================================

/**
 * Generate email content based on urgency level
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
 * Scheduled reminders task — email reminders for bills due within 7 days.
 */
async function runScheduledReminders() {
  console.log("🔔 [SCHEDULED REMINDERS] Starting bill reminder check...");
  console.log(`   Time: ${new Date().toISOString()}`);

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

    return stats;
  } catch (error) {
    // Fatal error (e.g. Brevo transporter failure, Firestore outage) — throw
    // with the partial stats attached so the router can respond 500 exactly
    // like the original endpoints did, instead of reporting a false success.
    console.error("❌ [SCHEDULED REMINDERS] Fatal error:", error);
    const wrapped = new Error(error.message || "Scheduled reminders failed");
    wrapped.stats = stats;
    throw wrapped;
  }
}

// ===========================================================================
// TASK: overdue bill check
// ===========================================================================

/**
 * Check if bill is overdue today (due date strictly in the past)
 */
function isOverdue(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  return due < today;
}

/**
 * Check days overdue
 */
function getDaysOverdue(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const daysOverdue = Math.ceil((today - due) / (1000 * 60 * 60 * 24));
  return Math.max(daysOverdue, 0);
}

/**
 * Generate overdue email content
 */
function generateOverdueEmail(bill, daysOverdue) {
  const dueDate = new Date(bill.gstrDeadline || bill.dueDate);
  const dueStr = dueDate.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const subject = `🚨 URGENT: Payment OVERDUE for ${bill.supplierName || "Bill"} - ${daysOverdue} days past due`;

  const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #DC2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #FEE2E2; padding: 20px; border-radius: 0 0 8px 8px; border: 2px solid #DC2626; }
        .bill-box { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #DC2626; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
        .row:last-child { border-bottom: none; }
        .label { font-weight: bold; color: #6b7280; }
        .value { text-align: right; color: #1f2937; }
        .action { background-color: #DC2626; color: white; padding: 12px 20px; text-align: center; margin: 20px 0; border-radius: 6px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin: 0; font-size: 24px;">🚨 PAYMENT OVERDUE</h2>
            <p style="margin: 10px 0 0 0; font-size: 16px;">${daysOverdue} Days Past Due!</p>
        </div>

        <div class="content">
            <h3 style="color: #DC2626; margin-top: 0;">Immediate Action Required</h3>

            <p style="color: #991B1B; font-weight: bold; font-size: 16px;">
                This bill was DUE on: ${dueStr}<br>
                It is NOW ${daysOverdue} DAYS OVERDUE
            </p>

            <div class="bill-box">
                <h4 style="margin-top: 0; color: #DC2626;">Bill Details:</h4>
                <div class="row">
                    <span class="label">Supplier:</span>
                    <span class="value">${bill.supplierName || "N/A"}</span>
                </div>
                <div class="row">
                    <span class="label">Invoice #:</span>
                    <span class="value">${bill.invoiceNumber || "N/A"}</span>
                </div>
                <div class="row">
                    <span class="label">Amount:</span>
                    <span class="value" style="color: #DC2626; font-weight: bold;">₹${(bill.amount || 0).toFixed(2)}</span>
                </div>
                <div class="row">
                    <span class="label">Due Date:</span>
                    <span class="value" style="color: #DC2626; font-weight: bold;">${dueStr}</span>
                </div>
                <div class="row">
                    <span class="label">Days Overdue:</span>
                    <span class="value" style="color: #DC2626; font-weight: bold; font-size: 18px;">${daysOverdue} DAYS</span>
                </div>
            </div>

            <h4 style="color: #991B1B;">⚠️ IMPORTANT:</h4>
            <ul style="color: #991B1B;">
                <li><strong>This payment is PAST DUE</strong></li>
                <li>Late charges may apply</li>
                <li>Immediate payment is required</li>
                <li>Contact supplier immediately if there are any issues</li>
            </ul>

            <div class="action">
                <strong>❗ PLEASE PAY IMMEDIATELY ❗</strong>
            </div>

            <p style="color: #6b7280; font-size: 12px; margin-bottom: 0;">
                This is an automated payment reminder sent to alert you of overdue bills.
                <br>Please take immediate action to avoid late payment penalties.
            </p>
        </div>
    </div>
</body>
</html>
  `;

  return { subject, html };
}

/**
 * Check if overdue email already sent today
 */
async function hasOverdueEmailBeenSent(userId, billId) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("emailReminders")
      .where("billId", "==", billId)
      .where("type", "==", "overdue")
      .where("sentDate", ">=", today)
      .limit(1)
      .get();

    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking email history:", error);
    return false;
  }
}

/**
 * Overdue check task — email an urgent notification for every overdue bill.
 */
async function runOverdueCheck() {
  console.log("\n📧 [OVERDUE CHECKER] Starting automatic overdue bill scan...");
  console.log(`   Time: ${new Date().toISOString()}\n`);

  let stats = {
    usersChecked: 0,
    billsChecked: 0,
    overdueFound: 0,
    emailsSent: 0,
    alreadySent: 0,
    errors: 0,
  };

  try {
    const transporter = getTransporter();

    // Get all users
    const usersSnapshot = await db.collection("users").get();
    stats.usersChecked = usersSnapshot.size;

    if (usersSnapshot.size === 0) {
      console.log("   ℹ️  No users found in database");
      return { success: true, stats };
    }

    // Check each user's bills
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const userEmail = userData.email;

      if (!userEmail) {
        console.log(`   ⚠️  User ${userId}: No email address`);
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

        // Check each bill for overdue status
        for (const billDoc of billsSnapshot.docs) {
          const bill = billDoc.data();
          bill.id = billDoc.id;

          // Get due date
          const dueDate = bill.gstrDeadline || bill.dueDate;
          if (!dueDate) {
            continue; // No due date, skip
          }

          // Check if overdue
          if (!isOverdue(dueDate)) {
            continue; // Not overdue yet
          }

          stats.overdueFound++;

          const daysOverdue = getDaysOverdue(dueDate);

          // Check if already sent today
          const alreadySent = await hasOverdueEmailBeenSent(userId, bill.id);
          if (alreadySent) {
            console.log(
              `   ⏭️  ${bill.supplierName}: Overdue email already sent today`
            );
            stats.alreadySent++;
            continue;
          }

          try {
            // Generate email
            const emailContent = generateOverdueEmail(bill, daysOverdue);

            // Send email
            const info = await transporter.sendMail({
              from: `"GST Buddy" <${process.env.EMAIL_FROM || "noreply@gstbuddy.app"}>`,
              to: userEmail,
              subject: emailContent.subject,
              html: emailContent.html,
            });

            console.log(
              `   ✅ SENT: ${bill.supplierName} (${daysOverdue} days overdue) → ${userEmail}`
            );

            // Record email sent
            await db
              .collection("users")
              .doc(userId)
              .collection("emailReminders")
              .add({
                billId: bill.id,
                type: "overdue",
                subject: emailContent.subject,
                emailSent: userEmail,
                sentDate: FieldValue.serverTimestamp(),
                daysOverdue: daysOverdue,
                status: "sent",
                messageId: info.messageId,
              });

            stats.emailsSent++;
          } catch (emailError) {
            stats.errors++;
            console.error(
              `   ❌ FAILED: ${bill.supplierName} - ${emailError.message}`
            );
          }
        }
      } catch (userError) {
        stats.errors++;
        console.error(`   ❌ Error processing user ${userId}:`, userError);
      }
    }

    console.log("\n✅ Overdue bill check completed!");
    console.log(`   📊 Users checked: ${stats.usersChecked}`);
    console.log(`   📋 Bills checked: ${stats.billsChecked}`);
    console.log(`   🚨 Overdue found: ${stats.overdueFound}`);
    console.log(`   📧 Emails sent: ${stats.emailsSent}`);
    console.log(`   ⏭️  Already sent today: ${stats.alreadySent}`);
    if (stats.errors > 0) {
      console.log(`   ❌ Errors: ${stats.errors}`);
    }
    console.log();

    return { success: true, stats };
  } catch (error) {
    console.error("❌ Fatal error:", error.message);
    stats.errors++;

    return {
      success: false,
      error: error.message,
      stats,
    };
  }
}

// ===========================================================================
// Router
// ===========================================================================

/**
 * Resolve which task to run. The `task` query parameter (set by vercel.json
 * rewrites / crons) wins; otherwise infer from the request path for
 * backwards compatibility with the old endpoint names.
 */
function resolveTask(req) {
  if (req.query && req.query.task) return req.query.task;
  const url = req.url || "";
  const path = url.split("?")[0];
  if (path.endsWith("/checkOverdueBills")) return "overdue";
  if (path.endsWith("/scheduledReminders")) return "scheduled";
  return "scheduled";
}

module.exports = async (req, res) => {
  const { handleCors, setCorsHeaders } = require("../lib/cors");
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req);

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

  const task = resolveTask(req);
  console.log(`🔔 [REMINDERS] Task: ${task}`);

  try {
    if (task === "overdue") {
      const result = await runOverdueCheck();
      return res.status(200).json(result);
    }

    // scheduled (default)
    const stats = await runScheduledReminders();
    return res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error("❌ [REMINDERS] Fatal error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stats: error.stats || undefined,
    });
  }
};
