# Scheduled Bill Reminders - Quick Start Deploy

## 🚀 30-Minute Setup Guide

### Step 1: Get SendGrid API Key (2 min)

```bash
# 1. Go to: https://sendgrid.com
# 2. Sign up (free tier includes 100 emails/day)
# 3. Go to: Settings → API Keys
# 4. Create API Key with "Mail Send" permission
# 5. Copy the key (SG.xxxxx...)
```

### Step 2: Install Firebase CLI (2 min)

```bash
npm install -g firebase-tools
firebase login
firebase use your-project-id  # Select your Firebase project
```

### Step 3: Update functions/package.json (1 min)

Ensure these dependencies are listed:

```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0",
    "nodemailer": "^6.9.0",
    "nodemailer-sendgrid-transport": "^0.2.0"
  }
}
```

### Step 4: Copy Function Files (1 min)

Copy to your `functions/` directory:

- `functions/index.js`
- `functions/scheduledReminders.js`
- `functions/emailReminders.js`

### Step 5: Install Dependencies (2 min)

```bash
cd functions
npm install
cd ..
```

### Step 6: Set Configuration (2 min)

```bash
# Set SendGrid API Key
firebase functions:config:set sendgrid.api_key="SG.your_key_here"

# Set email from address
firebase functions:config:set email.from="noreplygstbuddy@gmail.com"

# Verify config
firebase functions:config:get
```

### Step 7: Deploy Functions (5 min)

```bash
firebase deploy --only functions
```

You should see:

```
✔ Deploy complete!

Function URL (scheduledBillReminder): https://...
Function URL (triggerBillReminders): https://...
```

### Step 8: Test It Works (5 min)

**Create test bill** in Firestore:

```javascript
// In your React app or Firestore console
const newBill = {
  dueDate: "2026-02-12", // 3 days from today
  email: "your@email.com", // Must be valid email
  invoiceNumber: "TEST-001",
  supplierName: "Test Company",
  amount: 1000,
  reminderSent: false,
  paid: false,
  createdAt: new Date(),
};

// Add to: users/{userId}/bills/{billId}
```

**Manually trigger the function**:

```bash
# Get your function URL from Firebase Console
curl -X POST https://us-central1-YOUR_PROJECT.cloudfunctions.net/triggerBillReminders
```

**Check logs**:

```bash
firebase functions:log --follow
```

Watch for:

```
✅ Reminder sent for Bill TEST-001 to your@email.com
```

**Check your email** - The reminder should arrive within 30 seconds!

### Step 9: Verify Scheduling (2 min)

Go to **Firebase Console**:

1. Cloud Functions
2. Click `scheduledBillReminder`
3. Should show: **"Trigger: Pub/Sub"**
4. **Frequency**: "0 9 \* \* \*" (Daily at 9 AM IST)
5. Status: ✅ Deployed

---

## ✅ You're Done!

Your system now:

- ✅ **Runs daily** at 9 AM IST
- ✅ **Checks all bills** for upcoming due dates
- ✅ **Sends emails** 3 days, 1 day, and on due date
- ✅ **Tracks status** to avoid duplicate reminders
- ✅ **Handles errors** gracefully

---

## 📊 System Status Check

Run this to verify everything:

```bash
# 1. Check functions deployed
firebase functions:list

# 2. Check function logs
firebase functions:log -n 50

# 3. Check Firestore data
firebase firestore:export ./backup

# 4. Test email sending
curl -X POST \
  https://us-central1-YOUR_PROJECT.cloudfunctions.net/triggerBillReminders \
  -H "Content-Type: application/json"
```

---

## 🔧 Troubleshooting

| Issue                        | Fix                                                                       |
| ---------------------------- | ------------------------------------------------------------------------- |
| "SENDGRID_API_KEY not found" | `firebase functions:config:set sendgrid.api_key="SG.xxxxx"` then redeploy |
| Emails not sending           | Check SendGrid API key is valid, check logs with `firebase functions:log` |
| Function not running         | Check timezone is set to "Asia/Kolkata", verify function deployed         |
| Permission errors            | Ensure Service Account has Firestore/Cloud Functions permissions          |
| Timeout errors               | Check Firestore quotas, reduce number of bills, or increase timeout       |

---

## 📧 Email Templates

The system sends professional emails with:

- ✅ Reminder urgency badges (🔔 Regular, ⏰ Final, 🚨 Urgent)
- ✅ Bill details (Invoice #, Amount, Due Date)
- ✅ Call-to-action buttons
- ✅ Mobile-responsive HTML
- ✅ Plain text fallback

Example email flow:

```
Day -3: "📌 REMINDER - Due in 3 Days"
Day -2: (no email, already sent)
Day -1: "⏰ FINAL REMINDER - Due Tomorrow"
Day  0: "🚨 URGENT - Due TODAY"
```

---

## 🎯 Next Steps

After basic setup, consider:

1. **Test with real data**

   ```javascript
   // Add your actual bills to Firestore
   db.collection("users").doc(userId).collection("bills").add({...})
   ```

2. **Set up monitoring**
   - Firebase Console → Functions → Logs
   - Set alert if error rate > 5%

3. **Add more email templates**
   - Overdue reminders
   - Recurring bill setup
   - Payment confirmation

4. **Integrate with React**

   ```javascript
   import { getFunctions, httpsCallable } from "firebase/functions";

   const functions = getFunctions();
   const sendManualReminder = httpsCallable(functions, "sendManualReminder");

   // Button in your components
   <button onClick={() => sendManualReminder({ userId, billId })}>
     Send Reminder Now
   </button>;
   ```

5. **Monitor costs**
   - Free tier: 125,000 invocations/month
   - Typical usage: ~150 invocations/month = FREE
   - Check Firebase Console → Quotas

---

## 📞 Support

**Getting help:**

- Cloud Functions docs: https://firebase.google.com/docs/functions
- SendGrid docs: https://sendgrid.com/docs
- Debug tips: Run `firebase functions:log` to see detailed errors

**Common commands:**

```bash
# Deploy
firebase deploy --only functions

# View logs
firebase functions:log --follow

# Delete a function
firebase functions:delete scheduledBillReminder

# Redeploy after config change
firebase deploy --only functions

# Change Firebase project
firebase use prod  # or dev
```

---

## 🎉 You Now Have

✅ Automated daily bill reminders
✅ Professional email notifications
✅ Scheduled job system
✅ Email tracking (reminderSent flag)
✅ Error logging and monitoring
✅ Multiple reminder levels (3-day, 1-day, due-date)

**Deployment time**: ~30 minutes
**Monthly cost**: FREE (within free tier)
**Reliability**: 99.95% uptime (Google Cloud)
**Scalability**: Auto-scales to 10,000+ users
