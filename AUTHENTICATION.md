# Real-Time Authentication Implementation

This document describes the real-time authentication system implemented for the GST Buddy Compliance project using Firebase and React Context API.

## Overview

The authentication system provides:

- Real-time user state management with Firebase Authentication
- Email/password based signup and login
- Real-time form validation during signup and login
- Password strength indicator
- Email verification support
- Session persistence with localStorage
- Automatic redirect based on authentication status
- Centralized auth service layer

## Project Structure

```
src/
├── context/
│   └── AuthContext.jsx          # React Context for auth state management
├── hooks/
│   └── useAuth.js               # Custom hook for accessing auth context
├── services/
│   └── authService.js           # Firebase auth operations
├── pages/
│   ├── LoginPage.jsx            # Login page with real-time validation
│   ├── SignupPage.jsx           # Signup page with enhanced validation
│   └── Dashboard.jsx            # Protected dashboard
└── App.jsx                      # Main app with AuthProvider wrapper
```

## Key Features

### 1. AuthContext (src/context/AuthContext.jsx)

Provides centralized authentication state management using:

- `onAuthStateChanged()`: Real-time Firebase auth listener
- User data fetched from Firestore
- Automatic logout handling
- Error management

**Exposed State:**

```javascript
{
  user, // Current user object with profile data
    loading, // Loading state during auth checks
    error, // Error messages
    isAuthenticated, // Boolean auth status
    logout, // Function to logout user
    clearError, // Function to clear error messages
    setUser; // Manual user state setter (if needed)
}
```

### 2. useAuth Hook (src/hooks/useAuth.js)

Easy access to authentication context throughout the app:

```javascript
const { user, loading, isAuthenticated, logout } = useAuth();
```

### 3. Auth Service (src/services/authService.js)

All Firebase authentication operations in one place:

#### Functions Available:

- **`signup(email, password, userData)`**

  - Creates new user account
  - Stores user data in Firestore
  - Sends email verification
  - Returns Firebase user credential

- **`login(email, password)`**

  - Authenticates user with credentials
  - Updates last login timestamp
  - Returns Firebase user credential

- **`logout()`**

  - Signs out current user
  - Clears session data

- **`sendPasswordReset(email)`**

  - Sends password reset email

- **`sendVerificationEmail()`**

  - Sends email verification to current user

- **`getCurrentUserData()`**

  - Fetches current user with profile data
  - Returns combined Firebase + Firestore user data

- **`listenToAuthStateChange(callback)`**

  - Real-time auth listener
  - Executes callback on auth state changes

- **`updateUserProfile(updates)`**
  - Updates user profile information
  - Stores changes in Firestore

### 4. LoginPage (src/pages/LoginPage.jsx)

Enhanced features:

- Real-time email validation
- Real-time password validation
- Visual feedback for errors
- Password visibility toggle
- Disabled button state while loading
- Auto-redirect if already logged in
- Proper error messages for different scenarios

### 5. SignupPage (src/pages/SignupPage.jsx)

Enhanced features:

- Real-time field validation for each input
- Password strength indicator
- GSTIN format validation (optional field)
- Email format validation
- Confirm password matching
- Field-level error messages
- Success message before redirect
- Scrollable form for mobile devices

### 6. App.jsx

- Wrapped with `AuthProvider` for global auth state
- Uses `useAuth()` hook in AppRoutes component
- Automatic redirects based on auth status
- Shows loading screen during auth verification

## Authentication Flow

### Signup Flow

```
1. User fills signup form
2. Real-time validation on each field
3. Form submission triggers signup()
4. Firebase creates user account
5. User data stored in Firestore
6. Email verification sent
7. User automatically logged in
8. Redirects to dashboard
```

### Login Flow

```
1. User enters email/password
2. Real-time validation
3. Form submission triggers login()
4. Firebase authenticates credentials
5. Last login updated in Firestore
6. AuthContext listener captures auth state change
7. User data fetched from Firestore
8. Redirects to dashboard
```

### Session Persistence

```
1. App loads
2. AuthContext initializes with onAuthStateChanged listener
3. If user is logged in, auth data is restored
4. User object populated from Firestore
5. App shows loading screen during check
6. After check, user is redirected to dashboard or login
```

## Usage Examples

### In Components

