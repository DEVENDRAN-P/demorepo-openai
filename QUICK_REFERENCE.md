# 🚀 Deployment Quick Reference

**Print this out or keep in another window while deploying!**

---

## ⚠️ Current Email Setup: Brevo SMTP

The codebase now uses **Brevo SMTP** with Express.js instead of Firebase Functions + SendGrid.

**See [BREVO_EMAIL_SETUP.md](BREVO_EMAIL_SETUP.md) for current setup.**

---

## Email Server Commands (Current)

```powershell
# Start backend email server
cd api
npm install
node server.js
# Server runs on http://localhost:5000/api/sendEmail
```

---

## Legacy: Firebase Functions Deployment (Deprecated)

These commands are no longer needed with the current Brevo SMTP approach:

```powershell
# DEPRECATED - Only use if maintaining legacy code
# The following Firebase Functions commands are no longer needed:

# firebase functions:config:set sendgrid.api_key="SG.xxxxxxxxxxxxxxxxxxxxx"
# firebase deploy --only functions
```

**If you need to use Firebase Functions:**
- See [EMAIL_REMINDERS_SETUP.md](EMAIL_REMINDERS_SETUP.md) for legacy approaches
- Consider migrating to Brevo SMTP for simplicity

---

## Quick Deploy Steps (Brevo)

1. **Get Brevo Credentials**
   ```bash
   # Go to: https://www.brevo.com/
   # Settings → SMTP → Copy SMTP credentials
   ```

2. **Update .env**
   ```bash
   BREVO_API_KEY=your_brevo_smtp_key
   EMAIL_FROM=your_email@domain.com
   ```

3. **Start Email Server**
   ```bash
   cd api
   npm install
   node server.js
   ```

4. **Test Sending**
   ```bash
   curl -X POST http://localhost:5000/api/sendEmail \
     -H "Content-Type: application/json" \
     -d '{
       "subject": "Test", 
       "body": "Test email",
       "email": "test@example.com"
     }'
   ```

## Files You Created

```
functions/
  ├── package.json                    ← Dependencies list
  ├── index.js                        ← Function exports
  ├── scheduledReminders.js           ← Runs daily @ 9 AM IST
  └── emailReminders.js               ← Sends emails

Documentation/
  ├── SCHEDULED_REMINDERS_IMPLEMENTATION.md  ← Overview
  ├── DEPLOYMENT_CHECKLIST.md                ← Full steps
  ├── CLOUD_FUNCTIONS_SETUP.md               ← Detailed guide
  ├── CLOUD_FUNCTIONS_ENV_SETUP.md           ← Config help
  ├── FIRESTORE_BILL_SCHEMA.md               ← Database structure
  └── SCHEDULED_REMINDERS_QUICK_START.md     ← 30-min setup
```

---

## Test Bill Data

Create this in Firebase Console → Firestore:

```
Collection: users → [YOUR_UID] → bills → test-bill-001

Fields:
- dueDate (string): 2026-02-15
- email (string): your-email@gmail.com
- invoiceNumber (string): INV-TEST-001
- supplierName (string): BSNL Test
- amount (number): 1200
- paid (boolean): false
- reminderSent (boolean): false
- status (string): pending
- createdAt (timestamp): now
```

---

## Test Functions

### Local Test (Emulator)

```bash
firebase emulators:start --only functions
# In new terminal:
firebase deploy --only functions:sendManualReminder
```

### Production Test

```bash
# Get function URL
firebase functions:describe sendManualReminder

# Then call via curl or React:
const fn = firebase.functions().httpsCallable('sendManualReminder');
fn({ userId: "YOUR_UID", billId: "test-bill-001" })
  .then(r => console.log(r.data))
  .catch(e => console.log(e));
```

---

## Environment Variables

### Set These

```bash
firebase functions:config:set \
  sendgrid.api_key="SG.xxxxxxxxxxxxxxxxxxxxx" \
  email.from="noreplygstbuddy@gmail.com"
```

### Get SendGrid Key from

https://app.sendgrid.com/settings/api_keys

### Verify Setup

```bash
firebase functions:config:get
```

---

## Daily Monitoring

### Check if Scheduled Job Ran

```bash
firebase functions:log
# Look for: "scheduledBillReminder started"
# Expected time: 9 AM IST (3:30 AM UTC)
```

### Watch in Real-Time

```bash
firebase functions:log --follow
# Ctrl+C to stop
```

### Check Costs

Go to: Firebase Console → Project Settings → Billing

- Expected cost: **$0** (within free tier)

---

## Success Indicators

✅ All 4 functions deployed:

- scheduledBillReminder
- sendReminderEmail
- sendManualReminder
- triggerBillReminders

✅ Test email arrives in inbox

✅ `reminderSent` updates to `true`

✅ Job runs daily at 9 AM (check logs)

✅ Zero errors in Firebase Console

---

## Common Issues

| Problem              | Solution                                                    |
| -------------------- | ----------------------------------------------------------- |
| "Auth Error"         | `firebase login` again                                      |
| "Project not found"  | `firebase use --add` to select                              |
| "Permission denied"  | Check Firestore security rules                              |
| Email not arriving   | Check SendGrid API key with `firebase functions:config:get` |
| Function timeout     | Check database queries, add Firestore indexes               |
| "Cannot find module" | Run `cd functions && npm install && cd ..`                  |

---

## Important Dates/Times

- **Scheduled Job**: Every day at **9:00 AM IST** (3:30 AM UTC)
- **Email Timing**: Immediately after job triggers
- **First Run**: Tomorrow at 9 AM IST (after deployment)

---

## Firebase Console Links

```
Your Project: https://console.firebase.google.com/project/[PROJECT_ID]

Key Pages:
- Functions: ...project/functions
- Firestore: ...project/firestore/data
- Logs: ...project/functions/logs
- Config: ...project/settings/general
- Billing: ...project/billing
```

---

## React Integration Code

### In BillUpload.jsx

```javascript
await addDoc(collection(db, "users", user.uid, "bills"), {
  dueDate: "2026-02-15", // REQUIRED
  email: user.email, // REQUIRED
  invoiceNumber: data.invoice,
  supplierName: data.supplier,
  amount: data.amount,
  paid: false,
  reminderSent: false, // Function will set true
  createdAt: serverTimestamp(),
  status: "pending",
});
```

### In BillDetails.jsx

```javascript
const sendReminder = httpsCallable(functions, "sendManualReminder");
await sendReminder({ userId: user.uid, billId });
```

---

## Support Documents

1. **SCHEDULED_REMINDERS_IMPLEMENTATION.md** (this overview)
2. **DEPLOYMENT_CHECKLIST.md** (step-by-step)
3. **CLOUD_FUNCTIONS_SETUP.md** (complete guide)
4. **CLOUD_FUNCTIONS_ENV_SETUP.md** (config help)
5. **FIRESTORE_BILL_SCHEMA.md** (database structure)
6. **SCHEDULED_REMINDERS_QUICK_START.md** (30-min setup)

---

## Key Reminders

⚠️ **Never hardcode SendGrid key** in code - use `firebase functions:config:set`

⚠️ **Test locally first** before deploying to production

⚠️ **Always include** `dueDate` and `email` in bills for reminders to work

⚠️ **Check logs daily** for the first week after deployment

⚠️ **Monitor costs** - you get $300 free layer, after that: ~$0.05/month

---

**Deployment Time**: 30-45 minutes from start  
**First Email**: Should arrive within 60 seconds of manual test  
**Daily Automatic**: Starts the next day at 9 AM IST

**You're all set!** 🎉
