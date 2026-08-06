const admin = require("firebase-admin");
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

  // Reject non-GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
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

    // 2. Fetch subscription details using helper
    console.log(`🔍 Fetching subscription details for user ${uid}`);
    const subscription = await dbHelper.getUserSubscription(uid);
    console.log(`✅ Subscription fetched for user ${uid}: ${subscription.subscriptionPlan}`);
    
    return res.status(200).json(subscription);
  } catch (error) {
    console.error("❌ Error in subscription-status endpoint:", error);
    return res.status(500).json({
      error: "Internal server error during subscription check",
      details: error.message,
    });
  }
};
