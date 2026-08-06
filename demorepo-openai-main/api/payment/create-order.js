const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const { getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

// Initialize Firebase Admin
if (getApps().length === 0) {
  admin.initializeApp({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || "finalopenai-fc9c5"
  });
}

module.exports = async (req, res) => {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Reject non-POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
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
      decodedToken = await getAuth().verifyIdToken(idToken);
    } catch (authError) {
      console.error("❌ Token verification failed:", authError.message);
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    const uid = decodedToken.uid;
    const { planId } = req.body;

    // 2. Validate requested plan and determine price in paise (1 INR = 100 Paise)
    if (!planId || (planId !== "pro" && planId !== "business")) {
      return res.status(400).json({ error: "Invalid or missing planId. Must be 'pro' or 'business'." });
    }

    let planAmountPaise = 0;
    if (planId === "pro") {
      planAmountPaise = 29900; // ₹299
    } else if (planId === "business") {
      planAmountPaise = 99900; // ₹999
    }

    // 3. Initialize Razorpay Client
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("❌ Razorpay keys not configured in environment variables.");
      return res.status(500).json({ error: "Razorpay service configuration is missing on server." });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // 4. Create Razorpay Order
    const options = {
      amount: planAmountPaise,
      currency: "INR",
      receipt: `rcpt_${planId.substring(0, 3)}_${uid.substring(0, 5)}_${Date.now().toString().substring(5)}`,
      notes: {
        planId: planId,
        uid: uid,
      },
    };

    const order = await razorpay.orders.create(options);

    console.log(`✅ Razorpay order created for user ${uid}: ${order.id} (Amount: ₹${order.amount / 100})`);

    // 5. Return order details
    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
    });
  } catch (error) {
    console.error("❌ Error in create-order endpoint:", error);
    return res.status(500).json({
      error: "Internal server error during order creation",
      details: error.message,
    });
  }
};
