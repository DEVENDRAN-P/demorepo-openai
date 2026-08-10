/**
 * Server-side usage counters + plan entitlements.
 *
 * Counters live at users/{uid}/usage/{YYYY-MM} and are incremented with
 * atomic FieldValue.increment() — never trusted from the client.
 *
 * Limits (per calendar month):
 *   invoice_extractions:  free 10, pro 500, business 5000
 *   document_analyses:    free 3,  pro 50,  business 500
 */

const { getDb } = require("./admin");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");

const PLAN_LIMITS = {
  invoice_extractions: { free: 10, pro: 500, business: 5000 },
  document_analyses: { free: 3, pro: 50, business: 500 },
};

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function usageRef(db, uid) {
  return db.collection("users").doc(uid).collection("usage").doc(monthKey());
}

/**
 * Resolve the user's effective plan from Firestore.
 * Expired paid subscriptions fall back to "free".
 */
async function getPlanForUser(uid) {
  const db = getDb();
  const doc = await db.collection("users").doc(uid).get();
  const data = doc.exists ? doc.data() : {};
  const plan = String(data.subscriptionPlan || "free").toLowerCase();
  const expiry = data.subscriptionExpiry;
  if (expiry && expiry.toDate && expiry.toDate() < new Date()) {
    return "free";
  }
  return plan === "pro" || plan === "business" ? plan : "free";
}

async function getUsageCount(uid, key) {
  const db = getDb();
  const snap = await usageRef(db, uid).get();
  if (!snap.exists) return 0;
  const v = snap.data()[key];
  return typeof v === "number" ? v : 0;
}

async function incrementUsage(uid, key, n = 1) {
  const db = getDb();
  await usageRef(db, uid).set(
    { [key]: FieldValue.increment(n), updatedAt: Timestamp.now() },
    { merge: true }
  );
}

/**
 * Check whether the user may perform `key` this month.
 * Returns { allowed: true } or { allowed: false, limit, used, plan }.
 */
async function checkUsageLimit(uid, key) {
  const limits = PLAN_LIMITS[key];
  if (!limits) return { allowed: true };
  const plan = await getPlanForUser(uid);
  const limit = limits[plan] !== undefined ? limits[plan] : limits.free;
  const used = await getUsageCount(uid, key);
  return used < limit
    ? { allowed: true }
    : { allowed: false, limit, used, plan };
}

module.exports = {
  PLAN_LIMITS,
  getPlanForUser,
  getUsageCount,
  incrementUsage,
  checkUsageLimit,
};
