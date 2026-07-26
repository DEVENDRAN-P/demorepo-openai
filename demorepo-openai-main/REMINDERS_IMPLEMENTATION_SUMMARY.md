# Automatic Bill Reminders - Implementation Summary

## 🎉 What's Been Set Up

Your application now has **automatic email reminders** that will be sent to users when their bill due dates are approaching.

### ✨ Features Implemented

1. **Automated Daily Cron Job**
   - Runs every day at **09:00 AM IST** (3:30 AM UTC)
   - Triggered by Vercel Cron scheduler
   - Zero configuration needed on your part after deployment

2. **Intelligent Reminder Scheduling**
   - 7 days before due date: "📌 GST Filing Reminder"
   - 3 days before due date: "⚡ Urgent: GST Filing Due"
   - 1 day before due date: "⏰ FINAL REMINDER"
   - On due date: "🚨 DUE TODAY"
   - After due date: "🚨 CRITICAL: Payment Overdue"

3. **Smart Email System**
   - Uses Brevo SMTP for reliable delivery
   - Professional HTML email templates
   - Prevents duplicate reminders
   - Tracks all sent reminders in Firestore

4. **Database Integration**
   - Records reminder history in `emailReminders` subcollection
   - Updates bill with `reminderSent` flag
   - Query reminders anytime to audit what was sent

---

## 📁 Files Created/Modified

### New Files Created

1. **`api/reminders.js`** (150+ lines)
   - Vercel serverless function endpoint
   - Handles daily cron job execution
   - Sends emails via Brevo SMTP
   - Returns statistics and error logging

2. **`scripts/testReminders.js`** (300+ lines)
   - Command-line tool for local testing
   - Analyzes which reminders would be sent
   - Optional test email sending
   - Color-coded output for easy reading
   - Usage: `node scripts/testReminders.js`

3. **`AUTOMATED_REMINDERS_SETUP.md`** (500+ lines)
   - Complete detailed setup guide
   - Troubleshooting section
   - Advanced configuration options
   - Database structure documentation
   - API endpoint reference

4. **`REMINDERS_QUICKSTART.md`** (200+ lines)
   - Quick 5-minute setup guide
   - Clear step-by-step instructions
   - Testing section
   - Common issues and fixes

### Modified Files

1. **`vercel.json`**
   - Added cron job configuration
   - Schedule: `0 9 * * *` (9 AM daily)
   - Path: `/api/reminders`

2. **`api/scheduledReminders.js`** (replaced)
   - Complete rewrite with improved logic
   - Includes email template generation
   - Better error handling and logging
   - Production-ready code

---

## 🚀 How to Enable

### 1. Verify Environment Variables

Make sure these are set in your Vercel Project Settings:

```bash
BREVO_API_KEY=xsmtpsib-xxxxxxxxx
EMAIL_FROM=your-email@domain.com
FIREBASE_PROJECT_ID=your-project-id
CRON_SECRET=your-random-secret-key (optional)
```

Check: `api/.env` currently has:
```
BREVO_API_KEY=your-brevo-api-key
EMAIL_FROM=your-email@domain.com
```

### 2. Deploy to Vercel

```bash
git add .
git commit -m "Add automatic bill reminder system"
vercel deploy --prod
```

### 3. Verify in Vercel Dashboard

1. Go to your Vercel project
2. Click **Settings** → **Cron Jobs**
3. You should see `/api/reminders` scheduled

---

## 📧 How It Works

```
┌─────────────────────────────────────────────────────────┐
│ Every Day at 09:00 AM IST                               │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│ Vercel Cron Job Triggers /api/reminders endpoint        │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│ Load all users from Firestore                           │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│ For each user, get their bills                          │
└──────────────────────┬──────────────────────────────────┘
                       ↓
         ┌─────────────┴─────────────┐
         ↓                           ↓
    ┌──────────────┐         ┌──────────────────┐
    │ Bill has no  │         │ Calculate days   │
    │ deadline?    │         │ until due date   │
    │ Skip ───────→│         └────────┬─────────┘
    └──────────────┘                  ↓
                          ┌──────────────────────┐
                          │ Days until due < 0?  │
                          │ Send "OVERDUE" ──→  │
                          └────────┬─────────────┘
                                   ↓
                    (Other reminder types...)
                                   ↓
    ┌──────────────────────────────────────────────┐
    │ Generate professional HTML email            │
    └────────────────┬─────────────────────────────┘
                     ↓
    ┌──────────────────────────────────────────────┐
    │ Send via Brevo SMTP                          │
    │ (Uses: BREVO_API_KEY, EMAIL_FROM)            │
    └────────────────┬─────────────────────────────┘
                     ↓
    ┌──────────────────────────────────────────────┐
    │ Record in Firestore:                         │
    │ - emailReminders subcollection              │
    │ - Update bill with reminderSent flag        │
    └────────────────┬─────────────────────────────┘
                     ↓
    ┌──────────────────────────────────────────────┐
    │ Return statistics:                           │
    │ - Users checked: 10                          │
    │ - Bills checked: 45                          │
    │ - Reminders sent: 8                          │
    │ - Errors: 0                                  │
    └──────────────────────────────────────────────┘
```

