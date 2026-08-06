const fs = require("fs");
const path = require("path");
const { initializeApp, getApps, cert } = require("firebase-admin");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");

const MOCK_DB_PATH = path.join(__dirname, "mock_db.json");

// In-memory cache for stateless serverless runs (handles Vercel read-only system)
let mockDbInMemory = { users: {}, payments: [] };
let mockDbLoaded = false;

// 1. Audit Database Environment variables
function auditDatabaseEnv() {
  console.log("=== 🔍 DATABASE LAYER ENVIRONMENT AUDIT ===");
  const firebaseKeys = [
    "FIREBASE_PROJECT_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY"
  ];
  
  let missingAny = false;
  firebaseKeys.forEach(key => {
    if (!process.env[key]) {
      console.warn(`⚠️ [WARNING] Missing Firebase credential variable: ${key}`);
      missingAny = true;
    } else {
      console.log(`✓ Firebase credential ${key} is configured`);
    }
  });

  if (missingAny) {
    console.log("ℹ️ System will default to Mock Mode unless live credentials verify automatically.");
  }
  console.log("=========================================");
}

auditDatabaseEnv();

// Helper to read mock DB
function readMockDb() {
  if (mockDbLoaded) return mockDbInMemory;
  
  try {
    if (fs.existsSync(MOCK_DB_PATH)) {
      console.log("📂 Reading mock database from file:", MOCK_DB_PATH);
      const fileData = fs.readFileSync(MOCK_DB_PATH, "utf8");
      mockDbInMemory = JSON.parse(fileData);
    } else {
      console.log("ℹ️ Mock database file not found. Initializing empty in-memory store.");
    }
  } catch (e) {
    console.warn("⚠️ Could not read mock_db.json file:", e.message);
  }
  mockDbLoaded = true;
  return mockDbInMemory;
}

// Helper to write mock DB
function writeMockDb(data) {
  mockDbInMemory = data;
  try {
    console.log("💾 Attempting to persist mock database changes to file system...");
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(data, null, 2), "utf8");
    console.log("✅ Mock database persisted to disk.");
  } catch (e) {
    console.warn("⚠️ Failed to write mock DB to disk (normal in read-only Vercel serverless environments):", e.message);
  }
}

// Check if we should use mock database
let useMock = process.env.USE_MOCK_DATABASE === "true";
let firestoreDb;
let isInitialized = false;

async function initializeDb() {
  if (isInitialized) return;
  
  console.log("🔄 Initializing Firestore database configuration...");

  if (useMock) {
    console.log("ℹ️ USE_MOCK_DATABASE is active. Bypassing Firestore initialization.");
    isInitialized = true;
    return;
  }

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || "finalopenai-fc9c5";
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (clientEmail && privateKey) {
      console.log("🔑 Initializing Firebase Admin with explicit service account...");
      if (getApps().length === 0) {
        initializeApp({
          credential: cert({
            projectId: projectId,
            clientEmail: clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n')
          })
        });
      }
      firestoreDb = getFirestore();
      console.log("✅ Live Firestore database connected via Service Account cert.");
    } else {
      console.log("ℹ️ Service account variables missing. Initializing with default app credentials...");
      if (getApps().length === 0) {
        initializeApp();
      }
      firestoreDb = getFirestore();
      console.log("✅ Live Firestore database connected via Application Default credentials.");
    }
  } catch (err) {
    console.warn("⚠️ Firebase Admin initialization failed. Falling back to local mock database. Error:", err.message);
    useMock = true;
  }
  
  isInitialized = true;
  if (!useMock && !firestoreDb) {
    console.warn("⚠️ Firestore DB is undefined. Falling back to Mock Mode.");
    useMock = true;
  }
}

