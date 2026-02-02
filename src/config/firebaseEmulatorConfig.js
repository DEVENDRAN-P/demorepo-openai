/**
 * Firebase Emulator Configuration Helper
 * Use this to connect to local Firebase Emulator Suite during development
 */

import {
  connectAuthEmulator,
  connectDatabaseEmulator,
  connectFirestoreEmulator,
} from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";

/**
 * Initialize Firebase Emulator connections
 * Call this AFTER initializing Firebase but BEFORE using any Firebase services
 *
 * Make sure the emulator is running: firebase emulators:start
 */
export const initializeFirebaseEmulators = (auth, database, firestore) => {
  const useEmulator = process.env.REACT_APP_USE_EMULATOR === "true";

  if (!useEmulator) {
    console.log("📡 Using production Firebase services");
    return;
  }

  console.log("🔄 Connecting to Firebase Emulator Suite...");

  try {
    // Connect Authentication Emulator
    // connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    // console.log("✅ Auth Emulator connected: localhost:9099");

    // Connect Realtime Database Emulator
    // connectDatabaseEmulator(database, "127.0.0.1", 9000);
    // console.log("✅ Database Emulator connected: localhost:9000");

    // Connect Firestore Emulator
    // connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
    // console.log("✅ Firestore Emulator connected: localhost:8080");

    console.log("🎮 Emulator UI available at: http://localhost:4000");
  } catch (error) {
    console.warn(
      "⚠️  Some emulators are already connected or failed to connect:",
      error.message,
    );
  }
};

/**
 * Check if emulator is running
 */
export const isEmulatorActive = () => {
  return process.env.REACT_APP_USE_EMULATOR === "true";
};

/**
 * Get emulator URLs
 */
export const getEmulatorUrls = () => ({
  auth: "http://127.0.0.1:9099",
  database: "http://127.0.0.1:9000",
  firestore: "http://127.0.0.1:8080",
  ui: "http://localhost:4000",
});

/**
 * Log Firebase connection status
 */
export const logFirebaseStatus = () => {
  console.group("🔥 Firebase Connection Status");

  if (isEmulatorActive()) {
    console.log("🎮 Environment: LOCAL EMULATOR");
    console.log("Emulator URLs:", getEmulatorUrls());
  } else {
    console.log("📡 Environment: PRODUCTION");
    console.log("Database URL:", process.env.REACT_APP_FIREBASE_DATABASE_URL);
  }

  console.groupEnd();
};

export default {
  initializeFirebaseEmulators,
  isEmulatorActive,
  getEmulatorUrls,
  logFirebaseStatus,
};
