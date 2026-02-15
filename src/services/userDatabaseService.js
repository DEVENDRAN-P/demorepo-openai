import {
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  push,
} from "firebase/database";
import { database } from "../config/firebase";
import { auth } from "../config/firebase";

/**
 * Get current user ID
 * @returns {string} Current user UID
 */
const getUserId = () => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  return user.uid;
};

/**
 * Get current user email
 * @returns {string} Current user email
 */
const getUserEmail = () => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  return user.email;
};

/**
 * Convert email to database-safe key (removes special characters)
 * Ensures each email gets a UNIQUE key
 * @param {string} email - Email address
 * @returns {string} Safe database key
 */
const sanitizeEmail = (email) => {
  if (!email) throw new Error("Email is required");

  // Convert to lowercase and replace special characters
  let sanitized = email
    .toLowerCase()
    .replace(/\./g, "_dot_") // . becomes _dot_
    .replace(/@/g, "_at_"); // @ becomes _at_

  // Remove any other special characters
  sanitized = sanitized.replace(/[^a-z0-9_-]/g, "");

  if (!sanitized) {
    throw new Error("Email sanitization resulted in empty key");
  }

  console.log(`🔐 Email sanitized: ${email} -> ${sanitized}`);
  return sanitized;
};

// ========================================
// USER PROFILE OPERATIONS
// ========================================

/**
 * Save or update user profile in Realtime Database
 * Path: users/{userId}/profile
 */
