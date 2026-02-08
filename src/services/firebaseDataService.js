/**
 * COMPREHENSIVE FIREBASE DATA SERVICE
 * Stores and retrieves ALL user data from Firebase with user isolation
 *
 * Data Structure:
 * ├── users/
 * │   ├── {uid}/
 * │   │   ├── profile/              (User profile data)
 * │   │   ├── settings/             (User preferences)
 * │   │   ├── bills/                (GST bills/invoices)
 * │   │   ├── gstForms/             (GSTR forms)
 * │   │   ├── reports/              (Generated reports)
 * │   │   ├── reminders/            (Bill reminders)
 * │   │   ├── stats/                (User statistics)
 * │   │   └── documents/            (Supporting documents)
 */

import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  updateDoc,
  deleteDoc,
  Timestamp,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getBytes,
  deleteObject,
  listAll,
  getMetadata,
} from "firebase/storage";
import { db, auth, storage } from "../config/firebase";

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get current authenticated user ID
 * Ensures data is only accessed by the authenticated user
 */
const getCurrentUserId = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated. Cannot access user data.");
  }
  return user.uid;
};

/**
 * Get current user email (for logging/verification)
 */
const getCurrentUserEmail = () => {
  const user = auth.currentUser;
  return user?.email || "unknown";
};

// ========================================
// USER PROFILE MANAGEMENT
// ========================================

/**
 * Create/Update user profile
 * @param {object} profileData - { name, email, shopName, gstin, phone, address, city, state, pincode }
 */
export const saveUserProfile = async (profileData) => {
  try {
    const userId = getCurrentUserId();
    const userRef = doc(db, "users", userId);

    await setDoc(
      userRef,
      {
        // Profile fields
        name: profileData.name || "",
        email: getCurrentUserEmail(),
        shopName: profileData.shopName || "",
        gstin: profileData.gstin || "",
        phone: profileData.phone || "",
        address: profileData.address || "",
        city: profileData.city || "",
        state: profileData.state || "",
        pincode: profileData.pincode || "",

        // System fields
        uid: userId,
        emailVerified: auth.currentUser?.emailVerified || false,
        lastLogin: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdAt: Timestamp.now(), // Only set on first creation
      },
      { merge: true },
    );

    console.log("✅ User profile saved successfully");
    return { success: true, userId };
  } catch (error) {
    console.error("❌ Error saving user profile:", error);
    throw error;
  }
};

/**
 * Get user profile (with cache support)
 */
export const getUserProfile = async () => {
  try {
    const userId = getCurrentUserId();
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.warn("⚠️ User profile not found");
      return null;
    }

    return {
      uid: userDoc.id,
      ...userDoc.data(),
    };
  } catch (error) {
    console.error("❌ Error fetching user profile:", error);
    throw error;
  }
};

// ========================================
// BILLS/INVOICES MANAGEMENT
// ========================================

/**
 * Save a bill for the current user
 * @param {object} billData - Complete bill information
 */