async function getUserSubscription(uid) {
  console.log(`🔍 [getUserSubscription] Request received for user UID: ${uid}`);
  await initializeDb();

  if (useMock) {
    console.log(`⚡ [getUserSubscription] Operating in Mock Mode. Reading from mock database.`);
    const data = readMockDb();
    const user = data.users[uid] || {};
    const subscription = {
      subscriptionPlan: user.subscriptionPlan || "free",
      subscriptionStatus: user.subscriptionStatus || "active",
      subscriptionStart: user.subscriptionStart || new Date().toISOString(),
      subscriptionExpiry: user.subscriptionExpiry || null
    };
    console.log(`✅ [getUserSubscription] Mock response:`, subscription);
    return subscription;
  }
  
  try {
    console.log(`📡 [getUserSubscription] Querying Firestore for user: users/${uid}`);
    const doc = await firestoreDb.collection("users").doc(uid).get();
    if (!doc.exists) {
      console.log(`ℹ️ [getUserSubscription] Document not found. Returning default Free plan.`);
      return {
        subscriptionPlan: "free",
        subscriptionStatus: "active",
        subscriptionStart: new Date().toISOString(),
        subscriptionExpiry: null
      };
    }
    const uData = doc.data();
    const subscription = {
      subscriptionPlan: uData.subscriptionPlan || "free",
      subscriptionStatus: uData.subscriptionStatus || "active",
      subscriptionStart: uData.subscriptionStart ? uData.subscriptionStart.toDate().toISOString() : new Date().toISOString(),
      subscriptionExpiry: uData.subscriptionExpiry ? uData.subscriptionExpiry.toDate().toISOString() : null
    };
    console.log(`✅ [getUserSubscription] Live response:`, subscription);
    return subscription;
  } catch (err) {
    console.warn(`⚠️ [getUserSubscription] Firestore query failed: ${err.message}. Retrying with Mock Database.`);
    useMock = true;
    return getUserSubscription(uid); // recursive retry in mock mode
  }
}

async function updateUserSubscription(uid, planId, expiryDate, paymentData) {
  console.log(`✍️ [updateUserSubscription] Request to update plan to '${planId}' for user '${uid}'`);
  await initializeDb();

  if (useMock) {
    console.log(`⚡ [updateUserSubscription] Operating in Mock Mode. Writing to in-memory mock database.`);
    const data = readMockDb();
    
    // Update user subscription parameters
    data.users[uid] = {
      subscriptionPlan: planId,
      subscriptionStatus: "active",
      subscriptionStart: new Date().toISOString(),
      subscriptionExpiry: expiryDate.toISOString()
    };
    
    // Record payment log
    data.payments.push({
      ...paymentData,
      createdAt: new Date().toISOString()
    });
    
    writeMockDb(data);
    console.log(`✅ [updateUserSubscription] Mock state updated successfully.`);
    return { success: true };
  }
  
  try {
    console.log(`📡 [updateUserSubscription] Opening database transactional write on Firestore...`);
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
    console.log(`✅ [updateUserSubscription] Firestore transaction committed successfully.`);
    return { success: true };
  } catch (err) {
    console.warn(`⚠️ [updateUserSubscription] Firestore transaction failed: ${err.message}. Retrying with Mock Database.`);
    useMock = true;
    return updateUserSubscription(uid, planId, expiryDate, paymentData); // recursive retry in mock mode
  }
}

async function saveFailedPayment(paymentData) {
  console.log(`✍️ [saveFailedPayment] Recording failed transaction for order '${paymentData.orderId}'`);
  await initializeDb();

  if (useMock) {
    console.log(`⚡ [saveFailedPayment] Mock Mode: Appending fail record.`);
    const data = readMockDb();
    data.payments.push({
      ...paymentData,
      createdAt: new Date().toISOString()
    });
    writeMockDb(data);
    return;
  }

  try {
    console.log(`📡 [saveFailedPayment] Writing failure log to Firestore: payments/${paymentData.paymentId}`);
    await firestoreDb.collection("payments").doc(paymentData.paymentId).set({
      ...paymentData,
      createdAt: FieldValue.serverTimestamp()
    });
    console.log(`✅ [saveFailedPayment] Log written to Firestore.`);
  } catch (err) {
    console.warn(`⚠️ [saveFailedPayment] Firestore update failed: ${err.message}. Retrying with Mock Database.`);
    useMock = true;
    return saveFailedPayment(paymentData); // recursive retry in mock mode
  }
}

async function getPaymentHistory(uid) {
  console.log(`🔍 [getPaymentHistory] Fetching ledger logs for user UID: ${uid}`);
  await initializeDb();

  if (useMock) {
    console.log(`⚡ [getPaymentHistory] Mock Mode: Querying in-memory transaction logs.`);
    const data = readMockDb();
    const logs = data.payments
      .filter(p => p.uid === uid)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    console.log(`✅ [getPaymentHistory] Returned ${logs.length} mock transaction records.`);
    return logs;
  }

  try {
    console.log(`📡 [getPaymentHistory] Querying Firestore collection 'payments' for UID: ${uid}`);
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
    console.log(`✅ [getPaymentHistory] Live Firestore query found ${logs.length} records.`);
    return logs;
  } catch (err) {
    console.warn(`⚠️ [getPaymentHistory] Firestore query failed: ${err.message}. Retrying with Mock Database.`);
    useMock = true;
    return getPaymentHistory(uid); // recursive retry in mock mode
  }
}

module.exports = {
  getUserSubscription,
  updateUserSubscription,
  saveFailedPayment,
  getPaymentHistory
};
