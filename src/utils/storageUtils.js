/**
 * Centralized storage utility for consistent data persistence
 * Ensures all components use the same storage keys
 */

const STORAGE_KEYS = {
  BILLS: 'gstbuddy_bills', // Base key for bills (will be appended with user ID)
  THEME: 'theme',
  LANGUAGE: 'language',
  USER: 'user',
  USER_TOKEN: 'userToken',
};

/**
 * Get the storage key for bills based on user ID
 * @param {string} userId - User ID (from auth)
 * @returns {string} Storage key for bills
 */
export const getBillsStorageKey = (userId) => {
  if (!userId) {
    console.warn('⚠️ getBillsStorageKey called without userId');
    return STORAGE_KEYS.BILLS;
  }
  return `${STORAGE_KEYS.BILLS}_${userId}`;
};

/**
 * Save bills to localStorage
 * @param {Array} bills - Array of bill objects
 * @param {string} userId - User ID
 */
export const saveBills = (bills, userId) => {
  try {
    const key = getBillsStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(bills));
    console.log(`✅ Bills saved to localStorage (${bills.length} bills) with key: ${key}`);
    return true;
  } catch (error) {
    console.error('❌ Error saving bills to localStorage:', error);
    return false;
  }
};

/**
 * Get bills from localStorage
 * @param {string} userId - User ID
 * @returns {Array} Array of bills or empty array if not found
 */
export const getBills = (userId) => {
  try {
    const key = getBillsStorageKey(userId);
    const bills = JSON.parse(localStorage.getItem(key) || '[]');
    console.log(`✅ Bills retrieved from localStorage (${bills.length} bills) with key: ${key}`);
    return bills;
  } catch (error) {
    console.error('❌ Error retrieving bills from localStorage:', error);
    return [];
  }
};

/**
 * Add a new bill
 * @param {Object} bill - Bill object to add
 * @param {string} userId - User ID
 */
export const addBill = (bill, userId) => {
  try {
    const bills = getBills(userId);
    const newBill = {
      id: bill.id || Date.now(),
      ...bill,
      uploadedAt: bill.uploadedAt || new Date().toISOString(),
      filed: bill.filed || false,
      userId: userId,
    };
    bills.push(newBill);
    saveBills(bills, userId);
    console.log(`✅ New bill added:`, newBill);
    return newBill;
  } catch (error) {
    console.error('❌ Error adding bill:', error);
    return null;
  }
};

/**
 * Update a bill
 * @param {string} billId - Bill ID to update
 * @param {Object} updates - Updates to apply
 * @param {string} userId - User ID
 */
export const updateBill = (billId, updates, userId) => {
  try {
    const bills = getBills(userId);
    const index = bills.findIndex(b => b.id === billId);
    if (index === -1) {
      console.warn(`⚠️ Bill with ID ${billId} not found`);
      return null;
    }
    bills[index] = { ...bills[index], ...updates };
    saveBills(bills, userId);
    console.log(`✅ Bill updated:`, bills[index]);
    return bills[index];
  } catch (error) {
    console.error('❌ Error updating bill:', error);
    return null;
  }
};

/**
 * Delete a bill
 * @param {string} billId - Bill ID to delete
 * @param {string} userId - User ID
 */
export const deleteBill = (billId, userId) => {
  try {
    const bills = getBills(userId);
    const filtered = bills.filter(b => b.id !== billId);
    saveBills(filtered, userId);
    console.log(`✅ Bill deleted (ID: ${billId})`);
    return true;
  } catch (error) {
    console.error('❌ Error deleting bill:', error);
    return false;
  }
};

/**
 * Clear all bills for a user
 * @param {string} userId - User ID
 */
export const clearBills = (userId) => {
  try {
    const key = getBillsStorageKey(userId);
    localStorage.removeItem(key);
    console.log(`✅ All bills cleared for user: ${userId}`);
    return true;
  } catch (error) {
    console.error('❌ Error clearing bills:', error);
    return false;
  }
};

/**
 * Migrate old 'bills' key to new format with user ID
 * Call this once during app initialization
 * @param {string} userId - Current user ID
 */
export const migrateOldBillsKey = (userId) => {
  try {
    const oldKey = STORAGE_KEYS.BILLS;
    const newKey = getBillsStorageKey(userId);
    
    // Check if old key exists and new key doesn't
    const oldBills = localStorage.getItem(oldKey);
    const newBills = localStorage.getItem(newKey);
    
    if (oldBills && !newBills) {
      localStorage.setItem(newKey, oldBills);
      localStorage.removeItem(oldKey);
      console.log(`✅ Migrated bills from old key "${oldKey}" to new key "${newKey}"`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error migrating bills:', error);
    return false;
  }
};


const storageUtilsExport = {
  STORAGE_KEYS,
  getBillsStorageKey,
  saveBills,
  getBills,
  addBill,
  updateBill,
  deleteBill,
  clearBills,
  migrateOldBillsKey,
};

export default storageUtilsExport;
