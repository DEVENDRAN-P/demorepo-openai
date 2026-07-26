# ✅ Scheduled Bill Reminders - Deployment Checklist

**Estimated Time**: 1 hour (including testing)  
**Difficulty**: Easy  
**Prerequisites**: Firebase account, Node.js, VS Code

---

## 📋 Phase 1: Preparation (5 minutes)

### SendGrid Setup

- [ ] Go to https://sendgrid.com
- [ ] Create free account or login
- [ ] Navigate to: **Settings → API Keys**
- [ ] Click **"Create API Key"**
- [ ] Name it: `GSTBuddy Bill Reminders`
- [ ] Select permission: **Mail Send**
- [ ] Click **Create & Copy**
- [ ] **SAVE THE KEY**: `SG.xxxxxxxxxxxxxxxxxxxxx` (starts with SG.)

### Firebase Project Check

- [ ] Open Firebase Console (console.firebase.google.com)
- [ ] Select your project: `openaiacademy` (or your project)
- [ ] Verify you have **Firestore enabled**
- [ ] Go to: **Build → Functions** - Check cloud region

---

## 📋 Phase 2: Install Dependencies (3 minutes)

### Firebase CLI

```bash
# Check if already installed
firebase --version

# If not, install:
npm install -g firebase-tools

# Verify
firebase --version    # Should be 12.0.0 or higher
```

### Node Modules in Functions

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Should see:
# - firebase-admin@12.0.0
# - firebase-functions@5.0.0
# - nodemailer@6.9.0
# - nodemailer-sendgrid-transport@0.2.0

cd ..
```

---

## 📋 Phase 3: Firebase Authentication (2 minutes)

### Login to Firebase

```bash
firebase login
# Opens browser → Click "Allow"
# Returns to terminal: "✓ Logged in as your@email.com"
```

### Select Project

```bash
firebase use --add
# Shows: Pick a project (or press 'c' to create new)
# Select your project number
# Alias: gstbuddy (or your project name)
```

---

## 📋 Phase 4: Configuration (2 minutes)

### Set SendGrid API Key

```bash
firebase functions:config:set sendgrid.api_key="SG.xxxxxxxxxxxxxxxxxxxxx"
# Replace xxxxx with your actual SendGrid key
# Result: ✓ Config stored successfully
```

### Set Email From Address

```bash
firebase functions:config:set email.from="noreply@gstbuddy.ai"
# You can change this to any email
# Result: ✓ Config stored successfully
```

### Verify Configuration

```bash
firebase functions:config:get
# Output should show:
# {
#   "sendgrid": {
#     "api_key": "SG.xxxxxxxxxxxxxxxxxxxxx"
#   },
#   "email": {
#     "from": "noreply@gstbuddy.ai"
#   }
# }
```

---

## 📋 Phase 5: Deploy Functions (5 minutes)

### Deploy to Firebase

```bash
firebase deploy --only functions

# Expected output:
# ✓ functions: Initialized empty repository.
# ✓ functions: Uploading functions code...
# ✓ functions[scheduledBillReminder(us-central1)]: Successful
# ✓ functions[sendReminderEmail(us-central1)]: Successful
# ✓ functions[sendManualReminder(us-central1)]: Successful
# ✓ functions[triggerBillReminders(us-central1)]: Successful
```

### Check Deployment in Console

```bash
firebase functions:list
# Output should show all 4 functions deployed
```

---

## 📋 Phase 6: Create Test Data (3 minutes)

### Add Test Bill to Firestore

Go to **Firebase Console → Firestore → Data**

1. Navigate to: `users` → your UID → `bills`
2. Click **"Add Document"**
3. Set Document ID: `test-bill-001`
4. Add fields (click **"Add field"**):

```
dueDate (string):      2026-02-15
email (string):        your-email@gmail.com
invoiceNumber (string): INV-TEST-001
supplierName (string):  BSNL Test
amount (number):       1200
paid (boolean):        false
reminderSent (boolean): false
status (string):       pending
createdAt (timestamp): [current time]
```

5. Click **"Save"**

---

## 📋 Phase 7: Test Function Locally (5 minutes)

### Start Emulator

```bash
firebase emulators:start --only functions

