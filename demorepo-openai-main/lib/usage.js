/**
 * CENTRALIZED SERVER-SIDE USAGE SERVICE.
 *
 * Every monthly usage metric in GST Buddy flows through this module:
 *
 *   - Counters live at users/{uid}/usage/{YYYY-MM} (atomic FieldValue
 *     increments inside Firestore transactions — never a read+write race).
 *   - The period key is "YYYY-MM" and the lazy reset is built into the key:
 *     reading users/{uid}/usage/{currentPeriod} naturally yields zero when a
 *     new month starts — no scheduled reset job is required. Old period docs
 *     are simply left in place.
 *   - `reserveUsage()` is the safe path for paid work (invoice uploads, AI
 *     calls): it atomically checks the limit, increments the counter AND
 *     records the idempotency key in ONE transaction. Replays of the same
 *     key are never double-counted. Call `releaseUsage()` with the same key
 *     to refund the slot when the work failed before being accepted.
 *   - `incrementUsage()` remains for the count-on-success path where the
 *     caller has already proven the work succeeded.
 *   - Every reserve is mirrored to an audit event under
 *     users/{uid}/usageEvents so "I uploaded 4 but it says 5" is debuggable.
 *
 * The plan used for limit resolution is the EFFECTIVE plan: expired/cancelled
 * paid subscriptions fall back to "free".
 */

const crypto = require("crypto");
const { getDb } = require("./admin");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const {
  normalizePlan,
  resolveLimit,
  isFairUse,
  PLAN_LIMITS,
} = require("./plans");

// ---------------------------------------------------------------------------
// Period helpers (YYYY-MM)
// ---------------------------------------------------------------------------

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function usageRef(db, uid, period) {
  return db.collection("users").doc(uid).collection("usage").doc(period);
}

function eventRef(db, uid, idempotencyKey, metric) {
  const hash = crypto
    .createHash("sha1")
    .update(`${metric}:${idempotencyKey}`)
    .digest("hex");
  return db.collection("users").doc(uid).collection("usageEvents").doc(hash);
}