---

## 🧪 Testing Locally

### Test 1: Analyze Bills

```bash
node scripts/testReminders.js
```

This shows:
- How many users and bills exist
- Which bills need reminders
- What emails would be sent

### Test 2: Send Test Email

```bash
node scripts/testReminders.js --send-test
```

This sends a test email to the first bill that needs a reminder.

### Test 3: Manual API Call

```bash
# Development (with ADMIN_KEY)
curl "http://localhost:3000/api/reminders?adminKey=test123"

# Production (with ADMIN_KEY)
curl "https://yourdomain.com/api/reminders?adminKey=YOUR_ADMIN_KEY"
```

---

## 📊 Email Reminder Schedule

| Scenario | Days Left | Email Emoji | Subject | Send Date |
|----------|-----------|------------|---------|-----------|
| Normal reminder | 7 days | 📌 | "📌 GST Filing Reminder - Due in 7 Days" | When 7 days remain |
| Urgent alert | 3 days | ⚡ | "⚡ Urgent: GST Filing Due in 3 Days" | When 3 days remain |
| Final notice | 1 day | ⏰ | "⏰ FINAL REMINDER: GST Filing Due Tomorrow" | When 1 day remains |
| Due today | 0 days | 🚨 | "🚨 DUE TODAY: GST Filing Required" | On due date |
| Overdue | < 0 days | 🚨 | "🚨 CRITICAL: Payment Overdue" | After due date |

**Only reminders within 7 days of due date are sent.**

---

## 🔧 Configuration Options

### Change Cron Schedule

Edit `vercel.json` `crons` section:

```json
{
  "crons": [
    {
      "path": "/api/reminders",
      "schedule": "0 14 * * *"  // Change to 2 PM UTC (7:30 PM IST)
    }
  ]
}
```

Then redeploy: `vercel deploy --prod`

### Cron Expression Format

- `minute hour day month dayOfWeek`
- Examples:
  - `0 9 * * *` = 9 AM every day
  - `0 9 * * 1` = 9 AM every Monday
  - `0 0 1 * *` = 12 AM on 1st of month
  - `*/30 * * * *` = Every 30 minutes

### Add Security (Optional)

Set `CRON_SECRET` in environment:

```bash
# Generate a secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Use it in environment
CRON_SECRET=your-generated-secret
```

Vercel automatically sends this in the `Authorization: Bearer {CRON_SECRET}` header.

---

## 💾 Database Structure

### Reminder Records Created

When a reminder is sent, this is recorded:

```javascript
// Firestore: users/{userId}/emailReminders/{reminderId}
{
  billId: "bill-123",
  type: "one-week",  // or "three-days", "one-day", "today", "overdue"
  subject: "📌 GST Filing Reminder - Due in 7 Days",
  emailSent: "user@example.com",
  sentDate: Timestamp,      // When sent
  status: "sent",           // or "failed"
  messageId: "brevo-msg-id" // Brevo message ID
}
```

### Bill Updates

Bills are updated with:

```javascript
// Firestore: users/{userId}/bills/{billId}
{
  // ... existing bill fields ...
  reminderSent: true,          // Flag to prevent duplicates
  reminderSentDate: Timestamp, // When reminder was sent
  lastReminderType: "one-week" // Which reminder was sent
}
```

---

## 🔍 Monitoring & Debugging

### Check Cron Job Status

**Vercel Dashboard:**
1. Go to your project
2. Settings → Cron Jobs
3. See execution history and logs

### View Sent Reminders

**In Firestore:**

```javascript
// Get all reminders for a user
const reminders = await db
  .collection("users")
  .doc(userId)
  .collection("emailReminders")
  .get();

reminders.forEach(doc => {
  console.log(doc.data());
});

// Get reminders sent today
const today = new Date();
today.setHours(0, 0, 0, 0);

const todaysReminders = await db
  .collection("users")
  .doc(userId)
  .collection("emailReminders")
  .where("sentDate", ">=", today)
  .get();
```

