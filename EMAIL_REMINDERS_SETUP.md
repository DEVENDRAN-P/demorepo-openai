# Email Reminder System Setup Guide

## ⚠️ IMPORTANT: Use Brevo SMTP

This project now uses **Brevo SMTP** with Express.js for email delivery.

**See [BREVO_EMAIL_SETUP.md](BREVO_EMAIL_SETUP.md) for the current setup guide.**

---

## Overview

The email reminder system sends automatic emails to users when GST filing deadlines are approaching. It supports multiple reminder periods:

- **7 days before**: Upcoming reminder
- **3 days before**: Warning reminder
- **1 day before**: Urgent reminder
- **Today**: Critical reminder
- **After deadline**: Overdue reminder

## Architecture (Current)

The system consists of three main components:

1. **Frontend Service** (`src/services/emailReminderService.js`)
   - Checks bills for upcoming deadlines
   - Formats email content
   - Calls Express.js backend to send emails

2. **Backend Express Server** (`api/server.js`)
   - Receives email requests from client
   - Sends actual emails via Brevo SMTP
   - No Firebase Functions needed

3. **Firestore Database**
   - Stores email reminder history
   - Records sent emails in `users/{uid}/emailReminders` collection

## Quick Start

Follow the setup in [BREVO_EMAIL_SETUP.md](BREVO_EMAIL_SETUP.md) for:

1. Creating a Brevo account
2. Getting SMTP credentials
3. Setting up Express.js server
4. Testing email sending

---

## Legacy Approaches (Deprecated)

   ```bash
   firebase functions:config:set sendgrid.api_key="YOUR_SENDGRID_API_KEY"
   firebase functions:config:set email.from="noreply@yourdomain.com"
   ```

4. Create `functions/index.js` with code from `api/emailReminders.js`

5. Deploy:
   ```bash
   firebase deploy --only functions
   ```

#### Option C: Firebase Cloud Functions with Gmail

1. Follow steps 1-2 from Option B

2. Set Gmail credentials:

   ```bash
   firebase functions:config:set email.address="your-email@gmail.com"
   firebase functions:config:set email.password="your-app-password"
   ```

   Note: Use "App Password" from Google Account Security, not your regular password

3. Update `functions/index.js` to use Gmail

4. Deploy:
   ```bash
   firebase deploy --only functions
   ```

#### Option D: Custom Backend API

If you have your own backend server:

1. Create an endpoint that receives email data
2. Send emails using your preferred service (Nodemailer, SendGrid, etc.)
3. Update the Cloud Function URL in `.env`:
   ```
   REACT_APP_SEND_REMINDER_EMAIL_FUNCTION_URL=https://your-backend.com/api/send-email
   ```

### Step 2: Update Frontend Configuration

1. Add to `.env`:

   ```
   REACT_APP_SEND_REMINDER_EMAIL_FUNCTION_URL=https://your-region-your-project.cloudfunctions.net/sendReminderEmailHttp
   ```

2. If using custom backend, update the URL

### Step 3: Configure Firestore Rules

Add to `firestore.rules` to allow email reminder tracking:

```firestore
match /users/{uid}/emailReminders/{reminderId} {
  allow read, write: if request.auth.uid == uid;
}
```

Update your `firestore.rules` and deploy:

```bash
firebase deploy --only firestore:rules
```

### Step 4: Test the System

#### Test Individual Bill Reminder

```javascript
// In browser console or test file
import { sendManualReminder } from "./services/emailReminderService";

// Send reminder for specific bill
await sendManualReminder("billId123");
```

#### Test Bulk Reminder Check

```javascript
import { checkAndSendBillReminders } from "./services/emailReminderService";

// Check all bills and send reminders if needed
const result = await checkAndSendBillReminders();
console.log(result);
// Output: { success: true, remindersSent: [...], message: '...' }
```

## Features

### Automatic Daily Check

When using Cloud Functions with scheduled trigger, the system automatically:

- Runs every day at 8:00 AM UTC
- Checks all users' bills
- Sends reminders based on deadline proximity
- Avoids duplicate emails (tracks sent reminders)

### Smart Reminder Scheduling

The system intelligently sends reminders based on days remaining:

| Days Until Deadline | Reminder Type | Frequency    |
| ------------------- | ------------- | ------------ |
| 7 days              | Upcoming      | Once         |
| 3 days              | Warning       | Once         |
| 1 day               | Urgent        | Once         |
| 0 days (Today)      | Critical      | Once         |
| < 0 days (Overdue)  | Overdue       | Once per day |

