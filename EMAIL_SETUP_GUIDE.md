# Email Reminder Setup Guide

This guide explains how to set up automatic email reminders for GST bills.

## Current Status ✅

The application now has a **working email system** that:

- ✅ Sends emails automatically when bills are uploaded
- ✅ Sends reminders based on deadline urgency (overdue, due today, due soon)
- ✅ Works via simple API endpoint (no complex Cloud Functions needed)
- ✅ Securely stores SendGrid API key on backend
- ✅ Can run locally for testing OR on Vercel for production

## How It Works

1. **User uploads a bill** → App automatically checks if deadline is approaching
2. **If due soon or overdue** → Email reminder is sent to the user
3. **Email comes from** → `noreplygstbuddy@gmail.com`
4. **Email contains** → Bill details, urgency level, and filing instructions

## Email Urgency Levels

| Urgency           | Days Until Due | Email   | Example           |
| ----------------- | -------------- | ------- | ----------------- |
| 🚨 OVERDUE ALERT  | Already passed | URGENT  | "13 days overdue" |
| ⏰ FINAL REMINDER | Today          | FINAL   | "Due TODAY"       |
| ⚠️ CRITICAL       | 1 day          | WARNING | "Due Tomorrow"    |
| ⚡ URGENT         | 2-3 days       | ACTION  | "Due in 2 days"   |
| 📌 REMINDER       | 4-7 days       | INFO    | "Due in 5 days"   |

## Quick Start: Test Locally (Recommended First)

### Step 1: Install Dependencies

```bash
cd demorepo-openai-main

# Install backend dependencies
npm install express cors axios dotenv

# Or use npm in the api folder
cd api && npm install express cors axios dotenv && cd ..
```

### Step 2: Ensure SendGrid API Key is Set

Check your `.env` file has:

```env
SENDGRID_API_KEY=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
```

### Step 3: Start Email API Server

Open a **new terminal** and run:

```bash
cd api
node server.js
```

You should see:

```
✅ GST Buddy Email API Server Running

📧 Email Endpoint: http://localhost:5000/api/sendEmail
🏥 Health Check: http://localhost:5000/health

Update .env with:
REACT_APP_SEND_EMAIL_API=http://localhost:5000/api/sendEmail
```

### Step 4: Verify `.env` has Local URL

Your `.env` should have:

```env
REACT_APP_SEND_EMAIL_API=http://localhost:5000/api/sendEmail
```

### Step 5: Start React App

In another terminal:

```bash
npm start
```

### Step 6: Test Email Sending

1. Login to the app
2. Upload a bill with a deadline within 7 days
3. Check console logs for email status
4. Check your email inbox for the reminder

If working → Ready to deploy to Vercel!

---

## Production: Deploy to Vercel

Once testing works locally, deploy to Vercel:

### Step 1: Deploy Email API to Vercel

```bash
# Install Vercel CLI globally
npm install -g vercel

# Deploy the API
vercel deploy

# This will:
# 1. Create a Vercel project
# 2. Deploy api/sendEmail.js
# 3. Return your API URL (e.g., https://gstbuddy-abc123.vercel.app)
```

### Step 2: Set Environment Variables on Vercel

```bash
vercel env add SENDGRID_API_KEY
# Paste: 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

vercel env add EMAIL_FROM
# Paste: noreplygstbuddy@gmail.com

# Redeploy with new environment
vercel deploy
```

Or set via Vercel Dashboard:

1. Go to https://vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Add both variables above

### Step 2: Set Environment Variables on Vercel

```bash
# Set SendGrid API Key
vercel env add SENDGRID_API_KEY
# Paste: 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

vercel env add EMAIL_FROM
# Paste: noreplygstbuddy@gmail.com

# Redeploy
vercel deploy
```

### Step 3: Update `.env` with Vercel URL

After deployment, Vercel will show your API URL.

Update `.env`:

```env
REACT_APP_SEND_EMAIL_API=https://your-vercel-url.vercel.app/api/sendEmail
```

Example:

```env
REACT_APP_SEND_EMAIL_API=https://gstbuddy-abc123.vercel.app/api/sendEmail
```

### Step 4: Restart React App

```bash
npm start
```

Emails will now be sent via the Vercel API! ✅

## Alternative: Using Custom Node.js Server

If deploying to your own server instead of Vercel:

If you prefer to deploy on your own server:

```bash
# Install dependencies
npm install axios

# Use the api/sendEmail.js with any Node.js framework:
# - Express
# - Next.js
# - Fastify
# - Hapi
```

Example with Express:

```javascript
const express = require("express");
const app = express();
const sendEmailHandler = require("./api/sendEmail");

app.post("/api/sendEmail", async (req, res) => {
  await sendEmailHandler(req, res);
});

app.listen(3000);
```

## Troubleshooting

### ❌ "API not reachable" Error

**Cause**: The API endpoint hasn't been deployed yet

**Solution**:

1. Run `vercel deploy` to create the API
2. Copy the returned URL
3. Update `REACT_APP_SEND_EMAIL_API` in `.env`
4. Restart the app

### ❌ "Invalid SendGrid API key" Error

**Cause**: SENDGRID_API_KEY environment variable not set on Vercel

**Solution**:

1. Go to Vercel Dashboard
2. Select your project → Settings → Environment Variables
3. Add `SENDGRID_API_KEY=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`
4. Redeploy with `vercel deploy`

### ❌ Emails Going to Spam

**Solution**:

- Check Spam folder first
- SendGrid may need DKIM/SPF records configured:
  - Go to SendGrid Dashboard
  - Settings → Sender Authentication
  - Follow instructions to verify domain

### ✅ Email Sent Successfully

Check Vercel logs:

```bash
vercel logs --follow
```

You should see:

```
✅ Email sent successfully to user@example.com
```

## API Endpoint Reference

### POST `/api/sendEmail`

**Request**:

```json
{
  "subject": "GST Filing Reminder",
  "body": "Your bill is due on...",
  "email": "user@example.com"
}
```

**Response (Success)**:

```json
{
  "success": true,
  "messageId": "sendgrid-1708000000000",
  "message": "Email sent successfully",
  "recipient": "user@example.com",
  "statusCode": 202
}
```

**Response (Error)**:

```json
{
  "error": "Failed to send email: Invalid email address"
}
```

## Testing Locally

To test the API locally before deploying:

```bash
# Install dependencies
cd api
npm install axios

# Set environment variables
export SENDGRID_API_KEY="your_key"
export EMAIL_FROM="noreplygstbuddy@gmail.com"

# Test the endpoint
curl -X POST http://localhost:3000/api/sendEmail \
  -H "Content-Type: application/json" \
  -d '{"subject":"Test","body":"Test message","email":"test@example.com"}'
```

## Next Steps

1. ✅ Deploy API to Vercel
2. ✅ Update `.env` with API URL
3. ✅ Restart the app
4. ✅ Upload a bill and test email

Need help? Check the browser console for detailed logs and error messages!