### Check for Errors

**In Vercel logs:**
1. Deployments → Latest deployment
2. Functions tab
3. Click `/api/reminders`
4. See execution logs and errors

---

## ⚠️ Common Issues & Solutions

### Issue: No reminders being sent

**Check 1:** Are there bills with upcoming due dates?
```bash
node scripts/testReminders.js
```

**Check 2:** Is Brevo SMTP working?
```bash
curl -X POST http://localhost:5000/api/sendEmail \
  -H "Content-Type: application/json" \
  -d '{"subject":"Test","body":"Test","email":"you@example.com"}'
```

**Check 3:** Check Vercel logs
- Go to Vercel Dashboard → Deployments → Functions → `/api/reminders`

### Issue: Emails going to spam

**Solution:**
1. Ensure `EMAIL_FROM` matches Brevo registered email
2. Add SPF/DKIM records to your domain
3. See [BREVO_EMAIL_SETUP.md](BREVO_EMAIL_SETUP.md) for email configuration

### Issue: Too many test emails sent

**Solution:**
- The system prevents duplicate reminders
- Each reminder type is only sent once per day per bill
- Check `emailReminders` collection to see what was sent

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| [REMINDERS_QUICKSTART.md](REMINDERS_QUICKSTART.md) | **START HERE** - 5-minute setup |
| [AUTOMATED_REMINDERS_SETUP.md](AUTOMATED_REMINDERS_SETUP.md) | Complete detailed guide |
| [BREVO_EMAIL_SETUP.md](BREVO_EMAIL_SETUP.md) | Email service configuration |
| [EMAIL_REMINDERS_SETUP.md](EMAIL_REMINDERS_SETUP.md) | Manual reminder system |

---

## 🎯 Quick Checklist Before Going Live

- [ ] Brevo SMTP configured and tested
- [ ] BREVO_API_KEY set in Vercel environment
- [ ] EMAIL_FROM matches registered Brevo email
- [ ] Firebase Firestore connected
- [ ] Bills have `gstrDeadline` or `dueDate` field
- [ ] Users have email addresses
- [ ] `api/reminders.js` exists and is correct
- [ ] `vercel.json` has cron configuration
- [ ] Deployed with `vercel deploy --prod`
- [ ] Cron job visible in Vercel Dashboard
- [ ] (Optional) Run local test: `node scripts/testReminders.js`

---

## 🚀 Next Steps

1. **Read:** [REMINDERS_QUICKSTART.md](REMINDERS_QUICKSTART.md) (5 min read)

2. **Deploy:**
   ```bash
   vercel deploy --prod
   ```

3. **Verify:** Check Vercel Dashboard for cron job

4. **Test:** Run `node scripts/testReminders.js` to see what would be sent

5. **Monitor:** Check Firestore for `emailReminders` collection to audit sent emails

---

## 💡 Tips & Tricks

### Get All Reminders for a Date

```javascript
const date = new Date("2024-02-15");
const startOfDay = new Date(date);
startOfDay.setHours(0, 0, 0, 0);
const endOfDay = new Date(date);
endOfDay.setHours(23, 59, 59, 999);

const reminders = await db
  .collection("users")
  .doc(userId)
  .collection("emailReminders")
  .where("sentDate", ">=", startOfDay)
  .where("sentDate", "<=", endOfDay)
  .get();
```

### Disable Reminders Temporarily

Option 1: Comment out cron in `vercel.json` and redeploy
Option 2: In Vercel Dashboard, disable the cron job

### Change Reminder Email Title/Styling

Edit `api/reminders.js` > `generateEmailContent()` function:
- Change the emoji
- Change the color
- Modify the HTML content
- Redeploy

---

## 📞 Support

For issues and questions:

1. Check the troubleshooting section above
2. Review [AUTOMATED_REMINDERS_SETUP.md](AUTOMATED_REMINDERS_SETUP.md)
3. Check Vercel logs for error messages
4. Test locally with `node scripts/testReminders.js`

---

## ✅ Summary

You now have a **production-ready automatic reminder system** that:

✨ Runs every day automatically  
📧 Sends professional emails via Brevo SMTP  
🔄 Prevents duplicate reminders  
📊 Tracks all sent emails in Firestore  
🚀 Requires zero maintenance  
⚙️ Can be customized with 1 config change  

**Start with [REMINDERS_QUICKSTART.md](REMINDERS_QUICKSTART.md) for setup instructions!**
