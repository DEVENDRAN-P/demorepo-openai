import { db } from "../config/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";

/**
 * Save a bill to Firebase
 * @param {string} userId - User ID
 * @param {object} billData - Bill data to save
 * @returns {Promise} Promise that resolves with the document ID
 */
export const saveBillToFirebase = async (userId, billData) => {
  try {
    if (!userId) {
      throw new Error("User ID is required to save bills");
    }

    const billsRef = collection(db, "users", userId, "bills");
    const docRef = await addDoc(billsRef, {
      ...billData,
      userId: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log("✅ Bill saved to Firebase:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ Error saving bill to Firebase:", error);
    throw error;
  }
};

/**
 * Get all bills for a user from Firebase
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of bills
 */
export const getBillsFromFirebase = async (userId) => {
  try {
    if (!userId) {
      console.warn("⚠️ User ID is required to fetch bills");
      return [];
    }

    const billsRef = collection(db, "users", userId, "bills");
    const querySnapshot = await getDocs(billsRef);

    const bills = [];
    querySnapshot.forEach((doc) => {
      bills.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    console.log(`✅ Fetched ${bills.length} bills from Firebase`);
    return bills;
  } catch (error) {
    console.error("❌ Error fetching bills from Firebase:", error);
    return [];
  }
};

/**
 * Delete a bill from Firebase
 * @param {string} userId - User ID
 * @param {string} billId - Bill ID to delete
 * @returns {Promise} Promise that resolves when deletion is complete
 */
export const deleteBillFromFirebase = async (userId, billId) => {
  try {
    if (!userId || !billId) {
      throw new Error("User ID and Bill ID are required to delete a bill");
    }

    await deleteDoc(doc(db, "users", userId, "bills", billId));
    console.log("✅ Bill deleted from Firebase:", billId);
  } catch (error) {
    console.error("❌ Error deleting bill from Firebase:", error);
    throw error;
  }
};

/**
 * Update a bill in Firebase
 * @param {string} userId - User ID
 * @param {string} billId - Bill ID to update
 * @param {object} updates - Fields to update
 * @returns {Promise} Promise that resolves when update is complete
 */
export const updateBillInFirebase = async (userId, billId, updates) => {
  try {
    if (!userId || !billId) {
      throw new Error("User ID and Bill ID are required to update a bill");
    }

    const billRef = doc(db, "users", userId, "bills", billId);
    await updateDoc(billRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });

    console.log("✅ Bill updated in Firebase:", billId);
  } catch (error) {
    console.error("❌ Error updating bill in Firebase:", error);
    throw error;
  }
};

/**
 * Get bills due soon (within the next N days)
 * @param {string} userId - User ID
 * @param {number} daysFromNow - Number of days to look ahead (default: 7)
 * @returns {Promise<Array>} Array of bills due soon
 */
export const getBillsDueSoon = async (userId, daysFromNow = 7) => {
  try {
    const bills = await getBillsFromFirebase(userId);
    const now = new Date();
    const futureDate = new Date(
      now.getTime() + daysFromNow * 24 * 60 * 60 * 1000,
    );

    const duesSoon = bills.filter((bill) => {
      if (!bill.gstrDeadline) return false;
      const deadline = new Date(bill.gstrDeadline);
      return deadline >= now && deadline <= futureDate;
    });

    console.log(
      `✅ Found ${duesSoon.length} bills due in the next ${daysFromNow} days`,
    );
    return duesSoon;
  } catch (error) {
    console.error("❌ Error fetching bills due soon:", error);
    return [];
  }
};
