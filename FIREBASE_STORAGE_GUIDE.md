# Firebase Storage Integration Guide

## Overview

Firebase Storage is a powerful, simple, and cost-effective object storage solution that complements Firestore. Together, they provide complete data management:

- **Firestore (Database)** → Stores structured data (bills, forms, reminders, etc.) - **TEXT DATA**
- **Firebase Storage (Files)** → Stores actual files (documents, PDFs, images) - **BINARY DATA**

## Architecture

```
Firebase Backend
├── Firestore (Database)
│   └── users/{uid}/
│       ├── bills/
│       │   └── {billId}  ← Metadata: amount, date, GSTIN
│       ├── gstForms/
│       │   └── {formId}  ← Metadata: status, period
│       └── documents/
│           └── {docId}   ← Metadata: name, type, storagePath (reference)
│
└── Storage (Files)
    └── users/{uid}/
        ├── bills/{billId}/
        │   └── invoice.pdf    ← Actual PDF file
        ├── gstForms/{formId}/
        │   └── form.pdf       ← Actual GST form file
        └── documents/
            └── receipt.png    ← Actual receipt image
```

## What Gets Stored Where?

### ✅ Firestore (Metadata)

```javascript
{
  invoiceNumber: "INV-001",
  amount: 1000,
  taxAmount: 180,
  gstrDeadline: "2026-02-13",
  storagePath: "users/uid123/bills/bill001/invoice.pdf",  // Reference
  downloadUrl: "https://firebaseurl...",                   // Reference
  uploadedAt: Timestamp
}
```

### ✅ Firebase Storage (Actual Files)

```
users/uid123/bills/bill001/
  ├── invoice_1707400800000.pdf
  ├── receipt_1707400801000.png
  └── quote_1707400802000.pdf
```

## Data Flow

### When User Uploads a Bill:

```
User selects file
    ↓
File uploaded to Firebase Storage
    ↓
Storage returns: downloadUrl, storagePath, fileName, size
    ↓
Firestore Metadata saved with references to file
    ↓
User can download/view file anytime
```

## Complete Implementation

### 1. Upload Bill with Document

```javascript
// In BillUpload.jsx
import {
  saveUserBill,
  uploadBillDocument,
  logUserActivity,
} from "../services/firebaseDataService";

const handleConfirm = async (extractedData, file) => {
  try {
    // Step 1: Save bill metadata to Firestore
    const billResult = await saveUserBill({
      invoiceNumber: extractedData.invoiceNumber,
      invoiceDate: extractedData.invoiceDate,
      amount: extractedData.amount,
      taxAmount: extractedData.taxAmount,
      gstrDeadline: extractedData.gstrDeadline,
    });

    const billId = billResult.billId;

    // Step 2: Upload actual file to Firebase Storage
    const fileResult = await uploadBillDocument(file, billId);

    // Step 3: Update bill metadata with file reference
    await updateUserBill(billId, {
      storagePath: fileResult.storagePath,
      downloadUrl: fileResult.downloadUrl,
      fileName: fileResult.fileName,
      fileSize: fileResult.size,
      fileType: fileResult.type,
    });

    // Step 4: Log activity
    await logUserActivity({
      action: "upload_bill",
      details: {
        billId,
        fileName: fileResult.fileName,
        fileSize: fileResult.size,
      },
    });

    showNotification("✅ Bill uploaded successfully!", "success");
  } catch (error) {
    showNotification("❌ Upload failed: " + error.message, "error");
  }
};
```

### 2. Download Bill Document

```javascript
import { downloadBillDocument } from "../services/firebaseDataService";

const handleDownloadBill = async (storagePath, fileName) => {
  try {
    const fileBlob = await downloadBillDocument(storagePath);

    // Create download link
    const url = URL.createObjectURL(fileBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Download failed:", error);
  }
};
```

### 3. Get All Documents for a Bill

