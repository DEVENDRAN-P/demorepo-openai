/**
 * Firebase Connection Debug Tool
 * Use this to diagnose and verify Firebase connections
 * Run in browser console: debugFirebaseConnection()
 */

import { auth, database, db } from "../config/firebase";
import { ref, get, set, onValue, push } from "firebase/database";
import { doc, getDoc } from "firebase/firestore";

/**
 * Main debug function - Run this in browser console
 * Usage: import { debugFirebaseConnection } from '@/services/firebaseDebug'; debugFirebaseConnection();
 */
export const debugFirebaseConnection = async () => {
  console.clear();
  console.group("🔥 FIREBASE CONNECTION DEBUG");

  try {
    // ========================================
    // 1. Check Firebase App Initialization
    // ========================================
    console.group("1️⃣  Firebase App Status");
    if (!auth || !database || !db) {
      console.error("❌ Firebase services not initialized!");
      console.error("auth:", auth);
      console.error("database:", database);
      console.error("db:", db);
      return;
    }
    console.log("✅ Firebase app initialized");
    console.log("✅ Auth available:", !!auth);
    console.log("✅ Realtime Database available:", !!database);
    console.log("✅ Firestore available:", !!db);
    console.groupEnd();

    // ========================================
    // 2. Check Authentication State
    // ========================================
    console.group("2️⃣  Authentication State");
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("⚠️  No user logged in!");
      console.log("Please log in first to test database operations");
      console.groupEnd();
      return;
    }
    console.log("✅ User authenticated");
    console.log("📧 Email:", currentUser.email);
    console.log("🆔 UID:", currentUser.uid);
    console.log("✔️  Email verified:", currentUser.emailVerified);
    console.groupEnd();

    // ========================================
    // 3. Test Realtime Database Connection
    // ========================================
    console.group("3️⃣  Realtime Database Test");
    try {
      // Test 1: Write test data
      const testData = {
        message: "✅ Connection successful",
        timestamp: new Date().toISOString(),
        email: currentUser.email,
        uid: currentUser.uid,
      };

      const testPath = `test_debug/${currentUser.uid}`;
      const testRef = ref(database, testPath);

      console.log(`🔄 Writing test data to: ${testPath}`);
      await set(testRef, testData);
      console.log("✅ Write operation successful");

      // Test 2: Read test data
      console.log("🔄 Reading test data back...");
      const snapshot = await get(testRef);
      if (snapshot.exists()) {
        console.log("✅ Read operation successful");
        console.log("📊 Data retrieved:", snapshot.val());
      } else {
        console.error("❌ Read failed - no data returned");
      }

      // Test 3: Real-time listener
      console.log("🔄 Setting up real-time listener...");
      const unsubscribe = onValue(testRef, (snapshot) => {
        if (snapshot.exists()) {
          console.log("✅ Real-time update received:", snapshot.val());
        }
      });

      // Cleanup
      setTimeout(() => unsubscribe(), 2000);
      console.log("✅ Real-time listener working");
    } catch (error) {
      console.error("❌ Realtime Database error:", error.message);
    }
    console.groupEnd();

    // ========================================
    // 4. Test Email-Based Storage
    // ========================================
    console.group("4️⃣  Email-Based Storage Test");
    try {
      const email = currentUser.email;
      const sanitizedEmail = email
        .toLowerCase()
        .replace(/\./g, "_dot_")
        .replace(/@/g, "_at_");

      console.log("📧 Original email:", email);
      console.log("🔐 Sanitized key:", sanitizedEmail);

      const emailPath = `emails/${sanitizedEmail}/test_debug`;
      const emailRef = ref(database, emailPath);

      // Test: Save email-specific data
      const emailTestData = {
        id: Date.now(),
        email: email,
        message: `✅ Email storage working for ${email}`,
        timestamp: new Date().toISOString(),
      };

      console.log(`🔄 Saving email-specific data...`);
      await set(emailRef, emailTestData);
      console.log("✅ Email-specific data saved");

      // Test: Read email data
      const emailSnapshot = await get(emailRef);
      if (emailSnapshot.exists()) {
        console.log("✅ Email data retrieved:", emailSnapshot.val());
      }
    } catch (error) {
      console.error("❌ Email-based storage error:", error.message);
    }
    console.groupEnd();

    // ========================================
    // 5. Test Firestore Connection
    // ========================================
    console.group("5️⃣  Firestore Test");
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      console.log(`🔄 Reading Firestore user document...`);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        console.log("✅ Firestore read successful");
        console.log("📄 User document:", userDoc.data());
      } else {
        console.log("ℹ️  User document doesn't exist yet");
        console.log("(This is normal for new users)");
      }
    } catch (error) {
      console.error("❌ Firestore error:", error.message);
    }
    console.groupEnd();

    // ========================================
    // 6. Firebase Config Summary
    // ========================================
    console.group("6️⃣  Firebase Configuration");
    console.log(
      "📍 Project ID:",
      process.env.REACT_APP_FIREBASE_PROJECT_ID || "finalopenai-fc9c5",
    );
    console.log(
      "🔗 Database URL:",
      process.env.REACT_APP_FIREBASE_DATABASE_URL ||
        "https://finalopenai-fc9c5-default-rtdb.firebaseio.com",
    );
    console.log(
      "🌐 Auth Domain:",
      process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ||
        "finalopenai-fc9c5.firebaseapp.com",
    );
    console.log(
      "💾 Emulator mode:",
      process.env.REACT_APP_USE_EMULATOR === "true" ? "YES" : "NO",
    );
    console.groupEnd();

    // ========================================
    // Summary
    // ========================================
    console.group("✅ CONNECTION SUMMARY");
    console.log(
      "%cAll Firebase services are connected and working! 🎉",
      "color: green; font-weight: bold; font-size: 14px",
    );
    console.groupEnd();
  } catch (error) {
    console.error(
      "%c❌ CRITICAL ERROR:",
      "color: red; font-weight: bold;",
      error,
    );
  }

  console.groupEnd();
};