function num(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

// ---------------------------------------------------------------------------
// Effective plan resolution (subscription expiry aware)
// ---------------------------------------------------------------------------

/**
 * Resolve the user's EFFECTIVE plan from Firestore.
 * A paid plan is active only while:
 *   - subscriptionPlan is pro/business, AND
 *   - subscriptionStatus is "active" (or absent), AND
 *   - subscriptionExpiry is null or in the future.
 * Anything else falls back to "free".
 */
async function getPlanForUser(uid) {
  const db = getDb();
  const doc = await db.collection("users").doc(uid).get();
  const data = doc.exists ? doc.data() : {};
  const plan = String(data.subscriptionPlan || "free").toLowerCase();
  const status = String(data.subscriptionStatus || "active").toLowerCase();
  const expiry = data.subscriptionExpiry;

  if (plan !== "pro" && plan !== "business") return "free";
  if (status === "cancelled" || status === "expired") return "free";
  if (expiry && expiry.toDate && expiry.toDate() < new Date()) return "free";
  return plan;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Read the user's usage counters for the CURRENT month (lazy reset: a new
 * period yields zeros automatically). Returns:
 *   { period, plan, counts, limits }
 */
async function getUsageForUser(uid) {
  const period = monthKey();
  const db = getDb();
  const plan = await getPlanForUser(uid);
  const snap = await usageRef(db, uid, period).get();
  const data = snap.exists ? snap.data() : {};

  const counts = {};
  for (const metric of Object.keys(PLAN_LIMITS)) {
    counts[metric] = num(data[metric]);
  }

  const limits = {};
  for (const metric of Object.keys(PLAN_LIMITS)) {
    const limit = resolveLimit(plan, metric);
    limits[metric] = {
      limit,
      display: displayLimit(plan, metric),
      fairUse: isFairUse(plan, metric),
    };
  }
  return { period, plan, counts, limits };
}

function displayLimit(plan, metric) {
  const value = (PLAN_LIMITS[metric] || {})[normalizePlan(plan)];
  if (value === "unlimited") return "Unlimited";
  if (value === "fair_use") return "Fair-use";
  return String(value);
}

async function getUsageCount(uid, metric) {
  const period = monthKey();
  const db = getDb();
  const snap = await usageRef(db, uid, period).get();
  if (!snap.exists) return 0;
  return num(snap.data()[metric]);
}

// ---------------------------------------------------------------------------
// Non-mutating limit check
// ---------------------------------------------------------------------------

/**
 * Check (without consuming) whether the user may perform `metric` this month.
 * Returns { allowed: true } or { allowed: false, reason, used, limit, plan,
 * fairUse }.
 */
async function checkLimit(uid, metric) {
  const plan = await getPlanForUser(uid);
  const limit = resolveLimit(plan, metric);
  const used = await getUsageCount(uid, metric);
  if (used < limit) return { allowed: true };
  return {
    allowed: false,
    reason: plan === "business" ? "FAIR_USE_LIMIT_REACHED" : "PLAN_LIMIT_REACHED",
    used,
    limit,
    plan,
    fairUse: isFairUse(plan, metric),
  };
}

// ---------------------------------------------------------------------------
// Atomic reserve with idempotency
// ---------------------------------------------------------------------------

/**
 * Atomically reserve one unit of `metric` for the user, keyed by an
 * idempotency key (the client's uploadId / requestId).
 *
 * Guarantees:
 *   - The same key is counted at most ONCE (double-click, retry, page
 *     refresh and duplicate network requests are all safe).
 *   - The limit check + increment happen inside one Firestore transaction
 *     (two simultaneous requests can never both pass a 4/5 check).
 *   - "fair_use" plans are capped at their internal safety ceiling and are
 *     reported with FAIR_USE_LIMIT_REACHED (a controlled message), never an
 *     advertised hard limit.
 *
 * Returns:
 *   { allowed: true,  used, limit, plan, alreadyProcessed: false }
 *   { allowed: true,  alreadyProcessed: true,  ... }  (duplicate key replay)
 *   { allowed: false, reason, used, limit, plan, requiredPlan }
 */
async function reserveUsage(uid, metric, idempotencyKey, options = {}) {
  const db = getDb();
  const period = monthKey();
  const key = String(idempotencyKey || "").trim();
  if (!key) {
    const fallbackKey = `auto_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    return reserveUsage(uid, metric, fallbackKey, options);
  }

  const plan = options.plan || (await getPlanForUser(uid));
  const requiredPlan = options.requiredPlan || null;
  const limit = resolveLimit(plan, metric);
  const ref = usageRef(db, uid, period);
  const evRef = eventRef(db, uid, key, metric);

  let outcome;
  await db.runTransaction(async (tx) => {
    const evSnap = await tx.get(evRef);
    const evData = evSnap.exists ? evSnap.data() : null;
    if (evData && evData.period === period && evData.result !== "released") {
      // Idempotent replay — this key was already counted this period
      // (double-click, network retry, page refresh). Never double-count.
      const used = await readMetricInTx(tx, ref, metric);
      outcome = {
        allowed: true,
        alreadyProcessed: true,
        key,
        used,
        limit,
        plan,
        period,
        fairUse: isFairUse(plan, metric),
      };
      return;
    }

    const used = await readMetricInTx(tx, ref, metric);
    if (used >= limit) {
      outcome = {
        allowed: false,
        reason: plan === "business" ? "FAIR_USE_LIMIT_REACHED" : "PLAN_LIMIT_REACHED",
        key,
        used,
        limit,
        plan,
        period,
        requiredPlan,
        fairUse: isFairUse(plan, metric),
      };
      return;
    }

    tx.set(
      ref,
      {
        [metric]: FieldValue.increment(1),
        period,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );
    tx.set(
      evRef,
      {
        userId: uid,
        metric,
        idempotencyKey: key,
        period,
        plan,
        result: "reserved", // counted; released only on compensating failure
        createdAt: Timestamp.now(),
      },
      { merge: true }
    );

    outcome = {
      allowed: true,
      alreadyProcessed: false,
      key,
      used: used + 1,
      limit,
      plan,
      period,
      fairUse: isFairUse(plan, metric),
    };
  });

  return outcome;
}

async function readMetricInTx(tx, ref, metric) {
  const snap = await tx.get(ref);
  if (!snap.exists) return 0;
  return num(snap.data()[metric]);
}

/**
 * Read a usage-event doc (used to recover the stored billId on replay).
 */
async function getUsageEvent(uid, metric, idempotencyKey) {
  const db = getDb();
  const key = String(idempotencyKey || "").trim();
  if (!key) return null;
  const evRef = eventRef(db, uid, key, metric);
  const snap = await evRef.get();
  if (!snap.exists) return null;
  return snap.data();
}

/**
 * Finalize a reservation with the produced artifact (e.g. billId).
 * Replays of the same key can then return the existing artifact instead of
 * creating a duplicate. Safe to call more than once.
 */
async function finalizeUsage(uid, metric, idempotencyKey, extra = {}) {
  const db = getDb();
  const key = String(idempotencyKey || "").trim();
  if (!key) return null;
  const evRef = eventRef(db, uid, key, metric);
  await evRef.update({ result: "counted", ...extra, finalizedAt: Timestamp.now() });
  return true;
}

/**
 * Refund a previously reserved slot (compensating action).
 * Safe to call multiple times — only a "reserved" event is released once.
 * Returns { released: boolean }.
 */
async function releaseUsage(uid, metric, idempotencyKey) {
  const db = getDb();
  const period = monthKey();
  const key = String(idempotencyKey || "").trim();
  if (!key) return { released: false };

  const ref = usageRef(db, uid, period);
  const evRef = eventRef(db, uid, key, metric);

  let released = false;
  await db.runTransaction(async (tx) => {
    const evSnap = await tx.get(evRef);
    if (!evSnap.exists) return;
    const ev = evSnap.data();
    if (ev.period !== period || ev.result !== "reserved") return;
    tx.update(ref, { [metric]: FieldValue.increment(-1), updatedAt: Timestamp.now() });
    tx.update(evRef, { result: "released", releasedAt: Timestamp.now() });
    released = true;
  });

  return { released };
}

/**
 * Simple atomic increment (count-on-success path). No idempotency — callers
 * that need replay-safety should use reserveUsage()/releaseUsage() instead.
 */
async function incrementUsage(uid, metric, n = 1) {
  const db = getDb();
  const period = monthKey();
  await usageRef(db, uid, period).set(
    { [metric]: FieldValue.increment(n), period, updatedAt: Timestamp.now() },
    { merge: true }
  );
}

module.exports = {
  PLAN_LIMITS,
  monthKey,
  getPlanForUser,
  getUsageForUser,
  getUsageCount,
  checkLimit,
  reserveUsage,
  releaseUsage,
  getUsageEvent,
  finalizeUsage,
  incrementUsage,
};
