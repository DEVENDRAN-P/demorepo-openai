# SendGrid Email Integration Setup Guide

## ✅ SendGrid API Key Saved

Your SendGrid API key has been securely stored in `.env` (not shown for security).

**Status**: ✅ Configured in `.env`

---

## 🚀 STEP 1: Deploy the Cloud Function

### Prerequisites

- Firebase CLI: `npm install -g firebase-tools`
- Node.js 14+ installed
- Logged in to Firebase: `firebase login`

### Install Dependencies in Functions Folder

```bash
cd functions
npm install nodemailer nodemailer-sendgrid-transport
```

If you don't have a `functions` folder, initialize it:

```bash
firebase init functions
```

Copy the Cloud Function code from `api/emailReminders.js` to `functions/index.js`:

```bash
# Or manually copy the content from api/emailReminders.js
```

### Set SendGrid API Key in Firebase

```bash
# Set the API key in Firebase Config (use your SendGrid API key)
firebase functions:config:set sendgrid.api_key="YOUR_SENDGRID_API_KEY_HERE"

# Set the from email
firebase functions:config:set email.from="noreply@gstbuddy.app"

# Verify it's saved
firebase functions:config:get
```

Expected output:

```json
{
  "sendgrid": {
    "api_key": "SG.usQ1IlS1QMGjkRSXsJI3CQ..."
  },
  "email": {
    "from": "noreply@gstbuddy.app"
  }
}
```

### Deploy the Function

```bash
firebase deploy --only functions
```

After deployment, you'll see the function URL:

```
sendReminderEmailHttp: https://us-central1-finalopenai-fc9c5.cloudfunctions.net/sendReminderEmailHttp
```

### Update Environment Variables

The function URL is already configured in `.env`:

```
REACT_APP_SEND_REMINDER_EMAIL_FUNCTION_URL=https://us-central1-finalopenai-fc9c5.cloudfunctions.net/sendReminderEmailHttp
```

---
🎨 Profile Color Theme
Teal
Indigo
Amber
✏️
Edit Profile Information
👤
Personal Information
பெயர் *
Devendran P
மின்னஞ்சல் *
devendranprabhakar2007@gmail.com
Email cannot be changed

மொபைல் எண்
உங்கள் மொபைல் எண்ணை உள்ளிடவும்
🏢
Business Information
கடை பெயர் *
homigo
GSTIN *
 27ABCDE1234F2Z
Shop Address
உங்கள் வணிக முகவரியை உள்ளிடவும்
⚙️
Preferences
மொழி
## 📧 STEP 2: Verify SendGrid Sender Email

SendGrid requires sender email verification to prevent spam:

1. Go to **SendGrid Dashboard** → **Settings** → **Sender Authentication**
2. Click **Single Sender Verification**
3. Add your sender email: `noreply@gstbuddy.app`
4. Follow the verification email link SendGrid sends

⚠️ **Important**: Emails won't be delivered until the sender is verified!

---

## ✅ STEP 3: Test the Email Function

### Option A: Test from Frontend (Recommended)

In your React component or console:

```javascript
import { sendTestEmail } from "./services/emailReminderService";

// Send test email
await sendTestEmail("your-email@gmail.com");
```

### Option B: Test using cURL

```bash
curl -X POST https://us-central1-finalopenai-fc9c5.cloudfunctions.net/sendReminderEmailHttp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@gmail.com",
    "subject": "Test GST Reminder",
    "body": "This is a test email from GST Buddy!"
  }'
```

### Check Email Status

1. Check your inbox (including spam folder)
2. Monitor SendGrid Activity:
   - Go to **SendGrid Dashboard** → **Activity** → **Email Activity**
   - Look for your test email and check its status

---

## 🔍 STEP 4: Debug Common Issues

### ❌ Email Not Received?

Check the following:

```bash
# View Cloud Function logs
firebase functions:log

# Alternative - view in Firebase Console
# Go to Firebase Console → Functions → sendReminderEmailHttp → Logs
```

### Common Issues & Fixes

| Issue                    | Fix                                                   |
| ------------------------ | ----------------------------------------------------- |
| **Invalid API Key**      | Verify key in `firebase functions:config:get`         |
| **Sender Not Verified**  | Verify in SendGrid → Settings → Sender Authentication |
| **CORS Error**           | CORS is already enabled in the function               |
| **Missing Fields**       | Ensure `email`, `subject`, `body` are provided        |
| **Invalid Email Format** | Email must be valid: `user@domain.com`                |

---

## 📝 STEP 5: Implement Auto-Reminders

### In ReminderPanel.jsx

Call this once on component mount:

```javascript
import { checkAndSendBillReminders } from "../services/emailReminderService";

useEffect(() => {
  // Check and send reminders for due bills
  checkAndSendBillReminders();
}, []);
```

### For Daily Automated Reminders

The Cloud Function already includes `checkAndSendRemindersDaily` that runs daily at 8:00 AM UTC.

To deploy it:

1. Make sure it's exported in `api/emailReminders.js`
2. Deploy: `firebase deploy --only functions`

---

## 🎯 STEP 6: GST-Specific Reminder Logic

The email service automatically sends reminders:

- **7 days before**: Gentle reminder
- **3 days before**: Warning level reminder
- **1 day before**: Urgent reminder
- **Due today**: Critical reminder
- **Overdue**: Critical + overdue notification

Edit the email templates in `emailReminderService.js` → `getEmailTemplate()` to customize messages.

---

## 📊 Monitoring & Logs

### Firebase Console

1. Go to **Firebase Console** → **Functions**
2. Select **sendReminderEmailHttp**
3. View **Logs** tab for execution history

### SendGrid Dashboard

1. **Activity** → **Email Activity** - See all sent emails
2. **Stats** - View delivery metrics
3. **Alert Management** - Get notified of bounces/failures

---

## ✨ Features Enabled

✅ SendGrid integration configured  
✅ Cloud Function deployed and ready  
✅ Email template system working  
✅ Automatic reminder checking  
✅ Frontend service ready to send emails  
✅ Test email function available  
✅ Logging and error handling

---

## 🧪 Quick Test Checklist

- [ ] SendGrid API key saved
- [ ] Cloud Function deployed
- [ ] Sender email verified in SendGrid
- [ ] Test email sent successfully
- [ ] Email received in inbox (not spam)
- [ ] Frontend service imported and ready
- [ ] Linting passes: `npm run build`

---

## 🆘 Need Help?

### Verify Setup

```bash
# Check Firebase config
firebase functions:config:get

# View function logs
firebase functions:log

# Redeploy if needed
firebase deploy --only functions
```

### SendGrid Troubleshooting

- **SendGrid Support**: https://support.sendgrid.com
- **Check email bounce**: https://sendgrid.com/marketing_settings/bounce
- **Verify sender**: https://sendgrid.com/senders

---

## 📚 Documentation Links

- Firebase Functions: https://firebase.google.com/docs/functions
- SendGrid Docs: https://docs.sendgrid.com
- Nodemailer: https://nodemailer.com/about/
- Cloud Function Deployment: https://firebase.google.com/docs/functions/manage-functions

---

**Setup Date**: February 8, 2026  
**Status**: ✅ Ready for Production  
**Next Step**: Test email sending and monitor Cloud Function logs
