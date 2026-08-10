/**
 * Database utility for the Billing API.
 *
 * Uses Firebase Admin SDK (Firestore) exclusively.
 * All subscription and payment data is stored under users/{uid}/...
 * to guarantee strict user isolation.
 *
 * REMOVED: filesystem mock database, USE_MOCK_DATABASE flag.
 * If Firebase is misconfigured, the functions throw a clear error
 * rather than silently falling back to ephemeral in-memory state.
 */

// All Firestore access goes through the shared admin helper (lib/admin.js)
// so the instance is configured exactly once (ignoreUndefinedProperties) and
// no other module can start the Firestore instance before settings are applied.
const { getDb } = require("./admin");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");

/**
 * Get subscription state for a user.
 * Reads from users/{uid} document.
 */
async function getUserSubscription(uid) {
  const db = getDb();
  const doc = await db.collection("users").doc(uid).get();

  const defaults = {
    subscriptionPlan: "free",
    subscriptionStatus: "active",
    subscriptionStart: new Date().toISOString(),
    subscriptionExpiry: null,
  };

  if (!doc.exists) return defaults;

  const data = doc.data();
  return {
    subscriptionPlan: data.subscriptionPlan || "free",
    subscriptionStatus: data.subscriptionStatus || "active",
    subscriptionStart: data.subscriptionStart
      ? data.subscriptionStart.toDate().toISOString()
      : defaults.subscriptionStart,
    subscriptionExpiry: data.subscriptionExpiry
      ? data.subscriptionExpiry.toDate().toISOString()
      : null,
  };
}

/**
 * Update subscription state and record the payment.
 *
 * Subscription is stored on users/{uid} (merged).
 * Payment record is stored at users/{uid}/payments/{paymentId}
 * for strict user isolation.
 */
async function updateUserSubscription(uid, planId, expiryDate, paymentData) {
  const db = getDb();

  const userDocRef = db.collection("users").doc(uid);
  const paymentDocRef = db
    .collection("users")
    .doc(uid)
    .collection("payments")
    .doc(paymentData.paymentId);

  await db.runTransaction(async (transaction) => {
    transaction.set(
      userDocRef,
      {
        subscriptionPlan: planId,
        subscriptionStatus: "active",
        subscriptionStart: FieldValue.serverTimestamp(),
        subscriptionExpiry: Timestamp.fromDate(expiryDate),
      },
      { merge: true }
    );

    transaction.set(paymentDocRef, {
      ...paymentData,
      uid,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { success: true };
}

/**
 * Record a failed payment.
 * Stored at users/{uid}/payments/{paymentId} with status "failed".
 */
async function saveFailedPayment(paymentData) {
  const db = getDb();
  const paymentId = paymentData.paymentId || `failed_${Date.now()}`;
  await db
    .collection("users")
    .doc(paymentData.uid)
    .collection("payments")
    .doc(paymentId)
    .set({
      ...paymentData,
      createdAt: FieldValue.serverTimestamp(),
    });
}

/**
 * Get payment history for a user.
 * Reads from users/{uid}/payments (user-scoped).
 */
async function getPaymentHistory(uid) {
  const db = getDb();
  const snapshot = await db
    .collection("users")
    .doc(uid)
    .collection("payments")
    .orderBy("createdAt", "desc")
    .get();

  const records = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    records.push({
      id: doc.id,
      ...data,
      createdAt: data.createdAt
        ? data.createdAt.toDate().toISOString()
        : new Date().toISOString(),
    });
  });
  return records;
}

module.exports = {
  getUserSubscription,
  updateUserSubscription,
  saveFailedPayment,
  getPaymentHistory,
};
