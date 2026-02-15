/**
 * DEPRECATED: Firebase Cloud Function with Scheduled Bill Reminders
 *
 * This file is DEPRECATED. The application now uses:
 * - api/server.js (Express.js server)
 * - Brevo SMTP for email delivery
 * - On-demand email sending rather than scheduled tasks
 *
 * See BREVO_EMAIL_SETUP.md for the current email setup.
 *
 * Email reminders are now sent immediately when bills are uploaded,
 * not through scheduled tasks.
 *
 * This file remains for backward compatibility only.
 * Do not use for new implementations.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const sgTransport = require("nodemailer-sendgrid-transport");

// Initialize Firebase Admin (only if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// DEPRECATED: Configure SendGrid transporter (use Brevo SMTP instead)
const transporter = nodemailer.createTransport(
  sgTransport({
    auth: {
      api_key: process.env.SENDGRID_API_KEY,
    },
  }),
);

/**
 * SCHEDULED FUNCTION: Runs every 24 hours at 09:00 IST
 * Checks for upcoming bill due dates and sends email reminders
 */
exports.scheduledBillReminder = functions.pubsub
  .schedule("0 9 * * *") // 09:00 IST (UTC+5:30 → 3:30 UTC)
  .timeZone("Asia/Kolkata")
  .onRun(async (context) => {
    console.log("🔔 Bill Reminder Job Started at", new Date().toISOString());

    try {
      const db = admin.firestore();
      const usersSnapshot = await db.collection("users").get();

      let billsProcessed = 0;
      let emailsSent = 0;
      let errors = [];

      // Iterate through all users
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const userEmail = userData.email;

        try {
          // Get all bills for this user
          const billsSnapshot = await db
            .collection("users")
            .doc(userId)
            .collection("bills")
            .get();

          // Check each bill
          for (const billDoc of billsSnapshot.docs) {
            const bill = billDoc.data();
            const billId = billDoc.id;

            // Skip if bill doesn't have required fields
            if (!bill.dueDate || !userEmail) {
              console.warn(`⚠️  Bill ${billId} missing dueDate or email`);
              continue;
            }

            billsProcessed++;

            // Calculate days until due
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const dueDate = new Date(bill.dueDate);
            dueDate.setHours(0, 0, 0, 0);

            const daysUntilDue = Math.ceil(
              (dueDate - today) / (1000 * 60 * 60 * 24),
            );

            console.log(
              `📋 Bill: ${bill.invoiceNumber || billId}, Days left: ${daysUntilDue}`,
            );

            // Send reminder if due within 3 days and not already sent
            if (daysUntilDue <= 3 && daysUntilDue > 0 && !bill.reminderSent) {
              try {
                // Generate email content
                const emailContent = generateEmailContent(bill, daysUntilDue);

                // Send email
                await transporter.sendMail({
                  from: process.env.EMAIL_FROM || "noreplygstbuddy@gmail.com",
                  to: userEmail,
                  subject: emailContent.subject,
                  html: emailContent.html,
                  text: emailContent.text,
                });

                // Mark reminder as sent
                await db
                  .collection("users")
                  .doc(userId)
                  .collection("bills")
                  .doc(billId)
                  .update({
                    reminderSent: true,
                    reminderSentDate:
                      admin.firestore.FieldValue.serverTimestamp(),
                    lastReminderDaysLeft: daysUntilDue,
                  });

                emailsSent++;
                console.log(
                  `✅ Reminder sent for Bill ${bill.invoiceNumber} to ${userEmail}`,
                );
              } catch (emailError) {
                errors.push({
                  billId,
                  userId,
                  error: emailError.message,
                });
                console.error(
                  `❌ Failed to send email for bill ${billId}:`,
                  emailError,
                );
              }
            }

            // Send urgent reminder on due date
            if (daysUntilDue === 0 && !bill.urgencyReminderSent) {
              try {
                const urgentContent = generateUrgentEmailContent(bill);

                await transporter.sendMail({
                  from: process.env.EMAIL_FROM || "noreplygstbuddy@gmail.com",
                  to: userEmail,
                  subject: urgentContent.subject,
                  html: urgentContent.html,
                  text: urgentContent.text,
                });

                await db
                  .collection("users")
                  .doc(userId)
                  .collection("bills")
                  .doc(billId)
                  .update({
                    urgencyReminderSent: true,
                    urgencyReminderDate:
                      admin.firestore.FieldValue.serverTimestamp(),
                  });

                console.log(
                  `🚨 URGENT reminder sent for Bill ${bill.invoiceNumber}`,
                );
              } catch (urgentError) {
                console.error(
                  `❌ Failed to send urgent email for bill ${billId}:`,
                  urgentError,
                );
              }
            }
          }
        } catch (userError) {
          console.error(`❌ Error processing user ${userId}:`, userError);
          errors.push({
            userId,
            error: userError.message,
          });
        }
      }

      // Log completion
      console.log("✨ Job Completed:");
      console.log(`   📊 Bills Processed: ${billsProcessed}`);
      console.log(`   📧 Emails Sent: ${emailsSent}`);
      console.log(`   ⚠️  Errors: ${errors.length}`);

      // Store job log
      await db
        .collection("system")
        .doc("reminderJobLog")
        .set(
          {
            lastRun: admin.firestore.FieldValue.serverTimestamp(),
            billsProcessed,
            emailsSent,
            errorCount: errors.length,
            errors: errors.length > 0 ? errors : [],
          },
          { merge: true },
        );

      return {
        billsProcessed,
        emailsSent,
        errors: errors.length > 0 ? errors : null,
      };
    } catch (error) {
      console.error("❌ Critical Error in Reminder Job:", error);
      throw error;
    }
  });

