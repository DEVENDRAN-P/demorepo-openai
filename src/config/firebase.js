import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getStorage } from "firebase/storage";

// ========================================
// FIREBASE CONFIGURATION - PRODUCTION READY
// ========================================
const firebaseConfig = {
  apiKey: "AIzaSyAGGaj2BhlcxdJXV5FY9aNwJFwKXkL2Za0",
  authDomain: "finalopenai-fc9c5.firebaseapp.com",
  projectId: "finalopenai-fc9c5",
  storageBucket: "finalopenai-fc9c5.firebasestorage.app",
  messagingSenderId: "597968912139",
  appId: "1:597968912139:web:8bb776619a3292f587ec0e",
  measurementId: "G-VY1Q4M03VH",
};

// ========================================
// INITIALIZE FIREBASE APP
// ========================================
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log("✅ Firebase App initialized successfully");
} catch (error) {
  console.error("❌ Firebase initialization error:", error);
  throw new Error(
    "Failed to initialize Firebase. Please check your configuration.",
  );
}

// ========================================
// INITIALIZE FIREBASE AUTHENTICATION
// ========================================
export const auth = getAuth(app);

// Enable auth persistence (keep users logged in)
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("✅ Firebase Auth persistence enabled");
  })
  .catch((error) => {
    console.warn("⚠️ Auth persistence setup failed:", error.message);
  });

// ========================================
// INITIALIZE CLOUD FIRESTORE DATABASE
// ========================================
export const db = getFirestore(app);

// Enable offline persistence for better performance
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db)
    .then(() => {
      console.log("✅ Firestore offline persistence enabled");
    })
    .catch((err) => {
      if (err.code === "failed-precondition") {
        console.warn(
          "⚠️ Multiple tabs open, persistence enabled in first tab only",
        );
      } else if (err.code === "unimplemented") {
        console.warn("⚠️ Browser doesn't support offline persistence");
      }
    });
}

// ========================================
// INITIALIZE FIREBASE ANALYTICS
// ========================================
let analytics = null;
if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
        console.log("✅ Firebase Analytics initialized");
      }
    })
    .catch((error) => {
      console.warn("⚠️ Analytics initialization failed:", error.message);
    });
}

export { analytics };

// ========================================
// INITIALIZE FIREBASE STORAGE
// ========================================
export const storage = getStorage(app);
console.log("✅ Firebase Storage initialized");

// ========================================
// FIREBASE CONNECTION STATUS
// ========================================
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔥 FIREBASE CONNECTION STATUS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📦 Project ID:", firebaseConfig.projectId);
  console.log("🌐 Auth Domain:", firebaseConfig.authDomain);
  console.log(
    "🔑 API Key:",
    firebaseConfig.apiKey ? "✅ Configured" : "❌ Missing",
  );
  console.log("📊 Analytics:", analytics ? "✅ Enabled" : "⚠️ Disabled");
  console.log("💾 Storage:", storage ? "✅ Enabled" : "❌ Disabled");
  console.log("🔒 Auth Persistence:", "✅ Local Storage");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

export default app;