```javascript
import { getBillDocuments } from "../services/firebaseDataService";

const handleViewBillDocuments = async (billId) => {
  try {
    const documents = await getBillDocuments(billId);

    // documents is an array of:
    // {
    //   name: "invoice_1707400800000.pdf",
    //   fullPath: "users/uid123/bills/bill001/invoice_1707400800000.pdf",
    //   size: 1048576,
    //   type: "application/pdf",
    //   downloadUrl: "https://firebaseurl...",
    //   uploadedAt: "2026-02-08T10:30:00Z"
    // }

    setDocuments(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
  }
};
```

### 4. Delete Bill Document

```javascript
import { deleteBillDocument } from "../services/firebaseDataService";

const handleDeleteDocument = async (storagePath) => {
  try {
    const result = await deleteBillDocument(storagePath);
    if (result.success) {
      showNotification("✅ Document deleted", "success");
    }
  } catch (error) {
    showNotification("❌ Delete failed: " + error.message, "error");
  }
};
```

### 5. Upload Multiple Files (Batch)

```javascript
import { uploadBillDocumentsBatch } from "../services/firebaseDataService";

const handleUploadMultiple = async (files, billId) => {
  try {
    const results = await uploadBillDocumentsBatch(files, billId);
    console.log(`✅ Uploaded ${results.length} files`);

    // Show download links to user
    results.forEach((result) => {
      console.log(result.downloadUrl);
    });
  } catch (error) {
    console.error("Batch upload failed:", error);
  }
};
```

### 6. Get User Storage Usage

```javascript
import { getUserStorageUsage } from "../services/firebaseDataService";

const handleCheckStorageUsage = async () => {
  try {
    const usage = await getUserStorageUsage();

    console.log(`Total Size: ${usage.sizeInMB}MB`);
    console.log(`File Count: ${usage.fileCount}`);
    console.log(`Total Bytes: ${usage.totalSize}`);

    // Show in UI
    setStorageInfo(
      `Using ${usage.sizeInMB}MB of storage (${usage.fileCount} files)`,
    );
  } catch (error) {
    console.error("Error getting storage usage:", error);
  }
};
```

## Firebase Storage Security Rules

Add these rules to your Firebase Console (`Storage` → `Rules`):

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can only upload/download/delete their own files
    match /users/{userId}/{allPaths=**} {
      allow read, write, delete: if request.auth.uid == userId;
    }

    // Deny all other access
    match /{allPaths=**} {
      allow read, write, delete: if false;
    }
  }
}
```

## File Storage Paths

```
Storage Structure:
users/
├── {uid}/
│   ├── bills/
│   │   ├── {billId}/
│   │   │   ├── invoice.pdf
│   │   │   ├── receipt.png
│   │   │   └── quote.pdf
│   │   ├── uploads/
│   │   │   └── bill_1707400800000.pdf
│   │
│   ├── gstForms/
│   │   ├── {formId}/
│   │   │   ├── gstr1.pdf
│   │   │   └── attachment.docx
│   │
│   ├── documents/
│   │   ├── invoices/
│   │   │   └── invoice_1707400800000.pdf
│   │   ├── receipts/
│   │   │   └── receipt_1707400800000.png
│   │   └── others/
│   │       └── doc_1707400800000.pdf
```

## API Reference

### Bill Documents

| Function                                  | Purpose                 | Parameters      | Returns                                                          |
| ----------------------------------------- | ----------------------- | --------------- | ---------------------------------------------------------------- |
| `uploadBillDocument(file, billId)`        | Upload single bill file | file, billId    | { success, downloadUrl, storagePath, fileName, size, type }      |
| `uploadBillDocumentsBatch(files, billId)` | Upload multiple files   | files[], billId | Array of results                                                 |
| `downloadBillDocument(storagePath)`       | Download file bytes     | storagePath     | File bytes                                                       |
| `deleteBillDocument(storagePath)`         | Delete file             | storagePath     | { success: true }                                                |
| `getBillDocuments(billId)`                | List all files for bill | billId          | Array of { name, fullPath, size, type, downloadUrl, uploadedAt } |

### GST Form Documents

| Function                              | Purpose                  |
| ------------------------------------- | ------------------------ |
| `uploadGSTFormDocument(file, formId)` | Upload GST form document |

### Supporting Documents

| Function                                       | Purpose                       |
| ---------------------------------------------- | ----------------------------- |
| `uploadSupportingDocument(file, documentType)` | Upload receipt, invoice, etc. |

### Storage Management

| Function                            | Purpose                            |
| ----------------------------------- | ---------------------------------- |
| `getUserStorageUsage()`             | Get total storage used, file count |
| `getFileContentAsBlob(storagePath)` | Get file as Blob (for preview)     |

## Security Features

✅ **User Isolation**

- Every file stored under `users/{userId}/path`
- Security rules verify `request.auth.uid == userId`
- Users cannot access other users' files

✅ **Verification Before Download**

- `downloadBillDocument()` checks if file path starts with user's ID
- Returns "Access denied" if user tries to access another user's file

✅ **Activity Logging**

- Every upload logged in `activityLogs` collection
- Tracks action, file size, upload time

✅ **Metadata Tracking**

- Each file stores custom metadata (uploadedBy, uploadedAt, originalName)
- Enables audit trail and compliance

## Common Use Cases

### 1. Bill Upload with OCR

```javascript
// Extract text from bill
const extractedData = await extractTextWithOCR(file);

