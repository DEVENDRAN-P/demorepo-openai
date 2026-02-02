import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import {
  getFirestore,
} from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";

// ========================================
// FIREBASE CONFIGURATION - PRODUCTION READY
// ========================================

// Validate that required environment variables are set
if (!process.env.REACT_APP_FIREBASE_API_KEY) {
  console.error(
    "CRITICAL: REACT_APP_FIREBASE_API_KEY is not set. Please configure your .env file."
  );
}

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// ========================================
// INITIALIZE FIREBASE APP
// ========================================
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  throw new Error(
    "Failed to initialize Firebase. Please check your configuration.",
  );
}

// ========================================
// CONFIGURE EMULATOR (LOCAL DEVELOPMENT)
// ========================================
// Uncomment the following lines to use Firebase Emulator Suite locally
// Start emulators with: firebase emulators:start
const useEmulator = process.env.REACT_APP_USE_EMULATOR === "true";

// ========================================
// INITIALIZE FIREBASE AUTHENTICATION
// ========================================
export const auth = getAuth(app);

// Enable auth persistence (keep users logged in)
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    // Auth persistence enabled
  })
  .catch((error) => {
    // Auth persistence setup failed - continue anyway
  });

// ========================================
// INITIALIZE CLOUD FIRESTORE DATABASE
// ========================================
export const db = getFirestore(app);

// Note: Firestore offline persistence is now handled via FirestoreSettings.cache
// This is configured in individual components or as needed
// The deprecated enableIndexedDbPersistence() has been removed

// ========================================
// INITIALIZE FIREBASE ANALYTICS
// ========================================
let analytics = null;
if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch((error) => {
      // Analytics initialization not supported
    });
}

export { analytics };

// ========================================
// INITIALIZE FIREBASE STORAGE
// ========================================
export const storage = getStorage(app);

// ========================================
// INITIALIZE FIREBASE REALTIME DATABASE
// ========================================
export const database = getDatabase(app);

// Connect to Realtime Database Emulator for local development
if (useEmulator && typeof window !== "undefined") {
  try {
    // Note: connectDatabaseEmulator must be called before any database operations
    connectDatabaseEmulator(database, "127.0.0.1", 9000);
    console.log("✅ Connected to Realtime Database Emulator at 127.0.0.1:9000");
  } catch (error) {
    console.warn("⚠️  Emulator connection skipped:", error.message);
  }
}

// ========================================
// END FIREBASE INITIALIZATION
// ========================================

export default app;
