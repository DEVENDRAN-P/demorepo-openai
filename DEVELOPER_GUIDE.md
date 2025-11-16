# Developer Guide - Real-Time Authentication

## Overview

This guide provides detailed information for developers who need to work with or extend the real-time authentication system.

## Architecture Overview

### State Flow

```
┌─────────────────┐
│  Firebase Auth  │
│   & Firestore   │
└────────┬────────┘
         │
         │ onAuthStateChanged()
         │ ↓
┌─────────────────────────┐
│   AuthContext.jsx       │
│  - user state           │
│  - loading state        │
│  - isAuthenticated      │
└────────┬────────────────┘
         │
         │ useContext()
         │ ↓
┌─────────────────────────┐
│  useAuth() Hook         │
└────────┬────────────────┘
         │
         │ Custom Components/Pages
         │ ↓
┌─────────────────────────┐
│  Login / Signup /       │
│  Dashboard / etc.       │
└─────────────────────────┘
```

## File Reference

### 1. AuthContext.jsx

**Location:** `src/context/AuthContext.jsx`

**Key Components:**

- `AuthContext` - React Context object
- `AuthProvider` - Provider component
- Uses `onAuthStateChanged()` for real-time updates

**State Management:**

```javascript
{
  user: {          // User object from Firestore
    id,
    uid,
    email,
    emailVerified,
    name,
    shopName,
    gstin,
    createdAt,
    updatedAt,
    lastLogin
  },
  loading: boolean,        // Initial load state
  error: string | null,    // Error messages
  isAuthenticated: boolean,// Auth status
  logout: function,        // Logout method
  clearError: function,    // Clear error message
  setUser: function        // Manual user update
}
```

**Key Methods:**

- `onAuthStateChanged()` - Firebase real-time listener
- `getDoc()` - Fetch user from Firestore
- `signOut()` - Logout user

### 2. useAuth.js

**Location:** `src/hooks/useAuth.js`

**Purpose:** Easy access to AuthContext

**Usage:**

```javascript
const { user, loading, isAuthenticated, logout } = useAuth();
```

**Error Handling:**

```javascript
if (!context) {
  throw new Error("useAuth must be used within an AuthProvider");
}
```

### 3. authService.js

**Location:** `src/services/authService.js`

**Exported Functions:**

#### signup(email, password, userData)

```javascript
// Parameters:
// - email: string
// - password: string
// - userData: { name, shopName, gstin }

// Returns: Firebase UserCredential
// Side effects:
// - Creates Firestore document
// - Sends verification email
// - Updates auth state

await signup("user@example.com", "pass123", {
  name: "John",
  shopName: "Shop",
  gstin: "27AAHCT5055K1Z0",
});
```

#### login(email, password)

```javascript
// Parameters:
// - email: string
// - password: string

// Returns: Firebase UserCredential
// Side effects:
// - Updates last login in Firestore
// - Triggers auth state change

await login("user@example.com", "pass123");
```

#### logout()

```javascript
// No parameters
// Returns: Promise

// Side effects:
// - Signs out user
// - Clears auth state

await logout();
```

#### sendPasswordReset(email)

```javascript
// Parameters:
// - email: string

// Returns: Promise
// Side effects:
// - Sends password reset email

await sendPasswordReset("user@example.com");
```

#### sendVerificationEmail()

```javascript
// No parameters
// Returns: Promise
// Side effects:
// - Sends verification email to current user

await sendVerificationEmail();
```

#### getCurrentUserData()

```javascript
// No parameters
// Returns: Promise<userObject | null>

// Fetches user data from Firestore
const userData = await getCurrentUserData();
```

#### updateUserProfile(updates)

```javascript
// Parameters:
// - updates: { name?, shopName?, gstin? }

// Returns: Promise
// Side effects:
// - Updates Firestore document
// - Updates Firebase display name if name provided

await updateUserProfile({
  name: "New Name",
  shopName: "New Shop",
});
```

#### listenToAuthStateChange(callback)

```javascript
// Parameters:
// - callback: function

// Returns: unsubscribe function
// Callback receives: { user, isAuthenticated, loading, error? }

const unsubscribe = listenToAuthStateChange((authState) => {
  console.log(authState);
});

// Call to unsubscribe
unsubscribe();
```

