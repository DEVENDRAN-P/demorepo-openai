/**
 * Retrieves the list of businesses/workspaces for a given authenticated user.
 * Guarantees data isolation by checking local storage isolated by uid, and automatically
 * falls back to pre-seeded demo data ONLY for designated demo/admin accounts.
 *
 * @param {object} user - The user object from AuthContext
 * @returns {Array} List of business entities
 */
export const getUserBusinesses = (user) => {
  if (!user || !user.uid) return [];

  const demoEmails = ['demo@shop.com', 'devendranprabhakar2007@gmail.com'];
  if (demoEmails.includes(user.email)) {
    return [
      { id: 'apex_retailers', name: 'Apex Retailers', gstin: '29ABCDE1234F2Z5', state: 'Karnataka', type: 'Retail & Distribution', owner: 'Devendra Prabhakar', complianceScore: 94, compliance: 94, status: 'Ready' },
      { id: 'nexgen_solutions', name: 'NexGen Software Solutions', gstin: '27XYZAB5678C1Z0', state: 'Maharashtra', type: 'IT Services & Consulting', owner: 'Devendra Prabhakar', complianceScore: 88, compliance: 88, status: 'Auditing' },
      { id: 'phoenix_logistics', name: 'Phoenix Logistics', gstin: '07AAACP1234A1Z9', state: 'Delhi', type: 'Transport & Warehouse', owner: 'Staff Member', complianceScore: 76, compliance: 76, status: 'Filed' }
    ];
  }

  const storageKey = `saas_businesses_${user.uid}`;
  const saved = localStorage.getItem(storageKey);
  
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing isolated businesses:', e);
    }
  }

  // If no saved workspaces exist, initialize with user's primary registration profile
  const primaryWorkspace = {
    id: user.uid,
    name: user.shopName || user.businessName || 'My Business',
    gstin: user.gstin || '',
    state: 'Karnataka',
    type: 'Retail & Distribution',
    owner: user.name || 'Owner',
    complianceScore: 100,
    compliance: 100,
    status: 'Ready'
  };

  const initialList = [primaryWorkspace];
  localStorage.setItem(storageKey, JSON.stringify(initialList));
  return initialList;
};

/**
 * Saves a new business list for a given user to their isolated namespace.
 * 
 * @param {string} uid - User ID
 * @param {Array} businessList - The updated array of businesses
 */
export const saveUserBusinesses = (uid, businessList) => {
  if (!uid) return;
  const storageKey = `saas_businesses_${uid}`;
  localStorage.setItem(storageKey, JSON.stringify(businessList));
};