# Expected:
# ✓ Emulator started at http://127.0.0.1:5000
# ✓ View Emulator UI at http://127.0.0.1:4000
```

### Test in New Terminal (keep emulator running)

```bash
# In a new PowerShell window, navigate to project root

# Test the manual reminder function
curl -X POST "http://127.0.0.1:5000/gstbuddy-app/us-central1/sendManualReminder" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_UID",
    "billId": "test-bill-001"
  }'

# Should show: {"message": "Reminder email sent..."}
```

### Stop Emulator

```bash
# Press Ctrl+C in emulator terminal
```

---

## 📋 Phase 8: Deploy for Real (5 minutes)

### Deploy to Production

```bash
firebase deploy --only functions

# Wait for completion (should show ✓ for all functions)
```

### Verify Deployment

```bash
firebase functions:log
# Should show recent function executions
```

---

## 📋 Phase 9: Production Test (10 minutes)

### Get Your Function URL

```bash
firebase functions:describe sendManualReminder
# Look for: httpsTrigger.url
# Example: https://us-central1-yourproject.cloudfunctions.net/sendManualReminder
```

### Manually Trigger Reminder

```bash
# Option 1: Via cURL (PowerShell)
$URL = "https://us-central1-yourproject.cloudfunctions.net/sendManualReminder"
$Body = @{
  userId = "YOUR_UID"
  billId = "test-bill-001"
} | ConvertTo-Json

Invoke-WebRequest -Uri $URL -Method POST -Body $Body -ContentType "application/json"

# Option 2: Via React (in Chrome console)
const functions = firebase.functions();
const sendReminder = firebase.functions().httpsCallable('sendManualReminder');
sendReminder({ userId: "YOUR_UID", billId: "test-bill-001" })
  .then(result => console.log(result.data))
  .catch(error => console.log(error.message));
```

### Check Email

- [ ] Open your email (the one in test bill)
- [ ] Wait 30-60 seconds
- [ ] Check Inbox + Spam folder
- [ ] Should see: "📌 REMINDER: BSNL Test Due 2026-02-15"

### Check Firestore Update

```bash
# In Firebase Console:
# Navigate to: users → your UID → bills → test-bill-001
# Should see: reminderSent = true
# Should see: reminderSentDate = [current timestamp]
```

### View Logs

```bash
firebase functions:log

# Should show entries like:
# 2026-02-12 15:45:23.123  Function execution started
# 2026-02-12 15:45:24.456  Email sent to your-email@gmail.com
# 2026-02-12 15:45:25.789  ✓ Reminder recorded in Firestore
```

---

## 📋 Phase 10: Production Verification (5 minutes)

### Confirm Scheduled Job

The scheduled job runs **every day at 9 AM IST** (3:30 AM UTC)

To verify it's configured:

```bash
firebase functions:describe scheduledBillReminder

# Should show:
# eventTrigger:
#   eventType: google.pubsub.topic.publish
#   resource: projects/_/topics/firebase-schedule-scheduledBillReminder
#   failurePolicy: null
```

### Set Up Monitoring (Optional)

1. Go to Firebase Console
2. **Build → Functions → Monitoring**
3. Select **scheduledBillReminder**
4. Set up alerts for errors

---

## 📋 Phase 11: Add to React App (10 minutes)

### Add Bill Creation with Reminder

In your **BillUpload.jsx** or bill form:

```javascript
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../hooks/useAuth";
import { db } from "../config/firebase";

