# ⚠️ Failed to Send Email: Vercel Setup Required

## Problem
You're seeing: **❌ Failed to send email: true**

This happens when the Brevo SMTP credentials are not configured on Vercel.

---

## Solution - Set Environment Variables on Vercel

### Step 1: Go to Vercel Dashboard
1. Visit [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your **gstbuddy** project (or demorepo-openai)

### Step 2: Open Settings
1. Click **Settings** (gear icon)
2. Go to **Environment Variables** (left sidebar)

### Step 3: Add BREVO_API_KEY
1. Click **Add New**
2. **Name**: `BREVO_API_KEY`
3. **Value**: Your Brevo SMTP password from [Brevo Dashboard SMTP Settings](https://dashboard.brevo.com/smtp)
4. **Environment**: Select `Production` and `Preview`
5. Click **Save**

### Step 4: Add EMAIL_FROM
1. Click **Add New**
2. **Name**: `EMAIL_FROM`
3. **Value**: `devendranp.it2024@citchennai.net`
4. **Environment**: Select `Production` and `Preview`
5. Click **Save**

### Step 5: Redeploy
1. Go to **Deployments** tab
2. Click the **⋯** menu on the latest deployment
3. Select **Redeploy**
4. Wait for deployment to complete (should see ✓ Ready)

---

## Testing

After redeployment, test the app:

1. Open https://gstbuddy.vercel.app (or your Vercel URL)
2. Upload a bill with deadline ≤ 7 days
3. You should see: ✅ "Sending reminder email..."
4. Check your email inbox for the reminder

---

## Troubleshooting

### If still failing after setting variables:

1. **Check Vercel logs:**
   - Vercel Dashboard → Deployments → Latest → Logs
   - Look for error with BREVO_API_KEY or EMAIL_FROM

2. **Verify variables are saved:**
   - Settings → Environment Variables
   - Confirm both BREVO_API_KEY and EMAIL_FROM are there

3. **Check variable values:**
   - BREVO_API_KEY should start with `xsmtpsib-`
   - EMAIL_FROM should be a valid email

4. **Look for Brevo errors:**
   - Check Vercel logs for "EAUTH" (authentication error)
   - Go to Brevo.com and verify your SMTP credentials are correct

### Common Issues

| Error | Cause | Fix |
|-------|-------|-----|
| 500 Error | Variables not set | Follow steps above |
| EAUTH | Invalid API key | Verify in Brevo dashboard |
| Connection refused | Wrong SMTP server | Check server: smtp-relay.brevo.com |
| 401 Unauthorized | Wrong credentials | Double-check key and username |

---

## For Development (Local Testing)

If testing locally without Vercel, the app uses the Express server:

```bash
# Terminal 1: Email server
cd api
node server.js

# Terminal 2: React app  
npm start
```

Then upload a bill to test email sending locally.

---

## Need Help?

1. Check [Brevo Documentation](https://www.brevo.com/help/) for SMTP settings
2. Verify API key in Brevo Dashboard: [SMTP & API](https://dashboard.brevo.com/smtp)
3. Check Vercel logs for detailed error messages
