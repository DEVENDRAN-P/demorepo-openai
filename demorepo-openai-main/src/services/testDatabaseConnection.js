import { ref, set, get } from "firebase/database";
import { getDatabaseInstance, auth } from "../config/firebase";

let _db = null;
const getDb = async () => {
  if (!_db) _db = await getDatabaseInstance();
  return _db;
};

/**
 * Test if Realtime Database connection is working
 * Run this in browser console to debug
 */
export const testDatabaseConnection = async () => {
  try {
    console.log("🔍 Starting database connection test...");

    // Check 1: Database instance exists
    const database = await getDb();
    if (!database) {
      console.error("❌ Database instance not initialized!");
      return false;
    }
    console.log("✅ Database instance initialized");

    // Check 2: User is authenticated
    if (!auth.currentUser) {
      console.warn("⚠️  No user authenticated. Please login first.");
      return false;
    }
    console.log("✅ User authenticated:", auth.currentUser.uid);

    // Check 3: Test write operation
    const testPath = `test/${auth.currentUser.uid}/connection-test`;
    const testRef = ref(database, testPath);
    const testData = {
      message: "Connection test successful",
      timestamp: new Date().toISOString(),
    };

    console.log("🔄 Writing test data to:", testPath);
    await set(testRef, testData);
    console.log("✅ Write operation successful");

    // Check 4: Test read operation
    console.log("🔄 Reading test data from:", testPath);
    const snapshot = await get(testRef);

    if (snapshot.exists()) {
      console.log("✅ Read operation successful");
      console.log("📦 Data retrieved:", snapshot.val());
      return true;
    } else {
      console.error("❌ No data found at path");
      return false;
    }
  } catch (error) {
    console.error("❌ Database connection test failed:", error.message);
    console.error("Full error:", error);
    return false;
  }
};

/**
 * Clear test data
 */
export const clearTestData = async () => {
  try {
    if (!auth.currentUser) {
      console.warn("No user authenticated");
      return;
    }

    const database = await getDb();
    const testPath = `test/${auth.currentUser.uid}`;
    const testRef = ref(database, testPath);

    console.log("🗑️  Clearing test data...");
    await set(testRef, null);
    console.log("✅ Test data cleared");
  } catch (error) {
    console.error("❌ Error clearing test data:", error);
  }
};