export function BillUpload() {
  const { user } = useAuth();

  async function handleUpload(billData) {
    // Always include dueDate and email for reminders
    await addDoc(collection(db, "users", user.uid, "bills"), {
      dueDate: billData.dueDate, // REQUIRED for reminders
      email: user.email, // REQUIRED for reminders
      invoiceNumber: billData.invoiceNumber,
      supplierName: billData.supplierName,
      amount: billData.amount,
      paid: false,
      reminderSent: false, // Will be updated by Cloud Function
      createdAt: serverTimestamp(),
      status: "pending",
    });
  }
}
```

### Add Manual Reminder Button

In **BillDetails.jsx** or bill list:

```javascript
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "../hooks/useAuth";

export function BillDetailsPage({ billId }) {
  const { user } = useAuth();
  const functions = getFunctions();

  async function handleSendReminder() {
    try {
      const sendReminder = httpsCallable(functions, "sendManualReminder");
      const result = await sendReminder({
        userId: user.uid,
        billId: billId,
      });
      alert("✅ Reminder sent! " + result.data.message);
    } catch (error) {
      alert("❌ Error: " + error.message);
    }
  }

  return (
    <button onClick={handleSendReminder} className="btn btn-primary">
      📧 Send Reminder Now
    </button>
  );
}
```

---

## 📋 Phase 12: Daily Monitoring (Ongoing)

### Daily Check (Takes 1 minute)

```bash
# Every morning, check if function ran:
firebase functions:log --follow

# Should see entries like:
# [timestamp] ✓ scheduledBillReminder started
# [timestamp] Processing 156 bills for 42 users
# [timestamp] Sent 12 reminder emails
# [timestamp] ✓ Job completed successfully
```

### Weekly Review

- [ ] Check Firebase Console → Billing for costs (should be $0)
- [ ] Review error logs for any failures
- [ ] Test with new bills to verify reminders arrive
- [ ] Check email delivery rate (all emails arriving?)

### Monthly Tasks

- [ ] Check SendGrid dashboard for delivery stats
- [ ] Review Firestore storage usage
- [ ] Update email templates if needed
- [ ] Rotate SendGrid API key (once per 90 days)

---

## 🎯 Success Criteria

- [x] Cloud Functions deployed without errors
- [ ] SendGrid API key configured
- [ ] Test bill created in Firestore
- [ ] Manual reminder sent and email received
- [ ] Email arrived in inbox (not spam)
- [ ] `reminderSent` flag updated to `true`
- [ ] Scheduled job configured for 9 AM IST
- [ ] Firebase logs show no errors
- [ ] React app can create bills with due dates

---

## ❌ Troubleshooting

| Issue                        | Fix                                                       |
| ---------------------------- | --------------------------------------------------------- |
| Function deploy fails        | `firebase login` again, check Node version                |
| Email not arriving           | Check SendGrid API key in `firebase functions:config:get` |
| Function times out           | Check Firestore query, add indexes                        |
| "Permission denied"          | Update Firestore rules to allow write access              |
| Function not running at 9 AM | Check timezone: `echo $TZ` should be `Asia/Kolkata`       |

**Need more help?** See `CLOUD_FUNCTIONS_SETUP.md` troubleshooting section.

---

## 🎉 Completion Checklist

- [ ] **Phase 1**: SendGrid API key copied
- [ ] **Phase 2**: Firebase CLI & npm modules installed
- [ ] **Phase 3**: Logged in to Firebase, project selected
- [ ] **Phase 4**: Config set (API key & email)
- [ ] **Phase 5**: Functions deployed
- [ ] **Phase 6**: Test bill created
- [ ] **Phase 7**: Local test successful
- [ ] **Phase 8**: Production deployed
- [ ] **Phase 9**: Email received from production
- [ ] **Phase 10**: Scheduled job verified
- [ ] **Phase 11**: React integration added
- [ ] **Phase 12**: Monitoring set up

**When all boxes ✓**: Your scheduled bill reminder system is LIVE! 🚀

---

**Estimated Total Time**: 1 hour  
**Next Step**: Start with **Phase 1** (SendGrid setup)!
