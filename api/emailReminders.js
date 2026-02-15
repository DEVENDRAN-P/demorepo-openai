/**
 * Firebase Cloud Function: Send Reminder Email via SendGrid
 * This function sends email reminders for upcoming GST filing deadlines
 *
 * To deploy this function:
 * 1. Install Firebase CLI: npm install -g firebase-tools
 * 2. Initialize functions: firebase init functions
 * 3. Copy this code to functions/index.js
 * 4. Set SendGrid API key: firebase functions:config:set sendgrid.api_key="YOUR_KEY"
 * 5. Install dependencies: npm install nodemailer nodemailer-sendgrid-transport
 * 6. Deploy: firebase deploy --only functions
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const sgTransport = require("nodemailer-sendgrid-transport");

// Initialize Firebase Admin
admin.initializeApp();

// Configure SendGrid transporter
const transporter = nodemailer.createTransport(
  sgTransport({
    auth: {
      api_key:
        process.env.SENDGRID_API_KEY || functions.config().sendgrid?.api_key,
    },
  }),
);

/**
 * Callable Cloud Function to send reminder email
 * Call from client: firebase.functions().httpsCallable('sendReminderEmail')
 */
exports.sendReminderEmail = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    const { subject, body, email } = data;

    // Validate input
    if (!subject || !body || !email) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: subject, body, email",
      );
    }

    // Send email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || "noreply@gstfiling.app",
      to: email,
      subject: subject,
      text: body,
      html: `<pre>${body.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`,
    });

    console.log("Email sent:", info.messageId);

    return {
      success: true,
      messageId: info.messageId,
      message: "Email sent successfully",
    };
  } catch (error) {
    console.error("Error sending email:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to send email: " + error.message,
    );
  }
});

/**
 * HTTP Callable Function to send reminder email via SendGrid
 * Used from client applications
 */
exports.sendReminderEmailHttp = functions.https.onRequest(async (req, res) => {
  try {
    // Enable CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(200).send("OK");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    const { subject, body, email, htmlContent } = req.body;

    // Validate input
    if (!subject || !body || !email) {
      res
        .status(400)
        .json({ error: "Missing required fields: subject, body, email" });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    // Send email via SendGrid
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || "noreply@gstbuddy.app",
      to: email,
      subject: subject,
      text: body,
      html:
        htmlContent ||
        `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">${body.replace(/\n/g, "<br>").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`,
    });

    console.log("Email sent via SendGrid:", info.messageId);

    res.status(200).json({
      success: true,
      messageId: info.messageId,
      message: "Email sent successfully via SendGrid",
    });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to send email",
    });
  }
});

/**
 * Scheduled Cloud Function to check and send reminders daily
 * Runs every day at 8:00 AM UTC
 */
exports.checkAndSendRemindersDaily = functions.pubsub
  .schedule("0 8 * * *")
  .timeZone("UTC")
  .onRun(async (context) => {
    try {
      const db = admin.firestore();
      const now = new Date();

      // Get all users
      const usersSnapshot = await db.collection("users").get();

      let totalReminders = 0;
      let totalErrors = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();

        try {
          // Get all bills for this user
          const billsSnapshot = await db
            .collection("users")
            .doc(userId)
            .collection("bills")
            .get();

          for (const billDoc of billsSnapshot.docs) {
            const bill = billDoc.data();
            bill.id = billDoc.id;

            if (!bill.gstrDeadline) continue;

            const deadline = new Date(bill.gstrDeadline);
            const daysUntilDeadline = Math.ceil(
              (deadline - now) / (1000 * 60 * 60 * 24),
            );

            // Determine reminder type
            let reminderType = null;
            let send = false;

            if (daysUntilDeadline === 0) {
              reminderType = "today";
              send = true;
            } else if (daysUntilDeadline === 1) {
              reminderType = "one-day";
              send = true;
            } else if (daysUntilDeadline === 3) {
              reminderType = "three-days";
              send = true;
            } else if (daysUntilDeadline === 7) {
              reminderType = "one-week";
              send = true;
            } else if (daysUntilDeadline < 0) {
              reminderType = "overdue";
              send = true;
            }

            if (send && reminderType && userData.email) {
              // Check if reminder already sent today
              const todayStart = new Date(now);
              todayStart.setHours(0, 0, 0, 0);

              const remindersSnapshot = await db
                .collection("users")
                .doc(userId)
                .collection("emailReminders")
                .where("billId", "==", bill.id)
                .where("type", "==", reminderType)
                .where("sentDate", ">=", todayStart)
                .get();

              if (remindersSnapshot.empty) {
                // Send email
                const emailContent = getEmailTemplate(bill, daysUntilDeadline);

                await transporter.sendMail({
                  from: process.env.EMAIL_FROM || "noreply@gstfiling.app",
                  to: userData.email,
                  subject: emailContent.subject,
                  text: emailContent.body,
                  html: `<pre>${emailContent.body.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`,
                });

                // Record reminder sent
                await db
                  .collection("users")
                  .doc(userId)
                  .collection("emailReminders")
                  .add({
                    billId: bill.id,
                    type: reminderType,
                    subject: emailContent.subject,
                    emailSent: userData.email,
                    sentDate: admin.firestore.FieldValue.serverTimestamp(),
                    status: "sent",
                  });

                totalReminders++;
              }
            }
          }
        } catch (userError) {
          console.error(`Error processing user ${userId}:`, userError);
          totalErrors++;
        }
      }

      console.log(
        `Daily reminder check complete: ${totalReminders} sent, ${totalErrors} errors`,
      );
      return { totalReminders, totalErrors };
    } catch (error) {
      console.error("Error in checkAndSendRemindersDaily:", error);
      throw error;
    }
  });

