/**
 * Database utility for the Billing API (Cashfree).
 *
 * Uses Firebase Admin SDK (Firestore) exclusively.
 * All subscription and payment data is stored under users/{uid}/... to
 * guarantee strict user isolation.
 *
 * Data layout:
 *   users/{uid}                      → merged subscription fields (authoritative plan)
 *   users/{uid}/orders/{orderId}     → pending Cashfree order records
 *   users/{uid}/payments/{paymentId} → payment ledger (success/failed)
 *
 * REMOVED: filesystem mock database, USE_MOCK_DATABASE flag and the
 * legacy single-function subscription update helper.
 * If Firebase is misconfigured, the functions throw a clear error rather
 * than silently falling back to ephemeral in-memory state.
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
    subscriptionProvider: null,
  };

  if (!doc.exists) return defaults;

  const data = doc.data();
  return {
    subscriptionPlan: data.subscriptionPlan || "free",
    subscriptionStatus: data.subscriptionStatus || "active",
    subscriptionProvider: data.subscriptionProvider || null,
    subscriptionStart: data.subscriptionStart
      ? data.subscriptionStart.toDate().toISOString()
      : defaults.subscriptionStart,
    subscriptionExpiry: data.subscriptionExpiry
      ? data.subscriptionExpiry.toDate().toISOString()
      : null,
  };
}

/**
 * Record a pending Cashfree order before checkout.
 * Stored at users/{uid}/orders/{orderId}.
 */
async function savePendingOrder(uid, orderData) {
  const db = getDb();
  await db
    .collection("users")
    .doc(uid)
    .collection("orders")
    .doc(orderData.orderId)
    .set(
      {
        ...orderData,
        uid,
        status: orderData.status || "created",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

/**
 * Read a pending order record for a user.
 * Returns null when the order does not exist.
 */
async function getPendingOrder(uid, orderId) {
  const db = getDb();
  const doc = await db
    .collection("users")
    .doc(uid)
    .collection("orders")
    .doc(orderId)
    .get();
  if (!doc.exists) return null;
  const data = doc.data();
  return {
    ...data,
    createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
    updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
  };
}

/**
 * Update the status of a pending order.
 */
async function updateOrderStatus(uid, orderId, status, extra = {}) {
  const db = getDb();
  await db
    .collection("users")
    .doc(uid)
    .collection("orders")
    .doc(orderId)
    .update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
      ...extra,
    });
}

/**
 * Find a payment record by Cashfree order ID (idempotency helper).
 */
async function getPaymentByOrderId(uid, orderId) {
  const db = getDb();
  const snapshot = await db
    .collection("users")
    .doc(uid)
    .collection("payments")
    .where("orderId", "==", orderId)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
  };
}

/**
 * Atomically activate a subscription for a confirmed payment.
 *
 * Runs inside a Firestore transaction so concurrent webhook + verify calls
 * can never double-activate, double-record, or extend a subscription twice.
 *
 * Steps:
 *  1. Read users/{uid}/orders/{orderId}.
 *  2. If the order is already processed (success/failed) → no-op.
 *  3. If a payment with the same paymentId already exists → no-op.
 *  4. Mark the order processed, write the payment ledger entry and update the
 *     merged subscription fields on users/{uid} in one transaction.
 *
 * @returns {Promise<{alreadyProcessed: boolean, status?: string}>}
 */
async function activateSubscriptionFromOrder(
  uid,
  orderId,
  { paymentId, amount, currency, plan, provider = "cashfree", expiryDate }
) {
  const db = getDb();
  const userDocRef = db.collection("users").doc(uid);
  const orderRef = db.collection("users").doc(uid).collection("orders").doc(orderId);
  const paymentRef = paymentId
    ? db.collection("users").doc(uid).collection("payments").doc(paymentId)
    : null;

  let outcome;
  await db.runTransaction(async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists) {
      outcome = { alreadyProcessed: false, error: "ORDER_NOT_FOUND" };
      return;
    }
    const orderData = orderSnap.data();
    if (orderData.status === "success" || orderData.status === "failed") {
      outcome = { alreadyProcessed: true, status: orderData.status };
      return;
    }
    if (paymentRef) {
      const paymentSnap = await transaction.get(paymentRef);
      if (paymentSnap.exists) {
        outcome = { alreadyProcessed: true, status: paymentSnap.data().status || "success" };
        return;
      }
    }

    transaction.set(
      orderRef,
      {
        status: "success",
        paymentId: paymentId || null,
        processedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    transaction.set(
      userDocRef,
      {
        subscriptionPlan: plan,
        subscriptionStatus: "active",
        subscriptionProvider: provider,
        subscriptionOrderId: orderId,
        subscriptionPaymentId: paymentId || null,
        subscriptionAmount: amount,
        subscriptionCurrency: currency || "INR",
        subscriptionStart: FieldValue.serverTimestamp(),
        subscriptionExpiry: Timestamp.fromDate(expiryDate),
      },
      { merge: true }
    );

    if (paymentRef) {
      transaction.set(paymentRef, {
        paymentId,
        orderId,
        amount,
        currency: currency || "INR",
        plan,
        status: "success",
        provider,
        uid,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    outcome = { alreadyProcessed: false, status: "success" };
  });

  return outcome;
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
      status: "failed",
      createdAt: FieldValue.serverTimestamp(),
    });
}

/**
 * Downgrade a user to the Free plan (server-authoritative).
 * No payment record is created — this is a plan-state change only.
 */
async function downgradeUserToFree(uid) {
  const db = getDb();
  await db
    .collection("users")
    .doc(uid)
    .set(
      {
        subscriptionPlan: "free",
        subscriptionStatus: "active",
        subscriptionProvider: null,
        subscriptionOrderId: null,
        subscriptionPaymentId: null,
        subscriptionAmount: null,
        subscriptionCurrency: null,
        subscriptionStart: FieldValue.serverTimestamp(),
        subscriptionExpiry: null,
      },
      { merge: true }
    );
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
  getPaymentHistory,
  savePendingOrder,
  getPendingOrder,
  updateOrderStatus,
  getPaymentByOrderId,
  activateSubscriptionFromOrder,
  saveFailedPayment,
  downgradeUserToFree,
};
