# Automatic Email Reminders Setup Guide

> **Get automatic email reminders working for your bill due dates in 5 minutes!**

## What You'll Get ✨

Your users will automatically receive email reminders when bill due dates are approaching:

- 📌 7 days before due date: "GST Filing Reminder"
- ⚡ 3 days before due date: "Urgent: GST Filing Due..."
- ⏰ 1 day before due date: "FINAL REMINDER: Due Tomorrow"
- 🚨 On due date: "DUE TODAY"
- 🚨 After due date: "CRITICAL: Payment Overdue"

---

## Prerequisites

✅ Brevo SMTP configured (see `BREVO_EMAIL_SETUP.md`)
✅ Firebase Firestore database with bills
✅ Users with email addresses in their profiles
✅ Environment variables configured

---

## How It Works

```
Every Day at 09:00 AM IST (3:30 AM UTC)
         ↓
Vercel Cron Job Triggers
         ↓
api/reminders.js endpoint runs
         ↓
Checks all users' bills
         ↓
For each bill with upcoming deadline:
  - Calculate days until due
  - Generate reminder email
  - Check if already sent today
  - Send via Brevo SMTP
  - Record in Firestore
         ↓
Return statistics & log to console
```

---

## Step-by-Step Setup

### Step 1: Verify Brevo SMTP Configuration ✅

Make sure you have `.env` or environment variables set with:

```bash
BREVO_API_KEY=xsmtpsib-xxxxxxxxx
EMAIL_FROM=your-email@domain.com
```

Check [BREVO_EMAIL_SETUP.md](BREVO_EMAIL_SETUP.md) for complete setup.

### Step 2: Update Environment Variables

Add these to your `.env` file and Vercel deployment settings:

```bash
# Required
BREVO_API_KEY=xsmtpsib-xxxxxxxxx
EMAIL_FROM=your-email@domain.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# Optional (for rate limiting/security)
CRON_SECRET=your-random-secret-key
ADMIN_KEY=your-admin-key
```

### Step 3: Deploy to Vercel

The `/api/reminders.js` endpoint is automatically configured to be called by the Vercel Cron job (defined in `vercel.json`).

**Deploy with:**

```bash
vercel deploy --prod
```

### Step 4: Test Locally (Optional)

Test the reminder system locally before deploying:

```bash
# Terminal 1: Start Express Email Server
cd api
node server.js

# Terminal 2: Run reminder check manually
node scripts/testReminders.js
```

---

## Vercel Cron Configuration

The `vercel.json` file already contains the cron configuration:

```json
{
  "crons": [
    {
      "path": "/api/reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**Cron Schedule:** `0 9 * * *`
- Runs daily at 09:00 AM IST
- UTC Time: 3:30 AM (UTC+5:30 offset)

To change the schedule, modify the `crons` section in `vercel.json`.

---

## API Endpoints

### POST /api/reminders

**For Vercel Cron (Automatic):**
- Called automatically daily at 09:00 AM IST
- Requires valid `Authorization: Bearer {CRON_SECRET}` header

**For Manual Testing:**
- Add admin key: `?adminKey={ADMIN_KEY}` or header `x-admin-key`
- Example: `POST https://yourdomain.com/api/reminders?adminKey=your-admin-key`

**Response:**

```json
{
  "success": true,
  "stats": {
    "usersChecked": 12,
    "billsChecked": 45,
    "remindersSent": 8,
    "errors": []
  }
}
```

---

## Email Reminder Schedule Details

### 7 Days Before Deadline (one-week)

```
Subject: 📌 GST Filing Reminder - Due in 7 Days
Status: Informational
Color: Blue
```

### 3 Days Before Deadline (three-days)

```
Subject: ⚡ Urgent: GST Filing Due in 3 Days - {Supplier Name}
Status: Urgent
Color: Amber
```

### 1 Day Before Deadline (one-day)

```
Subject: ⏰ FINAL REMINDER: GST Filing Due Tomorrow - {Supplier Name}
Status: Critical
Color: Orange
```

### Due Today (today)

```
Subject: 🚨 DUE TODAY: GST Filing Required - {Supplier Name}
Status: Emergency
Color: Red
```

