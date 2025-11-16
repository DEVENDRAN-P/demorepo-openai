# Quick Start Guide - Real-Time Authentication

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

All required packages are already in `package.json`:

- firebase (for authentication)
- react-router-dom (for routing)
- react-i18next (for translations)

### 2. Firebase Configuration

Update your Firebase config in `src/config/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "G-XXXXXXXXXX",
};
```

Get these from: https://console.firebase.google.com/

### 3. Enable Authentication Methods

In Firebase Console:

1. Go to Authentication → Sign-in method
2. Enable **Email/Password**
3. (Optional) Enable Google Sign-in

### 4. Setup Firestore Database

In Firebase Console:

1. Go to Firestore Database
2. Create database in production mode
3. Add the security rules from AUTHENTICATION.md

### 5. Run the Project

```bash
npm start
```

The app will run on `http://localhost:3000`

## Quick Test

### Create a Test Account

1. Open http://localhost:3000
2. Click "Create one now" to go to signup
3. Fill in the form:
   - Full Name: Test User
   - Email: test@example.com
   - Password: TestPass123!
4. Click "Create Account"

### Login with Test Account

1. Go to http://localhost:3000/login
2. Enter email: test@example.com
3. Enter password: TestPass123!
4. Click "Login"

You should be redirected to the dashboard.

## Features Implemented

### Real-Time Validation

#### Signup Page

- ✅ Full Name validation (min 2 characters)
- ✅ Email format validation
- ✅ Password strength indicator
- ✅ Confirm password matching
- ✅ GSTIN format validation (optional)
- ✅ Field-level error messages

#### Login Page

- ✅ Email format validation
- ✅ Password length validation
- ✅ Real-time error clearing on input
- ✅ Password visibility toggle

### Authentication Features

- ✅ Email/password signup and login
- ✅ Session persistence
- ✅ Real-time auth state management
- ✅ Automatic redirects
- ✅ Protected routes
- ✅ User profile data storage
- ✅ Email verification (auto-sent)
- ✅ Last login tracking
- ✅ Logout functionality

## File Structure

New files created:

```
src/
├── context/
│   └── AuthContext.jsx (189 lines)
├── hooks/
│   └── useAuth.js (16 lines)
├── services/
│   └── authService.js (192 lines)
```

Files modified:

```
src/
├── pages/
│   ├── LoginPage.jsx (enhanced with real-time validation)
│   ├── SignupPage.jsx (enhanced with validation & strength indicator)
└── App.jsx (refactored to use AuthContext)
```

Documentation:

```
├── AUTHENTICATION.md (comprehensive guide)
└── QUICK_START.md (this file)
```

## Key Components

### AuthContext

- Manages global authentication state
- Listens to real-time auth changes
- Provides user data and auth status

### useAuth Hook

```javascript
const { user, loading, isAuthenticated, logout } = useAuth();
```

### authService

```javascript
import { signup, login, logout } from "../services/authService";
```

## API Reference

### Signup

```javascript
await signup(email, password, {
  name: "John Doe",
  shopName: "My Shop",
  gstin: "27AAHCT5055K1Z0",
});
```

### Login

```javascript
await login(email, password);
```

### Logout

```javascript
const { logout } = useAuth();
await logout();
```

## Common Issues & Solutions

### Issue: "Cannot find module 'AuthContext'"

**Solution:** Ensure AuthContext.jsx is in `src/context/` folder

### Issue: Login fails with "auth/invalid-credential"

**Solution:** Check your email and password are correct

### Issue: User data not showing

**Solution:** Verify Firestore security rules are set correctly

### Issue: Real-time validation not working

**Solution:** Check that field names match the validation logic

## Next Steps

1. **Email Verification**: Add requirement for users to verify email before access
2. **Password Reset**: Implement forgot password functionality
3. **Social Login**: Add Google and GitHub authentication
4. **Profile Update**: Let users update their profile information
5. **2FA**: Add two-factor authentication
6. **Session Management**: Add auto-logout on inactivity

## Environment Setup (Development)

### Prerequisites

- Node.js 16+
- npm 8+
- Firebase account

### Development Commands

```bash
# Start development server
npm start

# Build for production
npm build

# Run tests
npm test

# Run linter
npm run lint
```

## Deployment

### Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Deploy
firebase deploy
```

## Security Checklist

- [ ] Firebase API keys are in environment variables (not hardcoded)
- [ ] Firestore security rules are set to restrict unauthorized access
- [ ] Email/password authentication is enabled in Firebase
- [ ] HTTPS is enabled for your domain
- [ ] Regular security audits are scheduled
- [ ] Password requirements are enforced
- [ ] Session timeouts are configured
- [ ] Rate limiting is enabled

## Support & Documentation

- **Firebase Auth Docs**: https://firebase.google.com/docs/auth
- **React Router Docs**: https://reactrouter.com/
- **React Hooks Docs**: https://react.dev/reference/react/useContext
- **Firebase Console**: https://console.firebase.google.com/

## Contact & Feedback

For issues or improvements, please refer to the main AUTHENTICATION.md guide or Firebase documentation.

---

**Last Updated:** November 15, 2025
**Version:** 1.0.0