// Save bill metadata
const billResult = await saveUserBill(extractedData);

// Save actual file
const fileResult = await uploadBillDocument(file, billResult.billId);

// Link file to bill metadata
await updateUserBill(billResult.billId, {
  storagePath: fileResult.storagePath,
  downloadUrl: fileResult.downloadUrl,
});
```

### 2. GST Form Upload

```javascript
// Save form metadata
const formResult = await saveUserGSTForm({
  formType: "GSTR-1",
  period: "01-2026",
  status: "draft",
});

// Upload form document
const fileResult = await uploadGSTFormDocument(file, formResult.formId);

// Store file reference
await updateUserGSTForm(formResult.formId, {
  storagePath: fileResult.storagePath,
  downloadUrl: fileResult.downloadUrl,
});
```

### 3. Supporting Documents

```javascript
// Upload receipt
const result = await uploadSupportingDocument(
  receiptFile,
  "receipts", // documentType
);

// Save metadata
await saveUserDocument({
  fileName: result.fileName,
  fileType: "receipt",
  storagePath: result.storagePath,
  downloadUrl: result.downloadUrl,
});
```

## Best Practices

1. **Always Upload Before Saving Metadata**
   - Upload file first, get storagePath
   - Then save metadata with storagePath reference
2. **Use Try-Catch for Error Handling**
   - Network can fail during upload
   - Handle errors gracefully
3. **Show Progress to User**
   - Large files may take time
   - Display upload progress bar
4. **Validate File Size**
   - Set max file size limits (10MB recommended)
   - Check before uploading
5. **Clean Up Old Files**
   - Delete files from Storage when deleting bill
   - Both Storage file AND Firestore metadata
6. **Use Download URLs for Sharing**
   - Store downloadUrl in Firestore
   - Users can download without re-uploading
   - Download URLs expire after 1 week if not used

## Pricing

Firebase Storage is **very affordable**:

- **$0.018 per GB** stored per month
- **$0.05 per GB** downloaded per month
- **$1.00 per 1M PUT/PATCH calls**
- **$0.04 per 1M GET calls**

Example: 1000 bills (1MB each) = 1GB = **$0.018/month** + download costs

## Summary

| Component             | Purpose                           | Storage Type |
| --------------------- | --------------------------------- | ------------ |
| **Bill Metadata**     | Invoice #, amount, date, deadline | Firestore    |
| **Bill File**         | Actual PDF/image of bill          | Storage      |
| **GST Metadata**      | Form type, status, period         | Firestore    |
| **GST Document**      | Actual PDF form                   | Storage      |
| **User Documents**    | Receipts, quotes, etc.            | Storage      |
| **Document Metadata** | File name, type, reference        | Firestore    |

✅ **All user data is isolated and secure**
✅ **100% user-specific - one user cannot access another's files**
✅ **Complete audit trail with activity logs**
✅ **Production-ready implementation**