/**
 * Helper function to generate email template
 */
function getEmailTemplate(bill, daysUntilDeadline) {
  const deadline = new Date(bill.gstrDeadline);
  const deadlineStr = deadline.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let subject = "";
  let body = "";

  if (daysUntilDeadline < 0) {
    subject = `OVERDUE: GST Filing Now ${Math.abs(daysUntilDeadline)} Days Late - Invoice #${bill.invoiceNumber}`;
    body = `Your GST filing deadline has passed!

Bill Details:
- Invoice Number: ${bill.invoiceNumber}
- Supplier: ${bill.supplierName || "N/A"}
- Amount: ₹${bill.amount?.toFixed(2) || "0.00"}
- Deadline: ${deadlineStr} (${Math.abs(daysUntilDeadline)} days ago)
- Form: GSTR-1

Please file your GST return immediately to minimize penalties.

Log in to your account and file the GST return now.

Thank you!`;
  } else if (daysUntilDeadline === 0) {
    subject = `URGENT: GST Filing Due TODAY - Invoice #${bill.invoiceNumber}`;
    body = `Your GST filing deadline is TODAY!

Bill Details:
- Invoice Number: ${bill.invoiceNumber}
- Supplier: ${bill.supplierName || "N/A"}
- Amount: ₹${bill.amount?.toFixed(2) || "0.00"}
- Deadline: ${deadlineStr} (TODAY)
- Form: GSTR-1

Please file your GST return immediately to avoid penalties.

Log in to your account: [Your App Domain]/dashboard

Thank you!`;
  } else if (daysUntilDeadline === 1) {
    subject = `GST Filing Due TOMORROW - Invoice #${bill.invoiceNumber}`;
    body = `Your GST filing deadline is TOMORROW!

Bill Details:
- Invoice Number: ${bill.invoiceNumber}
- Supplier: ${bill.supplierName || "N/A"}
- Amount: ₹${bill.amount?.toFixed(2) || "0.00"}
- Deadline: ${deadlineStr} (Tomorrow)
- Form: GSTR-1

Please file your GST return today to avoid missing the deadline.

Log in to your account: [Your App Domain]/dashboard

Thank you!`;
  } else if (daysUntilDeadline <= 3) {
    subject = `GST Filing Due in ${daysUntilDeadline} Days - Invoice #${bill.invoiceNumber}`;
    body = `Your GST filing deadline is approaching!

Bill Details:
- Invoice Number: ${bill.invoiceNumber}
- Supplier: ${bill.supplierName || "N/A"}
- Amount: ₹${bill.amount?.toFixed(2) || "0.00"}
- Deadline: ${deadlineStr} (${daysUntilDeadline} days from now)
- Form: GSTR-1

Please file your GST return soon to avoid missing the deadline.

Log in to your account: [Your App Domain]/dashboard

Thank you!`;
  } else if (daysUntilDeadline <= 7) {
    subject = `GST Filing Reminder: Due in ${daysUntilDeadline} Days - Invoice #${bill.invoiceNumber}`;
    body = `Reminder: Your GST filing deadline is approaching.

Bill Details:
- Invoice Number: ${bill.invoiceNumber}
- Supplier: ${bill.supplierName || "N/A"}
- Amount: ₹${bill.amount?.toFixed(2) || "0.00"}
- Deadline: ${deadlineStr} (${daysUntilDeadline} days from now)
- Form: GSTR-1

Start preparing your GST filing documents now.

Log in to your account: [Your App Domain]/dashboard

Thank you!`;
  } else {
    subject = `Upcoming GST Filing: Invoice #${bill.invoiceNumber}`;
    body = `You have an upcoming GST filing deadline.

Bill Details:
- Invoice Number: ${bill.invoiceNumber}
- Supplier: ${bill.supplierName || "N/A"}
- Amount: ₹${bill.amount?.toFixed(2) || "0.00"}
- Deadline: ${deadlineStr}
- Form: GSTR-1

You will receive more detailed reminders as the deadline approaches.

Log in to your account: [Your App Domain]/dashboard

Thank you!`;
  }

  return { subject, body };
}

module.exports = {
  sendReminderEmail,
  sendReminderEmailHttp,
  checkAndSendRemindersDaily,
};
