# Real-Time Authentication Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Application                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    App.jsx                              │   │
│  │  ┌───────────────────────────────────────────────────┐  │   │
│  │  │            AuthProvider Wrapper                  │  │   │
│  │  │  ┌─────────────────────────────────────────────┐ │  │   │
│  │  │  │  AppRoutes Component                        │ │  │   │
│  │  │  │  ├─ useAuth() Hook                          │ │  │   │
│  │  │  │  ├─ Route: /login  → LoginPage             │ │  │   │
│  │  │  │  ├─ Route: /signup → SignupPage            │ │  │   │
│  │  │  │  └─ Protected Routes:                       │ │  │   │
│  │  │  │     ├─ /dashboard → Dashboard              │ │  │   │
│  │  │  │     ├─ /profile   → Profile                │ │  │   │
│  │  │  │     └─ /chat      → ChatPage               │ │  │   │
│  │  │  └─────────────────────────────────────────────┘ │  │   │
│  │  └───────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└──────────┬────────────────────────────────────────────────────┘
           │
           │
    ┌──────┴──────────────────────────────────────────┐
    │                                                 │
    │         Context & Hooks Layer                  │
    │                                                 │
    │  ┌──────────────────────────────────────────┐  │
    │  │      src/context/AuthContext.jsx         │  │
    │  │  ┌──────────────────────────────────────┐│  │
    │  │  │ State:                               ││  │
    │  │  │  - user                              ││  │
    │  │  │  - loading                           ││  │
    │  │  │  - error                             ││  │
    │  │  │  - isAuthenticated                   ││  │
    │  │  │                                      ││  │
    │  │  │ Listeners:                           ││  │
    │  │  │  - onAuthStateChanged()              ││  │
    │  │  │  - Auto fetch user from Firestore   ││  │
    │  │  └──────────────────────────────────────┘│  │
    │  └──────────────────────────────────────────┘  │
    │                                                 │
    │  ┌──────────────────────────────────────────┐  │
    │  │   src/hooks/useAuth.js                   │  │
    │  │   └─ Access AuthContext anywhere        │  │
    │  └──────────────────────────────────────────┘  │
    │                                                 │
    └──────────┬───────────────────────────────────┘
               │
               │
    ┌──────────┴───────────────────────────────────────────┐
    │                                                      │
    │         Services Layer (authService.js)             │
    │                                                      │
    │  ┌──────────────────────────────────────────────┐   │
    │  │ Functions:                                   │   │
    │  │ ├─ signup()                                  │   │
    │  │ ├─ login()                                   │   │
    │  │ ├─ logout()                                  │   │
    │  │ ├─ sendPasswordReset()                       │   │
    │  │ ├─ sendVerificationEmail()                   │   │
    │  │ ├─ getCurrentUserData()                       │   │
    │  │ ├─ updateUserProfile()                       │   │
    │  │ └─ listenToAuthStateChange()                 │   │
    │  └──────────────────────────────────────────────┘   │
    │                                                      │
    └──────────┬───────────────────────────────────────┘
               │
               │
    ┌──────────┴───────────────────────────────────────────────┐
    │                                                          │
    │         Firebase Services                               │
    │                                                          │
    │  ┌───────────────────────────────────────────────────┐  │
    │  │  Firebase Authentication                          │  │
    │  │  ├─ createUserWithEmailAndPassword()              │  │
    │  │  ├─ signInWithEmailAndPassword()                  │  │
    │  │  ├─ signOut()                                     │  │
    │  │  ├─ sendPasswordResetEmail()                      │  │
    │  │  ├─ sendEmailVerification()                       │  │
    │  │  ├─ onAuthStateChanged()                          │  │
    │  │  └─ updateProfile()                              │  │
    │  └───────────────────────────────────────────────────┘  │
    │                                                          │
    │  ┌───────────────────────────────────────────────────┐  │
    │  │  Firebase Firestore Database                      │  │
    │  │  Collection: /users/{uid}                         │  │
    │  │  ├─ uid                                           │  │
    │  │  ├─ email                                         │  │
    │  │  ├─ name                                          │  │
    │  │  ├─ shopName                                      │  │
    │  │  ├─ gstin                                         │  │
    │  │  ├─ createdAt                                     │  │
    │  │  ├─ updatedAt                                     │  │
    │  │  └─ lastLogin                                     │  │
    │  └───────────────────────────────────────────────────┘  │
    │                                                          │
    └──────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### Signup Flow

