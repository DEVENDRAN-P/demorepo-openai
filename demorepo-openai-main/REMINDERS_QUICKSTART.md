# Automatic Reminders - Quick Start (5 Minutes)

> **Get automatic bill reminders working in just 5 minutes!**

## What You Get 📧

Automatic emails sent to users when bill due dates are approaching:

- 7 days before: "📌 GST Filing Reminder"
- 3 days before: "⚡ Urgent: GST Filing Due"
- 1 day before: "⏰ FINAL REMINDER"
- On due date: "🚨 DUE TODAY"
- Past due: "🚨 CRITICAL: Overdue"

Emails run automatically **every day at 09:00 AM IST**.

---

## Prerequisites (30 seconds)

You already have these configured. Just verify:

```bash
# In .env or Vercel environment variables:
✓ BREVO_API_KEY=xsmtpsib-xxxxxxxxx
✓ EMAIL_FROM=your-email@domain.com
✓ FIREBASE_PROJECT_ID=your-project
```

If not, see [BREVO_EMAIL_SETUP.md](BREVO_EMAIL_SETUP.md) first.

---

## Enable Automatic Reminders (3 Steps)

### 1. Add Environment Variables (1 min)

**Add to `.env` or Vercel Project Settings:**

```bash
BREVO_API_KEY=xsmtpsib-xxxxxxxxx
EMAIL_FROM=your-email@domain.com
FIREBASE_PROJECT_ID=your-project-id
CRON_SECRET=your-random-secret-key  # Optional but recommended
```

### 2. Deploy to Vercel (2 min)

```bash
vercel deploy --prod
```

That's it! The cron job is already configured in `vercel.json`.

### 3. Verify It Works (30 sec)

Go to **Vercel Dashboard** → Your Project → **Cron Jobs**

You should see `/api/reminders` scheduled for daily at 09:00 AM IST.

---

## Test Before Deploying (Optional)

### Local Test

```bash
# Install dependencies (if needed)
npm install

# Test the reminder system locally
node scripts/testReminders.js

# Send a test email
node scripts/testReminders.js --send-test
```

### Manual Trigger

Call the endpoint directly to test:

```bash
curl "https://yourdomain.com/api/reminders?adminKey=YOUR_ADMIN_KEY"
```

Response:

```json
{
  "success": true,
  "stats": {
    "usersChecked": 5,
    "billsChecked": 12,
    "remindersSent": 3,
    "errors": []
  }
}
```

---

## How It Works

```
Every day at 09:00 AM IST:

Vercel Cron → /api/reminders endpoint
           ↓
   Check all users' bills
           ↓
   For each bill due within 7 days:
   - Generate email
   - Send via Brevo SMTP
   - Record in Firestore
           ↓
   Return statistics
```

---

## Email Reminder Schedule

| Days Left | Email Subject | Color | Emoji |
|-----------|---------------|-------|-------|
| 7+ days   | -None sent-   | - | - |
| 7 days    | 📌 GST Filing Reminder | Blue | 📌 |
| 3 days    | ⚡ Urgent: GST Filing Due | Amber | ⚡ |
| 1 day     | ⏰ Final Reminder: Due Tomorrow | Orange | ⏰ |
| Today     | 🚨 Due Today: GST Filing Required | Red | 🚨 |
| Overdue   | 🚨 Critical: Payment Overdue | Dark Red | 🚨 |

---

## Database Updates

When a reminder is sent, the system updates Firestore:

```javascript
// Creates record in emailReminders collection
{
  billId: "bill123",
  type: "one-week",  // or "three-days", "one-day", "today", "overdue"
  subject: "📌 GST Filing Reminder - Due in 7 Days",
  emailSent: "user@example.com",
  sentDate: Timestamp.now(),
  status: "sent"
}

// Updates bill document
{
  reminderSent: true,
  reminderSentDate: Timestamp.now()
}
```

---

## Troubleshooting

### Reminders Not Sending

**Check 1: Is Brevo working?**

```bash
curl -X POST http://localhost:5000/api/sendEmail \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test",
    "body": "Test email",
    "email": "your@email.com"
  }'
```

**Check 2: Are there bills due?**

