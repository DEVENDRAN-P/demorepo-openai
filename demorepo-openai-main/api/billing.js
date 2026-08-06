const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { 
  getUserSubscription, 
  updateUserSubscription, 
  getPaymentHistory 
} = require("./database");

// ==========================================
// 🔍 PRODUCTION ENVIRONMENT AUDIT ON BOOT
// ==========================================
function auditBillingEnvironment() {
  console.log("=== 🔍 SYSTEM AUDIT: STARTING BILLING API ENVIRONMENT CHECK ===");
  
  const requiredRazorpay = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"];
  requiredRazorpay.forEach(key => {
    if (!process.env[key] || process.env[key].trim() === "") {
      console.error(`❌ [CRITICAL ERROR] Missing required environment variable: ${key}`);
    } else {
      console.log(`✓ ${key} is configured (Length: ${process.env[key].length})`);
    }
  });

  const firebaseKeys = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
  let hasFirebaseCreds = true;
  firebaseKeys.forEach(key => {
    if (!process.env[key] || process.env[key].trim() === "") {
      console.warn(`⚠️ [WARNING] Missing optional Firebase environment variable: ${key}`);
      hasFirebaseCreds = false;
    } else {
      console.log(`✓ Firebase variable ${key} is configured`);
    }
  });

  if (!hasFirebaseCreds) {
    console.log("ℹ️ Database layer will run in fail-safe Local Mock Mode.");
  } else {
    console.log("ℹ️ Database layer will connect to Live Cloud Firestore.");
  }
  
  console.log("===============================================================");
}

auditBillingEnvironment();

// ==========================================
// 🔑 ROBUST FIREBASE AUTH INSTATIATION
// ==========================================
let authInstance = null;

function getFirebaseAuth() {
  if (authInstance) return authInstance;

  console.log("🔄 Initializing Firebase Auth Service...");

  if (admin.apps.length === 0) {
    // Force project ID to default strictly to client finalopenai-fc9c5 to prevent cloud-injected conflicts
    const projectId = process.env.FIREBASE_PROJECT_ID || "finalopenai-fc9c5";
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    try {
      if (clientEmail && privateKey) {
        console.log(`🔑 Authenticating Auth service for project '${projectId}' using Service Account Cert...`);
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: projectId,
            clientEmail: clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n')
          })
        });
      } else {
        console.log(`ℹ️ Initializing Auth service for project '${projectId}' with default context configuration...`);
        admin.initializeApp({
          projectId: projectId
        });
      }
    } catch (err) {
      console.warn("⚠️ Firebase Admin Auth initialization exception:", err.message);
      try {
        admin.initializeApp({ projectId: projectId });
      } catch (innerErr) {
        // App already exists or error
      }
    }
  }

  authInstance = admin.auth();
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
    console.log(`🔍 [status] Fetching subscription details from database...`);
    const subscription = await getUserSubscription(uid);
    console.log(`✅ [status] Return details for user:`, subscription);
    return res.status(200).json({
      success: true,
      subscription: subscription
    });
  } catch (error) {
    console.error("❌ [status] Error fetching subscription status:", error);
    return res.status(500).json({ 
      success: false,
      message: "Detailed subscription fetch error: " + error.message, 
      stack: error.stack 
    });
  }
};

// 2. History Handler
const handleHistory = async (req, res, decodedToken) => {
  const uid = decodedToken.uid;
  console.log(`📥 [GET /api/payment/history] Request received for UID: ${uid}`);
  
  try {
    console.log(`🔍 [history] Querying billing ledger entries...`);
    const transactions = await getPaymentHistory(uid);
    console.log(`✅ [history] Found ${transactions.length} transactions.`);
    return res.status(200).json(transactions); // Maintain direct array return for table compatibility
  } catch (error) {
    console.error("❌ [history] Error fetching payment history:", error);
    return res.status(500).json({ 
      success: false,
      message: "Detailed payment history fetch error: " + error.message, 
      stack: error.stack 
    });
  }
};