```
┌──────────┐
│ SignupPage│
│          │
└─────┬────┘
      │ 1. User enters data
      │ 2. Real-time validation
      │ 3. Form submission
      ▼
┌─────────────────────────┐
│  authService.signup()   │
│                         │
└─────┬───────────────────┘
      │ 4. Create user
      │ 5. Store in Firestore
      │ 6. Send verification
      ▼
┌────────────────────────────────────┐
│  Firebase Auth + Firestore         │
│ (Creates user + user document)     │
└─────┬──────────────────────────────┘
      │ 7. Auth state changes
      │ 8. onAuthStateChanged fires
      ▼
┌──────────────────────┐
│  AuthContext         │
│ (Updates user state) │
└─────┬────────────────┘
      │ 9. User logged in
      │ 10. Auto redirect
      ▼
┌──────────────┐
│  Dashboard   │
│  (Protected) │
└──────────────┘
```

### Login Flow

```
┌──────────┐
│ LoginPage │
│          │
└─────┬────┘
      │ 1. User enters credentials
      │ 2. Real-time validation
      │ 3. Form submission
      ▼
┌────────────────────────┐
│  authService.login()   │
│                        │
└─────┬──────────────────┘
      │ 4. Authenticate user
      │ 5. Update last login
      ▼
┌─────────────────────────────┐
│  Firebase Authentication    │
│ (Verifies credentials)      │
└─────┬───────────────────────┘
      │ 6. Auth state changes
      │ 7. onAuthStateChanged fires
      ▼
┌──────────────────────┐
│  AuthContext         │
│ (Fetches user data)  │
│ (Updates state)      │
└─────┬────────────────┘
      │ 8. User logged in
      │ 9. Auto redirect
      ▼
┌──────────────┐
│  Dashboard   │
│  (Protected) │
└──────────────┘
```

### Session Persistence Flow

```
┌─────────────────┐
│  App Load       │
│  (Browser Start)│
└────────┬────────┘
         │
         ▼
┌──────────────────────────┐
│  App.jsx                 │
│ 1. AuthProvider wrapper  │
└────────┬─────────────────┘
         │
         ▼
┌────────────────────────────┐
│  AuthContext.jsx           │
│ 1. Initialize listener     │
│ 2. onAuthStateChanged()    │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│  Firebase Auth.currentUser │
│ (Check if user exists)     │
└────────┬───────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌─────────────┐
│User OK │ │ No User     │
└────┬───┘ └────┬────────┘
     │          │
     ▼          ▼
 ┌───────────┐  ┌────────────┐
 │Fetch from │  │Show Login  │
 │Firestore  │  │Page        │
 └───┬───────┘  └────────────┘
     │
     ▼
 ┌────────────────┐
 │Update Context  │
 │(user, loaded)  │
 └───┬────────────┘
     │
     ▼
 ┌─────────────────────┐
 │Redirect to          │
 │Dashboard            │
 │(auto logged in)     │
 └─────────────────────┘
```

### Real-Time Validation Flow

```
SignupPage / LoginPage
        │
        ▼
    User Input
        │
        ▼
    onChange Event
        │
        ▼
    ┌─────────────────────────┐
    │ Validation Functions    │
    │ ├─ validateEmail()      │
    │ ├─ validatePassword()   │
    │ ├─ validateGSTIN()      │
    │ └─ validateForm()       │
    └────────┬────────────────┘
             │
             ▼
    ┌──────────────────────┐
    │ Error State Updated  │
    │ fieldErrors[name]    │
    └────────┬─────────────┘
             │
             ▼
    ┌──────────────────────┐
    │ UI Re-renders with   │
    │ Error Messages       │
    │ Button Disabled      │
    └──────────────────────┘
```