### Duplicate Prevention

Email reminders are recorded in Firestore:

```
users/{uid}/emailReminders/{docId}
├── billId: "bill123"
├── type: "three-days"
├── subject: "GST Filing Reminder: Due in 3 Days"
├── emailSent: "user@example.com"
├── sentDate: 2024-01-15T08:00:00Z
└── status: "sent"
```

The system checks this collection before sending to avoid duplicate emails.

## Email Templates

Emails are automatically formatted with:

- **URGENT**: When due today or overdue
- **Bill Details**: Invoice number, supplier, amount, deadline
- **Clear Call-to-Action**: Link to dashboard
- **Days Remaining**: Count down or overdue message

### Example Email

```
Subject: GST Filing Due in 3 Days - Invoice #INV-2024-001

Your GST filing deadline is approaching!

Bill Details:
- Invoice Number: INV-2024-001
- Supplier: ABC Supplies Inc
- Amount: ₹50,000.00
- Deadline: Wednesday, January 17, 2024 (3 days from now)
- Form: GSTR-1

Please file your GST return soon to avoid missing the deadline.

Login to your account: https://yourapp.com/dashboard

Thank you!
```

## Troubleshooting

### Emails Not Sending

1. **Check email service is configured**
   - Verify sendgrid.api_key or email credentials in Firebase config
   - Check `firebase functions:config:get`

2. **Check Cloud Function deployment**

   ```bash
   firebase functions:list
   # Should show: sendReminderEmailHttp, checkAndSendRemindersDaily
   ```

3. **Check function logs**

   ```bash
   firebase functions:log
   ```

4. **Verify Firestore rules allow writes**
   - Check that emailReminders collection can be written to
   - Check user authentication is working

5. **Test function directly**
   ```bash
   firebase functions:shell
   > sendReminderEmailHttp({subject: 'Test', body: 'Test', email: 'test@example.com'})
   ```

### Duplicate Emails

If receiving duplicate emails:

1. Check emailReminders collection for records
2. Verify Firestore rules aren't allowing duplicate writes
3. Check scheduled function runs (should be once daily)

### Rate Limiting

SendGrid has rate limits:

- **Free tier**: 100 emails/day
- **Paid tier**: Higher limits based on plan

If hitting limits, consider:

- Batch emails together
- Use premium SendGrid plan
- Implement queue system

## Integration with App

### Add Reminder Button to Bill Details

Update `BillDetails.jsx` to add manual reminder button:

```jsx
import { sendManualReminder } from "../services/emailReminderService";

// Inside component
const handleSendReminder = async () => {
  try {
    await sendManualReminder(bill.id);
    setSuccess("Reminder email sent successfully!");
  } catch (error) {
    setError(error.message);
  }
};

// In JSX
<button onClick={handleSendReminder}>📧 Send Reminder Email</button>;
```

### Display Reminder History

Show past reminders sent for a bill:

```jsx
import { getBillReminderHistory } from "../services/emailReminderService";

useEffect(() => {
  const loadHistory = async () => {
    const history = await getBillReminderHistory(userId, billId);
    setReminderHistory(history);
  };
  loadHistory();
}, [billId]);
```

## Advanced Configuration

### Custom Email Templates

Modify `getEmailTemplate()` in `emailReminderService.js` or `emailReminders.js` to customize:

- Email subject line
- Email body content
- HTML formatting
- Branding and signature

### Send Reminders to Multiple Emails

Update the email sending logic to send to:

- User email
- Accountant email (if available)
- Business owner email

### Integration with Other Systems

Connect reminders to:

- Slack notifications
- SMS via Twilio
- Push notifications
- Calendar integrations

## Production Checklist

- [ ] Email service credentials set up
- [ ] Cloud Function deployed and tested
- [ ] Firestore rules allow emailReminders collection
- [ ] Daily scheduled function is running
- [ ] Test email received successfully
- [ ] Duplicate prevention working (check Firestore)
- [ ] Error logging configured
- [ ] User privacy/consent obtained
- [ ] Email unsubscribe option added
- [ ] Error alerts set up

## Support

For issues or questions:

1. Check Cloud Function logs: `firebase functions:log`
2. Test sendReminderEmailHttp endpoint directly
3. Verify email service credentials
4. Check Firebase Console for function errors
5. Review Firestore Security Rules

## Next Steps

1. Choose and configure your email service
2. Deploy Cloud Functions
3. Test with manual reminder
4. Verify daily scheduled reminders are working
5. Monitor logs and adjust as needed
