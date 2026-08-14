import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  connectAuthEmulator,
} from "firebase/auth";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  connectFirestoreEmulator 
} from "firebase/firestore";
// firebase/analytics and firebase/database are imported lazily below so they
// never bloat the main bundle: analytics is non-critical and the Realtime
// Database is only used by debug tools (FirebaseDebugPanel etc.).
import { ENABLE_DOCUMENT_STORAGE } from "./features";

// ========================================
// FIREBASE CONFIGURATION - PRODUCTION READY
// ========================================

// Validate that required environment variables are set
if (!process.env.REACT_APP_FIREBASE_API_KEY) {
  console.error(
    "CRITICAL: REACT_APP_FIREBASE_API_KEY is not set. Please configure your .env file.",
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

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Debug: Log Google Provider setup
if (typeof window !== "undefined") {
  console.log("✅ Google OAuth Provider initialized");
  console.log("Auth Domain:", process.env.REACT_APP_FIREBASE_AUTH_DOMAIN);
  console.log("Project ID:", process.env.REACT_APP_FIREBASE_PROJECT_ID);
}

// ========================================
// PHONE AUTHENTICATION SETUP
// ========================================

// Enable test mode for phone auth in development
// Set this to true in .env for easier testing without real SMS
if (process.env.REACT_APP_PHONE_AUTH_TEST_MODE === "true") {
  auth.settings.appVerificationDisabledForTesting = true;
  console.warn(
    "⚠️ Phone Auth Test Mode ENABLED - App verification disabled for testing",
  );
}

// Initialize reCAPTCHA Verifier for Phone Authentication
export const setupRecaptchaVerifier = (containerId) => {
  try {
    const verifier = new RecaptchaVerifier(auth, containerId, {
      size: "invisible",
      callback: (response) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber
        console.log("✅ reCAPTCHA verified");
      },
      "expired-callback": () => {
        // Response expired. Ask user to solve reCAPTCHA again
        console.warn("⚠️ reCAPTCHA response expired");
      },
    });

    // Pre-render reCAPTCHA if test mode is enabled
    if (process.env.REACT_APP_PHONE_AUTH_TEST_MODE === "true") {
      verifier.render().then((widgetId) => {
        console.log("ℹ️ reCAPTCHA widget ID:", widgetId);
      });
    }

    return verifier;
  } catch (error) {
    console.error("Error setting up reCAPTCHA verifier:", error);
    return null;
  }
};

// Export signInWithPhoneNumber for use in phone auth
export { signInWithPhoneNumber };

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
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Note: Firestore offline persistence is now handled via FirestoreSettings.cache
// This is configured in individual components or as needed
// The deprecated enableIndexedDbPersistence() has been removed

// ========================================
// INITIALIZE FIREBASE ANALYTICS (lazy)
// ========================================
let analyticsPromise = null;

/**
 * Lazily resolve Firebase Analytics. Non-critical for startup, so it is
 * fetched on first use instead of inlining firebase/analytics in the main
 * bundle.
 */
export const getAnalyticsInstance = () => {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!analyticsPromise) {
    analyticsPromise = Promise.all([
      import("firebase/analytics").then(({ isSupported, getAnalytics }) =>
        isSupported().then((ok) => (ok ? getAnalytics(app) : null))
      ),
    ]).then(([a]) => a);
  }
  return analyticsPromise;
};

export { getAnalyticsInstance as analytics };

// ========================================
// INITIALIZE FIREBASE STORAGE (OPTIONAL)
// ========================================
// Cloud Storage is NOT required for the app to work. Invoices are processed
// in browser memory and only metadata is saved to Firestore. Storage is only
// initialized when ENABLE_DOCUMENT_STORAGE=true (optional future archive).
// firebase/storage is imported dynamically so it stays out of the main
// bundle when disabled.
let storageInstance = null;
let storagePromise = null;

/**
 * Lazily resolve the Firebase Storage instance.
 * Returns null when document storage is disabled (the default).
 */
export const getStorageInstance = () => {
  if (!ENABLE_DOCUMENT_STORAGE) return null;
  if (storageInstance) return Promise.resolve(storageInstance);
  if (!storagePromise) {
    storagePromise = import("firebase/storage").then(({ getStorage }) => {
      storageInstance = getStorage(app);
      return storageInstance;
    });
  }
  return storagePromise;
};

// ========================================
// INITIALIZE FIREBASE REALTIME DATABASE (lazy)
// ========================================
let databasePromise = null;

/**
 * Lazily resolve the Realtime Database instance. Only debug tools use it, so
 * firebase/database stays out of the main bundle until actually requested.
 */
export const getDatabaseInstance = () => {
  if (!databasePromise) {
    databasePromise = import("firebase/database").then(({ getDatabase, connectDatabaseEmulator }) => {
      const database = getDatabase(app);
      if (useEmulator && typeof window !== "undefined") {
        try {
          connectDatabaseEmulator(database, "127.0.0.1", 9000);
          console.log("✅ Connected to Realtime Database Emulator at 127.0.0.1:9000");
        } catch (error) {
          console.warn("⚠️  Realtime Database emulator connection skipped:", error.message);
        }
      }
      return database;
    });
  }
  return databasePromise;
};

// Keep the legacy named export working (resolves on first access via the
// lazy getter — callers that import `database` get the real instance).
const database = getDatabaseInstance();
export { database };

// Connect to Firebase Emulators for local development
if (useEmulator && typeof window !== "undefined") {
  try {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    console.log("✅ Connected to Firestore Emulator at 127.0.0.1:8080");
  } catch (error) {
    console.warn("⚠️  Firestore emulator connection skipped:", error.message);
  }

  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9099");
    console.log("✅ Connected to Auth Emulator at 127.0.0.1:9099");
  } catch (error) {
    console.warn("⚠️  Auth emulator connection skipped:", error.message);
  }

  if (ENABLE_DOCUMENT_STORAGE) {
    try {
      getStorageInstance().then((storageInstance) => {
        import("firebase/storage")
          .then(({ connectStorageEmulator }) => {
            if (storageInstance) connectStorageEmulator(storageInstance, "127.0.0.1", 9199);
            console.log("✅ Connected to Storage Emulator at 127.0.0.1:9199");
          });
      });
    } catch (error) {
      console.warn("⚠️  Storage emulator connection skipped:", error.message);
    }
  }
}

// ========================================
// END FIREBASE INITIALIZATION
// ========================================

export default app;