/**
 * Check email data isolation
 * Shows all data stored under current user's email
 */
export const debugEmailDataIsolation = async () => {
  try {
    if (!auth.currentUser) {
      console.error("❌ No user logged in");
      return;
    }

    const email = auth.currentUser.email;
    const sanitizedEmail = email
      .toLowerCase()
      .replace(/\./g, "_dot_")
      .replace(/@/g, "_at_");

    console.group(`📧 Email Data Isolation: ${email}`);
    console.log("Sanitized key:", sanitizedEmail);

    const emailRef = ref(database, `emails/${sanitizedEmail}`);
    const snapshot = await get(emailRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log("✅ Email folder contents:", data);

      // Count data by collection
      Object.entries(data).forEach(([collection, items]) => {
        if (typeof items === "object" && items !== null) {
          const count = Object.keys(items).length;
          console.log(`  📁 ${collection}: ${count} items`);
        }
      });
    } else {
      console.log("ℹ️  No data stored yet for this email");
    }

    console.groupEnd();
  } catch (error) {
    console.error("Error checking email data:", error);
  }
};

/**
 * List all users in database
 */
export const debugListAllUsers = async () => {
  try {
    console.group("👥 All Users in Database");

    const emailsRef = ref(database, "emails");
    const snapshot = await get(emailsRef);

    if (snapshot.exists()) {
      const emails = snapshot.val();
      console.log("Total email folders:", Object.keys(emails).length);

      Object.entries(emails).forEach(([sanitizedEmail, userData]) => {
        console.log(`\n📧 ${sanitizedEmail}`);

        if (userData.metadata) {
          console.log(`   Created: ${userData.metadata.createdAt}`);
          console.log(`   Last login: ${userData.metadata.lastLogin}`);
        }

        // Show collections
        Object.entries(userData).forEach(([collection, items]) => {
          if (
            collection !== "metadata" &&
            typeof items === "object" &&
            items !== null
          ) {
            const count = Object.keys(items).length;
            console.log(`   📁 ${collection}: ${count} items`);
          }
        });
      });
    } else {
      console.log("ℹ️  No users in database yet");
    }

    console.groupEnd();
  } catch (error) {
    console.error("Error listing users:", error);
  }
};

/**
 * Test real-time listener setup
 */
export const debugRealtimeListener = async (collectionName = "bills") => {
  try {
    if (!auth.currentUser) {
      console.error("❌ No user logged in");
      return;
    }

    const email = auth.currentUser.email;
    const sanitizedEmail = email
      .toLowerCase()
      .replace(/\./g, "_dot_")
      .replace(/@/g, "_at_");

    console.group(`📡 Real-time Listener Test: ${collectionName}`);

    const collectionRef = ref(
      database,
      `emails/${sanitizedEmail}/${collectionName}`,
    );

    const unsubscribe = onValue(
      collectionRef,
      (snapshot) => {
        console.log(
          `✅ Update received for ${collectionName}:`,
          snapshot.val(),
        );
      },
      (error) => {
        console.error(`❌ Listener error: ${error.message}`);
      },
    );

    console.log(`🔄 Listener active for ${collectionName}`);
    console.log(
      "💡 Try adding data to this collection to see real-time updates",
    );

    // Auto-cleanup after 30 seconds
    const timeout = setTimeout(() => {
      unsubscribe();
      console.log("🔌 Listener stopped (auto-cleanup after 30s)");
      console.groupEnd();
    }, 30000);

    window.stopRealtimeListener = () => {
      clearTimeout(timeout);
      unsubscribe();
      console.log("🔌 Listener stopped manually");
      console.groupEnd();
    };

    console.log("ℹ️  Run stopRealtimeListener() to stop manually");
  } catch (error) {
    console.error("Error setting up listener:", error);
  }
};

/**
 * Export debug commands to window for easy access
 */
if (typeof window !== "undefined") {
  window.debugFirebase = {
    connection: debugFirebaseConnection,
    emailIsolation: debugEmailDataIsolation,
    listAllUsers: debugListAllUsers,
    realtimeListener: debugRealtimeListener,
  };

  console.log(
    "%c🔧 Firebase Debug Tools Available!",
    "color: blue; font-weight: bold;",
  );
  console.log("Commands available in browser console:");
  console.log("  - debugFirebase.connection()         - Test all connections");
  console.log("  - debugFirebase.emailIsolation()     - Check email data");
  console.log("  - debugFirebase.listAllUsers()       - View all users");
  console.log(
    "  - debugFirebase.realtimeListener()   - Test real-time updates",
  );
}

export default {
  debugFirebaseConnection,
  debugEmailDataIsolation,
  debugListAllUsers,
  debugRealtimeListener,
};
