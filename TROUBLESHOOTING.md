# Authentication Troubleshooting Guide

## Problem: Failed to Login / Create Account

### Root Causes & Solutions

---

## ❌ Issue #1: Firebase Credentials Not Set

**Symptoms:**

- Login/Signup fails immediately
- Console shows "Invalid API Key" or generic error
- Nothing happens when you try to authenticate

**Solution:**

1. Open `src/config/firebase.js`
2. Replace placeholder values with **real Firebase credentials**
3. See **FIREBASE_SETUP.md** for step-by-step instructions

---

## ❌ Issue #2: Email/Password Authentication Not Enabled

**Symptoms:**

- Get error like "auth/operation-not-allowed"
- Firebase says authentication is disabled

**Solution:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication** → **Sign-in method**
4. Click **Email/Password**
5. Toggle **Enable** to ON
6. Click **Save**

---

## ❌ Issue #3: Firestore Database Not Created

**Symptoms:**

- Login works but redirects fail
- User data not saving
- Console shows Firestore errors

**Solution:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Go to **Firestore Database**
3. Click **Create Database**
4. Choose **Production mode**
5. Select your region
6. Click **Create**

---

## ❌ Issue #4: Firestore Security Rules Not Set

**Symptoms:**

- Login/Signup works
- But user data not saving
- "Permission denied" in console

**Solution:**

1. Go to Firestore in Firebase Console
2. Click **Rules** tab
3. Replace all content with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own documents
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

4. Click **Publish**

---

## ❌ Issue #5: Network/CORS Issues

**Symptoms:**

- Request fails with CORS error
- "Blocked by CORS policy"

**Solution:**

1. Make sure you're using `https://` in production
2. Firebase automatically handles CORS
3. Check browser console for exact error
4. Try incognito/private window to clear cache

---

## ✅ Testing Checklist

Before trying to authenticate, verify:

- [ ] Firebase project created
- [ ] Real credentials in `src/config/firebase.js`
- [ ] Email/Password authentication enabled
- [ ] Firestore database created
- [ ] Security rules published
- [ ] App running on `http://localhost:3000` (or configured port)

---

## 🔍 Debugging Steps

### Step 1: Check Firebase Config

Open browser console (F12) and look for:

```
🔥 Firebase Config Status:
   Project ID: gst-buddy-compliance
   Auth Domain: gst-buddy-compliance.firebaseapp.com
   API Key Valid: false ← If this is false, update credentials!
```

### Step 2: Check Console Errors

1. Press F12 to open Developer Tools
2. Go to **Console** tab
3. Look for Firebase error messages
4. Common errors:
   - `auth/invalid-api-key` → Update firebase.js
   - `auth/operation-not-allowed` → Enable Email/Password auth
   - `permission-denied` → Update Firestore rules

### Step 3: Test in Incognito

- Clear cache issues
- Try signing up in incognito window
- See if that works

### Step 4: Check Firebase Console

1. Go to Firebase Console
2. Click your project
3. Go to **Authentication** → **Users**
4. After signup, does a user appear here?
   - **YES** → Auth works, check Firestore rules
   - **NO** → Auth not working, update credentials

---

## 🚀 Quick Start - Do This Now

### 1. Get Your Firebase Credentials

```
Go to: https://console.firebase.google.com/
1. Create/Select project
2. Click gear icon → Project Settings
3. Copy the firebaseConfig
```

### 2. Update firebase.js

```javascript
// src/config/firebase.js
const firebaseConfig = {
  apiKey: "YOUR_REAL_API_KEY", // ← Paste your key
  authDomain: "your-project.firebaseapp.com", // ← Paste domain
  projectId: "your-project-id", // ← Paste project ID
  storageBucket: "your-project.appspot.com", // ← Paste bucket
  messagingSenderId: "YOUR_SENDER_ID", // ← Paste sender ID
  appId: "YOUR_APP_ID", // ← Paste app ID
};
```

### 3. Enable Authentication

```
Firebase Console → Authentication → Email/Password → Enable
```

### 4. Create Firestore

```
Firebase Console → Firestore Database → Create Database → Production mode
```

### 5. Add Security Rules

```
Firebase Console → Firestore → Rules →
(Copy from Step 4 in "Issue #4" above)
```

### 6. Restart App

```bash
npm start
```

### 7. Test

- Try signing up: `http://localhost:3000/signup`
- Check Firebase Console for new user
- Try logging in

---

## 📋 What Should Happen

### Successful Signup Flow:

```
1. Fill signup form
2. Click "Create Account"
3. Shows "Account created successfully!"
4. Auto-redirects to dashboard
5. Firebase Console shows new user
6. Firestore shows user document
```

### Successful Login Flow:

```
1. Enter email and password
2. Click "Login"
3. Auto-redirects to dashboard
4. User name shown in navbar
```

---

## ⚠️ Common Error Messages & Fixes

| Error                        | Cause                      | Fix                               |
| ---------------------------- | -------------------------- | --------------------------------- |
| `auth/invalid-api-key`       | Placeholder credentials    | Update firebase.js with real keys |
| `auth/operation-not-allowed` | Email/Password not enabled | Enable in Firebase Console        |
| `permission-denied`          | Firestore rules wrong      | Update security rules             |
| `auth/email-already-in-use`  | Email already registered   | Use different email or login      |
| `auth/user-not-found`        | Email not registered       | Try signing up first              |
| `auth/wrong-password`        | Incorrect password         | Check password, try again         |
| `Failed to compile`          | Code syntax error          | Already fixed! Just restart       |

---

## 📞 Still Not Working?

### Check These Files:

1. **src/config/firebase.js** - Has real credentials?
2. **src/context/AuthContext.jsx** - Has onAuthStateChanged listener
3. **src/services/authService.js** - Has signup/login functions
4. **src/pages/LoginPage.jsx** - Uses login function
5. **src/pages/SignupPage.jsx** - Uses signup function

### Check Firebase Console:

1. Authentication → Users tab → See users after signup?
2. Firestore → users collection → See user documents?
3. Rules → Shows your security rules?

### Check Browser Console:

1. Press F12
2. Go to Console tab
3. Look for red errors
4. Look for Firebase debug messages

---

## 🎯 Success Indicators

✅ When authentication is working:

- User appears in Firebase Console → Authentication → Users
- User document appears in Firestore
- Can login after signup
- Dashboard shows user's name
- Refresh page keeps you logged in

❌ When authentication is NOT working:

- No user in Firebase Console after signup
- Console shows Firebase errors
- Can't login even with correct credentials
- Always redirected to login page

---

## 📖 Documentation

- **FIREBASE_SETUP.md** - Complete Firebase setup steps
- **AUTHENTICATION.md** - Technical authentication reference
- **QUICK_START.md** - Getting started guide

---

## 🆘 Need More Help?

1. Check **FIREBASE_SETUP.md** for step-by-step setup
2. Read **AUTHENTICATION.md** for how the system works
3. Review **QUICK_START.md** for testing procedures
4. Check Firebase official docs: https://firebase.google.com/docs/auth

---

**Most common cause: Placeholder Firebase credentials. Update them and it will work! 🚀**
