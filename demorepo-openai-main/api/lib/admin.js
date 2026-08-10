/**
 * Firestore / Firebase Auth helper for serverless functions.
 *
 * Uses the Admin SDK so the AI service can (a) verify Firebase ID tokens
 * and (b) read the caller's Firestore invoices for agent tasks such as
 * compliance analysis and tax forecasting.
 *
 * Required environment variables (server-side only, on Vercel / .env):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 *
 * If these are absent the SDK falls back to Application Default Credentials,
 * which is only available on Google-hosted runtimes (e.g. Cloud Run).
 */

const { initializeApp, getApps, cert } = require("firebase-admin");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

function initAdmin() {
  if (getApps().length > 0) return;

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    "finalopenai-fc9c5";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    try {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n").replace(/\\n/g, "\n"),
        }),
      });
      console.log("[Admin] Firebase Admin initialized with explicit credentials");
      return;
    } catch (err) {
      console.error("[Admin] Firebase Admin cert() failed:", err.message);
      throw err;
    }
  }

  // No explicit credentials — cannot initialize
  throw new Error(
    "Firebase Admin credentials not configured. Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env"
  );
}

function getAuthService() {
  initAdmin();
  return getAuth();
}

let dbConfigured = false;

function getDb() {
  initAdmin();
  const db = getFirestore();
  // Tolerate `undefined` values in document writes (e.g. payload.invoice
  // when the agent trigger isn't invoice_uploaded). Without this, writes
  // fail with "Cannot use \"undefined\" as a Firestore value". Undefined
  // fields are dropped rather than stored.
  if (!dbConfigured) {
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch (e) {
      // The instance may already be started by an out-of-process path that
      // cannot be reconfigured. Degrade gracefully instead of hard-failing.
      console.warn("[Admin] Could not enable ignoreUndefinedProperties:", e.message);
    }
    dbConfigured = true;
  }
  return db;
}

class AiHttpError extends Error {
  constructor(status, code, safeMessage) {
    super(safeMessage);
    this.status = status;
    this.code = code;
    this.safeMessage = safeMessage;
  }
}

/**
 * Verifies the Firebase ID token from the Authorization header.
 * Returns the decoded token (uid) or throws AiHttpError(401).
 */
async function verifyAuth(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    throw new AiHttpError(401, "UNAUTHORIZED", "Authentication required.");
  }
  const idToken = header.slice("Bearer ".length).trim();
  if (!idToken) {
    throw new AiHttpError(401, "UNAUTHORIZED", "Authentication required.");
  }
  try {
    const decoded = await getAuthService().verifyIdToken(idToken);
    if (!decoded || !decoded.uid) {
      throw new Error("Missing uid in token");
    }
    return decoded;
  } catch (err) {
    console.warn("[AI] ID token verification failed:", err.message);
    throw new AiHttpError(
      401,
      "UNAUTHORIZED",
      "Invalid or expired session token."
    );
  }
}

/**
 * Verifies authorization for scheduled/cron endpoints.
 *
 * Accepts only:
 *  - Vercel Cron requests: `Authorization: Bearer <CRON_SECRET>`
 *  - Admin requests: `?adminKey=<ADMIN_KEY>` or `x-admin-key: <ADMIN_KEY>`
 *
 * Fails closed: there is NO environment-based bypass, because these
 * endpoints send real emails to real users and must never be triggerable
 * by unauthenticated callers.
 */
function verifyCronAuth(req) {
  const authHeader = req.headers.authorization || "";
  const cronSecret = process.env.CRON_SECRET;
  const adminKey = process.env.ADMIN_KEY;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  if (
    adminKey &&
    (req.query.adminKey === adminKey ||
      req.headers["x-admin-key"] === adminKey)
  ) {
    return true;
  }
  return false;
}

/**
 * Reads the caller's invoices from Firestore.
 * Path: users/{uid}/bills
 */
async function getBillsForUser(uid, businessId) {
  const db = getDb();
  const snapshot = await db
    .collection("users")
    .doc(uid)
    .collection("bills")
    .get();
  const bills = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (businessId && data.businessId && data.businessId !== businessId) {
      return;
    }
    bills.push({
      id: doc.id,
      invoiceId: doc.id,
      ...data,
    });
  });
  return bills;
}

module.exports = {
  initAdmin,
  getAuthService,
  getDb,
  getBillsForUser,
  verifyAuth,
  verifyCronAuth,
  AiHttpError,
};
