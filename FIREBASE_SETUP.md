# Firebase Configuration Guide

## Why Authentication is Failing

Your Firebase credentials are currently **placeholder values**. You need to replace them with your actual Firebase project credentials.

## Step-by-Step Setup

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select existing project
3. Follow the setup wizard

### 2. Get Your Credentials

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Click on your Web App (or create one if needed)
3. You'll see your credentials like this:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "G-XXXXXXXXXX",
};
```

### 3. Update Your Config

Replace the values in `src/config/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_KEY_FROM_FIREBASE_CONSOLE",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "G-XXXXXXXXXX",
};
```

### 4. Enable Authentication Methods

1. In Firebase Console, go to **Authentication**
2. Click **Get Started**
3. Enable **Email/Password** provider
4. Click **Enable** and **Save**

### 5. Create Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click **Create Database**
3. Choose **Production mode**
4. Select your region
5. Click **Create**

### 6. Set Security Rules

In Firestore, go to **Rules** tab and replace with:

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

Click **Publish**.

## Testing

1. Update `src/config/firebase.js` with your credentials
2. Run `npm start`
3. Try signing up with a test account
4. Try logging in

## Common Issues

### "auth/invalid-api-key"

- Firebase credentials are still placeholders
- Replace with actual credentials from Firebase Console

### "auth/operation-not-allowed"

- Email/Password authentication not enabled
- Go to Firebase Console → Authentication → Enable Email/Password

### "Firestore permission denied"

- Security rules not set up
- Add the security rules from Step 6 above

### User data not saving

- Firestore database not created
- Create Firestore database in Firebase Console

## What Your Credentials Should Look Like

✅ **Real Credentials (Example):**

```
apiKey: "AIzaSyC1bQQ7xf_nQ9FhgLk2h-vL8qZZXyZ123Ab"
authDomain: "gst-buddy-compliance-prod.firebaseapp.com"
projectId: "gst-buddy-compliance-prod"
storageBucket: "gst-buddy-compliance-prod.appspot.com"
messagingSenderId: "123456789012"
appId: "1:123456789012:web:abcdef1234567890abcdef"
```

❌ **Current Placeholder (Won't Work):**

```
apiKey: "AIzaSyD8qZqL9x_L9Q8K_L9Q8K_L9Q8K_L9Q8K" ← Dummy key
authDomain: "gst-buddy-compliance.firebaseapp.com"
projectId: "gst-buddy-compliance" ← May not exist
```

## Next Steps

1. **Create Firebase Project** - Go to Firebase Console
2. **Get Your Credentials** - Copy from Project Settings
3. **Update firebase.js** - Replace placeholder values
4. **Enable Authentication** - Enable Email/Password in Console
5. **Create Firestore** - Create database in Console
6. **Add Security Rules** - Add rules from Step 6
7. **Test Login/Signup** - Should now work!

---

**Once you have real Firebase credentials, authentication will work immediately!**
