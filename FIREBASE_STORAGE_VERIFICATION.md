# Firebase Data Storage Verification Guide

## ✅ Good News: Your Firebase is Configured!

Your `.env` file has all required Firebase credentials:

```
✅ REACT_APP_FIREBASE_API_KEY
✅ REACT_APP_FIREBASE_AUTH_DOMAIN
✅ REACT_APP_FIREBASE_PROJECT_ID
✅ REACT_APP_FIREBASE_STORAGE_BUCKET
✅ All other required credentials
```

**Firebase Project:** `finalopenai-fc9c5`

---

## How to Verify Data is Being Stored

### Step 1: Check Firestore Database

1. Go to **Firebase Console**: https://console.firebase.google.com/
2. Select project: **`finalopenai-fc9c5`**
3. Go to **Firestore Database** (left sidebar)
4. Look for collection structure:
   ```
   users/
   ├── {uid}/
   │   ├── [profile data]
   │   ├── bills/ [bills metadata]
   │   ├── gstForms/ [form metadata]
   │   └── settings/
   ```

### Step 2: Check Firebase Storage

1. In Firebase Console
2. Go to **Storage** (left sidebar)
3. Look for files in:
   ```
   users/
   └── {uid}/
       ├── bills/{billId}/
       │   └── [PDF/image files here]
       ├── gstForms/{formId}/
       │   └── [form files here]
       └── documents/
           └── [supporting docs here]
   ```

### Step 3: Monitor Real-Time Data Flow

Open your browser **Developer Console** while uploading:

1. **Press F12** to open Developer Tools
2. Open **Console** tab
3. Upload a bill and watch for these messages:

```
✅ Bill saved to Firebase with ID: bill_001
✅ File uploaded to Storage: users/{uid}/bills/bill_001/invoice_1707400800000.pdf
✅ Bill updated with file reference
✅ Activity logged
```

### Step 4: Check Local Browser Storage

Open Developer Tools → **Application** tab:

1. **Local Storage** → Look for `bills_{userId}`
   - Should contain array of bills (offline copy)

2. **IndexedDB** → Check Firebase storage cache
   - Stores synced data

---

## What Should Be Stored Where?

### ✅ Firestore (Database)

When you upload a bill, you should see in `users/{uid}/bills/{billId}`:

```json
{
  "invoiceNumber": "INV-001",
  "amount": 1000,
  "taxAmount": 180,
  "gstrDeadline": "2026-02-13",
  "storagePath": "users/{uid}/bills/bill001/invoice.pdf",
  "downloadUrl": "https://firebasestorage...",
  "fileSize": 1048576,
  "fileType": "application/pdf",
  "uploadedAt": Timestamp,
  "status": "pending"
}
```

**Check by:**

1. Firebase Console → Firestore → collection: `users` → document: `{your_uid}` → collection: `bills`
2. You should see your bills here

### ✅ Firebase Storage (Files)

When you upload a bill, file should appear at:

```
users/{uid}/bills/{billId}/
└── invoice_1707400800000.pdf  (the actual file)
```

**Check by:**

1. Firebase Console → Storage
2. Navigate to `users/{your_uid}/bills/`
3. You should see `.pdf` or image files here

### ✅ Browser Local Storage (Offline)

For offline support, bills are also saved locally:

```
localStorage.bills_{userId} = [
  { invoiceNumber: "INV-001", amount: 1000, ... }
]
```

**Check by:**

1. Open DevTools → Application
2. Left sidebar → Local Storage
3. Look for key: `bills_{your_userId}`

---

## Step-by-Step Testing

### Test 1: Upload a Bill

1. Login to GST Buddy
2. Go to **Bill Upload** page
3. Select a sample PDF/image file
4. Wait for extraction to complete
5. Review extracted data
6. Click **Confirm**

### Test 2: Check Console Output

While uploading:

```
✅ File uploaded: users/{uid}/bills/{billId}/filename.pdf
✅ Bill saved to Firebase with ID: {billId}
✅ Bill updated with file reference
✅ Activity logged
```

### Test 3: Verify in Firebase Console

1. Open Firebase Console
2. **Firestore Database** → Navigate to `users/{uid}/bills/`
3. Should see document with billId
4. Document should contain fields:
   - ✅ invoiceNumber
   - ✅ amount
   - ✅ storagePath
   - ✅ downloadUrl
   - ✅ fileSize

### Test 4: Verify File in Storage

1. Firebase Console → **Storage**
2. Navigate to: `users/{uid}/bills/{billId}/`
3. Should see your PDF/image file listed
4. File should have size matching original

### Test 5: Download and Preview

1. Go back to Bill Upload or Bills list
2. Click **Download** button for a bill
3. File should download
4. File should be readable (open it to verify)

---

## Troubleshooting: If Data is NOT Storing

### Problem 1: Firestore Shows Empty (No `users` collection)

**Possible causes:**

- User not logged in
- `getCurrentUserId()` returning undefined
- Firestore write failed

**Solution:**

```javascript
// Check console for this error:
"User not authenticated. Cannot access user data."

// If you see it, ensure:
1. User is logged in (check Firebase Auth)
2. Auth state is persisted
3. Try logging in again
```

### Problem 2: Storage Shows Empty (No `users` folder)

**Possible causes:**

- File upload failed silently
- Storage rules blocking upload
- Browser blocking (check DevTools → Application → Service Workers)

**Solution:**

```javascript
// Check console for this error:
"Error uploading bill document: [error details]"

// If you see it:
1. Check file size (max 100MB)
2. Check internet connection
3. Check Storage rules deployed
```

### Problem 3: File Exists But No `downloadUrl`

**Possible causes:**

- File uploaded but Firestore metadata not updated
- Timestamp mismatch

