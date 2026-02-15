/**
 * Scheduled Reminder Functions
 *
 * Runs daily at 9 AM IST to check bills and send automatic reminders
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const sgTransport = require("nodemailer-sendgrid-transport");

const db = admin.firestore();

// Configure email transporter
const getTransporter = () => {
  return nodemailer.createTransport(
    sgTransport({
      auth: {
        api_key: process.env.SENDGRID_API_KEY,
      },
    }),
  );
};

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
      const transporter = getTransporter();
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
              console.warn(`⚠️ Bill ${billId} missing dueDate or email`);
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

            // Send reminder if due within 7 days and not already sent
            if (daysUntilDue <= 7 && daysUntilDue > 0 && !bill.reminderSent) {
              try {
                const emailContent = generateEmailContent(bill, daysUntilDue);

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
      console.log(`   ⚠️ Errors: ${errors.length}`);

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
 * HTTP Endpoint: Manually trigger reminder job (for testing)
 * Call: POST /api/trigger-bill-reminders
 */
exports.triggerBillReminders = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const transporter = getTransporter();
    const usersSnapshot = await db.collection("users").get();

    let emailsSent = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const userEmail = userData.email;

      const billsSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("bills")
        .get();

      for (const billDoc of billsSnapshot.docs) {
        const bill = billDoc.data();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dueDate = new Date(bill.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        const daysUntilDue = Math.ceil(
          (dueDate - today) / (1000 * 60 * 60 * 24),
        );

        if (daysUntilDue <= 7 && daysUntilDue > 0 && !bill.reminderSent) {
          const emailContent = generateEmailContent(bill, daysUntilDue);

          try {
            await transporter.sendMail({
              from: process.env.EMAIL_FROM || "noreplygstbuddy@gmail.com",
              to: userEmail,
              subject: emailContent.subject,
              html: emailContent.html,
            });

            emailsSent++;
          } catch (e) {
            console.error("Email error:", e);
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      emailsSent,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Generate email content based on days until due
 */
function generateEmailContent(bill, daysUntilDue) {
  const dueDate = new Date(bill.dueDate);
  const deadlineStr = dueDate.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let urgency = "📌 REMINDER";
  let subtitle = `Due in ${daysUntilDue} Days`;

  if (daysUntilDue === 1) {
    urgency = "⏰ FINAL REMINDER";
    subtitle = "Due TOMORROW";
  } else if (daysUntilDue === 2) {
    urgency = "⚠️ IMPORTANT";
    subtitle = "Due in 2 Days";
  } else if (daysUntilDue === 3) {
    urgency = "⚠️ IMPORTANT";
    subtitle = "Due in 3 Days";
  } else if (daysUntilDue <= 7) {
    urgency = "📋 UPCOMING PAYMENT";
    subtitle = `Due in ${daysUntilDue} Days`;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; text-align: center;">
        <h2 style="margin: 0; font-size: 28px;">${urgency}</h2>
        <p style="margin: 10px 0 0 0; font-size: 16px;">${subtitle}</p>
      </div>

      <div style="background: white; padding: 30px; margin-top: -1px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
          Hi! 👋 This is a reminder that your <strong>${bill.supplierName || "bill"}</strong> payment is coming up.
        </p>

        <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Invoice:</strong> ${bill.invoiceNumber || "N/A"}</p>
          <p style="margin: 5px 0;"><strong>Amount:</strong> ₹${(bill.amount || 0).toFixed(2)}</p>
          <p style="margin: 5px 0;"><strong>Due:</strong> ${deadlineStr}</p>
          <p style="margin: 5px 0;"><strong>Days Left:</strong> <strong style="color: #d97706;">${daysUntilDue}</strong></p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://gstbuddy.app/bills" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            View Bills
          </a>
        </div>

        <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          GSTBuddy • Automated Bill Reminders
        </p>
      </div>
    </div>
  `;

  return {
    subject: `${urgency}: ${bill.supplierName || "Payment"} Due ${deadlineStr}`,
    html,
    text: `${urgency}\n\n${bill.supplierName || "Bill"} due on ${deadlineStr}\nAmount: ₹${(bill.amount || 0).toFixed(2)}\nDays left: ${daysUntilDue}`,
  };
}

/**
 * Generate urgent email for due date
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
      <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; border: 3px solid #991b1b;">
        <h2 style="margin: 0; font-size: 32px;">🚨 URGENT</h2>
        <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: bold;">Due TODAY!</p>
      </div>

      <div style="background: #fff7ed; padding: 20px; margin-top: -1px; border-radius: 0 0 8px 8px;">
        <p style="color: #991b1b; font-weight: bold; margin: 0 0 15px 0; font-size: 16px;">
          Your payment is due TODAY. Please pay immediately to avoid late fees!
        </p>

        <div style="background: white; padding: 15px; border-left: 4px solid #dc2626; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Bill:</strong> ${bill.supplierName || "Payment"}</p>
          <p style="margin: 5px 0;"><strong>Amount:</strong> ₹${(bill.amount || 0).toFixed(2)}</p>
          <p style="margin: 5px 0;"><strong>Due:</strong> ${deadlineStr} <strong style="color: #dc2626;">TODAY</strong></p>
        </div>

        <div style="text-align: center; margin: 25px 0;">
          <a href="https://gstbuddy.app/bills" style="background: #dc2626; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
            Pay Immediately
          </a>
        </div>
      </div>
    </div>
  `;

  return {
    subject: `🚨 URGENT - Payment Due TODAY: ${bill.supplierName || "Bill"}`,
    html,
    text: `URGENT: Your ${bill.supplierName} payment (₹${(bill.amount || 0).toFixed(2)}) is due TODAY!`,
  };
}

module.exports = {
  scheduledBillReminder: exports.scheduledBillReminder,
  triggerBillReminders: exports.triggerBillReminders,
};