### 4. LoginPage.jsx

**Location:** `src/pages/LoginPage.jsx`

**Features:**

- Real-time email validation
- Real-time password validation
- Visual error indicators
- Password visibility toggle
- Disabled button state

**State Variables:**

```javascript
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
const [showPassword, setShowPassword] = useState(false);
const [emailError, setEmailError] = useState("");
const [passwordError, setPasswordError] = useState("");
```

**Key Functions:**

```javascript
// Email validation
validateEmail(value); // Returns boolean

// Password validation
validatePassword(value); // Returns boolean

// Handle login
handleLogin(e); // Main login handler
```

**Error Codes Handled:**

- `auth/user-not-found`
- `auth/wrong-password`
- `auth/invalid-email`
- `auth/user-disabled`
- `auth/too-many-requests`

### 5. SignupPage.jsx

**Location:** `src/pages/SignupPage.jsx`

**Features:**

- All input fields have real-time validation
- Password strength indicator
- GSTIN format validation
- Confirm password matching
- Field-level error messages
- Success message before redirect

**State Variables:**

```javascript
const [formData, setFormData] = useState({
  name: "",
  email: "",
  shopName: "",
  gstin: "",
  password: "",
  confirmPassword: "",
});
const [fieldErrors, setFieldErrors] = useState({});
const [passwordStrength, setPasswordStrength] = useState("");
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
const [successMessage, setSuccessMessage] = useState("");
```

**Key Functions:**

```javascript
// Calculate password strength
calculatePasswordStrength(password); // Returns 'Weak'|'Fair'|'Good'|'Strong'|'Very Strong'

// Validate entire form
validateForm(); // Returns boolean

// Handle form submission
handleSignup(e); // Main signup handler
```

**Password Strength Criteria:**

1. Length >= 8 characters
2. Contains lowercase letters
3. Contains uppercase letters
4. Contains numbers
5. Contains special characters

**Validation Rules:**

```javascript
// Name: min 2 characters
// Email: valid email format
// Password: min 6 characters
// Confirm Password: must match password
// GSTIN: optional, but if provided must match regex
```

### 6. App.jsx

**Location:** `src/App.jsx`

**Key Changes:**

- Wrapped with `AuthProvider`
- AppRoutes component uses `useAuth()` hook
- Loading screen shows during auth check
- Protected routes check `user` prop
- Auto-redirect based on auth status

**Route Structure:**

```javascript
<AuthProvider>
  <Router>
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={...} />
      <Route path="/signup" element={...} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute user={user} />}>
        <Route path="/dashboard" element={...} />
        {/* Other protected routes */}
      </Route>

      {/* Fallback routes */}
      <Route path="/" element={...} />
      <Route path="*" element={...} />
    </Routes>
  </Router>
</AuthProvider>
```

## Integration Guide

### Adding New Protected Routes

```javascript
// In App.jsx AppRoutes component
<Route element={<ProtectedRoute user={user} />}>
  <Route path="/new-page" element={<NewPage user={user} />} />
</Route>
```

### Using Auth in Components

```javascript
import { useAuth } from "../hooks/useAuth";

function MyComponent() {
  const { user, isAuthenticated, logout, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Not logged in</div>;

  return (
    <div>
      <h1>Hello {user.name}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Checking Auth Status

```javascript
const { isAuthenticated, user } = useAuth();

if (isAuthenticated) {
  // User is logged in
  console.log(user.email);
} else {
  // User is not logged in
}
```

### Handling Auth Errors

```javascript
try {
  await login(email, password);
} catch (error) {
  if (error.code === "auth/user-not-found") {
    // Handle specific error
  } else {
    // Handle other errors
  }
}
```

## Firestore Database Structure

### Users Collection

```
/users/{uid}
├── uid: string
├── email: string
├── name: string
├── shopName: string
├── gstin: string
├── emailVerified: boolean
├── createdAt: ISO string
├── updatedAt: ISO string
└── lastLogin: ISO string
```

### Example Document

```json
{
  "uid": "abc123def456",
  "email": "user@example.com",
  "name": "John Doe",
  "shopName": "John's Electronics",
  "gstin": "27AAHCT5055K1Z0",
  "emailVerified": false,
  "createdAt": "2025-11-15T10:30:00Z",
  "updatedAt": "2025-11-15T10:30:00Z",
  "lastLogin": "2025-11-15T10:30:00Z"
}
```

## Firebase Security Rules

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

## Testing

### Unit Tests (Example with Jest)

```javascript
import { validateEmail, validatePassword } from "../utils/validation";

