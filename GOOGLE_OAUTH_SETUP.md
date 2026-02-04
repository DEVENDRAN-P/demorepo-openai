# Google OAuth Setup for Production Deployment

## Issue: Google Sign-Up/Sign-In Button Not Working on Vercel

The button works locally but disappears or fails silently in production. This is typically due to **unauthorized domains** in Firebase.

## Solution

### Step 1: Find Your Vercel Deployment URL

- Go to your [Vercel Dashboard](https://vercel.com/dashboard)
- Find your project
- Note the deployment URL (e.g., `your-project-name.vercel.app`)

### Step 2: Authorize Your Domain in Firebase

1. **Open Firebase Console:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select project: `finalopenai-fc9c5`

2. **Configure Authentication:**
   - Click **Authentication** in the left sidebar
   - Click the **Settings** tab (gear icon)
   - Scroll down to **"Authorized domains"**

3. **Add Your Domains:**
   - Click **"Add domain"**
   - Add these domains:
     - `localhost` (for local development)
     - `your-app-name.vercel.app` (your production domain)
     - Any custom domain you use

### Step 3: Verify Environment Variables in Vercel

Your `.env.production` already has Firebase config, but verify in Vercel:

1. Go to **Vercel Project Settings**
2. Click **Environment Variables**
3. Verify these are set:
   ```
   REACT_APP_FIREBASE_API_KEY=AIzaSyAGGaj2BhlcxdJXV5FY9aNwJFwKXkL2Za0
   REACT_APP_FIREBASE_AUTH_DOMAIN=finalopenai-fc9c5.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=finalopenai-fc9c5
   REACT_APP_FIREBASE_APP_ID=1:597968912139:web:8bb776619a3292f587ec0e
   ```

### Step 4: Redeploy

After authorizing the domain:

1. Push changes to your repository (or just redeploy the same code)
2. Vercel will automatically rebuild and deploy
3. Test Google Sign-Up/Sign-In on your live site

## Troubleshooting

### Still not working? Check browser console (F12):

- Look for any error messages in the **Console** tab
- Common errors:
  - `"The OAuth client was not found"` → Domain not authorized
  - `"popup_closed_by_user"` → User closed the popup (normal)
  - `"CORS error"` → Domain mismatch

### Enable Google OAuth in Firebase:

1. Go to **Authentication** → **Sign-in method**
2. Make sure **Google** is **enabled**

### Check Your OAuth App Settings:

1. In Firebase, go to **Project Settings** (gear icon, top-left)
2. Click **Service Accounts**
3. Click **Firebase Admin SDK** → **Python, Node.js, etc.**
4. Verify your project ID is correct: `finalopenai-fc9c5`

## Local Testing Checklist

- ✅ Google button shows on localhost
- ✅ Clicking opens Google OAuth popup
- ✅ Sign-in/Sign-up works
- ✅ User data appears in Firestore

## Production Testing Checklist

- ✅ Navigate to your Vercel domain
- ✅ Google button is visible
- ✅ Clicking opens Google OAuth popup
- ✅ Sign-in/Sign-up completes without errors
- ✅ User is redirected to dashboard

---

**If you're still having issues, share:**

1. Your Vercel deployment URL
2. Any error messages from browser console (F12)
3. Screenshot of your Firebase "Authorized domains" settings
