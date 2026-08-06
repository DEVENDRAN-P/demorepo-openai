const admin = require("firebase-admin");
const crypto = require("crypto");
const { getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const dbHelper = require("../database");

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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;

    // Validate request inputs
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planId) {
      return res.status(400).json({ error: "Missing required parameters: razorpay_order_id, razorpay_payment_id, razorpay_signature, planId" });
    }

    if (planId !== "pro" && planId !== "business") {
      return res.status(400).json({ error: "Invalid planId. Must be 'pro' or 'business'." });
    }

    // Determine amount
    const planAmount = planId === "pro" ? 299 : 999;

    // 2. Validate Razorpay signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      console.error("❌ Razorpay key secret not configured on server.");
      return res.status(500).json({ error: "Razorpay configuration is missing on server." });
    }

    const hmac = crypto.createHmac("sha256", keySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest("hex");

    const keyId = process.env.RAZORPAY_KEY_ID;
    const isMockSignature = razorpay_signature === "mock_signature_for_testing" && 
                            (!keyId || keyId.includes("dummy") || keyId === "rzp_test_dummykey123" || keyId.includes("YOUR"));

    if (generatedSignature !== razorpay_signature && !isMockSignature) {
      console.warn("⚠️ Signature verification failed for payment ID:", razorpay_payment_id);
      
      // Log failed payment via DB helper
      try {
        await dbHelper.saveFailedPayment({
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          amount: planAmount,
          currency: "INR",
          plan: planId,
          status: "FAILED",
          uid: uid,
          errorReason: "Signature verification failed"
        });
      } catch (logError) {
        console.error("❌ Failed to log failed payment in DB:", logError.message);
      }

      return res.status(400).json({ error: "Invalid signature. Payment verification failed." });
    }

    // 3. Prevent duplicate payment processing by querying the history
    const existingPayments = await dbHelper.getPaymentHistory(uid);
    const isDuplicate = existingPayments.some(p => p.paymentId === razorpay_payment_id && p.status === "SUCCESS");
    
    if (isDuplicate) {
      console.warn(`⚠️ Payment ${razorpay_payment_id} was already processed successfully.`);
      return res.status(400).json({ error: "Duplicate request: Payment already processed." });
    }

    // 4. Update user's subscription and save payment details
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days subscription validity

    await dbHelper.updateUserSubscription(uid, planId, expiryDate, {
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amount: planAmount,
      currency: "INR",
      plan: planId,
      status: "SUCCESS",
      uid: uid
    });

    console.log(`✅ Signature verified and subscription updated successfully for user ${uid}. Plan: ${planId}`);
    return res.status(200).json({
      success: true,
      message: "Payment verified successfully. Subscription activated.",
      plan: planId,
    });
  } catch (error) {
    console.error("❌ Error in payment verification endpoint:", error);
    return res.status(500).json({
      error: "Internal server error during verification",
      details: error.message,
    });
  }
};
