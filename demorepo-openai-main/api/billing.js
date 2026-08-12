const { getAuth } = require("firebase-admin/auth");
const { getApps, initializeApp, cert } = require("firebase-admin");
const crypto = require("crypto");
const {
  getUserSubscription,
  getPaymentHistory,
  savePendingOrder,
  getPendingOrder,
  updateOrderStatus,
  getPaymentByOrderId,
  activateSubscriptionFromOrder,
  saveFailedPayment,
  downgradeUserToFree,
} = require("../lib/database");

// ---------------------------------------------------------------------------
// Cashfree configuration (server-side secrets only — never exposed to the
// browser). CASHFREE_SECRET_KEY must live exclusively in server env vars.
// ---------------------------------------------------------------------------
const CASHFREE_API_VERSION = "2023-08-01";
const CASHFREE_ORDER_EXPIRY_DAYS = 30;

// Backend is the source of truth for pricing. The frontend sends only
// { plan: "pro" | "business" } — an amount from the client is NEVER trusted.
const PLAN_PRICES = {
  pro: 199,
  business: 499,
};

// Validate required env vars at startup (safe — no secret values logged)
const missingCashfree = ["CASHFREE_APP_ID", "CASHFREE_SECRET_KEY"].filter(
  (k) => !process.env[k]
);
if (missingCashfree.length > 0) {
  console.error(JSON.stringify({
    type: "billing_startup_error",
    message: "Missing Cashfree credentials",
    keys: missingCashfree,
  }));
}
// Cashfree signs webhooks with the PG Client Secret (CASHFREE_SECRET_KEY).
// CASHFREE_WEBHOOK_SECRET is an optional override for environments that
// deliberately use a different signing secret.
const webhookSecretEnv = process.env.CASHFREE_WEBHOOK_SECRET;
if (webhookSecretEnv && /^https?:\/\//i.test(webhookSecretEnv.trim())) {
  console.error(JSON.stringify({
    type: "billing_startup_error",
    message: "CASHFREE_WEBHOOK_SECRET looks like a URL, not a signing secret — falling back to CASHFREE_SECRET_KEY for webhook verification",
  }));
}

// Firebase Auth — reuse the already-initialized app if available,
// otherwise initialize with service account credentials.
let authInstance = null;

function getFirebaseAuth() {
  if (authInstance) return authInstance;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (getApps().length === 0) {
    if (clientEmail && privateKey && projectId) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      });
    } else {
      // Let Firebase use Application Default Credentials
      initializeApp({ projectId: projectId || undefined });
    }
  }

  authInstance = getAuth();
  return authInstance;
}

// ---------------------------------------------------------------------------
// Cashfree API helpers
// ---------------------------------------------------------------------------
function getCashfreeBaseUrl() {
  const env = String(process.env.CASHFREE_ENV || "sandbox").toLowerCase();
  return env === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

function getCashfreeEnv() {
  const env = String(process.env.CASHFREE_ENV || "sandbox").toLowerCase();
  return env === "production" ? "production" : "sandbox";
}

function getCashfreeCredentials() {
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  if (!appId || !secretKey) return null;
  return { appId, secretKey };
}

/** Normalize an Indian mobile number: +91, spaces, dashes tolerated. */
function normalizePhone(phone) {
  if (!phone) return "";
  let digits = String(phone).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 10 && /^[6-9]/.test(digits)) return digits;
  return "";
}

