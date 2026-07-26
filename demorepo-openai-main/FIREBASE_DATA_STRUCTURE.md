# Firebase Data Structure & User Data Isolation

## Overview

Complete data isolation per user using Firebase Authentication UID + Firestore subcollections.

## Data Structure

```
firestore/
└── users/
    ├── {uid}/
    │   ├── profile/                    (User profile document)
    │   ├── bills/                      (Collection: uploaded invoices)
    │   ├── gstForms/                   (Collection: GSTR-1, GSTR-3B, etc)
    │   ├── reports/                    (Collection: generated reports)
    │   ├── reminders/                  (Collection: bill reminders)
    │   ├── settings/                   (Collection: user preferences)
    │   ├── stats/                      (Collection: analytics)
    │   ├── documents/                  (Collection: supporting docs)
    │   └── activityLogs/               (Collection: audit trail)
```

## Field Details by Collection

### 1. User Profile (`users/{uid}`)

```
{
  uid: string,                     // Firebase UID (from auth)
  email: string,                   // User's email (from auth)
  name: string,                    // Full name
  shopName: string,                // Business name
  gstin: string,                   // GST identification number
  phone: string,                   // Contact number
  address: string,                 // Business address
  city: string,                    // City
  state: string,                   // State
  pincode: string,                 // Postal code
  emailVerified: boolean,          // Email verification status
  lastLogin: timestamp,            // Last login time
  createdAt: timestamp,            // Account creation time
  updatedAt: timestamp             // Last update time
}
```

### 2. Bills (`users/{uid}/bills/{billId}`)

```
{
  id: string,                      // Document ID
  invoiceNumber: string,           // Invoice reference number
  invoiceDate: string,             // Date of invoice (YYYY-MM-DD)
  supplierName: string,            // Seller/supplier name
  gstin: string,                   // Supplier's GSTIN

  // Amount Details
  amount: number,                  // Basic amount
  taxPercent: number,              // Tax percentage (5%, 12%, 18%, 28%)
  taxAmount: number,               // Calculated tax
  totalAmount: number,             // Total including tax

  // Tax Breakdown
  taxBreakdown: {
    cgst: number,                  // Central GST
    sgst: number,                  // State GST
    igst: number                   // Integrated GST
  },

  // Classification
  expenseType: string,             // "Travel", "Food", "Others", etc
  category: string,                // Custom category

  // GST Filing Status
  gstrDeadline: string,            // Filing deadline (ISO format)
  gstrForm: string,                // GSTR-1 (most common)
  filed: boolean,                  // Whether filed in GSTR
  filedDate: string,               // When filed (if applicable)

  // Status & Notes
  status: string,                  // "pending", "approved", "rejected", "filed"
  notes: string,                   // Internal notes

  // System Fields
  userId: string,                  // User's UID (for queries)
  extractionConfidence: string,    // "high", "medium", "low"
  uploadedAt: timestamp,           // Upload timestamp
  updatedAt: timestamp             // Last update
}
```

### 3. GST Forms (`users/{uid}/gstForms/{formId}`)