```javascript
import { useAuth } from "../hooks/useAuth";

function MyComponent() {
  const { user, isAuthenticated, logout, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!isAuthenticated) return <div>Please login</div>;

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Signup Example

```javascript
import { signup } from "../services/authService";

const handleSignup = async () => {
  try {
    await signup(email, password, {
      name: "John Doe",
      shopName: "My Shop",
      gstin: "27AAHCT5055K1Z0",
    });
    // User will be automatically logged in via AuthContext
  } catch (error) {
    console.error("Signup failed:", error);
  }
};
```

### Login Example

```javascript
import { login } from "../services/authService";

const handleLogin = async () => {
  try {
    await login(email, password);
    // User will be automatically logged in via AuthContext
  } catch (error) {
    console.error("Login failed:", error);
  }
};
```

## Firebase Security Rules

Ensure these Firestore security rules are set:

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

## Firebase Authentication Settings

Enable these providers in Firebase Console:

- Email/Password authentication
- (Optional) Google Sign-in
- (Optional) Phone authentication

## Error Handling

Common error codes handled:

- `auth/user-not-found` - Email not registered
- `auth/wrong-password` - Incorrect password
- `auth/email-already-in-use` - Email already registered
- `auth/weak-password` - Password too weak
- `auth/invalid-email` - Invalid email format
- `auth/user-disabled` - Account disabled
- `auth/too-many-requests` - Too many failed attempts

## Validation Rules

### Email

- Required field
- Must be valid email format

### Password

- Minimum 6 characters
- Recommended: uppercase, lowercase, numbers

### Password Strength Indicator

- Weak: < 2 criteria met
- Fair: 2 criteria met
- Good: 3 criteria met
- Strong: 4 criteria met
- Very Strong: All 5 criteria met

Criteria:

1. Length >= 8 characters
2. Contains lowercase letters
3. Contains uppercase letters
4. Contains numbers
5. Contains special characters (@$!%\*?&)

### GSTIN (Indian context)

- Optional field
- Format: 2 digits + 5 letters + 4 digits + 1 letter + 1 digit + Z + 1 alphanumeric
- Example: `27AAHCT5055K1Z0`

## Updating User Profile

```javascript
import { updateUserProfile } from "../services/authService";

await updateUserProfile({
  name: "New Name",
  shopName: "New Shop",
  gstin: "New GSTIN",
});
```

## Logout

```javascript
const { logout } = useAuth();

const handleLogout = async () => {
  await logout();
  // User will be redirected to login page automatically
};
```

## Protected Routes

The ProtectedRoute component checks `user` prop:

```javascript
<Route element={<ProtectedRoute user={user} />}>
  <Route path="/dashboard" element={<Dashboard />} />
</Route>
```

## Environment Variables

Ensure your Firebase config is properly set in `src/config/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

## Testing

### Test Signup

1. Go to `/signup`
2. Fill in form with valid data
3. Verify real-time validation works
4. Submit and check for verification email

### Test Login

1. Go to `/login`
2. Enter credentials from signup
3. Verify real-time validation
4. Check dashboard access
5. Verify session persistence on refresh

### Test Logout

1. Click logout button
2. Verify redirect to login page
3. Verify localStorage is cleared

## Future Enhancements

- [ ] Email verification requirement before access
- [ ] OAuth integration (Google, GitHub)
- [ ] Two-factor authentication (2FA)
- [ ] Social login options
- [ ] Password reset flow
- [ ] Account recovery options
- [ ] Session timeout
- [ ] Device tracking
- [ ] Login history
- [ ] Account deletion option

## Troubleshooting

### User not persisting on refresh

- Check Firebase `onAuthStateChanged` listener
- Verify Firestore security rules allow read

### Validation not working

- Check field names in form match validation logic
- Verify regex patterns are correct

### Redirect loops

- Check ProtectedRoute component logic
- Verify isAuthenticated state is updating

### Slow auth state updates

- Check Firestore queries for performance
- Consider caching user data

## Security Best Practices

1. ✅ Never store passwords in localStorage
2. ✅ Use HTTPS only
3. ✅ Implement CSRF protection
4. ✅ Validate on both client and server
5. ✅ Use Firebase security rules
6. ✅ Regular security audits
7. ✅ Monitor for suspicious activity
8. ✅ Keep dependencies updated

## Support

For issues or questions about the authentication system, refer to:

- Firebase Documentation: https://firebase.google.com/docs/auth
- React Context API: https://react.dev/reference/react/createContext
