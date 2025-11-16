import { db } from '../config/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';

/**
 * Calculates GST due dates based on invoice month
 * GST GSTR-3B is due on 20th of next month
 * GSTR-1 is due on 11th of next month
 */
export const calculateGSTDueDates = (invoiceDate) => {
  const date = new Date(invoiceDate);
  const year = date.getFullYear();
  const month = date.getMonth();

  // GSTR-1 due date: 11th of next month
  const gstr1DueDate = new Date(year, month + 1, 11);

  // GSTR-3B due date: 20th of next month
  const gstr3bDueDate = new Date(year, month + 1, 20);

  return {
    gstr1DueDate,
    gstr3bDueDate,
  };
};

/**
 * Create reminders for a bill when uploaded
 */
export const createBillReminders = async (userId, billData) => {
  try {
    const { gstr1DueDate, gstr3bDueDate } = calculateGSTDueDates(
      billData.invoiceDate
    );

    const reminders = [];

    // GSTR-1 reminder: Alert 1 day before
    const gstr1Reminder = await addDoc(collection(db, 'reminders'), {
      userId,
      billId: billData.id,
      type: 'gstr-1-due',
      title: 'GSTR-1 Filing Due Soon',
      message: `GSTR-1 form for invoice ${billData.invoiceNumber} is due on ${gstr1DueDate.toLocaleDateString()}`,
      dueDate: Timestamp.fromDate(gstr1DueDate),
      daysBeforeAlert: 1,
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    reminders.push(gstr1Reminder.id);

    // GSTR-3B reminder: Alert 1 day before
    const gstr3bReminder = await addDoc(collection(db, 'reminders'), {
      userId,
      billId: billData.id,
      type: 'gstr-3b-due',
      title: 'GSTR-3B Tax Return Due Soon',
      message: `GSTR-3B return for invoice ${billData.invoiceNumber} is due on ${gstr3bDueDate.toLocaleDateString()}`,
      dueDate: Timestamp.fromDate(gstr3bDueDate),
      daysBeforeAlert: 1,
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    reminders.push(gstr3bReminder.id);

    // GST Payment reminder: Alert 2 days before
    const paymentReminder = await addDoc(collection(db, 'reminders'), {
      userId,
      billId: billData.id,
      type: 'gst-payment-due',
      title: 'GST Payment Due',
      message: `GST payment for invoice ${billData.invoiceNumber} (₹${billData.taxAmount}) is due by ${gstr3bDueDate.toLocaleDateString()}`,
      dueDate: Timestamp.fromDate(gstr3bDueDate),
      daysBeforeAlert: 2,
      amount: billData.taxAmount,
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    reminders.push(paymentReminder.id);

    console.log('Reminders created:', reminders);
    return reminders;
  } catch (error) {
    console.error('Error creating reminders:', error);
    throw error;
  }
};

/**
 * Get pending reminders for a user that need to be shown
 * Returns reminders where (dueDate - now) <= daysBeforeAlert
 */
export const getPendingReminders = async (userId) => {
  try {
    const q = query(
      collection(db, 'reminders'),
      where('userId', '==', userId),
      where('status', '==', 'pending')
    );

    const querySnapshot = await getDocs(q);
    const now = new Date();
    const pendingReminders = [];

    querySnapshot.forEach((doc) => {
      const reminder = { id: doc.id, ...doc.data() };
      const dueDate = reminder.dueDate.toDate();
      const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

      // Show reminder if it's within the alert window
      if (daysUntilDue <= reminder.daysBeforeAlert && daysUntilDue >= 0) {
        pendingReminders.push({
          ...reminder,
          daysUntilDue,
          formattedDueDate: dueDate.toLocaleDateString(),
        });
      }
    });

    return pendingReminders.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return [];
  }
};

/**
 * Mark a reminder as sent/acknowledged
 */
export const markReminderSent = async (reminderId) => {
  try {
    const reminderRef = doc(db, 'reminders', reminderId);
    await updateDoc(reminderRef, {
      status: 'sent',
      sentAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error marking reminder as sent:', error);
    throw error;
  }
};

/**
 * Dismiss a reminder
 */
export const dismissReminder = async (reminderId) => {
  try {
    const reminderRef = doc(db, 'reminders', reminderId);
    await updateDoc(reminderRef, {
      status: 'dismissed',
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error dismissing reminder:', error);
    throw error;
  }
};

/**
 * Get all reminders for a user (regardless of status)
 */
export const getAllReminders = async (userId) => {
  try {
    const q = query(collection(db, 'reminders'), where('userId', '==', userId));

    const querySnapshot = await getDocs(q);
    const reminders = [];

    querySnapshot.forEach((doc) => {
      const reminder = { id: doc.id, ...doc.data() };
      reminders.push({
        ...reminder,
        formattedDueDate: reminder.dueDate.toDate().toLocaleDateString(),
        dueDate: reminder.dueDate.toDate(),
      });
    });

    return reminders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    console.error('Error fetching all reminders:', error);
    return [];
  }
};

/**
 * Generate alert notifications for display
 * This formats reminders into user-friendly messages
 */
export const generateReminderAlerts = (reminders) => {
  return reminders.map((reminder) => ({
    id: reminder.id,
    type: reminder.type,
    title: reminder.title,
    message: reminder.message,
    daysUntilDue: reminder.daysUntilDue,
    severity:
      reminder.daysUntilDue === 0
        ? 'critical'
        : reminder.daysUntilDue === 1
          ? 'warning'
          : 'info',
    emoji:
      reminder.type === 'gst-payment-due'
        ? '💰'
        : reminder.type === 'gstr-3b-due'
          ? '📋'
          : '📤',
  }));
};
