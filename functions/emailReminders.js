/**
 * Email Reminder Functions
 * 
 * NOTE: This file is deprecated. Email sending is now handled by:
 * - api/server.js (Express.js server with Brevo SMTP)
 * - src/services/emailReminderService.js (frontend integration)
 * 
 * See BREVO_EMAIL_SETUP.md for current email configuration.
 * 
 * These exported functions remain for backward compatibility with existing code.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

const db = admin.firestore();

// Configure: Call Express server for email sending
const getEmailServiceURL = () => {
  return process.env.EMAIL_SERVICE_URL || "http://localhost:5000/api/sendEmail";
};

/**
 * Callable Function: Send reminder email
 * 
 * DEPRECATED: Use express server instead.
 * Calls: POST /api/sendEmail endpoint
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

    const { billId, subject, body, email } = data;
    const userId = context.auth.uid;

    // Get user email if not provided
    let userEmail = email;
    if (!userEmail) {
      const userDoc = await db.collection("users").doc(userId).get();
      userEmail = userDoc.data()?.email;
    }

    if (!userEmail) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "No email address found for user",
      );
    }

    // Validate input
    if (!subject || !body) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: subject, body",
      );
    }

    // Call Express server
    const response = await axios.post(
      getEmailServiceURL(),
      {
        subject,
        body,
        email: userEmail,
      }
    );

    const info = response.data;
    console.log(`✅ Email sent: ${info.messageId}`);

    // Update bill status if billId provided
    if (billId) {
      await db
        .collection("users")
        .doc(userId)
        .collection("bills")
        .doc(billId)
        .update({
          reminderSent: true,
          reminderSentDate: admin.firestore.FieldValue.serverTimestamp(),
          reminderMessageId: info.messageId,
        });
    }

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
 * Callable Function: Send manual reminder to a specific user
 * DEPRECATED: Use express server instead.
 */
exports.sendManualReminder = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    const { userId, billId } = data;
    const requestUserId = context.auth.uid;

    // Allow users to send reminders to themselves or admins to send to anyone
    const requestorDoc = await db.collection("users").doc(requestUserId).get();
    const isAdmin = requestorDoc.data()?.role === "admin";

    if (userId !== requestUserId && !isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You can only send reminders to yourself",
      );
    }

    // Get bill details
    const billDoc = await db
      .collection("users")
      .doc(userId)
      .collection("bills")
      .doc(billId)
      .get();

    if (!billDoc.exists()) {
      throw new functions.https.HttpsError("not-found", "Bill not found");
    }

    const bill = billDoc.data();
    const userDoc = await db.collection("users").doc(userId).get();
    const userEmail = userDoc.data()?.email;

    if (!userEmail) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "User email not found",
      );
    }

    // Calculate days until due
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(bill.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    // Generate email content
    const emailContent = generateEmailForBill(bill, daysUntilDue);

    // Call Express server
    const response = await axios.post(
      getEmailServiceURL(),
      {
        subject: emailContent.subject,
        body: emailContent.text,
        email: userEmail,
      }
    );

    const info = response.data;

    // Update bill
    await db
      .collection("users")
      .doc(userId)
      .collection("bills")
      .doc(billId)
      .update({
        reminderSent: true,
        reminderSentDate: admin.firestore.FieldValue.serverTimestamp(),
        lastManualReminder: admin.firestore.FieldValue.serverTimestamp(),
      });

    return {
      success: true,
      messageId: info.messageId,
      message: "Reminder sent successfully",
    };
  } catch (error) {
    console.error("Error sending manual reminder:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to send reminder: " + error.message,
    );
  }
});

/**
 * Helper: Generate email content for a bill
 */
function generateEmailForBill(bill, daysUntilDue) {
  const dueDate = new Date(bill.dueDate);
  const deadlineStr = dueDate.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let urgency = "📌 REMINDER";
  if (daysUntilDue === 0) urgency = "🚨 URGENT - DUE TODAY";
  else if (daysUntilDue === 1) urgency = "⏰ FINAL REMINDER";
  else if (daysUntilDue <= 3) urgency = "⚠️ IMPORTANT";

  const text = `${urgency}\n\n${bill.supplierName} - ₹${(bill.amount || 0).toFixed(2)}\nDue: ${deadlineStr}\nDays left: ${daysUntilDue}`;

  return {
    subject: `${urgency}: ${bill.supplierName || "Payment"} Due ${deadlineStr}`,
    text,
  };
}

module.exports = {
  sendReminderEmail: exports.sendReminderEmail,
  sendManualReminder: exports.sendManualReminder,
};
