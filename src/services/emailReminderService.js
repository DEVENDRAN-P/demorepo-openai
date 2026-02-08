import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import axios from "axios";

/**
 * Email Reminder Service
 * Sends automatic email notifications to users when GST filing deadlines are approaching
 *
 * This service integrates with Firebase Cloud Functions to send emails.
 * To enable email sending, you need to:
 * 1. Set up a Cloud Function that sends emails (using SendGrid, Nodemailer, or similar)
 * 2. Or use Firebase Extensions (Email extension)
 * 3. Update sendReminderEmail() with your actual email service endpoint
 */

const db = getFirestore();
const auth = getAuth();

// Email templates for different reminder periods
const getEmailTemplate = (bill, daysUntilDeadline, userEmail) => {
  const deadline = new Date(bill.gstrDeadline);
  const deadlineStr = deadline.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let subject = "";
  let body = "";

  if (daysUntilDeadline <= 1) {
    subject = `URGENT: GST Filing Due TODAY - Invoice #${bill.invoiceNumber}`;
    body = `
Your GST filing deadline is TODAY!

Bill Details:
- Invoice Number: ${bill.invoiceNumber}
- Supplier: ${bill.supplierName || "N/A"}
- Amount: ₹${bill.amount?.toFixed(2) || "0.00"}
- Deadline: ${deadlineStr} (TODAY)
- Form: GSTR-1

Please file your GST return immediately to avoid penalties.

Login to your account: [Your App URL]/dashboard

Thank you!
        `;
  } else if (daysUntilDeadline <= 3) {
    subject = `GST Filing Due in ${daysUntilDeadline} Days - Invoice #${bill.invoiceNumber}`;
    body = `
Your GST filing deadline is approaching!

Bill Details:
- Invoice Number: ${bill.invoiceNumber}
- Supplier: ${bill.supplierName || "N/A"}
- Amount: ₹${bill.amount?.toFixed(2) || "0.00"}
- Deadline: ${deadlineStr} (${daysUntilDeadline} days from now)
- Form: GSTR-1

Please file your GST return soon to avoid missing the deadline.

Login to your account: [Your App URL]/dashboard

Thank you!
        `;
  } else if (daysUntilDeadline <= 7) {
    subject = `GST Filing Reminder: Due in ${daysUntilDeadline} Days - Invoice #${bill.invoiceNumber}`;
    body = `
Reminder: Your GST filing deadline is approaching.

Bill Details:
- Invoice Number: ${bill.invoiceNumber}
- Supplier: ${bill.supplierName || "N/A"}
- Amount: ₹${bill.amount?.toFixed(2) || "0.00"}
- Deadline: ${deadlineStr} (${daysUntilDeadline} days from now)
- Form: GSTR-1

Start preparing your GST filing documents now.

Login to your account: [Your App URL]/dashboard

Thank you!
        `;
  }

  return { subject, body, email: userEmail };
};

/**
 * Send email via Firebase Cloud Function with SendGrid
 * Requires REACT_APP_SEND_REMINDER_EMAIL_FUNCTION_URL to be set in .env
 */
export const sendReminderEmail = async (emailData) => {
  try {
    const functionUrl =
      process.env.REACT_APP_SEND_REMINDER_EMAIL_FUNCTION_URL ||
      "https://us-central1-finalopenai-fc9c5.cloudfunctions.net/sendReminderEmailHttp";

    if (!functionUrl || !functionUrl.startsWith("http")) {
      throw new Error("Cloud Function URL not configured");
    }

    const response = await axios.post(functionUrl, {
      subject: emailData.subject,
      body: emailData.body,
      email: emailData.email,
    });

    console.log("Email sent successfully:", response.data);

    return {
      success: true,
      messageId: response.data.messageId,
      message: response.data.message || "Email sent successfully",
    };
  } catch (error) {
    console.error("Error sending email:", error.message);

    // Fallback logging for development
    console.warn("Email could not be sent. Email content:", emailData);
    console.warn("Make sure the Cloud Function is deployed and running.");
    console.warn(
      "To deploy: cd functions && npm install && firebase deploy --only functions",
    );

    // Return error response
    return {
      success: false,
      error: error.message || "Failed to send email",
      message: "Email service temporarily unavailable",
    };
  }
};

/**
 * Check if reminder has already been sent for this bill on this date
 */
const hasReminderBeenSent = async (billId, userId, reminderType) => {
  try {
    const q = query(
      collection(db, "users", userId, "emailReminders"),
      where("billId", "==", billId),
      where("type", "==", reminderType),
      where(
        "sentDate",
        ">=",
        new Date(new Date().setDate(new Date().getDate() - 1)),
      ),
    );

    const snapshot = await getDocs(q);
    return snapshot.size > 0;
  } catch (error) {
    console.error("Error checking reminder history:", error);
    return false;
  }
};

