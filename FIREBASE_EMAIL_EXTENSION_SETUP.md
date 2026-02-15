# Firebase Email Extension Setup Guide

## Overview

This guide sets up the **Firebase Firestore Send Email Extension** to automatically send emails when documents are written to the `mail` collection in Firestore.

**Why use this instead of SendGrid API?**

- ✅ No API key management issues
- ✅ Built into Firebase Console
- ✅ No backend code required
- ✅ Works with Gmail SMTP (free)
- ✅ Secure - passwords never exposed to frontend

---

## Step 1: Install Firebase Email Extension

### 1.1 Open Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **finalopenai-fc9c5**
3. Go to **Extensions** (left sidebar)
4. Click **Discover Extensions** or **Create from template**

### 1.2 Search for Email Extension

- Search for **"Send Email"** or **"Firestore Send Email"**
- Look for extension by **Google Cloud** (official)
- Click **Install in Console**

### 1.3 Configure the Extension

A configuration dialog will appear. Fill in:

| Field                         | Value                       |
| ----------------------------- | --------------------------- |
| **Cloud Functions location**  | `us-central1`               |
| **Firestore collection path** | `mail`                      |
| **SMTP provider**             | Gmail (choose in next step) |

Click **Install Extension** and wait 2-3 minutes for installation to complete.

---

## Step 2: Configure Gmail SMTP Settings

### 2.1 Create Gmail App Password for SMTP

You need a Gmail account with 2FA enabled:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Search for **"App passwords"** (or go to: Security → 2-Step Verification → App passwords)
3. Select: Device: **Mail**, OS: **Windows, Mac, Linux**
4. Click **Generate**
5. Copy the **16-character app password** (remove spaces)
   ```
   Example: abcd efgh ijkl mnop → abcdefghijklmnop
   ```

### 2.2 Configure Extension with Gmail SMTP

The extension configuration dialog should show SMTP fields:

| Field             | Value                                                |
| ----------------- | ---------------------------------------------------- |
| **SMTP Server**   | `smtp.gmail.com`                                     |
| **SMTP Port**     | `465`                                                |
| **SMTP Username** | `your-email@gmail.com`                               |
| **SMTP Password** | `abcdefghijklmnop` (16-char app password from above) |
| **Sender Email**  | `noreplygstbuddy@gmail.com` (or your email)          |
| **Sender Name**   | `GST Buddy`                                          |

> ✅ **Note**: If `noreplygstbuddy@gmail.com` is not configured, use your Gmail address and set it up later.

### 2.3 Finish Installation

- Review the configuration
- Accept permissions
- Click **Install Extension**
- Wait for completion (shows "Extension installed successfully")

---

## Step 3: Verify Firestore Rules

✅ The app already has the correct Firestore rules. Check:

```plaintext
// firestore.rules - Already configured for mail collection
match /mail/{mailId} {
  allow create: if request.auth != null;
  allow read, update: if true; // Extension can access
}
```

---

## Step 4: Configure App Environment Variable

Update `.env` with the sender email:

```bash
# .env (root directory)
REACT_APP_EMAIL_FROM=noreplygstbuddy@gmail.com
# OR use your Gmail address if sender not verified:
# REACT_APP_EMAIL_FROM=your-gmail@gmail.com
```

---

## Step 5: Test Email Sending

### 5.1 Restart the App

```bash
# Kill all existing processes
taskkill /F /IM node.exe 2>nul

# Start app
npm start
```

### 5.2 Upload a Bill to Trigger Email

1. Open app: http://localhost:3000
2. Login with test account
3. Upload a bill with deadline **within 7 days**
4. Watch browser console for logs:
   ```
   📧 Writing email to Firestore (Extension will send)
   ✅ Email queued successfully via Firebase Extension
   ```

### 5.3 Check Email Inbox

- Check your email inbox after 10-30 seconds
- Check **Spam** folder if not found
- Email should have subject like:
  - 🚨 "OVERDUE ALERT: GST Filing Required..."
  - ⏰ "FINAL REMINDER: GST Filing Due TODAY..."
  - ⚠️ "CRITICAL: GST Filing Due Tomorrow..."
  - ⚡ "Urgent: GST Filing Due in X Days..."

### 5.4 Verify in Firebase Console

1. Go to Firebase Console → **Firestore Database**
2. Look for `mail` collection
3. Documents should show:
   - `to`: recipient email
   - `message.subject`: email subject
   - `delivery.state`: `SUCCESS` or `IN_PROGRESS`
   - `delivery.error`: (if any error occurred)

---

## Troubleshooting

### ❌ Emails Not Arriving

**Problem**: Emails are queued but not being sent

