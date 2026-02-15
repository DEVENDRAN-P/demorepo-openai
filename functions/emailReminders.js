/**
 * Email Reminder Functions
 * Callable and manual email sending for bill reminders
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
 * Callable Function: Send reminder email
 * Call from client-side:
 *
 * const sendReminder = firebase.functions().httpsCallable('sendReminderEmail');
 * await sendReminder({
 *   billId: "bill-123",
 *   subject: "Bill Due Tomorrow",
 *   body: "Your bill is due tomorrow..."
 * });
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

    const transporter = getTransporter();

    // Send email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || "noreplygstbuddy@gmail.com",
      to: userEmail,
      subject: subject,
      html: formatEmailHTML(body),
      text: body,
    });

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
 * Used for testing and manual reminders
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
    const transporter = getTransporter();

    // Send email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || "noreplygstbuddy@gmail.com",
      to: userEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

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

  const html = formatEmailHTML(`
    <h2>${urgency}</h2>
    <p>Your <strong>${bill.supplierName || "bill"}</strong> payment reminder.</p>
    
    <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p><strong>Invoice:</strong> ${bill.invoiceNumber || "N/A"}</p>
      <p><strong>Amount:</strong> ₹${(bill.amount || 0).toFixed(2)}</p>
      <p><strong>Due Date:</strong> ${deadlineStr}</p>
      <p><strong>Days Left:</strong> ${daysUntilDue}</p>
    </div>
    
    <p>Please ensure payment is made on time.</p>
  `);

  return {
    subject: `${urgency}: ${bill.supplierName || "Payment"} Due ${deadlineStr}`,
    html,
    text: `${urgency}\n\n${bill.supplierName} - ₹${(bill.amount || 0).toFixed(2)}\nDue: ${deadlineStr}\nDays left: ${daysUntilDue}`,
  };
}

/**
 * Helper: Format email HTML template
 */
function formatEmailHTML(content) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #333;
          background-color: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h2 {
          color: #667eea;
          margin-top: 0;
        }
        a {
          color: #667eea;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
        .footer {
          border-top: 1px solid #eee;
          padding-top: 20px;
          font-size: 12px;
          color: #999;
          text-align: center;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${content}
        <div class="footer">
          <p>GSTBuddy - Bill Reminder System</p>
          <p><a href="https://gstbuddy.app">Visit Dashboard</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = {
  sendReminderEmail: exports.sendReminderEmail,
  sendManualReminder: exports.sendManualReminder,
};