/** Unique Cashfree order id (alphanumeric only — safe for prod). */
function generateOrderId(uid) {
  const ts = Date.now();
  const suffix = String(uid || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase() || "USER";
  return `GB${ts}${suffix}`;
}

/** Derive the SPA origin for the Cashfree return_url. */
function getAppOrigin(req) {
  if (process.env.APP_URL) return String(process.env.APP_URL).replace(/\/+$/, "");
  const origin = req.headers.origin || req.headers.referer;
  if (origin) return String(origin).replace(/\/+$/, "");
  return "https://gstbuddy.vercel.app";
}

/**
 * Create a Cashfree order (server-to-server).
 * @see https://docs.cashfree.com/reference/pgordercreateorder
 */
async function createCashfreeOrder({ orderId, amount, currency, customer, returnUrl }) {
  const creds = getCashfreeCredentials();
  const response = await fetch(`${getCashfreeBaseUrl()}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": creds.appId,
      "x-client-secret": creds.secretKey,
      "x-api-version": CASHFREE_API_VERSION,
    },
    body: JSON.stringify({
      order_id: orderId,
      order_amount: amount,
      order_currency: currency,
      customer_details: {
        customer_id: customer.uid,
        customer_phone: customer.phone,
        customer_email: customer.email || "customer@gstbuddy.in",
        customer_name: customer.name || "GST Buddy Customer",
      },
      order_meta: {
        return_url: returnUrl,
      },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (data && (data.message || data.error_description)) ||
      `Cashfree order creation failed (HTTP ${response.status})`;
    throw new Error(message);
  }
  return data;
}

/**
 * Fetch all payments for an order from Cashfree.
 * @see https://docs.cashfree.com/reference/pgfetchallpaymentsfororder
 */
async function fetchOrderPayments(orderId) {
  const creds = getCashfreeCredentials();
  const response = await fetch(
    `${getCashfreeBaseUrl()}/orders/${encodeURIComponent(orderId)}/payments`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": creds.appId,
        "x-client-secret": creds.secretKey,
        "x-api-version": CASHFREE_API_VERSION,
      },
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (data && (data.message || data.error_description)) ||
      `Cashfree payment fetch failed (HTTP ${response.status})`;
    throw new Error(message);
  }
  return Array.isArray(data) ? data : [];
}

/**
 * Read the exact raw request body for webhook signature verification.
 * Works locally (express.json verify captures req.rawBody) and on Vercel
 * (the request stream is read before req.body is ever accessed).
 */
async function getRawBody(req) {
  if (typeof req.rawBody === "string" && req.rawBody.length > 0) {
    return req.rawBody;
  }
  try {
    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
      total += chunk.length;
      if (total > 10 * 1024 * 1024) throw new Error("Body too large");
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    if (raw && raw.trim()) return raw;
  } catch (e) {
    // stream already consumed or unreadable — fall through to reconstruction
  }
  // Last resort: reconstruct from the parsed body. This only matches the
  // Cashfree signature when serialization is byte-identical; if not, the
  // webhook is rejected (fail-closed), never blindly trusted.
  const body = req.body;
  return body && typeof body === "object" ? JSON.stringify(body) : "";
}

/**
 * Verify the Cashfree webhook signature (official algorithm):
 *   signature = base64(hmac_sha256(x-webhook-timestamp + "." + rawBody, secret))
 * The dot (.) separator between timestamp and body is REQUIRED.
 */
function verifyWebhookSignature(signature, timestamp, rawBody, secretKey) {
  if (!signature || !timestamp || !rawBody) return false;
  const expected = crypto
    .createHmac("sha256", secretKey)
    .update(String(timestamp) + "." + rawBody)
    .digest("base64");
  const provided = String(signature);
  if (expected.length !== provided.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch (e) {
    return false;
  }
}

function getSubscriptionExpiry() {
  return new Date(Date.now() + CASHFREE_ORDER_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

function sendJson(res, status, payload) {
  return res.status(status).json(payload);
}

// ----------------------------------------------------
// ROUTE HANDLERS
// ----------------------------------------------------

// 1. Status Handler
const handleStatus = async (req, res, decodedToken) => {
  const uid = decodedToken.uid;
  console.log(`📥 [GET /api/subscription/status] Request received for UID: ${uid}`);

  try {
    const subscription = await getUserSubscription(uid);
    return sendJson(res, 200, { success: true, subscription });
  } catch (error) {
    console.error(JSON.stringify({ type: "billing_status_error", uid, error: error.message }));
    return sendJson(res, 500, {
      success: false,
      error: "Failed to fetch subscription status. Please try again.",
    });
  }
};

// 2. History Handler
const handleHistory = async (req, res, decodedToken) => {
  const uid = decodedToken.uid;
  console.log(`📥 [GET /api/payment/history] Request received for UID: ${uid}`);

  try {
    const transactions = await getPaymentHistory(uid);
    return sendJson(res, 200, transactions);
  } catch (error) {
    console.error(JSON.stringify({ type: "billing_history_error", uid, error: error.message }));
    return sendJson(res, 500, {
      success: false,
      error: "Failed to fetch payment history. Please try again.",
    });
  }
};

// 3. Create Order Handler (Cashfree)
const handleCreateOrder = async (req, res, decodedToken) => {
  // Frontend sends ONLY { plan } — accept planId as a legacy alias, but the
  // price is always resolved server-side from PLAN_PRICES.
  const { plan, planId, phone } = req.body || {};
  const requestedPlan = plan || planId;
  const uid = decodedToken.uid;

  console.log(`📥 [POST /api/payment/create-order] Plan: '${requestedPlan}', UID: '${uid}'`);

  if (!requestedPlan || !PLAN_PRICES[requestedPlan]) {
    console.warn(`⚠️ [create-order] Invalid plan: '${requestedPlan}'`);
    return sendJson(res, 400, {
      success: false,
      error: "Invalid or missing plan. Allowed values: pro, business",
      code: "INVALID_PLAN",
    });
  }

  const creds = getCashfreeCredentials();
  if (!creds) {
    console.error("❌ [create-order] Cashfree credentials are not configured on the server.");
    return sendJson(res, 500, {
      success: false,
      error: "Payment service unavailable",
      code: "PAYMENT_SERVICE_ERROR",
    });
  }

  // Cashfree requires a customer phone number. Use the authenticated phone if
  // present, otherwise the frontend must collect one.
  const customerPhone = normalizePhone(
    phone || decodedToken.phone_number || ""
  );
  if (!customerPhone) {
    console.warn("⚠️ [create-order] Customer phone number is missing.");
    return sendJson(res, 400, {
      success: false,
      error: "A valid 10-digit Indian mobile number is required to continue.",
      code: "PHONE_REQUIRED",
    });
  }

  const amount = PLAN_PRICES[requestedPlan];
  const orderId = generateOrderId(uid);
  const origin = getAppOrigin(req);
  const returnUrl = `${origin}/payment-success?order_id=${encodeURIComponent(orderId)}`;

  // Persist the pending order BEFORE calling Cashfree so a failed Firestore
  // write can never leave an orphan Cashfree order that cannot be resumed.
  try {
    await savePendingOrder(uid, {
      orderId,
      plan: requestedPlan,
      amount,
      currency: "INR",
      provider: "cashfree",
    });
  } catch (saveErr) {
    console.error(JSON.stringify({ type: "billing_save_pending_error", uid, error: saveErr.message }));
    return sendJson(res, 500, {
      success: false,
      error: "Payment service unavailable",
      code: "PAYMENT_SERVICE_ERROR",
    });
  }

  try {
    console.log("🚀 [create-order] Creating Cashfree order...");
    const order = await createCashfreeOrder({
      orderId,
      amount,
      currency: "INR",
      customer: {
        uid,
        phone: customerPhone,
        email: decodedToken.email || "customer@gstbuddy.in",
        name: decodedToken.name || "GST Buddy Customer",
      },
      returnUrl,
    });
    console.log(`✅ [create-order] Cashfree Order created: ${order.order_id}`);

    // Attach the Cashfree session ID to the pending record.
    await updateOrderStatus(uid, orderId, "created", {
      paymentSessionId: order.payment_session_id,
    });

    return sendJson(res, 200, {
      success: true,
      orderId: order.order_id,
      paymentSessionId: order.payment_session_id,
      orderAmount: Number(order.order_amount),
      orderCurrency: order.order_currency || "INR",
      orderStatus: order.order_status,
      cashfreeEnv: getCashfreeEnv(),
      plan: requestedPlan,
    });
  } catch (error) {
    console.error(JSON.stringify({ type: "billing_create_order_error", plan: requestedPlan, error: error.message }));
    // Mark the pending record failed so it can never be activated.
    try {
      await updateOrderStatus(uid, orderId, "failed");
    } catch (cleanupErr) {
      // non-fatal
    }
    // Surface Cashfree's message (never a secret) so credential/config
    // problems are visible in the UI instead of a generic outage message.
    const providerMessage = error && error.message ? `Cashfree: ${error.message}` : undefined;
    return sendJson(res, 502, {
      success: false,
      error: "Payment service unavailable",
      code: "PAYMENT_SERVICE_ERROR",
      details: providerMessage,
    });
  }
};

// 4. Verify Handler (Cashfree) — server-side payment verification
const handleVerify = async (req, res, decodedToken) => {
  const { orderId, order_id } = req.body || {};
  const orderIdValue = orderId || order_id;
  const uid = decodedToken.uid;

  console.log(`📥 [POST /api/payment/verify] Verification callback received. Order: '${orderIdValue}', UID: '${uid}'`);

  if (!orderIdValue) {
    return sendJson(res, 400, {
      success: false,
      error: "Missing required parameter: orderId",
      code: "INVALID_ORDER",
    });
  }

  const creds = getCashfreeCredentials();
  if (!creds) {
    console.error("❌ [verify] Cashfree credentials are not configured on the server.");
    return sendJson(res, 500, {
      success: false,
      error: "Payment service unavailable",
      code: "PAYMENT_SERVICE_ERROR",
    });
  }

  try {
    const order = await getPendingOrder(uid, orderIdValue);
    if (!order) {
      console.warn(`⚠️ [verify] Unknown order '${orderIdValue}' for UID '${uid}'`);
      return sendJson(res, 400, {
        success: false,
        error: "Order not found",
        code: "INVALID_ORDER",
      });
    }

    // Idempotency: an already-activated order never re-activates.
    const existingPayment = await getPaymentByOrderId(uid, orderIdValue);
    if (existingPayment && existingPayment.status === "success") {
      return sendJson(res, 200, {
        success: true,
        status: "SUCCESS",
        message: "Subscription is already active.",
        payment: {
          paymentId: existingPayment.paymentId,
          orderId: orderIdValue,
          plan: existingPayment.plan,
          amount: existingPayment.amount,
          currency: existingPayment.currency,
          provider: existingPayment.provider || "cashfree",
        },
      });
    }
    if (order.status === "success") {
      return sendJson(res, 200, {
        success: true,
        status: "SUCCESS",
        message: "Subscription is already active.",
        payment: { orderId: orderIdValue, plan: order.plan, amount: order.amount, provider: "cashfree" },
      });
    }
    if (order.status === "failed") {
      return sendJson(res, 200, {
        success: true,
        status: "FAILED",
        message: "Payment failed. Your plan has not been upgraded.",
      });
    }

    console.log("🔍 [verify] Querying Cashfree for payment status...");
    const payments = await fetchOrderPayments(orderIdValue);
    const successful = payments.find((p) => p.payment_status === "SUCCESS");
    const payment = successful || payments[0] || null;

    if (payment && payment.payment_status === "SUCCESS") {
      // Verify the paid amount/currency against the server-side price.
      const paidAmount = Number(payment.payment_amount);
      const paidCurrency = String(payment.payment_currency || "INR").toUpperCase();
      if (paidAmount !== order.amount || paidCurrency !== "INR") {
        console.error(JSON.stringify({
          type: "billing_amount_mismatch",
          uid,
          orderId: orderIdValue,
          expected: order.amount,
          paid: paidAmount,
          currency: paidCurrency,
        }));
        return sendJson(res, 400, {
          success: false,
          error: "Payment verification failed: amount mismatch",
          code: "AMOUNT_MISMATCH",
        });
      }

      console.log("✍️ [verify] Activating subscription (idempotent transaction)...");
      const outcome = await activateSubscriptionFromOrder(uid, orderIdValue, {
        paymentId: payment.payment_id,
        amount: order.amount,
        currency: "INR",
        plan: order.plan,
        provider: "cashfree",
        expiryDate: getSubscriptionExpiry(),
      });

      if (outcome.alreadyProcessed) {
        return sendJson(res, 200, {
          success: true,
          status: "SUCCESS",
          message: "Subscription already activated.",
        });
      }
      if (outcome.error === "ORDER_NOT_FOUND") {
        return sendJson(res, 400, { success: false, error: "Order not found", code: "INVALID_ORDER" });
      }

      console.log(`✅ [verify] Subscription activated for UID '${uid}' (${order.plan}).`);
      return sendJson(res, 200, {
        success: true,
        status: "SUCCESS",
        message: "Payment verified. Subscription activated.",
        payment: {
          paymentId: payment.payment_id,
          orderId: orderIdValue,
          plan: order.plan,
          amount: order.amount,
          currency: "INR",
          provider: "cashfree",
        },
      });
    }

    if (payment && payment.payment_status === "PENDING") {
      // Do NOT activate on pending.
      return sendJson(res, 200, {
        success: true,
        status: "PENDING",
        message: "Your payment is being processed.",
      });
    }

    // FAILED / CANCELLED / USER_DROPPED / no payment yet
    const failedPaymentId = (payment && payment.payment_id) || orderIdValue;
    try {
      await saveFailedPayment({
        paymentId: failedPaymentId,
        orderId: orderIdValue,
        amount: order.amount,
        plan: order.plan,
        currency: "INR",
        provider: "cashfree",
        uid,
      });
      await updateOrderStatus(uid, orderIdValue, "failed");
    } catch (logErr) {
      console.warn("⚠️ [verify] Could not record failed payment:", logErr.message);
    }

    return sendJson(res, 200, {
      success: true,
      status: "FAILED",
      message: "Payment failed. Your plan has not been upgraded.",
    });
  } catch (error) {
    console.error(JSON.stringify({ type: "billing_verify_error", uid, orderId: orderIdValue, error: error.message }));
    const providerMessage = error && error.message ? `Cashfree: ${error.message}` : undefined;
    return sendJson(res, 502, {
      success: false,
      error: "Payment service unavailable",
      code: "PAYMENT_SERVICE_ERROR",
      details: providerMessage,
    });
  }
};

// 5. Webhook Handler (Cashfree) — signature verified, idempotent
const handleWebhook = async (req, res) => {
  // Cashfree signs webhooks with the PG Client Secret. The optional
  // CASHFREE_WEBHOOK_SECRET override is only honored when it is not a URL.
  const envWebhookSecret = process.env.CASHFREE_WEBHOOK_SECRET;
  const secretKey =
    envWebhookSecret && !/^https?:\/\//i.test(envWebhookSecret.trim())
      ? envWebhookSecret.trim()
      : process.env.CASHFREE_SECRET_KEY;
  if (!secretKey) {
    console.error("❌ [webhook] No signing secret configured — rejecting webhook.");
    return sendJson(res, 500, {
      success: false,
      error: "Webhook verification is not configured",
      code: "WEBHOOK_NOT_CONFIGURED",
    });
  }

  const signature = req.headers["x-webhook-signature"];
  const timestamp = req.headers["x-webhook-timestamp"];

  if (!signature || !timestamp) {
    console.warn("⚠️ [webhook] Missing signature headers.");
    return sendJson(res, 401, {
      success: false,
      error: "Missing webhook signature",
      code: "INVALID_SIGNATURE",
    });
  }

  // Read the raw body BEFORE touching req.body (critical for exact-bytes HMAC).
  const rawBody = await getRawBody(req);
  if (!verifyWebhookSignature(signature, timestamp, rawBody, secretKey)) {
    console.warn("⚠️ [webhook] Signature verification failed.");
    return sendJson(res, 401, {
      success: false,
      error: "Invalid webhook signature",
      code: "INVALID_SIGNATURE",
    });
  }
  console.log("✅ [webhook] Signature verified.");

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    return sendJson(res, 400, { success: false, error: "Invalid webhook payload" });
  }

  const order = payload.data && payload.data.order ? payload.data.order : payload.order || {};
  const payment = payload.data && payload.data.payment ? payload.data.payment : payload.payment || {};

  const orderId = order.order_id;
  const uid = (order.customer_details && order.customer_details.customer_id) || "";
  const paymentId = payment.payment_id;
  const paymentStatus = String(payment.payment_status || "").toUpperCase();
  const paymentAmount = Number(payment.payment_amount);

  if (!orderId || !uid) {
    console.warn("⚠️ [webhook] Missing order_id or customer_id in payload.");
    return sendJson(res, 400, { success: false, error: "Missing order or customer details" });
  }

  const pendingOrder = await getPendingOrder(uid, orderId);
  if (!pendingOrder) {
    // Signature already verified, but the order is unknown to this user. We
    // still NEVER create a subscription from an arbitrary webhook — we just
    // acknowledge receipt with 2xx so Cashfree stops retrying. This is also
    // what makes the dashboard's "Test webhook" pass: it POSTs a sample
    // payload whose order_id never exists in Firestore.
    console.warn(`⚠️ [webhook] Unknown order '${orderId}' for UID '${uid}' — acknowledged and ignored.`);
    return sendJson(res, 200, { received: true, ignored: "unknown_order" });
  }

  // Amount check against the server-side price stored on the order.
  if (paymentAmount && paymentAmount !== pendingOrder.amount) {
    console.error(JSON.stringify({
      type: "billing_webhook_amount_mismatch",
      uid,
      orderId,
      expected: pendingOrder.amount,
      paid: paymentAmount,
    }));
    return sendJson(res, 400, { success: false, error: "Amount mismatch", code: "AMOUNT_MISMATCH" });
  }

  if (paymentStatus === "SUCCESS") {
    const outcome = await activateSubscriptionFromOrder(uid, orderId, {
      paymentId: paymentId || undefined,
      amount: pendingOrder.amount,
      currency: "INR",
      plan: pendingOrder.plan,
      provider: "cashfree",
      expiryDate: getSubscriptionExpiry(),
    });
    // Idempotent: always 200 so Cashfree stops retrying duplicate deliveries.
    return sendJson(res, 200, {
      received: true,
      processed: !outcome.alreadyProcessed,
    });
  }

  if (paymentStatus === "PENDING") {
    // Do not activate; acknowledge so Cashfree keeps the delivery chain happy.
    return sendJson(res, 200, { received: true, status: "PENDING" });
  }

  // FAILED / CANCELLED / USER_DROPPED / any other terminal state
  const existingFailed = await getPaymentByOrderId(uid, orderId);
  if (!existingFailed) {
    try {
      await saveFailedPayment({
        paymentId: paymentId || orderId,
        orderId,
        amount: pendingOrder.amount,
        plan: pendingOrder.plan,
        currency: "INR",
        provider: "cashfree",
        uid,
      });
      await updateOrderStatus(uid, orderId, "failed");
    } catch (logErr) {
      console.warn("⚠️ [webhook] Could not record failed payment:", logErr.message);
    }
  }
  return sendJson(res, 200, { received: true, status: "FAILED" });
};

// 6. Downgrade Handler — server-authoritative plan reset to Free
const handleDowngrade = async (req, res, decodedToken) => {
  const uid = decodedToken.uid;
  console.log(`📥 [POST /api/subscription/downgrade] Request received for UID: ${uid}`);

  try {
    await downgradeUserToFree(uid);
    console.log(`✅ [downgrade] UID '${uid}' downgraded to Free plan.`);
    return sendJson(res, 200, {
      success: true,
      message: "Subscription downgraded to the Free tier.",
      subscription: {
        subscriptionPlan: "free",
        subscriptionStatus: "active",
        subscriptionExpiry: null,
      },
    });
  } catch (error) {
    console.error(JSON.stringify({ type: "billing_downgrade_error", uid, error: error.message }));
    return sendJson(res, 500, {
      success: false,
      error: "Failed to downgrade subscription. Please try again.",
    });
  }
};

// ==========================================
// 🚀 MAIN ROUTER HANDLER
// ==========================================
module.exports = async (req, res) => {
  const { handleCors, setCorsHeaders } = require("../lib/cors");
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req);

  console.log(`📡 [Billing Router] Request received. Path: ${req.url}, Method: ${req.method}`);

  // Determine target route action based on request path/query
  const action = req.query.action || req.url.split("?")[0].split("/").pop();

  // Cashfree webhook — signature-verified, NOT Firebase-authenticated.
  if (action === "webhook") {
    if (req.method === "POST") {
      try {
        return await handleWebhook(req, res);
      } catch (err) {
        console.error(JSON.stringify({ type: "billing_webhook_error", error: err.message }));
        return sendJson(res, 500, { success: false, error: "Webhook processing failed" });
      }
    }
    // GET/HEAD probes — Cashfree's dashboard sends a connectivity check when
    // testing/saving a webhook URL, and browsers may open the URL directly.
    // Answer with 200 so the endpoint passes validation; only POST events
    // (signature-verified) are ever processed.
    return sendJson(res, 200, {
      status: "Payment API running (webhook)",
      method: "POST",
      usage: "POST from Cashfree with x-webhook-signature and x-webhook-timestamp headers (signature verified server-side).",
    });
  }

  try {
    // 1. Authenticate user using Firebase ID Token
    const authHeader = req.headers.authorization;
    const hasAuthHeader = !!authHeader;
    const authHeaderLength = authHeader ? authHeader.length : 0;

    console.log(`🔒 [auth] Checking Authorization header. Present: ${hasAuthHeader}, Length: ${authHeaderLength}`);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("⚠️ [auth] Unauthorized request: Missing or invalid authorization headers.");
      return sendJson(res, 401, {
        success: false,
        error: "Unauthorized: Invalid token",
        message: "Missing or malformed Authorization header. Expected Format: 'Bearer <token>'",
      });
    }

    const idToken = authHeader.split("Bearer ")[1];
    console.log(`🔒 [auth] Extracting ID Token. Length: ${idToken ? idToken.length : 0}`);

    let decodedToken;
    try {
      const authService = getFirebaseAuth();
      decodedToken = await authService.verifyIdToken(idToken);
    } catch (authError) {
      console.error(JSON.stringify({ type: "billing_auth_error", code: authError.code, error: authError.message }));
      return sendJson(res, 401, {
        success: false,
        error: "Unauthorized: Invalid or expired token. Please sign in again.",
      });
    }

    console.log(`👉 [Billing Router] Resolved action: '${action}'`);

    if (action === "create-order" && req.method === "POST") {
      return await handleCreateOrder(req, res, decodedToken);
    } else if (action === "verify" && req.method === "POST") {
      return await handleVerify(req, res, decodedToken);
    } else if (action === "downgrade" && req.method === "POST") {
      return await handleDowngrade(req, res, decodedToken);
    } else if (action === "history" && req.method === "GET") {
      return await handleHistory(req, res, decodedToken);
    } else if ((action === "status" || action === "subscription-status") && req.method === "GET") {
      return await handleStatus(req, res, decodedToken);
    } else {
      console.warn(`⚠️ [Billing Router] Route action '${action}' for method ${req.method} not matched.`);
      return sendJson(res, 404, { success: false, error: `Not found: action '${action}' for method ${req.method}` });
    }
  } catch (err) {
    console.error(JSON.stringify({ type: "billing_router_error", error: err.message }));
    return sendJson(res, 500, {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    });
  }
};