```
{
  formType: string,                // "GSTR-1", "GSTR-3B", "GSTR-9", etc
  period: string,                  // "04-2024" format
  status: string,                  // "draft", "submitted", "accepted", "rejected"

  // Form Data
  data: object,                    // Complete form content

  // Filing Details
  submittedDate: string,           // When submitted to GST portal
  refNumber: string,               // GST portal reference number
  remarks: string,                 // GST official remarks

  // Related Data
  billIds: array,                  // IDs of bills included

  // System Fields
  userId: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 4. Reminders (`users/{uid}/reminders/{reminderId}`)

```
{
  billId: string,                  // Related bill ID
  invoiceNumber: string,           // Invoice number
  invoiceDate: string,             // Invoice date

  // Reminder Details
  reminderType: string,            // "deadline", "upload", "review"
  dueDate: string,                 // When it's due
  status: string,                  // "active", "completed", "snoozed"
  daysBeforeDeadline: number,      // Alert threshold (default: 3)

  // System Fields
  userId: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 5. Settings (`users/{uid}/settings/preferences`)

```
{
  // Notifications
  emailNotifications: boolean,     // Enable email alerts (default: true)
  billReminderDays: number,        // Days before deadline (default: 3)
  deadlineAlerts: boolean,         // Alert on approaching deadlines

  // Display
  theme: string,                   // "light", "dark"
  language: string,                // "en", "hi", "ta", "kn", "ml"
  timezone: string,                // "IST", "UTC", etc

  // GST
  gstinRequired: boolean,          // Require GSTIN entry (default: true)
  autoClassifyExpenses: boolean,   // Auto-categorize expenses

  // System Fields
  updatedAt: timestamp
}
```

### 6. Statistics (`users/{uid}/stats/overview`)

```
{
  totalBillsUploaded: number,      // Count of all bills
  totalGSTAmount: number,          // Sum of all GST collected
  totalCostSavings: number,        // Calculated savings vs accountant
  billsFiledCount: number,         // Bills included in GSTR
  averageProcessingTime: number,   // Days to process average

  // Monthly Breakdown
  monthlyStats: {
    "2024-04": {
      billCount: number,
      totalAmount: number,
      gstAmount: number
    },
    ...
  },

  // System Fields
  lastUpdated: timestamp
}
```

### 7. Documents (`users/{uid}/documents/{docId}`)

```
{
  fileName: string,                // Original file name
  fileType: string,                // "pdf", "jpg", "png", etc
  fileSize: number,                // Size in bytes

  // Storage
  storagePath: string,             // Path in Cloud Storage
  downloadUrl: string,             // Signed download URL

  // Classification
  documentType: string,            // "invoice", "receipt", "gst_form", etc
  relatedBillId: string,           // Associated bill ID

  // System Fields
  userId: string,
  uploadedAt: timestamp,
  expiresAt: string                // When to delete (optional)
}
```

### 8. Activity Logs (`users/{uid}/activityLogs/{logId}`)

```
{
  action: string,                  // "upload_bill", "update_bill", "file_gst", etc
  details: object,                 // Action-specific details
  ipAddress: string,               // User's IP
  userAgent: string,               // Browser info

  // System Fields
  userId: string,
  timestamp: timestamp
}
```

## Security Rules (Firestore)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - each user can only access their own data
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;

      // All subcollections inherit permissions
      match /{document=**} {
        allow read, write: if request.auth.uid == uid;
      }
    }

    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Implementation Flow

### Signup Process

1. Firebase Auth creates user account (UID generated)
2. `saveUserProfile()` creates `users/{uid}` document
3. User settings initialized with defaults
4. User can start uploading bills

### Bill Upload Process

1. User uploads invoice image
2. OCR/AI extracts data
3. User reviews and confirms
4. `saveUserBill()` saves to `users/{uid}/bills/{billId}`
5. `logUserActivity()` records action
6. Dashboard updates via `billUpdated` event
7. GST filing status auto-generates from bills

### Data Fetch Process

1. User opens app → Auth middleware checks `auth.currentUser`
2. Dashboard calls `getUserBills()` → Fetches ONLY from `users/{currentUser.uid}/bills`
3. Each function verifies `getCurrentUserId()` before accessing data
4. No cross-user data leakage possible

## Key Features

### ✅ User Isolation

- All queries filtered to `users/{uid}/` prefix
- `getCurrentUserId()` ensures logged-in user only
- Firestore rules prevent unauthorized access

### ✅ Real-time Updates

- Bills auto-update GST filing status
- Activity logs track all changes
- Stats recalculate on bill upload

### ✅ Offline Support

- Local storage fallback for bills
- Sync when online via `firebaseDataService`
- No data loss

### ✅ Data Export

- `exportAllUserData()` downloads complete user backup
- Includes all collections in JSON
- For GDPR/data portability

### ✅ Audit Trail

- `activityLogs` tracks every action
- Includes timestamp, action type, details
- For compliance & debugging

## Usage Examples

```javascript
// Save a bill (automatically for current user only)
const result = await saveUserBill({
  invoiceNumber: "INV-2024-001",
  invoiceDate: "2024-04-15",
  totalAmount: 10000,
  taxAmount: 1800,
  // ... other fields
});

// Get all user's bills (only their own)
const bills = await getUserBills(); // Returns ONLY current user's bills

// Update user profile
await saveUserProfile({
  name: "John Doe",
  shopName: "Doe Enterprises",
  gstin: "27XXXXX0000X0Z0",
});

// Get user stats
const stats = await getUserStats(); // ONLY current user's stats

// Export all data
const allData = await exportAllUserData(); // ONLY current user's data
```

## Security Checklist

- ✅ Authentication required for all operations
- ✅ User ID verified before every database call
- ✅ Firestore rules prevent subcollection bypass
- ✅ No admin operations in client-side code
- ✅ Activity logged for audit trail
- ✅ Email verified status tracked
- ✅ Data expires (optional) for documents
- ✅ Role-based access (can be extended)

## Future Enhancements

1. **Role-based Access**: Accountant role to access client data
2. **Data Sharing**: Share specific bills with accountants
3. **Batch Operations**: File multiple months at once
4. **Webhooks**: Alert on filing deadlines
5. **Analytics Dashboard**: Spending patterns, tax optimization
6. **Document Storage**: Cloud Storage integration for supporting docs
