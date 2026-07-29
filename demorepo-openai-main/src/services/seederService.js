import { collection, getDocs, doc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

const SEED_BILLS = [
  {
    invoiceNumber: 'INV-2026-001',
    invoiceDate: '2026-05-12T10:00:00.000Z',
    supplierName: 'Apex Distributors Ltd',
    gstin: '29ABCDE1234F2Z5',
    amount: 120000,
    taxPercent: 18,
    taxAmount: 21600,
    totalAmount: 141600,
    taxBreakdown: { cgst: 10800, sgst: 10800, igst: 0 },
    expenseType: 'Raw Material',
    category: 'Inventory',
    gstrDeadline: '2026-06-11',
    gstrForm: 'GSTR-1',
    filed: true,
    filedDate: '2026-06-08T15:30:00.000Z',
    status: 'approved',
    notes: 'Bulk purchase of standard inventory components for Karnataka warehouse.',
    extractionConfidence: 'high',
    businessId: 'apex_retailers'
  },
  {
    invoiceNumber: 'INV-2026-002',
    invoiceDate: '2026-06-04T11:20:00.000Z',
    supplierName: 'Reliance Energy Systems',
    gstin: '27XYZAB5678C1Z0',
    amount: 35000,
    taxPercent: 12,
    taxAmount: 4200,
    totalAmount: 39200,
    taxBreakdown: { cgst: 2100, sgst: 2100, igst: 0 },
    expenseType: 'Utilities',
    category: 'Electricity',
    gstrDeadline: '2026-07-11',
    gstrForm: 'GSTR-3B',
    filed: true,
    filedDate: '2026-07-05T09:15:00.000Z',
    status: 'approved',
    notes: 'Commercial power connection charges for Maharashtra office.',
    extractionConfidence: 'high',
    businessId: 'nexgen_solutions'
  },
  {
    invoiceNumber: 'INV-2026-003',
    invoiceDate: '2026-06-18T14:45:00.000Z',
    supplierName: 'BSNL Telecommunications',
    gstin: '07AAACP1234A1Z9',
    amount: 8500,
    taxPercent: 18,
    taxAmount: 1530,
    totalAmount: 10030,
    taxBreakdown: { cgst: 0, sgst: 0, igst: 1530 },
    expenseType: 'Utilities',
    category: 'Telecommunications',
    gstrDeadline: '2026-07-11',
    gstrForm: 'GSTR-1',
    filed: true,
    filedDate: '2026-07-09T16:20:00.000Z',
    status: 'approved',
    notes: 'Quarterly dedicated fiber internet line subscription.',
    extractionConfidence: 'high',
    businessId: 'phoenix_logistics'
  },
  {
    invoiceNumber: 'INV-2026-004',
    invoiceDate: '2026-07-02T10:10:00.000Z',
    supplierName: 'Global Software Consulting',
    gstin: '29ABCDE1234F2Z5',
    amount: 80000,
    taxPercent: 18,
    taxAmount: 14400,
    totalAmount: 94400,
    taxBreakdown: { cgst: 7200, sgst: 7200, igst: 0 },
    expenseType: 'Services',
    category: 'Software Licenses',
    gstrDeadline: '2026-08-11',
    gstrForm: 'GSTR-1',
    filed: false,
    filedDate: null,
    status: 'pending',
    notes: 'AI compliance model integrations and licensing renewal fees.',
    extractionConfidence: 'high',
    businessId: 'apex_retailers'
  },
  {
    invoiceNumber: 'INV-2026-005',
    invoiceDate: '2026-07-08T15:00:00.000Z',
    supplierName: 'Blue Dart Logistics Pvt Ltd',
    gstin: '07AAACP1234A1Z9',
    amount: 45000,
    taxPercent: 18,
    taxAmount: 8100,
    totalAmount: 53100,
    taxBreakdown: { cgst: 0, sgst: 0, igst: 8100 },
    expenseType: 'Raw Material',
    category: 'Logistics & Shipping',
    gstrDeadline: '2026-08-11',
    gstrForm: 'GSTR-1',
    filed: false,
    filedDate: null,
    status: 'pending',
    notes: 'Freight shipping charges for interstate item transfers.',
    extractionConfidence: 'high',
    businessId: 'phoenix_logistics'
  },
  {
    invoiceNumber: 'INV-2026-006',
    invoiceDate: '2026-07-15T09:30:00.000Z',
    supplierName: 'Office Depot Systems',
    gstin: '27XYZAB5678C1Z0',
    amount: 15000,
    taxPercent: 12,
    taxAmount: 1800,
    totalAmount: 16800,
    taxBreakdown: { cgst: 900, sgst: 900, igst: 0 },
    expenseType: 'Office Supplies',
    category: 'Printers & Stationary',
    gstrDeadline: '2026-08-11',
    gstrForm: 'GSTR-3B',
    filed: false,
    filedDate: null,
    status: 'pending',
    notes: 'Bulk purchase of high-quality printing paper, folders, and printer toners.',
    extractionConfidence: 'medium',
    businessId: 'nexgen_solutions'
  },
  {
    invoiceNumber: 'INV-2026-007',
    invoiceDate: '2026-07-22T13:00:00.000Z',
    supplierName: 'TATA Power Grid',
    gstin: '27XYZAB5678C1Z0',
    amount: 22000,
    taxPercent: 18,
    taxAmount: 3960,
    totalAmount: 25960,
    taxBreakdown: { cgst: 1980, sgst: 1980, igst: 0 },
    expenseType: 'Utilities',
    category: 'Electricity',
    gstrDeadline: '2026-08-11',
    gstrForm: 'GSTR-3B',
    filed: false,
    filedDate: null,
    status: 'pending',
    notes: 'Power grid maintenance fees and electricity units invoice.',
    extractionConfidence: 'high',
    businessId: 'nexgen_solutions'
  },
  {
    invoiceNumber: 'INV-2026-008',
    invoiceDate: '2026-07-25T16:15:00.000Z',
    supplierName: 'Vertex Legal Partners',
    gstin: '29ABCDE1234F2Z5',
    amount: 95000,
    taxPercent: 18,
    taxAmount: 17100,
    totalAmount: 112100,
    taxBreakdown: { cgst: 8550, sgst: 8550, igst: 0 },
    expenseType: 'Services',
    category: 'Legal Consultation',
    gstrDeadline: '2026-08-11',
    gstrForm: 'GSTR-1',
    filed: false,
    filedDate: null,
    status: 'pending',
    notes: 'Consultation fees for filing representations against outstanding GST notices.',
    extractionConfidence: 'high',
    businessId: 'apex_retailers'
  }
];

/**
 * Check if the user has bills in Firestore, if not, seeds them.
 * @param {string} userId - Auth user ID
 */
export const seedUserInvoicesIfEmpty = async (userId) => {
  if (!userId) return;
  try {
    const billsRef = collection(db, 'users', userId, 'bills');
    const snap = await getDocs(billsRef);
    
    if (snap.empty) {
      console.log(`🌱 Seeding Firestore invoices for user ${userId}...`);
      
      for (const bill of SEED_BILLS) {
        await addDoc(billsRef, {
          ...bill,
          userId: userId,
          uploadedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      console.log(`✅ Seeded ${SEED_BILLS.length} invoices successfully!`);
      // Dispatch custom event to tell UI pages to reload
      window.dispatchEvent(new Event('billUpdated'));
    } else {
      console.log(`ℹ️ Bills collection is not empty (${snap.size} invoices). Seeding skipped.`);
    }
  } catch (err) {
    console.error('❌ Error during invoice seeding:', err);
  }
};

/**
 * Force clear all invoices and seed again (for database management reset button)
 * @param {string} userId - Auth user ID
 */
export const clearAndReseedInvoices = async (userId) => {
  if (!userId) return;
  try {
    const billsRef = collection(db, 'users', userId, 'bills');
    const snap = await getDocs(billsRef);
    
    console.log(`🗑️ Clearing ${snap.size} invoices and resetting seed for user ${userId}...`);
    const deletePromises = snap.docs.map(docSnap => deleteDoc(doc(db, 'users', userId, 'bills', docSnap.id)));
    await Promise.all(deletePromises);
    
    // Seed again
    await seedUserInvoicesIfEmpty(userId);
  } catch (err) {
    console.error('❌ Reset seeder failed:', err);
  }
};
