# Firestore Database Schema for Bill Reminders

## Collection Structure

```
Firestore Database
│
├── users/ (Collection)
│   │
│   └── {userId} (Document)
│       │
│       ├── email: "user@example.com"
│       ├── name: "John Doe"
│       ├── createdAt: Timestamp
│       │
│       └── bills/ (Subcollection)
│           │
│           ├── {billId1} (Document)
│           ├── {billId2} (Document)
│           └── {billId3} (Document)
│
└── system/ (Collection)
    │
    └── reminderJobLog (Document) - Job execution logs
```

## User Document Structure

**Path**: `users/{userId}`

```javascript
{
  // Authentication
  uid: "user123abc",

  // Contact Information
  email: "user@example.com",
  name: "John Doe",
  phone: "+91-9876543210",

  // Preferences
  preferredLanguage: "en",
  timezone: "Asia/Kolkata",
  reminderPreferences: {
    emailReminders: true,
    smsReminders: false,
    pushNotifications: true,
    reminderDays: [3, 1, 0], // Remind on day 3, 1, and 0 (due date)
  },

  // Account
  gstin: "29ABCDE1234F2Z5",
  businessType: "retail",

  // Timestamps
  createdAt: Timestamp (server time),
  updatedAt: Timestamp (server time),
  lastLogin: Timestamp,
}
```

## Bill Document Structure

**Path**: `users/{userId}/bills/{billId}`

**Minimal Required Fields** (for reminders to work):

```javascript
{
  dueDate: "2026-02-15",      // ISO format: YYYY-MM-DD (REQUIRED)
  email: "user@example.com",   // User email (REQUIRED)
  amount: 1200,
  supplierName: "BSNL",
  invoiceNumber: "INV-001",
}
```

**Complete Bill Document**:

```javascript
{
  // Basic Information
  billId: "bill-2026-001",
  invoiceNumber: "INV-001",
  billType: "electricity",  // electricity, water, internet, gst, etc.
  supplierName: "BSNL Telecom",

  // Amount & Tax
  amount: 1200.00,
  currency: "INR",
  taxAmount: 216.00,
  taxRate: 18,  // GST rate if applicable
  totalAmount: 1416.00,

  // Dates
  billDate: "2026-01-15",
  dueDate: "2026-02-15",  // CRITICAL: Used for reminder logic
  createdAt: Timestamp (server),

  // Bill Details
  description: "Monthly internet bill",
  billDetails: {
    period: "January 2026",
    meterNumber: "12345678",
    unitsUsed: 450,
    unitRate: 2.50,
  },

  // Contact Information
  email: "user@example.com",  // CRITICAL: Where to send reminder
  phone: "+91-9876543210",

  // Reminder Status
  reminderSent: false,
  reminderSentDate: null,
  lastReminderDaysLeft: null,
  urgencyReminderSent: false,
  urgencyReminderDate: null,

  // Payment Status
  paid: false,
  paidDate: null,
  paidAmount: null,
  paymentMethod: null,

  // Additional Info
  category: "utilities",
  recurring: true,
  recurringFrequency: "monthly",
  notes: "Auto-pay mode enabled",

  // Metadata
  reminders: [
    {
      daysBeforeDue: 3,
      sent: false,
      sentDate: null,
      messageId: null,
    },
    {
      daysBeforeDue: 1,
      sent: false,
      sentDate: null,
      messageId: null,
    },
  ],

  // System Fields
  updatedAt: Timestamp,
  status: "pending",  // pending, paid, overdue, cancelled
  archived: false,
}
```

## Example: Create a Bill via React

```javascript
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../config/firebase";

async function addBill(billData) {
  const user = auth.currentUser;

  const billRef = await addDoc(collection(db, "users", user.uid, "bills"), {
    // Minimal required fields
    dueDate: "2026-02-15",
    email: user.email,

    // Your bill data
    invoiceNumber: billData.invoiceNumber,
    supplierName: billData.supplierName,
    amount: billData.amount,
    billDate: new Date().toISOString().split("T")[0],

    // Reminder tracking
    reminderSent: false,
    urgencyReminderSent: false,

    // Status
    paid: false,

    // Metadata
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: "pending",
  });

  console.log("Bill created:", billRef.id);
  return billRef.id;
}

// Usage
await addBill({
  invoiceNumber: "INV-2026-001",
  supplierName: "BSNL",
  amount: 1200,
});
```

## Query Examples

### Get bills due soon

```javascript
import { query, where, orderBy, limit } from "firebase/firestore";

async function getBillsDueSoon(userId) {
  const today = new Date().toISOString().split("T")[0];
  const threeDaysAhead = new Date();
  threeDaysAhead.setDate(threeDaysAhead.getDate() + 3);
  const threeDaysStr = threeDaysAhead.toISOString().split("T")[0];

  const billsQuery = query(
    collection(db, "users", userId, "bills"),
    where("dueDate", ">=", today),
    where("dueDate", "<=", threeDaysStr),
    where("paid", "==", false),
    orderBy("dueDate", "asc"),
  );

  const snapshot = await getDocs(billsQuery);
  return snapshot.docs.map((doc) => doc.data());
}
```

