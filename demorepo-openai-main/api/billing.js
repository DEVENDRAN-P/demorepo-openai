const { getAuth } = require("firebase-admin/auth");
const { getApps, initializeApp, cert } = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const {
  getUserSubscription,
  updateUserSubscription,
  getPaymentHistory,
} = require("./_utils/database");

// Validate required env vars at startup (safe — no secret values logged)
const missingRazorpay = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"].filter(
  (k) => !process.env[k]
);
if (missingRazorpay.length > 0) {
  console.error(JSON.stringify({
    type: "billing_startup_error",
    message: "Missing Razorpay credentials",
    keys: missingRazorpay,
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

// ----------------------------------------------------
// ROUTE HANDLERS
// ----------------------------------------------------

// 1. Status Handler
const handleStatus = async (req, res, decodedToken) => {
  const uid = decodedToken.uid;
  console.log(`📥 [GET /api/subscription/status] Request received for UID: ${uid}`);
  
  try {
    const subscription = await getUserSubscription(uid);
    return res.status(200).json({ success: true, subscription });
  } catch (error) {
    console.error(JSON.stringify({ type: "billing_status_error", uid, error: error.message }));
    return res.status(500).json({
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
    return res.status(200).json(transactions);
  } catch (error) {
    console.error(JSON.stringify({ type: "billing_history_error", uid, error: error.message }));
    return res.status(500).json({
      success: false,
      error: "Failed to fetch payment history. Please try again.",
    });
  }
};

// 3. Create Order Handler
const handleCreateOrder = async (req, res, decodedToken) => {
  const { planId, isYearly } = req.body;
  const uid = decodedToken.uid;
  console.log(`📥 [POST /api/payment/create-order] Request received. Plan: '${planId}', isYearly: '${isYearly}', UID: '${uid}'`);

  if (!planId) {
    console.warn("⚠️ [create-order] Missing parameter 'planId' in POST body.");
    return res.status(400).json({ success: false, error: "Missing required parameter: planId" });
  }

  // Determine amount in INR (paise conversion)
  let planAmountPaise = 0;
  const isYearlyBilling = isYearly === true;

  if (planId === "pro") {
    const monthlyRate = 199;
    const yearlyRate = 159 * 12; // ₹1,908 billed annually (save 20%)
    planAmountPaise = (isYearlyBilling ? yearlyRate : monthlyRate) * 100;
  } else if (planId === "business") {
    const monthlyRate = 499;
    const yearlyRate = 399 * 12; // ₹4,788 billed annually (save 20%)
    planAmountPaise = (isYearlyBilling ? yearlyRate : monthlyRate) * 100;
  } else {
    console.warn(`⚠️ [create-order] Invalid plan selected: '${planId}'`);
    return res.status(400).json({ success: false, error: "Invalid planId selected" });
  }

  try {
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error("❌ [create-order] Razorpay credentials are not configured on the server.");
      return res.status(500).json({
        success: false,
        error: "Configuration Error",
        message: "Razorpay credentials are not configured on the server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
      });
    }

    console.log("🚀 [create-order] Initializing Razorpay SDK instance...");
    const instance = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    const receiptId = `rcpt_${planId.substring(0, 3)}_${uid.substring(0, 5)}_${Date.now().toString().substring(5)}`;
    const options = {
      amount: planAmountPaise,
      currency: "INR",
      receipt: receiptId,
      notes: {
        planId: planId,
        uid: uid,
      },
    };

    console.log(`📡 [create-order] Requesting order from Razorpay API...`);
    const order = await instance.orders.create(options);
    console.log(`✅ [create-order] Razorpay Order created: ${order.id}`);

    // Append key_id to the response so the frontend knows what keys to configure the SDK with
    return res.status(200).json({
      ...order,
      key_id: razorpayKeyId
    });
  } catch (error) {
    console.error(JSON.stringify({ type: "billing_create_order_error", planId, error: error.message }));
    return res.status(500).json({
      success: false,
      error: "Failed to create payment order. Please try again.",
    });
  }
};

// 4. Verify Handler
const handleVerify = async (req, res, decodedToken) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    planId,
    isYearly
  } = req.body;

  const uid = decodedToken.uid;
  console.log(`📥 [POST /api/payment/verify] Verification callback received. Order: '${razorpay_order_id}', Payment UTR: '${razorpay_payment_id}', User: '${uid}'`);

  if (!razorpay_order_id || !razorpay_payment_id || !planId) {
    console.warn("⚠️ [verify] Missing payment verification parameters.");
    return res.status(400).json({ success: false, error: "Missing verification parameters" });
  }

  try {
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error("❌ [verify] Razorpay credentials are not configured on the server.");
      return res.status(500).json({
        success: false,
        error: "Configuration Error",
        message: "Razorpay credentials are not configured on the server."
      });
    }

    // 1. Prevent duplicate processing (double-spend check)
    console.log("🔍 [verify] Checking for duplicate transaction record...");
    const history = await getPaymentHistory(uid);
    const isDuplicate = history.some(p => p.paymentId === razorpay_payment_id || p.razorpayPaymentId === razorpay_payment_id);
    if (isDuplicate) {
      console.warn(`⚠️ [verify] Double-spend alert. UTR ${razorpay_payment_id} has already been verified.`);
      return res.status(400).json({ success: false, error: "Transaction already processed" });
    }

    // 2. Perform HMAC SHA256 Signature Verification.
    // Every plan change — including downgrades — must carry a valid Razorpay
    // signature. There is NO test bypass: a missing or mismatched signature is
    // always rejected so clients can never self-authorize plan changes.
    console.log("🔒 [verify] Performing HMAC SHA256 signature verification...");
    const generatedSignature = crypto
      .createHmac("sha256", razorpayKeySecret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (!razorpay_signature || generatedSignature !== razorpay_signature) {
      console.error("❌ [verify] Razorpay signature mismatch! Verification validation failed.");
      return res.status(400).json({ success: false, error: "Invalid payment signature" });
    }
    console.log("✅ [verify] Signature validation passed.");

    // 3. Update subscription state & log transaction in database
    console.log("✍️ [verify] Updating subscription state and writing ledger entries...");
    const isYearlyBilling = isYearly === true;
    const daysToAdd = isYearlyBilling ? 365 : 30;
    const expiryDate = planId === "free" ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000) : new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);
    const amount = planId === "free" ? 0 : (planId === "pro" ? (isYearlyBilling ? 159 * 12 : 199) : (isYearlyBilling ? 399 * 12 : 499));
    const paymentData = {
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount: amount,
      plan: planId,
      status: "success",
      uid: uid
    };

    await updateUserSubscription(uid, planId, expiryDate, paymentData);
    console.log(`✅ [verify] Subscription updated and payment logged.`);

    return res.status(200).json({ success: true, message: "Subscription upgraded successfully" });
  } catch (error) {
    console.error(JSON.stringify({ type: "billing_verify_error", uid, error: error.message }));
    return res.status(500).json({
      success: false,
      error: "Payment verification failed. Please contact support if funds were deducted.",
    });
  }
};

// ==========================================
// 🚀 MAIN ROUTER HANDLER
// ==========================================
module.exports = async (req, res) => {
  const { handleCors, setCorsHeaders } = require("./_utils/cors");
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req);

  console.log(`📡 [Billing Router] Request received. Path: ${req.url}, Method: ${req.method}`);

  try {
    // 1. Authenticate user using Firebase ID Token
    const authHeader = req.headers.authorization;
    const hasAuthHeader = !!authHeader;
    const authHeaderLength = authHeader ? authHeader.length : 0;
    
    console.log(`🔒 [auth] Checking Authorization header. Present: ${hasAuthHeader}, Length: ${authHeaderLength}`);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("⚠️ [auth] Unauthorized request: Missing or invalid authorization headers.");
      return res.status(401).json({ 
        success: false, 
        error: "Unauthorized: Invalid token",
        message: "Missing or malformed Authorization header. Expected Format: 'Bearer <token>'"
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
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid or expired token. Please sign in again.",
      });
    }

    // Determine target route action based on request path/query
    const action = req.query.action || req.url.split("?")[0].split("/").pop();
    console.log(`👉 [Billing Router] Resolved action: '${action}'`);

    if (action === "create-order" && req.method === "POST") {
      return await handleCreateOrder(req, res, decodedToken);
    } else if (action === "verify" && req.method === "POST") {
      return await handleVerify(req, res, decodedToken);
    } else if (action === "history" && req.method === "GET") {
      return await handleHistory(req, res, decodedToken);
    } else if ((action === "status" || action === "subscription-status") && req.method === "GET") {
      return await handleStatus(req, res, decodedToken);
    } else {
      console.warn(`⚠️ [Billing Router] Route action '${action}' for method ${req.method} not matched.`);
      return res.status(404).json({ success: false, error: `Not found: action '${action}' for method ${req.method}` });
    }
  } catch (err) {
    console.error(JSON.stringify({ type: "billing_router_error", error: err.message }));
    return res.status(500).json({
      success: false,
      error: "An unexpected error occurred. Please try again.",
    });
  }
};