/**
 * Generate email content for 3-day, 2-day, 1-day reminders
 */
function generateEmailContent(bill, daysUntilDue) {
  const dueDate = new Date(bill.dueDate);
  const deadlineStr = dueDate.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let urgency = "";
  let subtitle = "";

  if (daysUntilDue === 1) {
    urgency = "⏰ FINAL REMINDER";
    subtitle = `Due TOMORROW - ${deadlineStr}`;
  } else if (daysUntilDue === 2) {
    urgency = "⚠️  IMPORTANT";
    subtitle = `Due in 2 Days - ${deadlineStr}`;
  } else {
    urgency = "📌 REMINDER";
    subtitle = `Due in ${daysUntilDue} Days - ${deadlineStr}`;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <!-- Header -->
      <div style="background-color: #1f2937; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h2 style="margin: 0; font-size: 24px;">${urgency}</h2>
        <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">${subtitle}</p>
      </div>

      <!-- Content -->
      <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px;">
          Hi there! 👋
        </p>

        <p style="margin: 0 0 20px 0; color: #374151; line-height: 1.6;">
          This is a reminder that your <strong>${bill.supplierName || "Bill"}</strong> payment is due on 
          <strong>${deadlineStr}</strong>.
        </p>

        <!-- Bill Details Card -->
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Invoice #:</strong></td>
              <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${
                bill.invoiceNumber || "N/A"
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Amount:</strong></td>
              <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">₹${(
                bill.amount || 0
              ).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Due Date:</strong></td>
              <td style="padding: 8px 0; color: #1f2937; font-size: 14px; text-align: right;">${deadlineStr}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Days Left:</strong></td>
              <td style="padding: 8px 0; color: #d97706; font-size: 14px; font-weight: bold; text-align: right;">${daysUntilDue} day${
                daysUntilDue === 1 ? "" : "s"
              }</td>
            </tr>
          </table>
        </div>

        <p style="margin: 20px 0; color: #374151; line-height: 1.6;">
          Please ensure payment is made on time to avoid any late fees or penalties.
        </p>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://gstbuddy.app/bills" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            View Bill Details
          </a>
        </div>

        <!-- Footer -->
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
          This is an automated reminder from GSTBuddy. 
          <br>
          <a href="https://gstbuddy.app" style="color: #3b82f6; text-decoration: none;">Visit Dashboard</a> to manage your bills.
        </p>
      </div>
    </div>
  `;

  const text = `
BILL REMINDER: ${bill.supplierName || "Bill"}
${subtitle}

Invoice #: ${bill.invoiceNumber || "N/A"}
Amount: ₹${(bill.amount || 0).toFixed(2)}
Due Date: ${deadlineStr}
Days Left: ${daysUntilDue}

Please ensure payment is made on time.

View your bill: https://gstbuddy.app/bills
  `;

  return {
    subject: `${urgency}: ${bill.supplierName || "Bill"} Due ${deadlineStr}`,
    html,
    text: text.trim(),
  };
}

/**
 * Generate urgent email for due date (today)
 */
function generateUrgentEmailContent(bill) {
  const dueDate = new Date(bill.dueDate);
  const deadlineStr = dueDate.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #991b1b; color: white; padding: 20px; border-radius: 8px; text-align: center; border: 3px solid #dc2626;">
        <h2 style="margin: 0; font-size: 28px;">🚨 URGENT - DUE TODAY</h2>
        <p style="margin: 8px 0 0 0; font-size: 16px;">Your payment is due TODAY!</p>
      </div>

      <div style="background-color: #fff7ed; padding: 20px; margin-top: 20px; border-radius: 6px; border-left: 4px solid #dc2626;">
        <p style="margin: 0; color: #921f1f; font-weight: bold; font-size: 16px;">
          ⚡ Action Required Immediately
        </p>
        <p style="margin: 10px 0 0 0; color: #92400e; font-size: 14px;">
          Your <strong>${bill.supplierName || "bill"}</strong> for ₹${(
            bill.amount || 0
          ).toFixed(2)} is due TODAY (${deadlineStr}).
        </p>
      </div>

      <div style="background-color: #f9fafb; padding: 20px; margin-top: 20px; border-radius: 6px;">
        <p style="margin: 0 0 15px 0; color: #1f2937; font-weight: bold;">Invoice Details:</p>
        <div style="background-color: #ffffff; padding: 15px; border-radius: 4px; border: 1px solid #e5e7eb;">
          <p style="margin: 5px 0;"><strong>Invoice #:</strong> ${
            bill.invoiceNumber || "N/A"
          }</p>
          <p style="margin: 5px 0;"><strong>Amount:</strong> ₹${(
            bill.amount || 0
          ).toFixed(2)}</p>
          <p style="margin: 5px 0;"><strong>Due:</strong> ${deadlineStr} (TODAY)</p>
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://gstbuddy.app/bills" style="background-color: #dc2626; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
          Pay Now
        </a>
      </div>

      <p style="margin: 20px 0; color: #6b7280; font-size: 13px;">
        Delaying payment may result in late fees or penalties. Please complete the payment immediately.
      </p>
    </div>
  `;

  return {
    subject: `🚨 URGENT - Payment Due TODAY: ${bill.supplierName || "Bill"}`,
    html,
    text: `URGENT - Payment due TODAY: ${bill.supplierName} (₹${(
      bill.amount || 0
    ).toFixed(2)})`,
  };
}

/**
 * HTTP Endpoint: Manually trigger reminder job (for testing)
 * Call: POST /api/trigger-bill-reminders
 * Auth: Requires admin token
 */
exports.triggerBillReminders = functions.https.onRequest(async (req, res) => {
  // Add authentication check here
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const result = await exports.scheduledBillReminder({});
    return res.status(200).json({
      success: true,
      message: "Reminder job executed",
      result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = {
  scheduledBillReminder: exports.scheduledBillReminder,
  triggerBillReminders: exports.triggerBillReminders,
};