## Component Interaction Map

```
┌──────────────────────────────────────────────────────────┐
│                      App.jsx                             │
│  Provider: AuthProvider                                  │
└──────────────────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
    ┌────────┐  ┌────────┐  ┌──────────┐
    │ Login  │  │Signup  │  │Protected │
    │ Page   │  │ Page   │  │ Routes   │
    └───┬────┘  └───┬────┘  └────┬─────┘
        │           │            │
        └─────┬─────┴─────┬──────┘
              │           │
              ▼           ▼
        ┌──────────┐  ┌──────────┐
        │useAuth   │  │useAuth   │
        │Hook      │  │Hook      │
        └──────────┘  └──────────┘
              │           │
              └─────┬─────┘
                    │
              ┌─────▼──────┐
              │AuthContext │
              │  (useContext)
              └─────┬──────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
    ▼               ▼               ▼
┌────────┐    ┌──────────┐    ┌──────────┐
│Firebase│    │Firestore │    │Services  │
│Auth    │    │Database  │    │authService
└────────┘    └──────────┘    └──────────┘
```

## State Management Flow

```
Firebase Auth State
        │
        ▼
┌─────────────────────────────┐
│ onAuthStateChanged()        │
│ (Real-time Listener)        │
└────────┬────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ AuthContext                  │
│ ├─ user state               │
│ ├─ loading state            │
│ ├─ error state              │
│ ├─ isAuthenticated state    │
│ └─ Helper functions         │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Components (via useAuth)     │
│ └─ Re-render with new state  │
└──────────────────────────────┘
```

## Error Handling Flow

```
User Action
(Signup/Login)
    │
    ▼
Firebase Operation
    │
    ├─ Success
    │  └─ Update state
    │     └─ Redirect
    │
    └─ Error
       │
       ▼
    Error Code Check
    │
    ├─ auth/user-not-found
    │  └─ "Email not registered"
    │
    ├─ auth/wrong-password
    │  └─ "Incorrect password"
    │
    ├─ auth/email-already-in-use
    │  └─ "Email already registered"
    │
    └─ Other
       └─ "Operation failed"
          │
          ▼
       Display Error Message
          │
          ▼
       User can retry
```

## Security Layers

```
┌─────────────────────────────────────────────────────────┐
│  Frontend Validation Layer (React)                      │
│  ├─ Email format check                                  │
│  ├─ Password strength check                             │
│  ├─ Required field validation                           │
│  └─ Real-time field feedback                            │
└─────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Firebase Authentication Layer                          │
│  ├─ Password hashing (Firebase)                         │
│  ├─ Email verification                                  │
│  ├─ Session token generation                           │
│  └─ Auth state management                              │
└─────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Firestore Security Rules                              │
│  ├─ User can only read/write own document              │
│  ├─ Anonymous access denied                            │
│  └─ Rate limiting (optional)                           │
└─────────────────────────────────────────────────────────┘
```

## Environment Setup

```
Development Environment
        │
        ├─ Firebase Config (src/config/firebase.js)
        ├─ AuthContext (src/context/AuthContext.jsx)
        ├─ Custom Hooks (src/hooks/useAuth.js)
        ├─ Auth Service (src/services/authService.js)
        ├─ Login Page (src/pages/LoginPage.jsx)
        └─ Signup Page (src/pages/SignupPage.jsx)
        │
        ▼
Production Environment
        │
        ├─ Firebase Project (Cloud)
        ├─ Real-time Database (Firestore)
        ├─ Authentication (Firebase Auth)
        └─ Email Service (Firebase)
```

---

This architecture provides:

- **Real-time authentication** via Firebase
- **Persistent sessions** through localStorage
- **Protected routes** with ProtectedRoute component
- **Centralized state** through AuthContext
- **Easy access** via useAuth hook
- **Comprehensive validation** on signup/login
- **Secure** Firebase backend
- **Scalable** design for future features