**Solutions**:

1. **Check Firebase Extension Logs**
   - Go to Firebase Console → **Functions**
   - Look for `ext-firestore-send-email-...` functions
   - Click **Logs** to see errors

2. **Verify Gmail App Password**
   - Make sure 2FA is enabled on Gmail
   - App password must be 16 characters (no spaces)
   - Try removing and regenerating app password

3. **Check SMTP Configuration**
   - Go to Firebase Console → **Extensions**
   - Click the installed extension
   - Verify SMTP settings are correct

4. **Check Firestore Rules**
   - Go to **Firestore** → **Rules**
   - Ensure `mail` collection rules allow service account access

### ❌ Extension Won't Install

**Problem**: Installation fails or stuck

**Solution**:

- Try installing from different project
- Or use alternative: install via `firebase-cli` command:
  ```bash
  npm install -g firebase-tools
  firebase ext:install firestore-send-email --project=finalopenai-fc9c5
  ```

### ✅ Email Sending Works But Slow

**Normal behavior**:

- Firebase Extension runs asynchronously
- Emails usually arrive in 10-30 seconds
- During high demand may take up to 2 minutes

---

## Alternative: Use Different SMTP Provider

If you want to use Outlook, Yahoo, or corporate email instead of Gmail:

### Outlook/Hotmail SMTP Settings

```
Server: smtp.outlook.com
Port: 587 (TLS) or 465 (SSL)
Username: your-email@outlook.com
Password: Your Outlook password
```

### Corporate/Office 365 SMTP

```
Server: smtp.office365.com
Port: 587
Username: your-email@company.com
Password: Your Office 365 password
```

---

## How It Works (Diagram)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User uploads bill with deadline ≤ 7 days                 │
│    (BillUpload.jsx → Firebase)                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. emailReminderService.sendBillUploadReminder()            │
│    - Calculates urgency (overdue/critical/urgent/soon)      │
│    - Generates email subject & body                         │
│    - Calls sendReminderEmail()                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. sendReminderEmail()                                      │
│    - Writes document to firestore: db.collection('mail')   │
│    - Document contains: to, subject, message (html+text)    │
│    - Returns immediately (non-blocking)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Firebase Firestore Trigger                               │
│    - Extension watches 'mail' collection                    │
│    - When new document created → trigger function           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Firebase Extension sends email via SMTP/Gmail            │
│    - Reads email document from Firestore                    │
│    - Connects to Gmail SMTP server                          │
│    - Sends email to recipient                               │
│    - Updates document with delivery status                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Email arrives in user's inbox ✅                        │
│    User receives GST filing reminder with urgency level     │
└─────────────────────────────────────────────────────────────┘
```

---

## Code Changes Made

### emailReminderService.js

```javascript
// OLD: Called API endpoint (sendEmail.js)
const response = await axios.post(apiUrl, { subject, body, email });

// NEW: Write to Firestore (Extension sends automatically)
const mailDocRef = await addDoc(collection(db, "mail"), {
  to: emailData.email,
  message: {
    subject: emailData.subject,
    html: htmlBody,
    text: emailData.body,
  },
  from: "noreplygstbuddy@gmail.com",
  replyTo: "support@gstbuddy.ai",
  timestamp: serverTimestamp(),
});
```

### firestore.rules

```plaintext
// Added mail collection permissions
match /mail/{mailId} {
  allow create: if request.auth != null;
  allow read, update: if true; // Extension service account
}
```

---

## Summary

✅ **Installation Complete When**:

1. Firebase Extension installed in Console
2. SMTP credentials configured (Gmail app password)
3. Firestore rules updated for `mail` collection
4. `.env` updated with `REACT_APP_EMAIL_FROM`
5. App code refactored to write to Firestore

✅ **Email Flow**:

```
Bill Upload → Calculate Urgency → Write to Firestore →
Firebase Extension Sends Email → User Receives Email
```

✅ **No More Issues**:

- ❌ ~~SendGrid 403 errors~~
- ❌ ~~API key management~~
- ❌ ~~Backend server required~~

✅ **Ready to Use**: Just upload a bill and emails will send automatically!

---

## Need Help?

**Error in Firebase Extension Logs?**

1. Go to Firebase Console → **Functions** → Filter: `ext-firestore-send-email`
2. Click **Logs** and scroll to newest entries
3. Look for `ERROR` messages

**Email not arriving?**

1. Check spam folder
2. Verify test email address is correct
3. Check Gmail allows "Less secure apps" (if not using App Password)
4. Verify SMTP credentials in extension config

**Support**: Check [Firebase Extensions Documentation](https://firebase.google.com/docs/extensions)