**Solution:**

```javascript
// Should see:
✅ File uploaded to Storage
✅ Bill updated with file reference

// If only first message appears:
- Check Firebase permissions
- Check `updateUserBill()` function
```

### Problem 4: See Errors in Console

**Common errors:**

| Error                                 | Cause                                | Fix                                              |
| ------------------------------------- | ------------------------------------ | ------------------------------------------------ |
| "Missing or insufficient permissions" | Firestore/Storage rules not deployed | `firebase deploy --only firestore:rules,storage` |
| "User not authenticated"              | User not logged in                   | Login first                                      |
| "Reference is not valid"              | File path issue                      | Check storagePath format                         |
| "403 Forbidden"                       | Firebase rules blocking              | Update storage.rules                             |

---

## Debugging Commands

### Open Chrome DevTools Console and Run:

**Check if user is logged in:**

```javascript
import { auth } from "./src/config/firebase";
console.log(auth.currentUser);
// Should show: { uid: "...", email: "...", ... }
// If null: User not logged in
```

**Check Firebase configuration:**

```javascript
import { db, storage } from "./src/config/firebase";
console.log("Firestore:", db);
console.log("Storage:", storage);
// Should show initialized Firebase instances
```

**Check if functions are available:**

```javascript
import {
  saveUserBill,
  uploadBillDocument,
} from "./src/services/firebaseDataService";
console.log("saveUserBill:", saveUserBill);
console.log("uploadBillDocument:", uploadBillDocument);
// Should show as functions
```

---

## Real-Time Monitoring Dashboard

To monitor data flow in real-time:

1. **Open 2 windows side-by-side:**
   - Left: Your GST Buddy app
   - Right: Firebase Console

2. **Monitor these locations:**
   - Firestore: `users/{uid}/bills/`
   - Storage: `users/{uid}/bills/`
   - Browser Console: Watch for ✅ messages

3. **Upload a bill in left window**

4. **Refresh right window (Firebase Console)**

5. **You should see:**
   - New document in Firestore
   - New file in Storage
   - Total files/storage increased

---

## Expected Data Flow Timeline

```
T+0:   User clicks "Upload"
T+1:   File validated (Console: "File validated")
T+2:   OCR extraction starts (Progress: 0-50%)
T+3:   AI extraction (Progress: 50-85%)
T+4:   User confirms data
T+5:   Save to Local Storage (Console: "Bill saved locally")
T+6:   Save metadata to Firestore (Console: "✅ Bill saved to Firebase")
T+7:   Upload file to Storage (Console: "✅ File uploaded")
T+8:   Update Firestore with file ref (Console: "✅ Bill updated with file reference")
T+9:   Log activity (Console: "✅ Activity logged")
T+10:  Create reminders
T+11:  Redirect to GST Forms
```

---

## Verification Checklist

### ✅ Pre-Upload Checks

- [ ] User is logged in (see name in Navbar)
- [ ] Firebase Console shows project: `finalopenai-fc9c5`
- [ ] Developer Console shows no errors
- [ ] .env file has all Firebase credentials

### ✅ During Upload

- [ ] See extraction progress (OCR → AI)
- [ ] Review extracted data
- [ ] Confirm data
- [ ] Watch console for ✅ messages

### ✅ Post-Upload Checks

**In Firestore:**

- [ ] Collection `users` exists
- [ ] Document with your `uid` exists
- [ ] Subcollection `bills` exists
- [ ] Document with `billId` exists
- [ ] Fields: invoiceNumber, amount, storagePath, etc.

**In Storage:**

- [ ] Folder: `users/{uid}/bills/{billId}/` exists
- [ ] File: `invoice_*.pdf` (or .png, .jpg) exists
- [ ] File size matches original

**In Local Storage:**

- [ ] Key: `bills_{uid}` exists
- [ ] Contains bill object with same data

### ✅ Functionality Tests

- [ ] Download bill (should work)
- [ ] See file in Firebase Console
- [ ] See metadata in Firestore
- [ ] Check storage usage increased

---

## If Everything is Stored Correctly

You should see:

### 1. In Firestore Console:

```
finalopenai-fc9c5 / Firestore Database
└── users/
    └── {your_uid}/
        ├── profile { name, email, gstin, ... }
        ├── bills/
        │   └── bill_001 { invoiceNumber, amount, storagePath, ... }
        └── ...
```

### 2. In Storage Console:

```
gs://finalopenai-fc9c5.appspot.com/
└── users/
    └── {your_uid}/
        └── bills/
            └── bill_001/
                └── invoice_1707400800000.pdf (1.2 MB)
```

### 3. In Browser DevTools:

```
Console messages:
✅ Bill saved to Firebase with ID: bill_001
✅ File uploaded to Storage: users/{uid}/bills/bill_001/invoice.pdf
✅ Bill updated with file reference
✅ Activity logged

Local Storage:
bills_{uid} = [{ invoiceNumber: "INV-001", amount: 1000, ... }]
```

---

## Next: Verify It's All Working

1. **Start the app:**

   ```bash
   npm start
   ```

2. **Login with a test account**

3. **Upload a test bill**

4. **Open Firefox/Chrome DevTools (F12)**

5. **Watch the console during upload**

6. **Check Firebase Console immediately after**

7. **Verify data appears in both places**

**If you see data in both Firestore and Storage = ✅ Everything is working!**

---

## Support

If data is NOT appearing:

1. **Check console errors** - Share the error message
2. **Check Firebase rules** - Ensure rules deployed
3. **Check network tab** - See if requests succeeded
4. **Check file size** - Max 100MB
5. **Check authentication** - Ensure user logged in

Your Firebase credentials are correct and properly configured! The code is ready to store data. Just upload a bill and verify it appears in Firebase Console.
