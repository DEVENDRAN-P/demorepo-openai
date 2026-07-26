/**
 * Vercel Serverless Function Endpoint: Scheduled Bill Reminders
 *
 * Route: /api/reminders
 * Method: GET, POST
 * Trigger: Vercel Cron (daily at 09:00 IST - see vercel.json)
 *
 * This endpoint:
 * 1. Checks all users' bills for approaching due dates
 * 2. Sends automatic email reminders via Brevo SMTP
 * 3. Records sent reminders in Firestore
 * 4. Returns statistics about reminders sent
 *
 * Response Example:
 * {
 *   "success": true,
 *   "stats": {
 *     "usersChecked": 10,
 *     "billsChecked": 45,
 *     "remindersSent": 8,
 *     "errors": []
 *   }
 * }
 */

const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Configure Brevo SMTP transporter
 */
const getTransporter = () => {
  const brevoSmtpKey = process.env.BREVO_API_KEY;
  const brevoSmtpUser = "a26ddc001@smtp-brevo.com";
  const senderEmail = process.env.EMAIL_FROM || "noreply@gstbuddy.app";

  if (!brevoSmtpKey) {
    throw new Error("BREVO_API_KEY not configured in environment");
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
};

/**
 * Calculate days until bill is due
 */
const calculateDaysUntilDue = (dueDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
};

/**
 * Generate email content based on urgency level
 */
const generateEmailContent = (bill, daysUntilDue) => {
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
    return null; // No reminder for bills >7 days out
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
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
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
                    <span class="label">Due Date</span>
                    <span class="value" style="color: ${color}; font-weight: bold;">${deadlineStr}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Days Remaining</span>
                    <span class="value" style="color: ${color}; font-weight: bold;">${daysUntilDue}</span>
                </div>
            </div>

            <p>Please ensure your GST filing is completed before the deadline.</p>

            <a href="https://gstbuddy.app" class="action-button">View Dashboard</a>

            <div class="footer">
                <p>This is an automated reminder. Do not reply to this email.</p>
            </div>
        </div>
    </div>
</body>
</html>
  `;

  return {
    subject,
    html: htmlBody,
  };
};

/**
 * Main handler function
 */
module.exports = async (req, res) => {
  // Only allow GET and POST
  if (!["GET", "POST"].includes(req.method)) {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify authorization (Vercel Cron or Admin Key)
  const authHeader = req.headers.authorization;
  const cron_secret = process.env.CRON_SECRET;
  const admin_key = process.env.ADMIN_KEY;

  const isVercelCron = cron_secret && authHeader === `Bearer ${cron_secret}`;
  const hasAdminKey =
    admin_key &&
    (req.query.adminKey === admin_key || req.headers["x-admin-key"] === admin_key);

  // For GET requests, also check for dev mode
  const isDev = process.env.NODE_ENV === "development";

  if (!isVercelCron && !hasAdminKey && !(isDev && req.method === "GET")) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or missing authorization",
    });
  }

  Console.log("🔔 [SCHEDULED REMINDERS] Starting...");

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

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const userEmail = userData.email;

      if (!userEmail) continue;

      try {
        const billsSnapshot = await db
          .collection("users")
          .doc(userId)
          .collection("bills")
          .get();

        stats.billsChecked += billsSnapshot.size;

        for (const billDoc of billsSnapshot.docs) {
          const bill = billDoc.data();
          bill.id = billDoc.id;

          if (!bill.gstrDeadline && !bill.dueDate) continue;

          const dueDate = bill.gstrDeadline || bill.dueDate;
          const daysUntilDue = calculateDaysUntilDue(dueDate);

          // Only process bills due within 7 days
          if (daysUntilDue > 7) continue;

          // Skip past reminders
          if (bill.reminderSent && daysUntilDue > 0) continue;

          const emailContent = generateEmailContent(bill, daysUntilDue);
          if (!emailContent) continue;

          try {
            await transporter.sendMail({
              from: `"GST Buddy" <${process.env.EMAIL_FROM || "noreply@gstbuddy.app"}>`,
              to: userEmail,
              subject: emailContent.subject,
              html: emailContent.html,
              replyTo: "support@gstbuddy.app",
            });

            // Record reminder
            await db
              .collection("users")
              .doc(userId)
              .collection("emailReminders")
              .add({
                billId: bill.id,
                type: "scheduled",
                subject: emailContent.subject,
                emailSent: userEmail,
                sentDate: admin.firestore.FieldValue.serverTimestamp(),
                status: "sent",
              });

            // Update bill
            await db
              .collection("users")
              .doc(userId)
              .collection("bills")
              .doc(bill.id)
              .update({
                reminderSent: true,
                reminderSentDate:
                  admin.firestore.FieldValue.serverTimestamp(),
              });

            stats.remindersSent++;
          } catch (emailError) {
            stats.errors.push({
              billId: bill.id,
              errors: emailError.message,
            });
          }
        }
      } catch (userError) {
        stats.errors.push({ userId, error: userError.message });
      }
    }

    console.log(
      `✅ Reminders completed: ${stats.remindersSent} sent, ${stats.errors.length} errors`
    );

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("❌ Error in scheduled reminders:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stats,
    });
  }
};