```bash
node scripts/testReminders.js
```

**Check 3: Vercel Logs**

Go to Vercel Dashboard → Deployments → Latest → Functions → `/api/reminders`

### Bills Not Found

Make sure bills have `gstrDeadline` or `dueDate`:

```javascript
{
  gstrDeadline: "2024-02-28T00:00:00Z",  // Required
  supplierName: "Company Name",
  invoiceNumber: "INV-001",
  amount: 5000
}
```

### Emails Going to Spam

1. Set `EMAIL_FROM` to registered Brevo email
2. Add SPF/DKIM records to your domain
3. See [BREVO_EMAIL_SETUP.md](BREVO_EMAIL_SETUP.md) for details

---

## Configuration Files

**Key files involved:**

| File | Purpose |
|------|---------|
| `vercel.json` | Cron job schedule config |
| `api/reminders.js` | Reminder endpoint |
| `api/scheduledReminders.js` | Reminder logic (optional) |
| `scripts/testReminders.js` | Local testing script |
| `.env` | Environment variables |
| `AUTOMATED_REMINDERS_SETUP.md` | Detailed guide |

---

## Change Cron Schedule

Edit `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/reminders",
      "schedule": "0 14 * * *"  // Change: 2 PM UTC (7:30 PM IST)
    }
  ]
}
```

Then redeploy:

```bash
vercel deploy --prod
```

**Cron Expressions:** `minute hour day month dayOfWeek`

Examples:
- `0 9 * * *` = 9 AM daily (current)
- `0 9 * * 1` = 9 AM every Monday
- `0 14 9 * *` = 2 PM on 9th of each month
- `*/30 * * * *` = Every 30 minutes

---

## Monitoring

### Check Sent Reminders

Query Firestore:

```javascript
const reminders = await db
  .collection("users")
  .doc(userId)
  .collection("emailReminders")
  .get();

reminders.forEach(doc => {
  console.log(doc.data());
  // { billId, type, subject, emailSent, sentDate, status }
});
```

### View Cron Job Status

1. Go to **Vercel Dashboard**
2. Select your project
3. Open **Project Settings**
4. Go to **Cron Jobs**
5. See execution history and logs

---

## API Reference

### POST /api/reminders

**Automatic (Vercel):**
- Called daily at 09:00 AM IST
- Authorization: Vercel Cron (`Bearer {CRON_SECRET}`)

**Manual Test:**
- Add query: `?adminKey={ADMIN_KEY}`
- Or header: `x-admin-key: {ADMIN_KEY}`

**Response:**

```json
{
  "success": true,
  "stats": {
    "usersChecked": 10,
    "billsChecked": 45,
    "remindersSent": 8,
    "errors": []
  }
}
```

---

## Next Steps

✅ **Reminder system is ready to use!**

1. Verify `.env` variables are set
2. Deploy with `vercel deploy --prod`
3. Check Vercel Dashboard for cron job
4. Wait for next scheduled time OR test manually
5. Check Firestore for `emailReminders` collection

---

## Complete Setup Checklist

- [ ] Brevo SMTP configured (see BREVO_EMAIL_SETUP.md)
- [ ] `BREVO_API_KEY` in environment
- [ ] `EMAIL_FROM` in environment
- [ ] Firebase project connected
- [ ] Bills have `gstrDeadline` or `dueDate` field
- [ ] Users have email addresses in profile
- [ ] `api/reminders.js` exists
- [ ] `vercel.json` has cron config
- [ ] Deployed to Vercel with `vercel deploy --prod`
- [ ] Cron job visible in Vercel Dashboard
- [ ] (Optional) Run `node scripts/testReminders.js`

---

## Support

For detailed information, see:
- [AUTOMATED_REMINDERS_SETUP.md](AUTOMATED_REMINDERS_SETUP.md) - Complete guide
- [BREVO_EMAIL_SETUP.md](BREVO_EMAIL_SETUP.md) - Email configuration
- [EMAIL_REMINDERS_SETUP.md](EMAIL_REMINDERS_SETUP.md) - Manual reminders

---

**Done! Your automatic reminder system is now active.** 🎉

Emails will be sent automatically every day for bills due within 7 days.