### Overdue (overdue)

```
Subject: 🚨 CRITICAL: Payment Overdue - {Supplier Name}
Status: Critical
Color: Dark Red
```

---

## Database Structure

Reminders are tracked in Firestore:

```
users/
  {userId}/
    emailReminders/
      {reminderId}/
        billId: "bill123"
        type: "one-week|three-days|one-day|today|overdue"
        subject: "Email subject"
        emailSent: "user@example.com"
        sentDate: Timestamp
        status: "sent"
        messageId: "brevo-message-id"
```

Bills updated with:

```
bills/
  {billId}/
    ...
    reminderSent: true/false
    reminderSentDate: Timestamp
    lastReminderType: "one-week|three-days|one-day"
```

---

## Troubleshooting

### Reminders Not Sending

**1. Check Brevo Configuration**

```bash
POST http://localhost:5000/api/sendEmail
{
  "subject": "Test Email",
  "body": "This is a test",
  "email": "your@email.com"
}
```

**Expected response:**

```json
{
  "success": true,
  "messageId": "brevo-msg-id",
  "message": "Email sent successfully via Brevo SMTP"
}
```

**2. Check Vercel Cron Logs**

Go to Vercel Dashboard:
1. Select your project
2. Go to **Deployments** tab
3. Click on latest deployment
4. Check **Functions** logs for `/api/reminders`

**3. Manual Test Endpoint**

```bash
curl -X POST "https://yourdomain.com/api/reminders?adminKey=YOUR_ADMIN_KEY"
```

Check the JSON response for `stats` and `errors`.

### Emails Stuck in Spam

1. Make sure `EMAIL_FROM` matches Brevo registered email
2. Add DKIM, SPF, DMARC records to your domain
3. Use a branded email domain (not Gmail)
4. See `BREVO_EMAIL_SETUP.md` for details

### Bills Not Found

Ensure bills have these fields in Firestore:

```javascript
{
  gstrDeadline: "2024-02-28T23:59:59Z", // Required
  supplierName: "Company Name",
  invoiceNumber: "INV-001",
  amount: 1000,
  // OR
  dueDate: "2024-02-28T23:59:59Z" // Alternative to gstrDeadline
}
```

### Too Many Reminders Sent

Check if `reminderSent` flag is being updated:

```javascript
// Make sure bill is updated after sending reminder
db.collection("users").doc(userId).collection("bills").doc(billId).update({
  reminderSent: true,
  reminderSentDate: admin.firestore.FieldValue.serverTimestamp()
});
```

---

## Monitoring & Analytics

### View Sent Reminders in Firestore

```javascript
// Get all reminders for a user
db.collection("users").doc(userId).collection("emailReminders").get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      console.log(doc.data()); // { billId, type, sentDate, status }
    });
  });

// Get reminders for specific date
const today = new Date();
today.setHours(0, 0, 0, 0);

db.collection("users").doc(userId).collection("emailReminders")
  .where("sentDate", ">=", today)
  .get()
```

### Check Cron Job History

**Vercel Dashboard:**
1. Project Settings → Cron Jobs
2. See last execution time and status
3. View logs for any errors

---

## Advanced Configuration

### Change Reminder Times

Edit `api/reminders.js` and adjust the reminder thresholds:

```javascript
// Current thresholds
if (daysUntilDue < 0) reminderType = "overdue";    // Past due
else if (daysUntilDue === 0) reminderType = "today"; // Due today
else if (daysUntilDue === 1) reminderType = "one-day"; // 1 day left
else if (daysUntilDue <= 3) reminderType = "three-days"; // 3 days or less
else if (daysUntilDue <= 7) reminderType = "one-week"; // 7 days or less

// To change: modify the numbers above
```

### Change Cron Schedule

Edit `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/reminders",
      "schedule": "0 14 * * *"  // 2 PM UTC = 7:30 PM IST
    }
  ]
}
```

**Cron Expression Format:** `minute hour day month dayOfWeek`

Examples:
- `0 9 * * *` = 9 AM daily
- `0 9 * * 1` = 9 AM every Monday
- `*/30 * * * *` = Every 30 minutes
- `0 14 * * Mon-Fri` = 2 PM weekdays

