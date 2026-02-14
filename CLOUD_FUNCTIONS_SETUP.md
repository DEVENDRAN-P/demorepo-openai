# Cloud Functions Setup Guide

## Overview

This guide walks you through setting up Firebase Cloud Functions for automated bill reminders.

## Architecture Flow

```
📱 React Frontend
    ↓
🔥 Firebase Firestore (Store bills + due dates)
    ↓
⏰ Scheduled Function (Runs daily at 9 AM IST)
    ↓
📧 SendGrid / Email Service
    ↓
📬 User Email
```

## Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

## Step 2: Initialize Cloud Functions

```bash
# In your project root
firebase init functions

# Select:
# - Use JavaScript
# - Install dependencies now: YES
```

## Step 3: Set Environment Variables

### Get SendGrid API Key

1. Go to https://app.sendgrid.com/settings/api_keys
2. Create a new API key with "Mail Send" permissions
3. Copy the key

### Set Config

```bash
# Replace with your actual key
firebase functions:config:set sendgrid.api_key="SG.xxxxxxxxxxxxxxxxxxxxx"
firebase functions:config:set email.from="noreply@gstbuddy.ai"
```

### Verify Config

```bash
firebase functions:config:get
```

Should output:

```json
{
  "sendgrid": {
    "api_key": "SG.xxxxx..."
  },
  "email": {
    "from": "noreply@gstbuddy.ai"
  }
}
```

## Step 4: Update package.json

Ensure your `functions/package.json` has:

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

Install dependencies:

```bash
cd functions
npm install
cd ..
```

## Step 5: Copy Function Files

Copy these files to your `functions/` directory:

- `index.js` - Main export file
- `scheduledReminders.js` - Scheduled job that runs daily
- `emailReminders.js` - Email sending functions

## Step 6: Deploy Functions

```bash
# Deploy only functions
firebase deploy --only functions

# Or deploy everything
firebase deploy
```

You should see output like:

```
✔ Deploy complete!

Function URL (scheduledBillReminder): https://us-central1-your-project.cloudfunctions.net/scheduledBillReminder
Function URL (triggerBillReminders): https://us-central1-your-project.cloudfunctions.net/triggerBillReminders
```

## Step 7: Verify Deployment

Check Firebase Console:

1. Go to Firebase Console → Cloud Functions
2. You should see:
   - `scheduledBillReminder` (Cloud Pub/Sub)
   - `triggerBillReminders` (HTTP trigger)
   - `sendReminderEmail` (Callable)
   - `sendManualReminder` (Callable)

## Step 8: Test the Function

### Test Manually (HTTP endpoint)

```bash
# Get your function URL from Firebase Console
curl -X POST https://us-central1-YOUR_PROJECT.cloudfunctions.net/triggerBillReminders
```

### Test from React

```javascript
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();
const triggerReminders = httpsCallable(functions, "triggerBillReminders");

// Test
await triggerReminders();
```

### Check Logs

```bash
firebase functions:log --follow
```

## Step 9: Database Structure

Ensure your bills have this structure in Firestore:

```
users/
  {userId}/
    bills/
      {billId}
        dueDate: "2026-02-15" (ISO format: YYYY-MM-DD)
        email: "user@example.com"
        invoiceNumber: "INV-001"
        supplierName: "BSNL"
        amount: 1200
        reminderSent: false
        urgencyReminderSent: false
        reminderSentDate: null
        lastReminderDaysLeft: null
```

## Scheduled Job Behavior

The `scheduledBillReminder` function:

- **Runs**: Every day at 09:00 IST (03:30 UTC)
- **Checks**: All bills for all users
- **Sends reminder** if:
  - Due date is within 3 days
  - `reminderSent` is false
  - Has valid email
- **Marks**: `reminderSent = true` after sending
- **Urgent**: Sends separate alert on due date (day 0)

## Troubleshooting

### "SENDGRID_API_KEY not found"

```bash
# Check if config is set
firebase functions:config:get

# If empty, set it again
firebase functions:config:set sendgrid.api_key="SG.xxxxx"
firebase deploy --only functions
```

### "Permission denied" errors

- Verify Service Account has Firestore access
- Check IAM permissions in Firebase Console
- Make sure `.env` has correct credentials for local testing

### Function timing out

- Check Firestore read/write quotas
- Reduce number of users/bills
- Increase function timeout in Firebase Console

### Emails not sending

1. Check SendGrid API key is valid
2. Verify "From" email is authorized in SendGrid
3. Check spam folder for test emails
4. Look at function logs: `firebase functions:log`

## Email Service Alternatives

### Use Gmail SMTP instead of SendGrid

```bash
# Install Gmail transport
npm install nodemailer-gmail-transport

# In functions code:
const gmailTransport = require("nodemailer-gmail-transport");
const transporter = nodemailer.createTransport(
  gmailTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  })
);
```

### Use Firebase Email Extension

Firebase offers an Email extension that handles SMTP for you:

1. Go to Firebase Console → Extensions
2. Install "Trigger Email" extension
3. Configure SMTP settings
4. No need to manage SENDGRID_API_KEY

## Monitoring

### View Logs

```bash
firebase functions:log
firebase functions:log --follow  # Real-time
```

### View Execution History

Firebase Console → Cloud Functions → Select function → Logs

### Create Alerts

Firebase Console → Monitoring → Create Policy

- Alert on: Function error rate > 5%
- Alert on: Function duration > 30s

## Cost Estimates

**Free Tier (monthly)**:

- 125,000 Cloud Function invocations
- 40,000 GB-seconds of compute

**Typical usage**:

- 1 scheduled job/day: ~30 invocations/month
- If 100 emails sent/day: ~150 additional invocations
- Cost: Usually within free tier

See: https://firebase.google.com/pricing

## Next Steps

1. ✅ Deploy Cloud Functions
2. ✅ Set up Firestore data structure
3. ✅ Configure SendGrid API key
4. ✅ Test scheduling works
5. ✅ Monitor function logs
6. Add more email templates (recurring bills, overdue, etc.)
7. Set up better email templates with company branding
8. Add SMS reminders (Twilio)
9. Add push notifications
10. Analytics: Track delivery rates, open rates

## Support

For issues:

- Check Firebase documentation: https://firebase.google.com/docs/functions
- Check SendGrid docs: https://sendgrid.com/docs
- Firebase support: https://stackoverflow.com/questions/tagged/firebase
