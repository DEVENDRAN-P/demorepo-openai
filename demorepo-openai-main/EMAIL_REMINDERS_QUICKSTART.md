# Email Reminders Quick Start (5 Minutes)

Get email reminders working in 5 minutes using SendGrid (recommended).

## Prerequisites

- SendGrid account (free tier available: https://sendgrid.com/free)
- Firebase CLI installed
- Your Firebase project set up

## Option 1: Fastest Way - Firebase Email Extension (Recommended)

⏱️ **Time: 2-3 minutes**

### Step 1: Go to Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com)
2. Select Your Project
3. Go to **Extensions**

### Step 2: Install Email Extension

1. Click **"Install Extension"**
2. Search for **"Firestore Send Email"** (by Google Cloud)
3. Click **Install**
4. Select your Cloud Storage bucket
5. Click **Install Extension**

### Step 3: Configure Email Service

1. Choose SMTP or SendGrid:
   - **SendGrid:** Paste API key (easiest)
   - **Gmail:** Use app-specific password
   - **SMTP:** Enter custom server details

2. Click **Review Policies**
3. Click **Continue** → **Install**

### Done! ✅

Email reminders now work automatically. No code changes needed.

---

## Option 2: Cloud Functions with SendGrid (More Control)

⏱️ **Time: 4-5 minutes**

### Step 1: Get SendGrid API Key

1. Go to [SendGrid](https://sendgrid.com)
2. Create free account
3. Go to **Settings** → **API Keys**
4. Click **"Create API Key"**
5. Name it "Firebase" and copy the key

### Step 2: Deploy Cloud Function

```bash
# In your project directory
firebase init functions

# Choose: JavaScript, ESLint (if prompted)

cd functions
npm install nodemailer nodemailer-sendgrid-transport
```

### Step 3: Update Function Code

Open `functions/index.js` and replace with:

```javascript
const functions = require("firebase-functions");
const nodemailer = require("nodemailer");
const sgTransport = require("nodemailer-sendgrid-transport");

const transporter = nodemailer.createTransport(
  sgTransport({
    auth: {
      api_key: "YOUR_SENDGRID_API_KEY_HERE",
    },
  }),
);

exports.sendReminderEmailHttp = functions.https.onRequest(async (req, res) => {
  try {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(200).send("OK");
      return;
    }

    const { subject, body, email } = req.body;

    if (!subject || !body || !email) {
      res.status(400).send("Missing fields");
      return;
    }

    // Send email
    await transporter.sendMail({
      from: "noreply@gstfilling.app",
      to: email,
      subject: subject,
      text: body,
      html: `<pre>${body}</pre>`,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### Step 4: Deploy

```bash
firebase deploy --only functions
```

### Step 5: Add Function URL to .env

After deployment, you'll see output like:

```
sendReminderEmailHttp: https://us-central1-YOUR-PROJECT.cloudfunctions.net/sendReminderEmailHttp
```

Add to your `.env` file:

```
REACT_APP_SEND_REMINDER_EMAIL_FUNCTION_URL=https://us-central1-YOUR-PROJECT.cloudfunctions.net/sendReminderEmailHttp
```

Then restart your app.

### Done! ✅

---

## Test If It's Working

### Manual Test

Open browser console and run:

```javascript
// Import the service
import { sendManualReminder } from "./src/services/emailReminderService";

// Get a bill ID from your Firebase (check your bills)
// Then send a test reminder
await sendManualReminder("YOUR_BILL_ID_HERE");
```

Check your email inbox - you should see the reminder email!

### Automatic Daily Test

Wait until 8:00 AM UTC next day, or check logs:

```bash
firebase functions:log
```

You should see logs of reminders being sent.

---

## Troubleshooting

### Email Not Received?

**Check 1: Function Deployed?**

```bash
firebase functions:list
```

Should show `sendReminderEmailHttp`

**Check 2: SendGrid Key Set?**

```bash
firebase functions:config:get sendgrid
```

**Check 3: Function Logs**

```bash
firebase functions:log
```

Look for errors

**Check 4: Check Spam Folder**
Emails might be in spam

**Check 5: Test Function Directly**
Go to [Firebase Console](https://console.firebase.google.com):

1. Functions tab
2. Click on `sendReminderEmailHttp`
3. Testing tab
4. Run with test data:

```json
{
  "subject": "Test",
  "body": "This is a test",
  "email": "your-email@gmail.com"
}
```

---

## What Happens Now?

### Automatic Behavior

Every day at 8:00 AM UTC:

1. System checks all users' bills
2. Finds bills with deadlines approaching
3. Sends reminders:
   - **7 days before** → Upcoming reminder
   - **3 days before** → Warning reminder
   - **1 day before** → Urgent reminder
   - **Today** → Critical reminder
   - **After deadline** → Overdue reminder
4. Records sent emails in database to prevent duplicates

### Manual Behavior

In your app:

- Click bill in GST status → See bill details
- Click "Send Reminder Email" button → Email sent immediately
- Previous reminders shown in history

---

## Next Steps

1. **Test it works** (send manual reminder)
2. **Wait for automatic email** (next day at 8 AM UTC)
3. **Check Firebase logs** (verify it's running)
4. **Customize** (edit email templates if needed)

---

## Need More Help?

See detailed guide: [EMAIL_REMINDERS_SETUP.md](./EMAIL_REMINDERS_SETUP.md)

Quick reference:

- **Service code:** `src/services/emailReminderService.js`
- **Cloud Function:** `api/emailReminders.js`
- **Setup guide:** `EMAIL_REMINDERS_SETUP.md`
- **Implementation summary:** `GST_FILING_STATUS_IMPLEMENTATION.md`

## SendGrid Free Tier

- ✅ 100 emails per day
- ✅ Unlimited contacts
- ✅ Free account
- ✅ Full email tracking

Upgrade if you need more emails.

---

**You're all set! Email reminders are now live. 🎉**