### Send Test Email

```bash
# Using curl
curl -X POST http://localhost:5000/api/sendEmail \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test Reminder",
    "body": "This is a test email",
    "email": "your@email.com"
  }'
```

### Disable Reminders Temporarily

Close the cron job in Vercel:
1. Go to Vercel Dashboard
2. Project Settings → Cron Jobs
3. Toggle the job off

Or modify `vercel.json` to remove the cron block and redeploy.

---

## API Integration (From Frontend)

The frontend can also trigger manual reminders:

```javascript
// src/services/emailReminderService.js
import { sendBillUploadReminder } from "../services/emailReminderService";

// Send reminder when bill is uploaded
await sendBillUploadReminder(billData, userEmail);

// Check and send reminders for all bills
const result = await checkAndSendBillReminders(userId);
// Returns: { success: true, remindersSent: [...], message: "..." }

// Get reminder history for a bill
const history = await getBillReminderHistory(userId, billId);
// Returns: [{ type, sentDate, email, status }, ...]
```

---

## Security

### CRON_SECRET Setup

This prevents unauthorized access to the reminder endpoint:

1. Generate a random secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. Set in `.env`:

```bash
CRON_SECRET=your-generated-secret
```

3. Add to Vercel environment:
   - Go to Project Settings
   - Add to Environment Variables
   - Value: Your secret
   - Target: Production

Vercel automatically sets the `Authorization` header when calling cron jobs.

### ADMIN_KEY Setup

For manual testing without authorization:

```bash
ADMIN_KEY=your-test-key
```

Usage: `?adminKey=your-test-key`

---

## Rate Limiting

To prevent too many email sends:

1. Check `emailReminders` collection for today's date
2. Only send one reminder per type per day
3. Skip if `reminderSent` flag is already true

Current implementation prevents duplicate reminders by:
- Checking `emailReminders` subcollection
- Validating `sentDate >= today`
- Skipping if already sent today

---

## Support & Documentation

- **Brevo SMTP Setup:** See [BREVO_EMAIL_SETUP.md](BREVO_EMAIL_SETUP.md)
- **Email Service:** See `api/server.js`
- **Email Templates:** See `api/reminders.js`
- **Frontend Integration:** See `src/services/emailReminderService.js`
- **Manual Reminders:** See [EMAIL_REMINDERS_SETUP.md](EMAIL_REMINDERS_SETUP.md)

---

## Quick Checklist

Before going live:

- [ ] Brevo SMTP configured and tested
- [ ] `BREVO_API_KEY` added to `.env`
- [ ] `EMAIL_FROM` is registered with Brevo
- [ ] Firebase Firestore is connected
- [ ] Bills have `gstrDeadline` or `dueDate` fields
- [ ] Users have email addresses in profile
- [ ] `vercel.json` has cron configuration
- [ ] `CRON_SECRET` set for security (optional but recommended)
- [ ] Deployed to Vercel with `vercel deploy --prod`
- [ ] Cron job appears in Vercel Dashboard
- [ ] Test email sent successfully

---

## Example: Complete Flow

1. **User uploads a bill** with due date Feb 28, 2024

2. **Cron job runs daily at 09:00 AM IST:**
   - Feb 22 (6 days): Sends "📌 GST Filing Reminder - Due in 6 Days"
   - Feb 26 (2 days): Sends "⚡ Urgent: GST Filing Due in 2 Days"
   - Feb 27 (1 day): Sends "⏰ FINAL REMINDER: Due Tomorrow"
   - Feb 28 (0 days): Sends "🚨 DUE TODAY: GST Filing Required"
   - Feb 29+ (overdue): Sends "🚨 CRITICAL: Payment Overdue"

3. **Each email includes:**
   - Bill details (supplier, invoice #, amount)
   - Due date and days remaining
   - Link to dashboard
   - Professional HTML template

4. **Records created in Firestore:**
   - `emailReminders` subcollection tracks each sent email
   - `bills` updated with `reminderSent` flag
   - Can query history anytime

---

**🎉 You're all set! Automatic reminders will now be sent to your users daily.**

Questions? Check the troubleshooting section above or review the related documentation files.
