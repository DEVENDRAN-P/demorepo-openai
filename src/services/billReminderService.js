/**
 * Bill Reminder Service
 * Manages reminders for individual bills and tracks reminder status
 */

import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

const db = getFirestore();

/**
 * Get reminder information for a specific bill
 * Returns: { hasReminder, reminderDaysLeft, reminderType, lastSentEmail, lastSentDate }
 */
export const getBillReminderStatus = async (userId, billId) => {
  try {
    if (!userId || !billId) {
      return { hasReminder: false, reminderDaysLeft: null, reminderType: null };
    }

    // Get the bill details
    const billRef = doc(db, "users", userId, "bills", billId);
    const billSnapshot = await getDoc(billRef);

    if (!billSnapshot.exists()) {
      return { hasReminder: false };
    }

    const bill = billSnapshot.data();
    const now = new Date();

    // Check if bill has a deadline
    if (!bill.gstrDeadline) {
      return {
        hasReminder: false,
        message: "No deadline set for this bill",
      };
    }

    const deadline = new Date(bill.gstrDeadline);
    const daysUntilDeadline = Math.ceil(
      (deadline - now) / (1000 * 60 * 60 * 24),
    );

    let reminderType = null;
    let hasReminder = false;

    // Determine if reminder should be shown
    if (daysUntilDeadline < 0) {
      reminderType = "overdue";
      hasReminder = true;
    } else if (daysUntilDeadline === 0) {
      reminderType = "today";
      hasReminder = true;
    } else if (daysUntilDeadline === 1) {
      reminderType = "tomorrow";
      hasReminder = true;
    } else if (daysUntilDeadline <= 3) {
      reminderType = "three-days";
      hasReminder = true;
    } else if (daysUntilDeadline <= 7) {
      reminderType = "one-week";
      hasReminder = true;
    } else if (daysUntilDeadline <= 14) {
      reminderType = "two-weeks";
      hasReminder = true;
    }

    // Get the last sent reminder email
    const remindersRef = collection(db, "users", userId, "emailReminders");
    const remindersQuery = query(remindersRef, where("billId", "==", billId));

    const remindersSnapshot = await getDocs(remindersQuery);
    let lastSentEmail = null;
    let lastSentDate = null;

    if (!remindersSnapshot.empty) {
      const reminders = remindersSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort((a, b) => {
          const dateA = a.sentDate?.toDate?.() || new Date(0);
          const dateB = b.sentDate?.toDate?.() || new Date(0);
          return dateB - dateA;
        });

      if (reminders.length > 0) {
        lastSentEmail = reminders[0].emailSent;
        lastSentDate = reminders[0].sentDate?.toDate?.() || null;
      }
    }

    return {
      hasReminder,
      reminderDaysLeft: daysUntilDeadline,
      reminderType,
      daysText: getDaysText(daysUntilDeadline),
      deadline: deadline.toLocaleDateString(),
      lastSentEmail,
      lastSentDate,
      billData: bill,
    };
  } catch (error) {
    console.error("Error getting bill reminder status:", error);
    return { hasReminder: false, error: error.message };
  }
};

/**
 * Get reminder history for a bill
 */
export const getBillReminderHistory = async (userId, billId) => {
  try {
    const remindersRef = collection(db, "users", userId, "emailReminders");
    const remindersQuery = query(remindersRef, where("billId", "==", billId));

    const snapshot = await getDocs(remindersQuery);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      sentDate: doc.data().sentDate?.toDate?.() || null,
    }));
  } catch (error) {
    console.error("Error getting reminder history:", error);
    return [];
  }
};

/**
 * Record that a email reminder was sent for this bill
 */
export const recordReminderEmailSent = async (
  userId,
  billId,
  email,
  type = "manual",
) => {
  try {
    const remindersRef = collection(db, "users", userId, "emailReminders");

    const docRef = await addDoc(remindersRef, {
      billId,
      type,
      emailSent: email,
      sentDate: serverTimestamp(),
      status: "sent",
    });

    return {
      success: true,
      documentId: docRef.id,
      message: `Reminder email sent to ${email}`,
    };
  } catch (error) {
    console.error("Error recording reminder:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Helper function to format days text
 */
function getDaysText(daysUntilDeadline) {
  if (daysUntilDeadline < 0) {
    return `OVERDUE by ${Math.abs(daysUntilDeadline)} day${Math.abs(daysUntilDeadline) > 1 ? "s" : ""}`;
  } else if (daysUntilDeadline === 0) {
    return "Due TODAY";
  } else if (daysUntilDeadline === 1) {
    return "Due TOMORROW";
  } else if (daysUntilDeadline <= 3) {
    return `Due in ${daysUntilDeadline} days`;
  } else if (daysUntilDeadline <= 7) {
    return `Due in ${daysUntilDeadline} days`;
  } else {
    return `Due in ${daysUntilDeadline} days`;
  }
}

/**
 * Get severity level for reminder badge
 */
export const getReminderSeverity = (daysUntilDeadline) => {
  if (daysUntilDeadline < 0) return "critical";
  if (daysUntilDeadline <= 1) return "critical";
  if (daysUntilDeadline <= 3) return "warning";
  if (daysUntilDeadline <= 7) return "alert";
  return "info";
};

const billReminderService = {
  getBillReminderStatus,
  getBillReminderHistory,
  recordReminderEmailSent,
  getReminderSeverity,
};

export default billReminderService;