### Get overdue bills

```javascript
async function getOverdueBills(userId) {
  const today = new Date().toISOString().split("T")[0];

  const billsQuery = query(
    collection(db, "users", userId, "bills"),
    where("dueDate", "<", today),
    where("paid", "==", false),
    orderBy("dueDate", "desc"),
  );

  const snapshot = await getDocs(billsQuery);
  return snapshot.docs.map((doc) => doc.data());
}
```

### Get bills to remind about

```javascript
async function getBillsToRemind() {
  const db = admin.firestore();
  const usersQuery = await db.collection("users").get();

  for (const userDoc of usersQuery.docs) {
    const userId = userDoc.id;
    const billsQuery = await db
      .collection("users")
      .doc(userId)
      .collection("bills")
      .where("dueDate", ">", new Date().toISOString().split("T")[0])
      .where("reminderSent", "==", false)
      .where("paid", "==", false)
      .get();

    billsQuery.forEach((billDoc) => {
      console.log("Remind about:", billDoc.data().supplierName);
    });
  }
}
```

## Data Validation Rules

**Firestore Security Rules** (firebase.rules):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;

      // Bills subcollection
      match /bills/{billId} {
        allow read, write: if request.auth.uid == userId;

        // Validate required fields
        allow create: if
          request.resource.data.dueDate is string &&
          request.resource.data.email is string;
      }
    }

    // System logs (admin only)
    match /system/{document=**} {
      allow read, write: if request.auth.token.admin == true;
    }
  }
}
```

## Indexes Required

For better query performance, create these indexes:

1. **Bills by Due Date**
   - Collection: `bills`
   - Fields: `dueDate` (Ascending), `paid` (Ascending)
   - Query scope: `Collection`

2. **Bills by Status**
   - Collection: `bills`
   - Fields: `status` (Ascending), `dueDate` (Ascending)

3. **Pending Reminders**
   - Collection: `bills`
   - Fields: `reminderSent` (Ascending), `dueDate` (Ascending)

Firestore will prompt you to create indexes when you run these queries.

## Sample Data for Testing

```javascript
// Test bill 1: Due in 3 days
{
  invoiceNumber: "TEST-001",
  supplierName: "Test Supplier",
  amount: 1000,
  dueDate: "2026-02-12",  // 3 days from today (2026-02-09)
  email: "test@example.com",
  reminderSent: false,
  paid: false,
  createdAt: serverTimestamp(),
}

// Test bill 2: Due today
{
  invoiceNumber: "TEST-002",
  supplierName: "Urgent Bill Co",
  amount: 2000,
  dueDate: "2026-02-09",  // Today
  email: "test@example.com",
  reminderSent: false,
  paid: false,
  createdAt: serverTimestamp(),
}

// Test bill 3: Already reminded
{
  invoiceNumber: "TEST-003",
  supplierName: "Already Sent Co",
  amount: 500,
  dueDate: "2026-02-11",
  email: "test@example.com",
  reminderSent: true,
  reminderSentDate: serverTimestamp(),
  paid: false,
  createdAt: serverTimestamp(),
}
```

## Migration from CSV/Excel

Convert existing bills to Firestore:

```javascript
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

async function importBillsFromCSV(csvData, userId) {
  const billsRef = collection(db, "users", userId, "bills");

  for (const row of csvData) {
    await addDoc(billsRef, {
      invoiceNumber: row.invoice_no,
      supplierName: row.supplier,
      amount: parseFloat(row.amount),
      dueDate: row.due_date, // Expected format: YYYY-MM-DD
      email: row.email || auth.currentUser.email,
      billDate: row.bill_date,
      description: row.description,

      reminderSent: false,
      urgencyReminderSent: false,
      paid: row.paid === "yes",

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: "pending",
    });
  }
}
```

## Backup & Export

Export bills for backup:

```javascript
async function exportUserBills(userId) {
  const billsRef = collection(db, "users", userId, "bills");
  const snapshot = await getDocs(billsRef);

  const bills = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Convert to JSON
  const json = JSON.stringify(bills, null, 2);

  // Download
  const element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(json),
  );
  element.setAttribute(
    "download",
    `bills-backup-${new Date().toISOString()}.json`,
  );
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
```

## Performance Tips

1. **Use specific queries** - Always filter instead of getting all data
2. **Paginate results** - Use `.limit()` and `.startAfter()` for large datasets
3. **Create indexes** - For frequently queried fields
4. **Archive old bills** - Move paid/completed bills to archive subcollection
5. **Cache data locally** - Use Redux or Context for app state

## Monitoring

Check collection size and document count in Firebase Console:

- Firestore → Collection Stats → Bills collection
- Monitor: Read/write operations
- Alert if: Cost exceeds threshold

Cost estimate:

- 1 read = $0.06 per 100k reads
- 1 write = $0.18 per 100k writes
- Typical: ~few dollars/month