// 3. Create Order Handler
const handleCreateOrder = async (req, res, decodedToken) => {
  const { planId } = req.body;
  const uid = decodedToken.uid;
  console.log(`📥 [POST /api/payment/create-order] Request received. Plan: '${planId}', UID: '${uid}'`);

  if (!planId) {
    console.warn("⚠️ [create-order] Missing parameter 'planId' in POST body.");
    return res.status(400).json({ success: false, error: "Missing required parameter: planId" });
  }

  // Determine amount in INR (paise conversion)
  let planAmountPaise = 0;
  if (planId === "pro") {
    planAmountPaise = 299 * 100; // ₹299 = 29900 paise
  } else if (planId === "business") {
    planAmountPaise = 999 * 100; // ₹999 = 99900 paise
  } else {
    console.warn(`⚠️ [create-order] Invalid plan selected: '${planId}'`);
    return res.status(400).json({ success: false, error: "Invalid planId selected" });
  }

  try {
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    
    // Check if we are running in simulated mock mode
    const isDummyMode = !razorpayKeyId || razorpayKeyId === "rzp_test_dummykey123";

    if (isDummyMode) {
      console.log(`ℹ️ [create-order] Dummy Razorpay keys detected. Creating mock order.`);
      const mockOrderId = `order_${Math.random().toString(36).substring(2, 16)}`;
      const mockOrder = {
        id: mockOrderId,
        amount: planAmountPaise,
        currency: "INR",
        receipt: `rcpt_${planId.substring(0, 3)}_${uid.substring(0, 5)}_${Date.now().toString().substring(5)}`,
        key_id: "rzp_test_dummykey123",
        isDummy: true
      };
      console.log("✅ [create-order] Mock order object created:", mockOrder);
      return res.status(200).json(mockOrder);
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
    console.error("❌ [create-order] Error in order creation execution flow:", error);
    return res.status(500).json({ 
      success: false,
      message: "Razorpay order creation exception: " + error.message, 
      stack: error.stack 
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
    isDummyPayment
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
    const isDummyMode = !razorpayKeyId || razorpayKeyId === "rzp_test_dummykey123" || isDummyPayment === true;

    // 1. Prevent duplicate processing (double-spend check)
    console.log("🔍 [verify] Checking for duplicate transaction record...");
    const history = await getPaymentHistory(uid);
    const isDuplicate = history.some(p => p.paymentId === razorpay_payment_id || p.razorpayPaymentId === razorpay_payment_id);
    if (isDuplicate) {
      console.warn(`⚠️ [verify] Double-spend alert. UTR ${razorpay_payment_id} has already been verified.`);
      return res.status(400).json({ success: false, error: "Transaction already processed" });
    }

    if (isDummyMode) {
      console.log(`✅ [verify] Mock Checkout confirmed. Bypassing HMAC cryptographic checks.`);
    } else {
      // 2. Perform HMAC SHA256 Signature Verification
      console.log("🔒 [verify] Performing HMAC SHA256 signature verification...");
      const generatedSignature = crypto
        .createHmac("sha256", razorpayKeySecret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        console.error("❌ [verify] Razorpay signature mismatch! Verification validation failed.");
        return res.status(400).json({ success: false, error: "Invalid payment signature" });
      }
      console.log("✅ [verify] Signature validation passed.");
    }

    // 3. Update subscription state & log transaction in database
    console.log("✍️ [verify] Updating subscription state and writing ledger entries...");
    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days active cycle
    const amount = planId === "pro" ? 299 : 999;
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
    console.error("❌ [verify] Verification error occurred:", error);
    return res.status(500).json({ 
      success: false,
      message: "Internal signature verification exception: " + error.message, 
      stack: error.stack 
    });
  }
};

// ==========================================
// 🚀 MAIN ROUTER HANDLER
// ==========================================
module.exports = async (req, res) => {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

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
      console.log("🔐 [auth] Verifying Firebase ID Token with Auth Service...");
      const authService = getFirebaseAuth();
      decodedToken = await authService.verifyIdToken(idToken);
      console.log(`👤 [auth] Token verified successfully. UID: ${decodedToken.uid}`);
    } catch (authError) {
      console.error("❌ [auth] Firebase ID Token verification failed. Complete Error Details:", authError);
      return res.status(401).json({ 
        success: false, 
        error: "Unauthorized: Invalid token",
        message: authError.message,
        code: authError.code,
        stack: authError.stack
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
    console.error("❌ [Billing Router] Critical exception caught in main routing loop:", err);
    return res.status(500).json({ 
      success: false,
      error: "Internal routing error", 
      message: err.message, 
      stack: err.stack 
    });
  }
};