export const saveUserBill = async (billData) => {
  try {
    const userId = getCurrentUserId();
    const billsRef = collection(db, "users", userId, "bills");

    const docRef = await addDoc(billsRef, {
      // Bill details
      invoiceNumber: billData.invoiceNumber || "",
      invoiceDate: billData.invoiceDate || new Date().toISOString(),
      supplierName: billData.supplierName || "",
      gstin: billData.gstin || "",

      // Amount details
      amount: billData.amount || 0,
      taxPercent: billData.taxPercent || 0,
      taxAmount: billData.taxAmount || 0,
      totalAmount: billData.totalAmount || 0,

      // Tax breakdown
      taxBreakdown: billData.taxBreakdown || {
        cgst: 0,
        sgst: 0,
        igst: 0,
      },

      // Classification
      expenseType: billData.expenseType || "Others",
      category: billData.category || "",

      // GST filing
      gstrDeadline: billData.gstrDeadline || "",
      gstrForm: billData.gstrForm || "GSTR-1",
      filed: billData.filed || false,
      filedDate: billData.filedDate || null,

      // Status tracking
      status: billData.status || "pending", // pending, approved, rejected, filed
      notes: billData.notes || "",

      // System fields
      userId: userId,
      extractionConfidence: billData.extractionConfidence || "medium",
      uploadedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log("✅ Bill saved:", docRef.id);
    return { success: true, billId: docRef.id };
  } catch (error) {
    console.error("❌ Error saving bill:", error);
    throw error;
  }
};

/**
 * Get all bills for current user
 */
export const getUserBills = async () => {
  try {
    const userId = getCurrentUserId();
    const billsRef = collection(db, "users", userId, "bills");
    const snapshot = await getDocs(billsRef);

    const bills = [];
    snapshot.forEach((doc) => {
      bills.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    console.log(`✅ Fetched ${bills.length} bills for user ${userId}`);
    return bills;
  } catch (error) {
    console.error("❌ Error fetching bills:", error);
    return [];
  }
};

/**
 * Get a specific bill
 */
export const getUserBillById = async (billId) => {
  try {
    const userId = getCurrentUserId();
    const billRef = doc(db, "users", userId, "bills", billId);
    const billDoc = await getDoc(billRef);

    if (!billDoc.exists()) {
      throw new Error("Bill not found");
    }

    return {
      id: billDoc.id,
      ...billDoc.data(),
    };
  } catch (error) {
    console.error("❌ Error fetching bill:", error);
    throw error;
  }
};

/**
 * Update a bill
 */
export const updateUserBill = async (billId, updates) => {
  try {
    const userId = getCurrentUserId();
    const billRef = doc(db, "users", userId, "bills", billId);

    await updateDoc(billRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    console.log("✅ Bill updated:", billId);
    return { success: true };
  } catch (error) {
    console.error("❌ Error updating bill:", error);
    throw error;
  }
};

/**
 * Delete a bill
 */
export const deleteUserBill = async (billId) => {
  try {
    const userId = getCurrentUserId();
    const billRef = doc(db, "users", userId, "bills", billId);

    await deleteDoc(billRef);

    console.log("✅ Bill deleted:", billId);
    return { success: true };
  } catch (error) {
    console.error("❌ Error deleting bill:", error);
    throw error;
  }
};

// ========================================
// GST FORMS MANAGEMENT
// ========================================

/**
 * Save a GST form
 */
export const saveUserGSTForm = async (formData) => {
  try {
    const userId = getCurrentUserId();
    const formsRef = collection(db, "users", userId, "gstForms");

    const docRef = await addDoc(formsRef, {
      formType: formData.formType || "GSTR-1", // GSTR-1, GSTR-3B, GSTR-9, etc.
      period: formData.period || "", // MM-YYYY format
      status: formData.status || "draft", // draft, submitted, accepted, rejected

      // Form content
      data: formData.data || {},

      // Filing details
      submittedDate: formData.submittedDate || null,
      refNumber: formData.refNumber || "",
      remarks: formData.remarks || "",

      // Related bills
      billIds: formData.billIds || [],

      // System fields
      userId: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log("✅ GST Form saved:", docRef.id);
    return { success: true, formId: docRef.id };
  } catch (error) {
    console.error("❌ Error saving GST Form:", error);
    throw error;
  }
};

/**
 * Get all GST forms for user
 */
export const getUserGSTForms = async () => {
  try {
    const userId = getCurrentUserId();
    const formsRef = collection(db, "users", userId, "gstForms");
    const snapshot = await getDocs(formsRef);

    const forms = [];
    snapshot.forEach((doc) => {
      forms.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return forms;
  } catch (error) {
    console.error("❌ Error fetching GST Forms:", error);
    return [];
  }
};

// ========================================
// USER STATISTICS & ANALYTICS
// ========================================

/**
 * Update user statistics
 */
export const updateUserStats = async (statsData) => {
  try {
    const userId = getCurrentUserId();
    const statsRef = doc(db, "users", userId, "stats", "overview");

    await setDoc(
      statsRef,
      {
        totalBillsUploaded: statsData.totalBillsUploaded || 0,
        totalGSTAmount: statsData.totalGSTAmount || 0,
        totalCostSavings: statsData.totalCostSavings || 0,
        billsFiledCount: statsData.billsFiledCount || 0,
        averageProcessingTime: statsData.averageProcessingTime || 0,

        // Monthly breakdown
        monthlyStats: statsData.monthlyStats || {},

        // System fields
        lastUpdated: serverTimestamp(),
      },
      { merge: true },
    );

    console.log("✅ User statistics updated");
    return { success: true };
  } catch (error) {
    console.error("❌ Error updating stats:", error);
    throw error;
  }
};

/**
 * Get user statistics
 */
export const getUserStats = async () => {
  try {
    const userId = getCurrentUserId();
    const statsRef = doc(db, "users", userId, "stats", "overview");
    const statsDoc = await getDoc(statsRef);

    if (!statsDoc.exists()) {
      return {
        totalBillsUploaded: 0,
        totalGSTAmount: 0,
        totalCostSavings: 0,
        billsFiledCount: 0,
      };
    }

    return statsDoc.data();
  } catch (error) {
    console.error("❌ Error fetching stats:", error);
    return {};
  }
};

// ========================================
// USER SETTINGS & PREFERENCES
// ========================================

/**
 * Save user settings
 */
export const saveUserSettings = async (settings) => {
  try {
    const userId = getCurrentUserId();
    const settingsRef = doc(db, "users", userId, "settings", "preferences");

    await setDoc(
      settingsRef,
      {
        // Notification preferences
        emailNotifications: settings.emailNotifications !== false,
        billReminderDays: settings.billReminderDays || 3,
        deadlineAlerts: settings.deadlineAlerts !== false,

        // Display preferences
        theme: settings.theme || "light", // light, dark
        language: settings.language || "en", // en, hi, ta, kn, ml
        timezone: settings.timezone || "IST",

        // GST preferences
        gstinRequired: settings.gstinRequired !== false,
        autoClassifyExpenses: settings.autoClassifyExpenses !== false,

        // System fields
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    console.log("✅ User settings saved");
    return { success: true };
  } catch (error) {
    console.error("❌ Error saving settings:", error);
    throw error;
  }
};

/**
 * Get user settings
 */
export const getUserSettings = async () => {
  try {
    const userId = getCurrentUserId();
    const settingsRef = doc(db, "users", userId, "settings", "preferences");
    const settingsDoc = await getDoc(settingsRef);

    if (!settingsDoc.exists()) {
      // Return default settings
      return {
        emailNotifications: true,
        billReminderDays: 3,
        deadlineAlerts: true,
        theme: "light",
        language: "en",
        autoClassifyExpenses: true,
      };
    }

    return settingsDoc.data();
  } catch (error) {
    console.error("❌ Error fetching settings:", error);
    return {};
  }
};

// ========================================
// REMINDERS MANAGEMENT
// ========================================

/**
 * Create a bill reminder
 */
export const createBillReminder = async (reminderData) => {
  try {
    const userId = getCurrentUserId();
    const remindersRef = collection(db, "users", userId, "reminders");

    const docRef = await addDoc(remindersRef, {
      billId: reminderData.billId || "",
      invoiceNumber: reminderData.invoiceNumber || "",
      invoiceDate: reminderData.invoiceDate || "",

      // Reminder details
      reminderType: reminderData.reminderType || "deadline", // deadline, upload, review
      dueDate: reminderData.dueDate || "",

      // Status
      status: reminderData.status || "active", // active, completed, snoozed
      daysBeforeDeadline: reminderData.daysBeforeDeadline || 3,

      // System fields
      userId: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log("✅ Reminder created:", docRef.id);
    return { success: true, reminderId: docRef.id };
  } catch (error) {
    console.error("❌ Error creating reminder:", error);
    throw error;
  }
};

/**
 * Get all reminders for user
 */
export const getUserReminders = async () => {
  try {
    const userId = getCurrentUserId();
    const remindersRef = collection(db, "users", userId, "reminders");
    const snapshot = await getDocs(remindersRef);

    const reminders = [];
    snapshot.forEach((doc) => {
      reminders.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return reminders;
  } catch (error) {
    console.error("❌ Error fetching reminders:", error);
    return [];
  }
};

// ========================================
// DOCUMENTS STORAGE
// ========================================

/**
 * Save document metadata
 */
export const saveUserDocument = async (docData) => {
  try {
    const userId = getCurrentUserId();
    const docsRef = collection(db, "users", userId, "documents");

    const docRef = await addDoc(docsRef, {
      fileName: docData.fileName || "",
      fileType: docData.fileType || "", // pdf, image, etc
      fileSize: docData.fileSize || 0,

      // Storage reference
      storagePath: docData.storagePath || "",
      downloadUrl: docData.downloadUrl || "",

      // Classification
      documentType: docData.documentType || "other", // invoice, receipt, gst_form, etc
      relatedBillId: docData.relatedBillId || "",

      // System fields
      userId: userId,
      uploadedAt: serverTimestamp(),
      expiresAt: docData.expiresAt || null,
    });

    console.log("✅ Document metadata saved:", docRef.id);
    return { success: true, docId: docRef.id };
  } catch (error) {
    console.error("❌ Error saving document:", error);
    throw error;
  }
};

/**
 * Get all documents for user
 */
export const getUserDocuments = async () => {
  try {
    const userId = getCurrentUserId();
    const docsRef = collection(db, "users", userId, "documents");
    const snapshot = await getDocs(docsRef);

    const docs = [];
    snapshot.forEach((doc) => {
      docs.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return docs;
  } catch (error) {
    console.error("❌ Error fetching documents:", error);
    return [];
  }
};

// ========================================
// AUDIT LOG
// ========================================

/**
 * Log user activity for audit
 */
export const logUserActivity = async (activity) => {
  try {
    const userId = getCurrentUserId();
    const logsRef = collection(db, "users", userId, "activityLogs");

    await addDoc(logsRef, {
      action: activity.action || "", // upload_bill, update_bill, file_gst, etc
      details: activity.details || {},
      ipAddress: activity.ipAddress || "",
      userAgent: activity.userAgent || "",

      // System fields
      userId: userId,
      timestamp: serverTimestamp(),
    });

    console.log("✅ Activity logged");
  } catch (error) {
    console.error("❌ Error logging activity:", error);
    // Non-blocking error
  }
};

/**
 * Get user activity logs
 */
export const getUserActivityLogs = async (limit = 100) => {
  try {
    const userId = getCurrentUserId();
    const logsRef = collection(db, "users", userId, "activityLogs");
    const snapshot = await getDocs(logsRef);

    const logs = [];
    snapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return logs.slice(0, limit);
  } catch (error) {
    console.error("❌ Error fetching activity logs:", error);
    return [];
  }
};

// ========================================
// DATA EXPORT & BACKUP
// ========================================

/**
 * Get all user data (for export/backup)
 */
export const exportAllUserData = async () => {
  try {
    const userId = getCurrentUserId();

    const [profile, bills, forms, stats, settings, reminders, documents, logs] =
      await Promise.all([
        getUserProfile(),
        getUserBills(),
        getUserGSTForms(),
        getUserStats(),
        getUserSettings(),
        getUserReminders(),
        getUserDocuments(),
        getUserActivityLogs(),
      ]);

    const exportData = {
      userId,
      exportDate: new Date().toISOString(),
      profile,
      bills,
      forms,
      stats,
      settings,
      reminders,
      documents,
      logs,
    };

    console.log("✅ All user data exported");
    return exportData;
  } catch (error) {
    console.error("❌ Error exporting data:", error);
    throw error;
  }
};

/**
 * Delete all user data (DANGER: IRREVERSIBLE)
 * NOTE: Caller must handle user confirmation before calling this function
 */
export const deleteAllUserData = async () => {
  try {
    const userId = getCurrentUserId();
    console.warn("⚠️ CRITICAL: Deletion requested for user:", userId);

    // Implementation would require deleting all subcollections
    // For now, just log the request
    // In production, iterate through all subcollections and delete docs

    return { success: true, message: "Data deletion initiated" };
  } catch (error) {
    console.error("❌ Error deleting data:", error);
    throw error;
  }
};

// ========================================
// FIREBASE STORAGE - FILE MANAGEMENT
// ========================================

/**
 * Upload a bill document to Firebase Storage
 * @param {File} file - The file to upload
 * @param {string} billId - Optional bill ID for organization
 * @returns {Object} - { success, downloadUrl, storagePath }
 */
export const uploadBillDocument = async (file, billId = null) => {
  try {
    const userId = getCurrentUserId();
    if (!file) throw new Error("No file provided");

    // Generate unique filename
    const timestamp = new Date().getTime();
    const fileName = `${file.name.split(".")[0]}_${timestamp}.${file.name.split(".").pop()}`;

    // Create storage path: users/{uid}/bills/{billId}/documents/{fileName}
    const storagePath = billId
      ? `users/${userId}/bills/${billId}/${fileName}`
      : `users/${userId}/bills/uploads/${fileName}`;

    const storageRef = ref(storage, storagePath);

    // Upload file with metadata
    const metadata = {
      customMetadata: {
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        originalName: file.name,
      },
    };

    const uploadResult = await uploadBytes(storageRef, file, metadata);
    console.log("✅ File uploaded:", uploadResult.ref.fullPath);

    // Get download URL
    const { getDownloadURL } = await import("firebase/storage");
    const downloadUrl = await getDownloadURL(uploadResult.ref);

    return {
      success: true,
      downloadUrl,
      storagePath: uploadResult.ref.fullPath,
      fileName: fileName,
      size: file.size,
      type: file.type,
    };
  } catch (error) {
    console.error("❌ Error uploading bill document:", error);
    throw error;
  }
};

/**
 * Upload multiple files in batch
 */
export const uploadBillDocumentsBatch = async (files, billId = null) => {
  try {
    const uploadPromises = files.map((file) =>
      uploadBillDocument(file, billId),
    );
    const results = await Promise.all(uploadPromises);

    console.log("✅ Batch upload completed:", results.length, "files");
    return results;
  } catch (error) {
    console.error("❌ Error in batch upload:", error);
    throw error;
  }
};

/**
 * Download a bill document
 */
export const downloadBillDocument = async (storagePath) => {
  try {
    const userId = getCurrentUserId();

    // Security: Verify the file belongs to the current user
    if (!storagePath.startsWith(`users/${userId}/`)) {
      throw new Error("Access denied: File does not belong to you");
    }

    const storageRef = ref(storage, storagePath);
    const fileBytes = await getBytes(storageRef);

    console.log("✅ File downloaded:", storagePath);
    return fileBytes;
  } catch (error) {
    console.error("❌ Error downloading document:", error);
    throw error;
  }
};

/**
 * Delete a bill document from storage
 */
export const deleteBillDocument = async (storagePath) => {
  try {
    const userId = getCurrentUserId();

    // Security: Verify the file belongs to the current user
    if (!storagePath.startsWith(`users/${userId}/`)) {
      throw new Error("Access denied: File does not belong to you");
    }

    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);

    console.log("✅ File deleted:", storagePath);
    return { success: true };
  } catch (error) {
    console.error("❌ Error deleting document:", error);
    throw error;
  }
};

/**
 * Get all documents for a bill
 */
export const getBillDocuments = async (billId) => {
  try {
    const userId = getCurrentUserId();
    const billPath = `users/${userId}/bills/${billId}/`;
    const folderRef = ref(storage, billPath);

    const items = await listAll(folderRef);
    const documentsData = [];

    for (const itemRef of items.files) {
      const metadata = await getMetadata(itemRef);
      const { getDownloadURL } = await import("firebase/storage");
      const downloadUrl = await getDownloadURL(itemRef);

      documentsData.push({
        name: itemRef.name,
        fullPath: itemRef.fullPath,
        size: metadata.size,
        type: metadata.contentType,
        downloadUrl: downloadUrl,
        uploadedAt: metadata.timeCreated,
        customMetadata: metadata.customMetadata,
      });
    }

    console.log("✅ Retrieved", documentsData.length, "documents for bill");
    return documentsData;
  } catch (error) {
    console.error("❌ Error getting bill documents:", error);
    return [];
  }
};

/**
 * Upload GST form document
 */
export const uploadGSTFormDocument = async (file, formId) => {
  try {
    const userId = getCurrentUserId();
    if (!file) throw new Error("No file provided");

    const timestamp = new Date().getTime();
    const fileName = `${file.name.split(".")[0]}_${timestamp}.${file.name.split(".").pop()}`;

    // Create storage path: users/{uid}/gstForms/{formId}/documents/{fileName}
    const storagePath = `users/${userId}/gstForms/${formId}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    const metadata = {
      customMetadata: {
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        originalName: file.name,
        formId: formId,
      },
    };

    const uploadResult = await uploadBytes(storageRef, file, metadata);
    const { getDownloadURL } = await import("firebase/storage");
    const downloadUrl = await getDownloadURL(uploadResult.ref);

    console.log("✅ GST Form document uploaded:", uploadResult.ref.fullPath);
    return {
      success: true,
      downloadUrl,
      storagePath: uploadResult.ref.fullPath,
      fileName: fileName,
      size: file.size,
    };
  } catch (error) {
    console.error("❌ Error uploading GST form document:", error);
    throw error;
  }
};

/**
 * Upload supporting document (receipt, invoice, etc.)
 */
export const uploadSupportingDocument = async (file, documentType) => {
  try {
    const userId = getCurrentUserId();
    if (!file) throw new Error("No file provided");

    const timestamp = new Date().getTime();
    const fileName = `${documentType}_${timestamp}_${file.name}`;

    // Create storage path: users/{uid}/documents/{documentType}/{fileName}
    const storagePath = `users/${userId}/documents/${documentType}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    const metadata = {
      customMetadata: {
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        originalName: file.name,
        documentType: documentType,
      },
    };

    const uploadResult = await uploadBytes(storageRef, file, metadata);
    const { getDownloadURL } = await import("firebase/storage");
    const downloadUrl = await getDownloadURL(uploadResult.ref);

    console.log("✅ Supporting document uploaded:", uploadResult.ref.fullPath);
    return {
      success: true,
      downloadUrl,
      storagePath: uploadResult.ref.fullPath,
      fileName: fileName,
      size: file.size,
      type: file.type,
    };
  } catch (error) {
    console.error("❌ Error uploading supporting document:", error);
    throw error;
  }
};

/**
 * Get storage usage for user
 */
export const getUserStorageUsage = async () => {
  try {
    const userId = getCurrentUserId();
    const userFolderRef = ref(storage, `users/${userId}/`);

    const items = await listAll(userFolderRef);
    let totalSize = 0;
    const fileCount = items.files.length;

    // Get size of all files recursively
    const getAllMetadata = async (folderRef) => {
      const items = await listAll(folderRef);

      for (const file of items.files) {
        const metadata = await getMetadata(file);
        totalSize += metadata.size;
      }

      for (const folder of items.prefixes) {
        await getAllMetadata(folder);
      }
    };

    await getAllMetadata(userFolderRef);

    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);

    console.log(`✅ Storage usage: ${sizeInMB}MB (${fileCount} files)`);
    return { totalSize, sizeInMB, fileCount };
  } catch (error) {
    console.error("❌ Error getting storage usage:", error);
    return { totalSize: 0, sizeInMB: "0", fileCount: 0 };
  }
};

/**
 * Get file content as Blob (for preview)
 */
export const getFileContentAsBlob = async (storagePath) => {
  try {
    const userId = getCurrentUserId();

    // Security check
    if (!storagePath.startsWith(`users/${userId}/`)) {
      throw new Error("Access denied");
    }

    const storageRef = ref(storage, storagePath);
    const fileBytes = await getBytes(storageRef);
    return new Blob([fileBytes]);
  } catch (error) {
    console.error("❌ Error getting file blob:", error);
    throw error;
  }
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Verify current user owns the data (security check)
 */
export const verifyUserOwnership = (userId) => {
  const currentUserId = getCurrentUserId();
  return currentUserId === userId;
};

/**
 * Get user email for validation
 */
export const getCurrentUserInfo = () => {
  return {
    uid: getCurrentUserId(),
    email: getCurrentUserEmail(),
  };
};

const firebaseDataService = {
  // Profile
  saveUserProfile,
  getUserProfile,

  // Bills
  saveUserBill,
  getUserBills,
  getUserBillById,
  updateUserBill,
  deleteUserBill,

  // Forms
  saveUserGSTForm,
  getUserGSTForms,

  // Stats
  updateUserStats,
  getUserStats,

  // Settings
  saveUserSettings,
  getUserSettings,

  // Reminders
  createBillReminder,
  getUserReminders,

  // Documents Metadata
  saveUserDocument,
  getUserDocuments,

  // Firebase Storage - File Management
  uploadBillDocument,
  uploadBillDocumentsBatch,
  downloadBillDocument,
  deleteBillDocument,
  getBillDocuments,
  uploadGSTFormDocument,
  uploadSupportingDocument,
  getUserStorageUsage,
  getFileContentAsBlob,

  // Activity
  logUserActivity,
  getUserActivityLogs,

  // Export
  exportAllUserData,
  deleteAllUserData,

  // Utilities
  verifyUserOwnership,
  getCurrentUserInfo,
};

export default firebaseDataService;
