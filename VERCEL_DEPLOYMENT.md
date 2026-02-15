# Vercel Deployment Guide

## ⚠️ CRITICAL: Environment Variables Setup

Your app requires these environment variables to be set in Vercel before deployment will succeed.

### Step 1: Go to Vercel Project Settings

1. Open your project on Vercel: https://vercel.com/dashboard
2. Select your project: **openaibuildathonproject**
3. Go to **Settings** → **Environment Variables**

### Step 2: Add These Variables

Copy and paste each variable exactly:

| Variable Name | Value |
|--|--|
| `REACT_APP_FIREBASE_API_KEY` | *(Get from Firebase Console Settings → General)* |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | *(From .env.example file)* |
| `REACT_APP_FIREBASE_PROJECT_ID` | *(From .env.example file)* |
| `REACT_APP_FIREBASE_DATABASE_URL` | *(From .env.example file)* |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | *(From .env.example file)* |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | *(From .env.example file)* |
| `REACT_APP_FIREBASE_APP_ID` | *(From .env.example file)* |
| `REACT_APP_FIREBASE_MEASUREMENT_ID` | *(From .env.example file)* |
| `REACT_APP_GROQ_API_KEY` | *(Get from console.groq.com/keys)* |
| `CI` | `false` |

### Step 3: Apply to Environments

Select which environments these apply to:
- ✅ Production
- ✅ Preview
- ✅ Development

### Step 4: Redeploy

After adding all variables:
1. Go back to **Deployments**
2. Click the three dots (...) on the latest failed deployment
3. Select **Redeploy**

Wait 1-2 minutes for the build to complete.

## ✅ Verification

Once deployed, verify it works:
1. Check the deployment status turns green ✅
2. Open the deployment URL
3. Test login functionality
4. Test AI chat with Groq

## 🔒 Security Notes

⚠️ **IMPORTANT**: These are production credentials. In a real production app:
- Use separate API keys for production and development
- Rotate keys regularly
- Monitor API usage
- Consider using a secrets management service

## 🆘 If Build Still Fails

Check the Vercel build logs:
1. Click on the failed deployment
2. Scroll to **Build Logs**
3. Look for error messages
4. Common issues:
   - Missing environment variables (check spelling exactly!)
   - Node version mismatch (Vercel defaults to Node 18+)
   - Missing dependencies (check `package.json`)

## 🚀 For Production (Beyond Hackathon)

Before launching to real users:
- [ ] Use environment-specific keys
- [ ] Set up error tracking (Sentry)
- [ ] Enable CORS properly
- [ ] Add rate limiting on backend
- [ ] Setup database backups
- [ ] Configure CDN caching
- [ ] Add SSL certificate
- [ ] Setup monitoring and alerts
