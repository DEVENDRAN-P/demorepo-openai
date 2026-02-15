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
 * This service integrates with a backend Express.js server that uses Brevo SMTP
 * for reliable email delivery. See BREVO_EMAIL_SETUP.md for configuration details.
 *
 * Email flow:
 * 1. Frontend calls sendBillUploadReminder() when bill is uploaded
 * 2. Service calculates deadline urgency
 * 3. Sends POST to backend: http://localhost:5000/api/sendEmail
 * 4. Express server uses Brevo SMTP to deliver email
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
 * Send email via Brevo (formerly Sendinblue) SMTP API
 * Uses Express backend to handle Brevo API requests
 *
 * Brevo provides reliable email delivery with excellent support
 */
export const sendReminderEmail = async (emailData) => {
  try {
    // Use relative path for API endpoint (works on both local and Vercel)
    const apiUrl = "/api/email";

    console.log("📧 Sending email via Brevo:", {
      api: apiUrl,
      email: emailData.email,
      subject: emailData.subject,
    });

    const response = await axios.post(apiUrl, {
      subject: emailData.subject,
      body: emailData.body,
      email: emailData.email,
    });

    console.log("✅ Email sent successfully via Brevo:", response.data);

    return {
      success: true,
      messageId: response.data?.messageId || "brevo-" + Date.now(),
      message: response.data?.message || "Email sent successfully",
      provider: "Brevo",
      recipient: emailData.email,
    };
  } catch (error) {
    console.error("❌ Email API Error:");
    console.error("Status:", error.response?.status);
    console.error("Data:", error.response?.data);
    console.error("Message:", error.message);

    // Extract detailed error from API response
    const apiError = error.response?.data;
    let errorMessage = error.message;

    if (apiError) {
      // If API returned structured error, use it
      errorMessage = apiError.message || apiError.error || error.message;

      if (apiError.code === "EAUTH") {
        errorMessage = `❌ Brevo Authentication Failed\n${apiError.help || "Check BREVO_API_KEY in Vercel Environment Variables"}`;
      } else if (apiError.code === "ECONNREFUSED") {
        errorMessage = `❌ Cannot Connect to Brevo Server\nCheck: https://status.brevo.com`;
      } else if (apiError.help) {
        errorMessage = `${apiError.message}\n\n${apiError.help}`;
      }
    } else if (error.code === "ERR_NETWORK") {
      errorMessage =
        "❌ Network Error: Cannot reach email API\n\nFor production (Vercel): Check environment variables\nFor development: Ensure 'node api/server.js' is running";
    }

    console.warn("⚠️ Email sending failed:", errorMessage);

    return {
      success: false,
      messageId: null,
      message: errorMessage,
      provider: "Brevo",
      error: true,
      statusCode: error.response?.status,
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
 * Calculate days until deadline and return status
 * Returns: { daysUntilDue, isOverdue, isDueSoon, urgencyLevel }
 */
export const calculateBillUrgency = (dueDate) => {
  if (!dueDate)
    return {
      daysUntilDue: Infinity,
      isOverdue: false,
      isDueSoon: false,
      urgencyLevel: "none",
    };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDateObj = new Date(dueDate);
  dueDateObj.setHours(0, 0, 0, 0);

  const daysUntilDue = Math.ceil((dueDateObj - today) / (1000 * 60 * 60 * 24));

  let urgencyLevel = "normal";
  let isOverdue = false;
  let isDueSoon = false;

  if (daysUntilDue < 0) {
    urgencyLevel = "overdue";
    isOverdue = true;
  } else if (daysUntilDue === 0) {
    urgencyLevel = "due-today";
    isDueSoon = true;
  } else if (daysUntilDue <= 1) {
    urgencyLevel = "critical";
    isDueSoon = true;
  } else if (daysUntilDue <= 3) {
    urgencyLevel = "urgent";
    isDueSoon = true;
  } else if (daysUntilDue <= 7) {
    urgencyLevel = "soon";
    isDueSoon = true;
  }

  return { daysUntilDue, isOverdue, isDueSoon, urgencyLevel };
};

/**
 * Send reminder email when a bill is uploaded
 * Checks if the bill is overdue or due soon and sends appropriate reminder
 */
export const sendBillUploadReminder = async (billData, userEmail) => {
  try {
    if (!billData.gstrDeadline || !userEmail) {
      console.log("⚠️ Missing deadline or email - skipping reminder");
      return { sent: false, reason: "Missing deadline or email" };
    }

    const urgency = calculateBillUrgency(billData.gstrDeadline);

    // Only send reminder if bill is overdue or due soon
    if (!urgency.isOverdue && !urgency.isDueSoon) {
      console.log(
        `📋 Bill not due soon (${urgency.daysUntilDue} days) - no reminder needed`,
      );
      return { sent: false, reason: "Bill not due soon", urgency };
    }

    // Generate appropriate email based on urgency
    const deadline = new Date(billData.gstrDeadline);
    const deadlineStr = deadline.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let emailSubject = "";
    let emailBody = "";

    if (urgency.isOverdue) {
      emailSubject = `🚨 OVERDUE ALERT: GST Filing Required - Invoice #${billData.invoiceNumber}`;
      emailBody = `
URGENT: Your GST filing is OVERDUE!

Bill Details:
- Invoice Number: ${billData.invoiceNumber}
- Supplier Name: ${billData.supplierName || "N/A"}
- Amount: ₹${(billData.amount || 0).toFixed(2)}
- Tax Amount: ₹${(billData.taxAmount || 0).toFixed(2)}
- Due Date: ${deadlineStr} (OVERDUE by ${Math.abs(urgency.daysUntilDue)} days)
- GSTR Form: GSTR-1 & GSTR-3B

ACTION REQUIRED:
Please file your GST return immediately to avoid penalties and interest charges.

Penalties for late filing:
- ₹100 per day (max ₹5,000)
- Interest on tax dues

FILE NOW: Visit your dashboard to generate and submit forms.
      `;
    } else if (urgency.urgencyLevel === "due-today") {
      emailSubject = `⏰ FINAL REMINDER: GST Filing Due TODAY - Invoice #${billData.invoiceNumber}`;
      emailBody = `
Your GST filing deadline is TODAY!

Bill Details:
- Invoice Number: ${billData.invoiceNumber}
- Supplier Name: ${billData.supplierName || "N/A"}
- Amount: ₹${(billData.amount || 0).toFixed(2)}
- Tax Amount: ₹${(billData.taxAmount || 0).toFixed(2)}
- Deadline: ${deadlineStr} (TODAY)
- GSTR Form: GSTR-1 & GSTR-3B

IMPORTANT: File your return before the end of today to avoid penalties.

FILE NOW: Visit your dashboard to generate and submit forms.
      `;
    } else if (urgency.urgencyLevel === "critical") {
      emailSubject = `⚠️ CRITICAL: GST Filing Due Tomorrow - Invoice #${billData.invoiceNumber}`;
      emailBody = `
Your GST filing deadline is TOMORROW!

Bill Details:
- Invoice Number: ${billData.invoiceNumber}
- Supplier Name: ${billData.supplierName || "N/A"}
- Amount: ₹${(billData.amount || 0).toFixed(2)}
- Tax Amount: ₹${(billData.taxAmount || 0).toFixed(2)}
- Deadline: ${deadlineStr} (Tomorrow)
- GSTR Form: GSTR-1 & GSTR-3B

Please file your GST return immediately to avoid penalties.

FILE NOW: Visit your dashboard to generate and submit forms.
      `;
    } else if (urgency.urgencyLevel === "urgent") {
      emailSubject = `⚡ Urgent: GST Filing Due in ${urgency.daysUntilDue} Days - Invoice #${billData.invoiceNumber}`;
      emailBody = `
Important Reminder: Your GST filing deadline is approaching!

Bill Details:
- Invoice Number: ${billData.invoiceNumber}
- Supplier Name: ${billData.supplierName || "N/A"}
- Amount: ₹${(billData.amount || 0).toFixed(2)}
- Tax Amount: ₹${(billData.taxAmount || 0).toFixed(2)}
- Deadline: ${deadlineStr} (${urgency.daysUntilDue} days from now)
- GSTR Form: GSTR-1 & GSTR-3B

Please prepare and file your GST return to avoid penalties.

FILE SOON: Visit your dashboard to generate and submit forms.
      `;
    } else {
      emailSubject = `📌 GST Filing Reminder - Invoice #${billData.invoiceNumber}`;
      emailBody = `
Reminder: Your GST filing deadline is approaching.

Bill Details:
- Invoice Number: ${billData.invoiceNumber}
- Supplier Name: ${billData.supplierName || "N/A"}
- Amount: ₹${(billData.amount || 0).toFixed(2)}
- Tax Amount: ₹${(billData.taxAmount || 0).toFixed(2)}
- Deadline: ${deadlineStr} (${urgency.daysUntilDue} days from now)
- GSTR Form: GSTR-1 & GSTR-3B

Start preparing your GST filing documents now.

VISIT: Your dashboard to generate and submit forms.
      `;
    }

    // Send the email
    const emailData = {
      subject: emailSubject,
      body: emailBody,
      email: userEmail,
    };

    const result = await sendReminderEmail(emailData);

    console.log(`✅ Bill upload reminder email sent to ${userEmail}`, {
      urgency,
      result,
    });

    return {
      sent: result.success,
      urgency,
      message: result.message,
    };
  } catch (error) {
    console.error("Error sending bill upload reminder:", error);
    return {
      sent: false,
      error: error.message,
    };
  }
};

/**
 * Test function to send a test email
 * Verifies Brevo SMTP integration is working
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
  calculateBillUrgency,
  sendBillUploadReminder,
  sendReminderEmail,
  checkAndSendBillReminders,
  sendManualReminder,
  getBillReminderHistory,
  sendTestEmail,
};

export default emailReminderService;
