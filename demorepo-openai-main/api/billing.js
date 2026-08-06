const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { 
  getUserSubscription, 
  updateUserSubscription, 
  getPaymentHistory 
} = require("./database");

// Initialize Firebase Admin
if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || "finalopenai-fc9c5"
  });
}

const auth = admin.auth();

// ----------------------------------------------------
// Handlers
// ----------------------------------------------------

// 1. Status Handler
const handleStatus = async (req, res, decodedToken) => {
  const uid = decodedToken.uid;
  try {
    const subscription = await getUserSubscription(uid);
    return res.status(200).json({
      success: true,
      subscription: subscription
    });
  } catch (error) {
    console.error("❌ Error fetching subscription status:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      message: error.message,
      stack: error.stack
    });
  }
};

// 2. History Handler
const handleHistory = async (req, res, decodedToken) => {
  const uid = decodedToken.uid;
  try {
    const transactions = await getPaymentHistory(uid);
    return res.status(200).json({
      success: true,
      transactions: transactions
    });
  } catch (error) {
    console.error("❌ Error fetching payment history:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      message: error.message,
      stack: error.stack
    });
  }
};

// 3. Create Order Handler
const handleCreateOrder = async (req, res, decodedToken) => {
  const { planId } = req.body;
  const uid = decodedToken.uid;

  if (!planId) {
    return res.status(400).json({ error: "Missing required parameter: planId" });
  }

  // Determine amount based on plan
  let planAmountPaise = 0;
  if (planId === "pro") {
    planAmountPaise = 299 * 100; // ₹299 in paise
  } else if (planId === "business") {
    planAmountPaise = 999 * 100; // ₹999 in paise
  } else {
    return res.status(400).json({ error: "Invalid planId selected" });
  }

  try {
    // 1. Initialize Razorpay SDK
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "rzp_test_dummykey123";
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "dummysecret123";
    const isDummyMode = razorpayKeyId === "rzp_test_dummykey123";

    if (isDummyMode) {
      console.log(`ℹ️ Dummy Razorpay keys detected. Creating mock order.`);
      const mockOrderId = `order_${Math.random().toString(36).substring(2, 16)}`;
      return res.status(200).json({
        id: mockOrderId,
        amount: planAmountPaise,
        currency: "INR",
        receipt: `rcpt_${planId.substring(0, 3)}_${uid.substring(0, 5)}_${Date.now().toString().substring(5)}`,
        isDummy: true
      });
    }

    const instance = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    // 2. Create Razorpay Order
    const options = {
      amount: planAmountPaise,
      currency: "INR",
      receipt: `rcpt_${planId.substring(0, 3)}_${uid.substring(0, 5)}_${Date.now().toString().substring(5)}`,
      notes: {
        planId: planId,
        uid: uid,
      },
    };

    const order = await instance.orders.create(options);
    console.log(`✅ Razorpay order created for user ${uid}: ${order.id} (Amount: ₹${planAmountPaise/100})`);

    return res.status(200).json(order);
  } catch (error) {
    console.error("❌ Error in create-order endpoint:", error);
    return res.status(500).json({ 
      error: "Internal server error during order creation",
      message: error.message,
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

  if (!razorpay_order_id || !razorpay_payment_id || !planId) {
    return res.status(400).json({ error: "Missing verification parameters" });
  }

  try {
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "rzp_test_dummykey123";
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "dummysecret123";
    const isDummyMode = razorpayKeyId === "rzp_test_dummykey123" || isDummyPayment === true;

    // 1. Prevent duplicate processing (double-spend check)
    // 1. Prevent duplicate processing (double-spend check)
    const history = await getPaymentHistory(uid);
    const isDuplicate = history.some(p => p.paymentId === razorpay_payment_id || p.razorpayPaymentId === razorpay_payment_id);
    if (isDuplicate) {
      console.warn(`⚠️ UTR ${razorpay_payment_id} already processed. Rejecting double-spend.`);
      return res.status(400).json({ error: "Transaction already processed" });
    }

    if (isDummyMode) {
      console.log(`✅ Dummy payment verification requested for UTR ${razorpay_payment_id}. Bypassing HMAC verification.`);
    } else {
      // 2. Perform HMAC SHA256 Signature Verification
      const generatedSignature = crypto
        .createHmac("sha256", razorpayKeySecret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        console.error("❌ Razorpay signature mismatch! Verification failed.");
        return res.status(400).json({ error: "Invalid payment signature" });
      }
      console.log("✅ Razorpay payment signature verified successfully.");
    }

    // 3. Update subscription state & log transaction in database
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

    console.log(`✅ Subscription upgraded for user ${uid} to plan ${planId}`);
    return res.status(200).json({ success: true, message: "Subscription upgraded successfully" });
  } catch (error) {
    console.error("❌ Verification error:", error);
    return res.status(500).json({ 
      error: "Internal verification error",
      message: error.message,
      stack: error.stack
    });
  }
};

// ----------------------------------------------------
// Main Handler / Router
// ----------------------------------------------------
module.exports = async (req, res) => {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // 1. Authenticate user using Firebase ID Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const idToken = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (authError) {
      console.error("❌ JWT token verification failed:", authError.message);
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    // Determine target route action based on request path/query
    // Since Vercel route rewrites translate subpaths to query action
    const action = req.query.action || req.url.split("?")[0].split("/").pop();

    if (action === "create-order" && req.method === "POST") {
      return await handleCreateOrder(req, res, decodedToken);
    } else if (action === "verify" && req.method === "POST") {
      return await handleVerify(req, res, decodedToken);
    } else if (action === "history" && req.method === "GET") {
      return await handleHistory(req, res, decodedToken);
    } else if ((action === "status" || action === "subscription-status") && req.method === "GET") {
      return await handleStatus(req, res, decodedToken);
    } else {
      return res.status(404).json({ error: `Not found: action '${action}' for method ${req.method}` });
    }
  } catch (err) {
    console.error("❌ API routing error:", err);
    return res.status(500).json({ 
      error: "Internal routing error",
      message: err.message,
      stack: err.stack
    });
  }
};
