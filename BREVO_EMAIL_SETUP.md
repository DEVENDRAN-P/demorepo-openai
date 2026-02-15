# Brevo SMTP Email Setup Guide

## Overview

This project uses **Brevo SMTP** (formerly Sendinblue) for automatic GST filing email reminders.

**Features:**
- ✅ Automatic reminder emails on bill upload
- ✅ Urgency-based email subjects
- ✅ Reliable SMTP delivery
- ✅ No API key exposed to frontend
- ✅ Express.js backend integration

---

## Configuration

### 1. Get Brevo SMTP Credentials

1. Sign up at [Brevo.com](https://www.brevo.com/)
2. Go to **Settings → SMTP & API**
3. Note your **SMTP credentials**:
   - **Server**: `smtp-relay.brevo.com`
   - **Port**: `587` (TLS)
   - **Username**: `your_brevo_username@smtp-brevo.com`
   - **Password**: Your SMTP key

### 2. Update Environment Variables

Create/update `.env` file in root and `api/.env`:

```bash
# .env (root)
BREVO_API_KEY=your_brevo_smtp_key_here
EMAIL_FROM=your_registered_email@domain.com
REACT_APP_EMAIL_FROM=your_registered_email@domain.com
REACT_APP_SEND_EMAIL_API=http://localhost:5000/api/sendEmail

# api/.env  
BREVO_API_KEY=your_brevo_smtp_key_here
EMAIL_FROM=your_registered_email@domain.com
```

### 3. Install Dependencies

```bash
cd api
npm install nodemailer
```

### 4. Start Email Server

```bash
# Terminal 1: Email API
cd api
node server.js

# Terminal 2: React App
npm start
```

---

## How It Works

```
User uploads bill with deadline ≤ 7 days
         ↓
App calls: sendBillUploadReminder()
         ↓
Calculates urgency level
         ↓
POST to: http://localhost:5000/api/sendEmail
         ↓
Express server connects to Brevo SMTP
         ↓
Email sent successfully
```

---

## Email Urgency Levels

| Days Remaining | Symbol | Subject |
|---|---|---|
| Past deadline | 🚨 | "OVERDUE ALERT: GST Filing Required..." |
| 0 days | ⏰ | "FINAL REMINDER: GST Filing Due TODAY..." |
| 1 day | ⚠️ | "CRITICAL: GST Filing Due Tomorrow..." |
| 2-3 days | ⚡ | "Urgent: GST Filing Due in X Days..." |
| 4-7 days | 📌 | "GST Filing Reminder..." |

---

## Troubleshooting

### Email Not Sending

**Check 1**: Verify Brevo SMTP username
```bash
# Should be: username@smtp-brevo.com
# NOT: your_email@domain.com
```

**Check 2**: Verify SMTP key is correct
```bash
# Go to Brevo → Settings → SMTP & API
# Copy password from SMTP section
```

**Check 3**: Check Express server logs
```bash
# Terminal running: node api/server.js
# Look for error messages like:
# "Authentication failed" → Check SMTP user/pass
# "Connection refused" → Check server is running
```

**Check 4**: Verify sender email
```bash
# EMAIL_FROM must match your Brevo account email
# Go to Brevo Dashboard to verify registered email
```

---

## Production Deployment (Vercel)

For production, deploy Express server to Vercel or similar:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel deploy

# Set environment variables on Vercel
vercel env add BREVO_API_KEY
vercel env add EMAIL_FROM

# Update .env with Vercel URL
REACT_APP_SEND_EMAIL_API=https://your-vercel-deployment.vercel.app/api/sendEmail
```

---

## Testing

Send a test email via API:

```bash
curl -X POST http://localhost:5000/api/sendEmail \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test Email",
    "body": "This is a test from GST Buddy",
    "email": "yourtest@example.com"
  }'
```

Expected response:
```json
{
  "success": true,
  "messageId": "<email-id>@domain.com",
  "message": "Email sent successfully via Brevo SMTP",
  "recipient": "yourtest@example.com",
  "statusCode": 200
}
```

---

## Support

For issues:
1. Check [Brevo Documentation](https://www.brevo.com/help/)
2. Verify SMTP settings in Brevo Dashboard
3. Check Express server logs for connection errors
4. Ensure port 5000 is not blocked by firewall