describe("Validation", () => {
  test("validateEmail with valid email", () => {
    expect(validateEmail("test@example.com")).toBe(true);
  });

  test("validateEmail with invalid email", () => {
    expect(validateEmail("invalid")).toBe(false);
  });

  test("validatePassword with strong password", () => {
    expect(validatePassword("StrongPass123")).toBe(true);
  });
});
```

### Integration Tests

```javascript
// Test signup flow
1. Fill signup form
2. Verify validation messages
3. Submit form
4. Check auth state changed
5. Verify redirect to dashboard

// Test login flow
1. Fill login form
2. Verify validation messages
3. Submit form
4. Check auth state changed
5. Verify redirect to dashboard

// Test session persistence
1. Login user
2. Refresh page
3. Verify user still logged in
4. Verify user data loaded
```

## Debugging

### Enable Firebase Debug Logging

```javascript
import { enableLogging } from "firebase/auth";
enableLogging(true); // Enable Firebase auth logging
```

### Console Debugging

```javascript
// Check current auth state
const user = auth.currentUser;
console.log("Current user:", user);

// Check auth state changes
onAuthStateChanged(auth, (user) => {
  console.log("Auth state changed:", user);
});

// Check Firestore data
const userDoc = await getDoc(doc(db, "users", uid));
console.log("User doc:", userDoc.data());
```

## Performance Optimization

### 1. Memoization

```javascript
const value = useMemo(
  () => ({
    user,
    loading,
    error,
    isAuthenticated,
    logout,
    clearError,
    setUser,
  }),
  [user, loading, error, isAuthenticated]
);
```

### 2. Selective Updates

```javascript
// Only re-render when necessary
const { user } = useAuth();
// vs
const { user, loading, error } = useAuth();
```

### 3. Caching User Data

```javascript
// Avoid repeated Firestore queries
const userData = useRef(null);
if (!userData.current) {
  userData.current = await getCurrentUserData();
}
```

## Common Issues & Solutions

### Issue: Infinite re-renders

**Solution:** Check useEffect dependencies, ensure auth state isn't updating on every render

### Issue: Auth state not persisting

**Solution:** Verify localStorage is enabled, check security rules

### Issue: Slow login/signup

**Solution:** Check Firestore query performance, add indexes

### Issue: Validation not working

**Solution:** Check regex patterns, verify field names match state

## Best Practices

1. **Always use useAuth hook** instead of context directly
2. **Validate on both client and server**
3. **Never log sensitive data** to console
4. **Use HTTPS only** in production
5. **Implement rate limiting** for login attempts
6. **Clear errors** when user changes input
7. **Show loading states** during async operations
8. **Handle errors gracefully** with user-friendly messages
9. **Keep auth logic separate** from business logic
10. **Test auth flows thoroughly** before deployment

## Future Enhancements

- [ ] Social login (Google, GitHub)
- [ ] Two-factor authentication
- [ ] Biometric authentication
- [ ] Session timeout
- [ ] Device tracking
- [ ] Login history
- [ ] Account recovery
- [ ] Email verification requirement
- [ ] Custom password policies
- [ ] Role-based access control

## Resources

- **Firebase Auth Docs:** https://firebase.google.com/docs/auth
- **Firebase Firestore Docs:** https://firebase.google.com/docs/firestore
- **React Context Docs:** https://react.dev/reference/react/useContext
- **React Hooks Docs:** https://react.dev/reference/react

## Contact

For questions about this authentication system, refer to:

1. AUTHENTICATION.md - Full technical documentation
2. QUICK_START.md - Getting started guide
3. Firebase official documentation

---

**Last Updated:** November 15, 2025
**Version:** 1.0.0