export const saveUserProfile = async (profileData) => {
  try {
    const userId = getUserId();
    const userRef = ref(database, `users/${userId}/profile`);

    await set(userRef, {
      ...profileData,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error("Error saving user profile:", error);
    throw error;
  }
};

/**
 * Get user profile data
 * Path: users/{userId}/profile
 */
export const getUserProfile = async () => {
  try {
    const userId = getUserId();
    const userRef = ref(database, `users/${userId}/profile`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
};
/**
 * Listen to real-time user profile updates
 * Path: users/{userId}/profile
 */
export const onUserProfileChange = (callback) => {
  try {
    const userId = getUserId();
    const userRef = ref(database, `users/${userId}/profile`);

    return onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback(null);
      }
    });
  } catch (error) {
    console.error("Error listening to user profile:", error);
    throw error;
  }
};

// ========================================
// USER PREFERENCES/SETTINGS
// ========================================

/**
 * Save user settings
 * Path: users/{userId}/settings
 */
export const saveUserSettings = async (settings) => {
  try {
    const userId = getUserId();
    const settingsRef = ref(database, `users/${userId}/settings`);

    await set(settingsRef, {
      ...settings,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error("Error saving user settings:", error);
    throw error;
  }
};

/**
 * Get user settings
 * Path: users/{userId}/settings
 */
export const getUserSettings = async () => {
  try {
    const userId = getUserId();
    const settingsRef = ref(database, `users/${userId}/settings`);
    const snapshot = await get(settingsRef);

    return snapshot.val();
  } catch (error) {
    console.error("Error getting user settings:", error);
    throw error;
  }
};

// ========================================
// USER DATA COLLECTION (For bills, documents, etc.)
// ========================================

/**
 * Add new data to user collection
 * Path: users/{userId}/{collectionName}
 * Returns: Auto-generated document ID
 */
export const addUserData = async (collectionName, data) => {
  try {
    const userId = getUserId();
    const collectionRef = ref(database, `users/${userId}/${collectionName}`);
    const newDocRef = push(collectionRef);

    await set(newDocRef, {
      id: newDocRef.key,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return newDocRef.key;
  } catch (error) {
    console.error(`Error adding data to ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Get all data from user collection
 * Path: users/{userId}/{collectionName}
 */
export const getUserData = async (collectionName) => {
  try {
    const userId = getUserId();
    const collectionRef = ref(database, `users/${userId}/${collectionName}`);
    const snapshot = await get(collectionRef);

    if (snapshot.exists()) {
      return snapshot.val();
    }
    return {};
  } catch (error) {
    console.error(`Error getting ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Get single document from user collection
 * Path: users/{userId}/{collectionName}/{docId}
 */
export const getUserDataItem = async (collectionName, docId) => {
  try {
    const userId = getUserId();
    const itemRef = ref(database, `users/${userId}/${collectionName}/${docId}`);
    const snapshot = await get(itemRef);

    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error(`Error getting ${collectionName} item:`, error);
    throw error;
  }
};

/**
 * Update user data
 * Path: users/{userId}/{collectionName}/{docId}
 */
export const updateUserData = async (collectionName, docId, updates) => {
  try {
    const userId = getUserId();
    const itemRef = ref(database, `users/${userId}/${collectionName}/${docId}`);

    await update(itemRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error(`Error updating ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Delete user data
 * Path: users/{userId}/{collectionName}/{docId}
 */
export const deleteUserData = async (collectionName, docId) => {
  try {
    const userId = getUserId();
    const itemRef = ref(database, `users/${userId}/${collectionName}/${docId}`);

    await remove(itemRef);
    return true;
  } catch (error) {
    console.error(`Error deleting ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Listen to real-time updates from user collection
 * Path: users/{userId}/{collectionName}
 */
export const onUserDataChange = (collectionName, callback) => {
  try {
    const userId = getUserId();
    const collectionRef = ref(database, `users/${userId}/${collectionName}`);

    return onValue(collectionRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback({});
      }
    });
  } catch (error) {
    console.error(`Error listening to ${collectionName}:`, error);
    throw error;
  }
};

// ========================================
// USER STATISTICS/ANALYTICS
// ========================================

/**
 * Save user statistics
 * Path: users/{userId}/stats
 */
export const saveUserStats = async (stats) => {
  try {
    const userId = getUserId();
    const statsRef = ref(database, `users/${userId}/stats`);

    await update(statsRef, {
      ...stats,
      lastUpdated: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error("Error saving user stats:", error);
    throw error;
  }
};

/**
 * Get user statistics
 * Path: users/{userId}/stats
 */
export const getUserStats = async () => {
  try {
    const userId = getUserId();
    const statsRef = ref(database, `users/${userId}/stats`);
    const snapshot = await get(statsRef);

    return snapshot.val();
  } catch (error) {
    console.error("Error getting user stats:", error);
    throw error;
  }
};

// ========================================
// DATABASE STRUCTURE REFERENCE
// ========================================
/*
DATABASE STRUCTURE:
├── users/
│   ├── {userId}/
│   │   ├── profile/           (User basic info)
│   │   ├── settings/          (User preferences)
│   │   ├── stats/             (User statistics)
│   │   ├── bills/             (User bills collection)
│   │   │   ├── {billId1}/
│   │   │   ├── {billId2}/
│   │   │   └── ...
│   │   ├── documents/         (User documents)
│   │   │   ├── {docId1}/
│   │   │   ├── {docId2}/
│   │   │   └── ...
│   │   ├── gstForms/          (User GST forms)
│   │   └── reports/           (User reports)
│   └── {userId2}/
│       └── ... (same structure)

Each user has completely isolated data - no cross-user access
*/

// ========================================
// EMAIL-BASED DATA STORAGE (NEW)
// ========================================

/**
 * Save data organized by email ID
 * Path: emails/{sanitizedEmail}/{collectionName}
 * This creates a separate folder for each email address
 */
export const saveEmailData = async (collectionName, data) => {
  try {
    const email = getUserEmail();
    const sanitizedEmail = sanitizeEmail(email);
    const emailRef = ref(
      database,
      `emails/${sanitizedEmail}/${collectionName}`,
    );

    const newDocRef = push(emailRef);
    await set(newDocRef, {
      id: newDocRef.key,
      email: email,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log(`✅ Data saved for email: ${email}`);
    return newDocRef.key;
  } catch (error) {
    console.error("Error saving email data:", error);
    throw error;
  }
};

/**
 * Get all data for a specific email
 * Path: emails/{sanitizedEmail}/{collectionName}
 */
export const getEmailData = async (collectionName) => {
  try {
    const email = getUserEmail();
    const sanitizedEmail = sanitizeEmail(email);
    const emailRef = ref(
      database,
      `emails/${sanitizedEmail}/${collectionName}`,
    );
    const snapshot = await get(emailRef);

    if (snapshot.exists()) {
      return snapshot.val();
    }
    return {};
  } catch (error) {
    console.error("Error getting email data:", error);
    throw error;
  }
};

/**
 * Get single item from email data collection
 * Path: emails/{sanitizedEmail}/{collectionName}/{docId}
 */
export const getEmailDataItem = async (collectionName, docId) => {
  try {
    const email = getUserEmail();
    const sanitizedEmail = sanitizeEmail(email);
    const itemRef = ref(
      database,
      `emails/${sanitizedEmail}/${collectionName}/${docId}`,
    );
    const snapshot = await get(itemRef);

    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error("Error getting email data item:", error);
    throw error;
  }
};

/**
 * Update data for a specific email
 * Path: emails/{sanitizedEmail}/{collectionName}/{docId}
 */
export const updateEmailData = async (collectionName, docId, updates) => {
  try {
    const email = getUserEmail();
    const sanitizedEmail = sanitizeEmail(email);
    const itemRef = ref(
      database,
      `emails/${sanitizedEmail}/${collectionName}/${docId}`,
    );

    await update(itemRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    console.log(`✅ Data updated for email: ${email}`);
    return true;
  } catch (error) {
    console.error("Error updating email data:", error);
    throw error;
  }
};

/**
 * Delete data for a specific email
 * Path: emails/{sanitizedEmail}/{collectionName}/{docId}
 */
export const deleteEmailData = async (collectionName, docId) => {
  try {
    const email = getUserEmail();
    const sanitizedEmail = sanitizeEmail(email);
    const itemRef = ref(
      database,
      `emails/${sanitizedEmail}/${collectionName}/${docId}`,
    );

    await remove(itemRef);
    console.log(`✅ Data deleted for email: ${email}`);
    return true;
  } catch (error) {
    console.error("Error deleting email data:", error);
    throw error;
  }
};

/**
 * Listen to real-time updates for email data
 * Path: emails/{sanitizedEmail}/{collectionName}
 */
export const onEmailDataChange = (collectionName, callback) => {
  try {
    const email = getUserEmail();
    const sanitizedEmail = sanitizeEmail(email);
    const emailRef = ref(
      database,
      `emails/${sanitizedEmail}/${collectionName}`,
    );

    return onValue(emailRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback({});
      }
    });
  } catch (error) {
    console.error("Error listening to email data:", error);
    throw error;
  }
};

/**
 * Get all emails stored in database
 * Path: emails/
 * Note: Only works if user has admin access
 */
export const getAllEmailsData = async () => {
  try {
    const emailsRef = ref(database, "emails");
    const snapshot = await get(emailsRef);

    if (snapshot.exists()) {
      return snapshot.val();
    }
    return {};
  } catch (error) {
    console.error("Error getting all emails data:", error);
    throw error;
  }
};

// ========================================
// NEW USER INITIALIZATION (IMPORTANT!)
// ========================================

/**
 * Initialize data for a new user email
 * Creates a fresh start for new users with empty collections
 * Call this when a user first signs up
 */
export const initializeNewUserEmail = async (userEmail) => {
  try {
    const sanitizedEmail = sanitizeEmail(userEmail);

    // Create user profile entry
    const profileRef = ref(database, `emails/${sanitizedEmail}/metadata`);
    await set(profileRef, {
      email: userEmail,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      status: "active",
    });

    console.log(`✅ New user initialized: ${userEmail}`);
    return true;
  } catch (error) {
    console.error("Error initializing new user:", error);
    throw error;
  }
};

/**
 * Update last login time for user email
 * Call this every time a user logs in to track activity
 */
export const updateUserLastLogin = async () => {
  try {
    const email = getUserEmail();
    const sanitizedEmail = sanitizeEmail(email);
    const metadataRef = ref(database, `emails/${sanitizedEmail}/metadata`);

    await update(metadataRef, {
      lastLogin: new Date().toISOString(),
    });

    console.log(`✅ Last login updated for: ${email}`);
    return true;
  } catch (error) {
    console.error("Error updating last login:", error);
    // Don't throw - this is optional tracking
  }
};

/**
 * Get user metadata (creation time, last login, etc.)
 * Path: emails/{sanitizedEmail}/metadata
 */
export const getUserMetadata = async () => {
  try {
    const email = getUserEmail();
    const sanitizedEmail = sanitizeEmail(email);
    const metadataRef = ref(database, `emails/${sanitizedEmail}/metadata`);
    const snapshot = await get(metadataRef);

    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error("Error getting user metadata:", error);
    throw error;
  }
};

/**
 * Clear old listeners and get fresh data
 * Use this when switching users or on component mount
 */
export const refreshEmailData = async (collectionName) => {
  try {
    const email = getUserEmail();
    const sanitizedEmail = sanitizeEmail(email);

    console.log(
      `🔄 Refreshing data for email: ${email}, collection: ${collectionName}`,
    );

    // First, unsubscribe from old listeners (handled by component)
    // Then get fresh data
    const emailRef = ref(
      database,
      `emails/${sanitizedEmail}/${collectionName}`,
    );
    const snapshot = await get(emailRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log(`✅ Refreshed data for ${email}/${collectionName}:`, data);
      return data;
    }

    console.log(`✅ No data exists yet for ${email}/${collectionName}`);
    return {};
  } catch (error) {
    console.error(`Error refreshing ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Setup real-time listener with automatic email verification
 * This ensures data is always scoped to current logged-in user
 * Returns unsubscribe function - IMPORTANT: call this on component unmount
 */
export const setupEmailDataListener = (collectionName, callback) => {
  let unsubscribe = null;

  try {
    const email = getUserEmail();
    const sanitizedEmail = sanitizeEmail(email);
    const emailRef = ref(
      database,
      `emails/${sanitizedEmail}/${collectionName}`,
    );

    console.log(`📡 Setting up listener for ${email}/${collectionName}`);

    unsubscribe = onValue(
      emailRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          console.log(
            `📨 Real-time update for ${email}/${collectionName}:`,
            data,
          );
          callback(data);
        } else {
          console.log(
            `📨 No data for ${email}/${collectionName}, sending empty object`,
          );
          callback({});
        }
      },
      (error) => {
        console.error(
          `❌ Listener error for ${email}/${collectionName}:`,
          error,
        );
        callback(null); // Signal error to component
      },
    );

    return unsubscribe;
  } catch (error) {
    console.error("Error setting up listener:", error);
    throw error;
  }
};

/**
 * Check if data exists for current user email
 * Useful for conditional rendering (show empty state vs. loading state)
 */
export const emailDataExists = async (collectionName) => {
  try {
    const email = getUserEmail();
    const sanitizedEmail = sanitizeEmail(email);
    const emailRef = ref(
      database,
      `emails/${sanitizedEmail}/${collectionName}`,
    );
    const snapshot = await get(emailRef);

    return snapshot.exists();
  } catch (error) {
    console.error("Error checking if data exists:", error);
    return false;
  }
};

/**
 * Get data size/count for a collection
 * Useful for analytics or UI decisions
 */
export const getEmailDataCount = async (collectionName) => {
  try {
    const email = getUserEmail();
    const sanitizedEmail = sanitizeEmail(email);
    const emailRef = ref(
      database,
      `emails/${sanitizedEmail}/${collectionName}`,
    );
    const snapshot = await get(emailRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      const count = Object.keys(data).length;
      console.log(`📊 ${email} has ${count} items in ${collectionName}`);
      return count;
    }

    return 0;
  } catch (error) {
    console.error("Error getting data count:", error);
    return 0;
  }
};

// ========================================
// UPDATED DATABASE STRUCTURE REFERENCE
// ========================================
/*
DATABASE STRUCTURE:
├── users/
│   ├── {userId}/
│   │   ├── profile/           (User basic info)
│   │   ├── settings/          (User preferences)
│   │   ├── stats/             (User statistics)
│   │   ├── bills/             (User bills collection)
│   │   ├── documents/         (User documents)
│   │   ├── gstForms/          (User GST forms)
│   │   └── reports/           (User reports)
│   └── {userId2}/
│       └── ... (same structure)
│
├── emails/                     [NEW - EMAIL-BASED STORAGE]
│   ├── user_example_com/       (user@example.com)
│   │   ├── bills/
│   │   │   ├── {billId1}/
│   │   │   ├── {billId2}/
│   │   │   └── ...
│   │   ├── documents/
│   │   │   ├── {docId1}/
│   │   │   ├── {docId2}/
│   │   │   └── ...
│   │   ├── gstForms/
│   │   ├── reminders/
│   │   ├── reports/
│   │   └── invoices/
│   │
│   ├── john_doe_gmail_com/     (john.doe@gmail.com)
│   │   ├── bills/
│   │   ├── documents/
│   │   └── ...
│   │
│   └── user2_domain_org/       (user2@domain.org)
│       ├── bills/
│       ├── documents/
│       └── ...

FEATURES:
- Each email gets a separate folder (safe keys: @ → _, . → _)
- Each collection within email folder is isolated
- All timestamps are stored automatically
- Real-time listeners available
- Complete CRUD operations supported
- User email is stored with each record for verification
*/
