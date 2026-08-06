const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");

const MOCK_DB_PATH = path.join(__dirname, "mock_db.json");

// Helper to read mock DB
function readMockDb() {
  try {
    if (!fs.existsSync(MOCK_DB_PATH)) {
      return { users: {}, payments: [] };
    }
    return JSON.parse(fs.readFileSync(MOCK_DB_PATH, "utf8"));
  } catch (e) {
    return { users: {}, payments: [] };
  }
}

// Helper to write mock DB
function writeMockDb(data) {
  try {
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("❌ Failed to write mock DB:", e);
  }
}

// Check if we should use mock database
let useMock = process.env.USE_MOCK_DATABASE === "true";
let firestoreDb;
let isInitialized = false;

async function initializeDb() {
  if (isInitialized) return;
  
  if (!useMock) {
    try {
      // Validate credentials using google-auth-library to avoid async connection crashes
      let GoogleAuth;
      try {
        GoogleAuth = require("google-auth-library").GoogleAuth;
      } catch (e) {
        console.warn("ℹ️ google-auth-library not found. Defaulting to mock mode.");
        useMock = true;
      }

      if (GoogleAuth) {
        const auth = new GoogleAuth();
        await auth.getApplicationDefault();
        
        if (getApps().length === 0) {
          admin.initializeApp({
            projectId: process.env.GOOGLE_CLOUD_PROJECT || "finalopenai-fc9c5"
          });
        }
        firestoreDb = getFirestore();
        console.log("✅ Live Firestore database initialized successfully.");
      }
    } catch (err) {
      console.warn("⚠️ No Firebase credentials detected. Falling back to local mock database.", err.message);
      useMock = true;
    }
  } else {
    console.log("ℹ️ USE_MOCK_DATABASE is active. Bypassing Firestore initialization.");
  }
  isInitialized = true;
}

async function getUserSubscription(uid) {
  await initializeDb();
  if (useMock) {
    const data = readMockDb();
    const user = data.users[uid] || {};
    return {
      subscriptionPlan: user.subscriptionPlan || "free",
      subscriptionStatus: user.subscriptionStatus || "active",
      subscriptionStart: user.subscriptionStart || new Date().toISOString(),
      subscriptionExpiry: user.subscriptionExpiry || null
    };
  }
  
  try {
    const doc = await firestoreDb.collection("users").doc(uid).get();
    if (!doc.exists) {
      return {
        subscriptionPlan: "free",
        subscriptionStatus: "active",
        subscriptionStart: new Date().toISOString(),
        subscriptionExpiry: null
      };
    }
    const uData = doc.data();
    return {
      subscriptionPlan: uData.subscriptionPlan || "free",
      subscriptionStatus: uData.subscriptionStatus || "active",
      subscriptionStart: uData.subscriptionStart ? uData.subscriptionStart.toDate().toISOString() : new Date().toISOString(),
      subscriptionExpiry: uData.subscriptionExpiry ? uData.subscriptionExpiry.toDate().toISOString() : null
    };
  } catch (err) {
    if (err.message.includes("credentials") || err.message.includes("ProjectId") || err.message.includes("Project Id") || err.code === "invalid-argument") {
      console.warn("⚠️ Credentials error detected. Switching to local mock database.");
      useMock = true;
      return getUserSubscription(uid); // retry using mock
    }
    throw err;
  }
}

async function updateUserSubscription(uid, planId, expiryDate, paymentData) {
  await initializeDb();
  if (useMock) {
    const data = readMockDb();
    
    // Update user
    data.users[uid] = {
      subscriptionPlan: planId,
      subscriptionStatus: "active",
      subscriptionStart: new Date().toISOString(),
      subscriptionExpiry: expiryDate.toISOString()
    };
    
    // Save payment
    data.payments.push({
      ...paymentData,
      createdAt: new Date().toISOString()
    });
    
    writeMockDb(data);
    return { success: true };
  }
  
  try {
    const userDocRef = firestoreDb.collection("users").doc(uid);
    const paymentDocRef = firestoreDb.collection("payments").doc(paymentData.paymentId);
    
    await firestoreDb.runTransaction(async (transaction) => {
      transaction.set(userDocRef, {
        subscriptionPlan: planId,
        subscriptionStatus: "active",
        subscriptionStart: FieldValue.serverTimestamp(),
        subscriptionExpiry: Timestamp.fromDate(expiryDate)
      }, { merge: true });
      
      transaction.set(paymentDocRef, {
        ...paymentData,
        createdAt: FieldValue.serverTimestamp()
      });
    });
    return { success: true };
  } catch (err) {
    if (err.message.includes("credentials") || err.message.includes("ProjectId") || err.message.includes("Project Id") || err.code === "invalid-argument") {
      console.warn("⚠️ Credentials error detected. Switching to local mock database.");
      useMock = true;
      return updateUserSubscription(uid, planId, expiryDate, paymentData); // retry using mock
    }
    throw err;
  }
}

async function saveFailedPayment(paymentData) {
  await initializeDb();
  if (useMock) {
    const data = readMockDb();
    data.payments.push({
      ...paymentData,
      createdAt: new Date().toISOString()
    });
    writeMockDb(data);
    return;
  }
  try {
    await firestoreDb.collection("payments").doc(paymentData.paymentId).set({
      ...paymentData,
      createdAt: FieldValue.serverTimestamp()
    });
  } catch (err) {
    if (err.message.includes("credentials") || err.message.includes("ProjectId") || err.message.includes("Project Id") || err.code === "invalid-argument") {
      console.warn("⚠️ Credentials error detected. Switching to local mock database.");
      useMock = true;
      return saveFailedPayment(paymentData);
    }
    throw err;
  }
}

async function getPaymentHistory(uid) {
  await initializeDb();
  if (useMock) {
    const data = readMockDb();
    return data.payments
      .filter(p => p.uid === uid)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  try {
    const snapshot = await firestoreDb.collection("payments")
      .where("uid", "==", uid)
      .orderBy("createdAt", "desc")
      .get();
    
    const logs = [];
    snapshot.forEach(doc => {
      const pData = doc.data();
      logs.push({
        id: doc.id,
        ...pData,
        createdAt: pData.createdAt ? pData.createdAt.toDate().toISOString() : new Date().toISOString()
      });
    });
    return logs;
  } catch (err) {
    if (err.message.includes("credentials") || err.message.includes("ProjectId") || err.message.includes("Project Id") || err.message.includes("requires an index") || err.code === "invalid-argument") {
      console.warn("⚠️ Database query error. Switching to local mock database.");
      useMock = true;
      return getPaymentHistory(uid);
    }
    throw err;
  }
}

module.exports = {
  getUserSubscription,
  updateUserSubscription,
  saveFailedPayment,
  getPaymentHistory
};