/**
 * Record that a reminder email was sent
 */
const recordReminderSent = async (userId, billId, reminderType, emailData) => {
  try {
    await addDoc(collection(db, "users", userId, "emailReminders"), {
      billId,
      type: reminderType,
      subject: emailData.subject,
      emailSent: emailData.email,
      sentDate: serverTimestamp(),
      status: "sent",
    });
  } catch (error) {
    console.error("Error recording reminder:", error);
  }
};

/**
 * Check all bills for a user and send reminders if needed
 * This should be called periodically (e.g., daily via cron or Cloud Scheduler)
 */
export const checkAndSendBillReminders = async (userId = null) => {
  try {
    const currentUser = userId || auth.currentUser;

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const userUid = currentUser.uid || currentUser;

    // Get all bills for user
    const billsRef = collection(db, "users", userUid, "bills");
    const snapshot = await getDocs(billsRef);

    const now = new Date();
    const remindersSent = [];

    for (const billDoc of snapshot.docs) {
      const bill = billDoc.data();
      bill.id = billDoc.id;

      if (!bill.gstrDeadline) continue;

      const deadline = new Date(bill.gstrDeadline);
      const daysUntilDeadline = Math.ceil(
        (deadline - now) / (1000 * 60 * 60 * 24),
      );

      // Determine reminder type based on days remaining
      let reminderType = null;

      if (daysUntilDeadline < 0) {
        reminderType = "overdue";
      } else if (daysUntilDeadline === 0) {
        reminderType = "today";
      } else if (daysUntilDeadline === 1) {
        reminderType = "one-day";
      } else if (daysUntilDeadline <= 3) {
        reminderType = "three-days";
      } else if (daysUntilDeadline <= 7) {
        reminderType = "one-week";
      }

      // Send reminder if needed and not already sent today
      if (reminderType) {
        const alreadySent = await hasReminderBeenSent(
          bill.id,
          userUid,
          reminderType,
        );

        if (!alreadySent) {
          const user = currentUser.email || currentUser;
          const emailTemplate = getEmailTemplate(bill, daysUntilDeadline, user);

          // Send email
          const result = await sendReminderEmail(emailTemplate);

          if (result.success) {
            // Record that reminder was sent
            await recordReminderSent(
              userUid,
              bill.id,
              reminderType,
              emailTemplate,
            );
            remindersSent.push({
              billId: bill.id,
              invoiceNumber: bill.invoiceNumber,
              type: reminderType,
              email: user,
            });
          }
        }
      }
    }

    return {
      success: true,
      remindersSent,
      message: `Checked ${snapshot.size} bills, sent ${remindersSent.length} reminders`,
    };
  } catch (error) {
    console.error("Error in checkAndSendBillReminders:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Manually send reminder for specific bill
 */
export const sendManualReminder = async (userId, billId) => {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const userUid = userId || currentUser.uid;

    // Get bill details
    const billSnapshot = await getDocs(query(where("__name__", "==", billId)));

    if (billSnapshot.empty) {
      throw new Error("Bill not found");
    }

    const bill = billSnapshot.docs[0].data();
    const now = new Date();
    const deadline = new Date(bill.gstrDeadline);
    const daysUntilDeadline = Math.ceil(
      (deadline - now) / (1000 * 60 * 60 * 24),
    );

    const emailTemplate = getEmailTemplate(
      bill,
      daysUntilDeadline,
      currentUser.email,
    );

    // Send email
    const result = await sendReminderEmail(emailTemplate);

    if (result.success) {
      // Record that reminder was sent
      await recordReminderSent(userUid, billId, "manual", emailTemplate);
    }

    return result;
  } catch (error) {
    console.error("Error sending manual reminder:", error);
    throw error;
  }
};

/**
 * Get reminder history for a bill
 */
export const getBillReminderHistory = async (userId, billId) => {
  try {
    const q = query(
      collection(db, "users", userId, "emailReminders"),
      where("billId", "==", billId),
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting reminder history:", error);
    return [];
  }
};

/**
 * Test function to send a test email
 * Call this once to verify SendGrid integration is working
 */
export const sendTestEmail = async (userEmail) => {
  try {
    const testEmailData = {
      subject: "Test GST Buddy Reminder",
      body: `Hello,\n\nThis is a test email from GST Buddy application.\n\nIf you received this email, your email system is working correctly!\n\nBest regards,\nGST Buddy Team`,
      email: userEmail,
    };

    const result = await sendReminderEmail(testEmailData);
    console.log("Test email result:", result);
    return result;
  } catch (error) {
    console.error("Error sending test email:", error);
    throw error;
  }
};

const emailReminderService = {
  checkAndSendBillReminders,
  sendManualReminder,
  getBillReminderHistory,
  sendTestEmail,
};

export default emailReminderService;
