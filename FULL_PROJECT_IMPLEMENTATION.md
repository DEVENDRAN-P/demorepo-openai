# AI GST & Compliance Buddy — Full Project Implementation (A to Z)

A complete, file-by-file technical reference for the **AI GST & Compliance Buddy** web application, built for the **OpenAI x NxtWave BUILDATHON**.

This document walks through the **entire project implementation from A to Z**: from the very first directory structure, through every configuration file, every service, every page component, all the way to deployment, environment setup, security rules, email automation, and payment integration.

---

## Table of Contents

1. [Project Overview (The "What")](#-project-overview)
2. [Technology Stack & Dependencies (The "How")](#-technology-stack)
3. [Repository Layout & Directory Tree (The "where")](#-repository-layout)
4. [Environment & API Key Setup (The "secrets")](#-environment--api-key-setup)
5. [Application Bootstrap (index.js → App.jsx)](#-application-bootstrap--routing)
6. [Routing Map — Full Route Table](#-routing-map--full-route-table)
7. [State Management & Contexts](#-state-management--contexts)
8. [Firebase Client Configuration](#-firebase-client-configuration)
9. [Internationalization (i18n) & Localization](#-internationalization-i18n)
10. [Services Layer — Every Service Deep-Dive](#-services-layer--every-service)
11. [Utility Layer](#-utility-layer)
12. [UI Layout Components (The Shell)](#-ui-layout-components)
13. [All 27+ Pages Map](#-all-pages-map)
14. [AI Features — Bill Extraction & Chat Assistant](#-ai-features)
15. [GST Forms & PDF Generation](#-gst-forms--pdf-generation)
16. [Email & Reminder System (Brevo SMTP)](#-email--reminder-system)
17. [Payments & Subscriptions (Razorpay)](#-payments--subscriptions)
18. [Security Rules (Firestore / RTDB / Storage)](#-security-rules)
19. [Vercel Deployment & Cron Jobs](#-deployment--vercel)
20. [Scripts & Build Tooling](#-scripts--build-tooling)
21. [Data Models & Firestore Schema](#-data-models--firestore-schema)
22. [Observability & Debug Tools](#-observability--debug-tools)
23. [Running The Whole Stack (Dev/PROD)](#-running-the-whole-stack)
24. [Troubleshooting Playbook (Z recommendations)](#-common-issues-and-fixes)

---

## 1. Project Overview

**AI GST & Compliance Buddy** is a React single-page application that helps small Indian businesses and merchants automate their Goods and Services Tax (GST) compliance using AI.

### Primary Business Capabilities
- **AI Bill Extraction** — upload a PDF/JPG/PNG/WEBP invoice; the app runs local OCR (Tesseract) plus Groq AI (Vision + LLM) to extract supplier, GSTIN, amounts, tax, category, and audit metadata.
- **Auto GST Form Generation** — auto-fills **GSTR-1** (outward supplies register) and **GSTR-3B** (summary return) from uploaded bills, with PDF download and JSON export.
- **AI Chat Assistant** — real-time streaming chatbot (Groq Llama 3.3 70B) that is given the user's invoice context as part of its system prompt, so answers reference real data.
- **Smart Reminders** — GSTR deadlines, overdue payments, and automated email alerts via Brevo SMTP (client-side + Vercel cron).
- **Business Analytics** — dashboards, expense charts (Recharts), compliance/business-health scoring.
- **Multi-language** — English, Hindi, Tamil, Malayalam, Kannada (300 keys, perfectly synced).
- **Subscriptions & Payments** — Free / Pro / Business tiers with Razorpay checkout.
- **Multi-business context** — 3 seeded demo businesses (Apex Retailers, NexGen, Phoenix Logistics).

**Demo Credentials:** Email `demo@shop.com` / Password `password123`.

---

## 2. Technology Stack

| Layer | Technology |
|------|-----------|
| Frontend framework | React 18 (SPA, create-react-app via react-scripts) |
| Routing | React Router **v6** (BrowserRouter) |
| State management | React Context API (`AuthContext`, `DarkModeContext`) + localStorage caching |
| Styling | Inline styles + CSS variables + a custom design system (no Tailwind runtime base classes; Tailwind config present) |
| AI | Groq SDK — models `llama-3.3-70b-versatile` and `llama-3.2-11b-vision-preview` |
| OCR | Tesseract.js (client-side) |
| Charts | Recharts |
| i18n | i18next + react-i18next |
| Database | Firebase Firestore (primary) + Realtime Database (secondary) |
| Cloud storage | Firebase Storage (invoice files, ≤100MB) |
| Email | **Brevo** (formerly Sendinblue) SMTP via nodemailer |
| Payments | Razorpay (checkout.js + node SDK) + Firebase Admin on backend |
| Backend (local) | Express.js (`api/_server.js`), port 5000 |
| Serverless | Vercel functions (`api/...`) |
| Utility | Axios, html2pdf.js, framer-motion, dotenv |

**Key dependencies** (`package.json`): `firebase` v12, `firebase-admin` v14, `groq-sdk`, `nodemailer`, `razorpay`, `react-router-dom`, `recharts`, `tesseract.js`, `html2pdf.js`, `i18next`, `framer-motion`, `axios`, `express`, `cors`, `dotenv`, `lucide-react`.

---

## 3. Repository Layout (the "Where")

Note: The repo is a nested folder. The outer folder contains docs; the real app lives in **`demorepo-openai-main/demorepo-openai-main/`**.

```
demorepo-openai-main/                 (repo root)
├── PROJECT_INFO.md                   (build/feature status)
├── PROJECT_MASTER_DOCUMENT.md        (previous A-Z reference)
├── FULL_PROJECT_IMPLEMENTATION.md    (THIS file)
├── PREVIEW_INSTRUCTIONS.md
├── deploy.log
├── package.json / package-lock.json  (outer docs only)
│
└── demorepo-openai-main/             (React app root)
    ├── public/                       (index.html, favicons, logos, manifest.json)
    ├── build/                        (production build output + assets)
    ├── api/                          (Vercel serverless + local Express)
    │   ├── _server.js                (local Express server + Brevo SMTP + billing)
    │   ├── _utils/database.js        (Firestore + mock DB billing layer)
    │   ├── billing.js                (Razorpay payment API handler)
    │   ├── email.js                  (Vercel serverless email endpoint using Brevo)
    │   ├── sendEmail.js              (DEPRECATED)
    │   ├── checkOverdueBills.js      (Vercel cron — overdue alerts)
    │   ├── scheduledReminders.js     (Vercel cron — approaching-deadline alerts)
    │   ├── reminders.js              (cron reminder endpoint)
    │   ├── scheduledBillReminder.js  (DEPRECATED)
    │   ├── emailReminders.js         (DEPRECATED)
    │   └── extract.js, chat.js       (empty stubs)
    ├── functions/                    (DEPRECATED Firebase Cloud Functions)
    ├── src/
    │   ├── App.jsx                   (root router)
    │   ├── index.js                  (ReactDOM entry)
    │   ├── config/                   (firebase.js, firebaseEmulatorConfig.js)
    │   ├── context/                  (AuthContext.jsx, DarkModeContext.jsx)
    │   ├── hooks/                    (useAuth.js)
    │   ├── i18n/                     (config.js + locales/{en,hi,ta,ml,kn}.json)
    │   ├── components/               (16 layout & feature components)
    │   ├── pages/                    (27 view pages)
    │   ├── services/                 (11 service modules)
    │   ├── styles/                   (auth-animations.css)
    │   ├── utils/                    (rateLimiter.js, storageUtils.js, validators.js)
    │   ├── App.css                   (global design-system)
    │   └── index.css
    ├── scripts/                      (Python asset generation, Node tests)
    ├── check_keys.py / verify_langs.js  (locale parity scripts)
    ├── tailwind.config.js            (present but unused at runtime)
    ├── firebase.json                 (emulator ports + rules mapping)
    ├── firestore.rules / database.rules.json / storage.rules
    ├── vercel.json                   (rewrites, headers, crons)
    ├── .env.example / .env / .env.production
    └── package.json / testOverdue.js / triggerReminders.js / CORRECT_COMPONENT_EXAMPLE.jsx
```

---

## 4. Environment & API Key Setup (the "Secrets")

Environment variables are read via `process.env.REACT_APP_*` (client) and plain `process.env.*` (server).

### `.env.example` — Required Variables

```
# Firebase
REACT_APP_FIREBASE_API_KEY=YOUR_API_KEY_HERE
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
REACT_APP_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Optional
REACT_APP_AUTH_REDIRECT_URL=http://localhost:3000
REACT_APP_ENVIRONMENT=development
REACT_APP_USE_EMULATOR=false (or "true")
REACT_APP_PHONE_AUTH_TEST_MODE=false

# Groq AI (required for AI features)
REACT_APP_GROQ_API_KEY=your_groq_key

# Email (Brevo SMTP)
BREVO_API_KEY=your_brevo_smtp_key
EMAIL_FROM=your_verified_email@domain.com

# Backend (local Express)
REACT_APP_SEND_EMAIL_API=http://localhost:5000/api/sendEmail
```

### Backend / Billing (Razorpay + Firebase Admin) variables
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` — required for orders.
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — optional service account; if absent, the billing layer falls back to a **local mock mode** (`api/_utils/mock_db.json` or in-memory).
- `USE_MOCK_DATABASE=true` — force mock DB.
- `CRON_SECRET`, `ADMIN_KEY` — optional authorization for the `api/reminders.js` cron endpoint.

> ⚠️ **Never commit real keys.** The repo's `.env.local list example only keys/values are placeholders.

---

## 5. Application Bootstrap & Routing

### Entry Point — `src/index.js`
```js
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App'
const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<React.StrictMode><App /></React.StrictMode>)
```

### Root — `src/App.jsx`
Wraps everything with `ErrorBoundary` → `I18nextProvider` → `AuthProvider` → `DarkModeProvider`, then renders `AppContent` which installs `BrowserRouter` (v7 future flags) and `ScrollToTop`.

**Code-splitting strategy:**
- **Imported directly** (first paint): `ProtectedRoute`, `ErrorBoundary`, `ScrollToTop`, `SignupPage`, `ForgotPasswordPage`, `Dashboard`, `Home`, `DashboardLayout`.
- **Lazy-loaded** (secondary pages): `BillUpload`, `BillDetails`, `GSTForms`, `Reports`, `Profile`, `ChatPage`, `Settings`, `Support`, `AIFinanceAgent`, `Invoices`, `ComplianceCenter`, `BusinessHealth`, `AuditCenter`, `TaxForecast`, `AIInsights`, `Recommendations`, `ExpenseAnalytics`, `VendorIntelligence`, `BusinessDirectory`, `NotificationCenter`, `DocumentAssistant`, `GlobalSearch`, `PenaltyCenter`, `PricingBilling`, `PaymentSuccess`, `CheckoutPage`.

`AppRoutes` uses `useAuth()`; while `loading` is true it shows a gradient `LoadingScreen`. It builds the nested route tree (see next section).

---

## 6. Routing Map — Full Routes

| Route | Page Component | Auth | Notes |
|------|----------------|------|-------|
| `/` | Home | Public | Landing page |
| `/pricing` | PricingBilling | Both | Inside DashboardLayout |
| `/login` | SignupPage (`isLoginInitial=true`) | Redirect if authed | |
| `/signup` | SignupPage (`isLoginInitial=false`) | Redirect if authed | |
| `/forgot-password` | ForgotPasswordPage | Redirect if authed | |
| `/dashboard` | Dashboard | Protected | |
| `/agent` | AIFinanceAgent | Protected | |
| `/bill-upload` | BillUpload | Protected | |
| `/bill/:billId` | BillDetails | Protected | |
| `/invoices` | Invoices | Protected | |
| `/compliance` | ComplianceCenter | Protected | |
| `/health` | BusinessHealth | Protected | |
| `/audit` | AuditCenter | Protected | |
| `/forecast` | TaxForecast | Protected | |
| `/reports` | Reports | Protected | |
| `/insights` | AIInsights | Protected | |
| `/recommendations` | Recommendations | Protected | |
| `/gst-forms` | GSTForms | Protected | |
| `/expenses` | ExpenseAnalytics | Protected | |
| `/vendors` | VendorIntelligence | Protected | |
| `/business` | BusinessDirectory | Protected | |
| `/notifications` | NotificationCenter | Protected | |
| `/documents` | DocumentAssistant | Protected | |
| `/chat` | ChatPage | Protected | |
| `/search` | GlobalSearch | Protected | |
| `/settings` | Settings | Protected | |
| `/penalty` | PenaltyCenter | Protected | |
| `/checkout` | CheckoutPage | Protected | |
| `/payment-success` | PaymentSuccess | Protected | |
| `/support` | Support | Protected | |
| `/profile` | Profile | Protected | |
| `*` | Navigate to `/dashboard` or `/login` | — | Catch-all |

Protected sections are wrapped in `<ProtectedRoute>` (checks `isAuthenticated || user`) and rendered inside `<DashboardLayout>` (Sidebar + Header + Outlet).

---

## 7. State Management & Contexts

### `AuthContext.jsx`
- Holds `user`, `loading`, `error`, `isAuthenticated`, `logout`, `clearError`, `setUser`.
- Subscribes to `onAuthStateChanged`. Uses a **cached-user-first strategy**:
  1. Show cached `localStorage['user']` immediately.
  2. Firestore `getDoc(users/{uid})` in the background to freshen data.
  3. Falls back to a minimal user object built from Firebase Auth.
- Seeds invoices with `seedUserInvoicesIfEmpty(uid)` when the users doc is empty.
- Stores `user` and `userToken` in localStorage; clears them on logout.

### `DarkModeContext.jsx`
- Persistent via `localStorage['darkMode']`.
- `applyDarkMode(isDark)` swaps CSS variables (`--bg-primary`, `--text-primary`, etc.) with a premium Vercel-like dark palette (deep navy `#0b0f19`) vs light (white/gray).
- Forces light mode when logged out (auth-gated).
- Exposes `isDarkMode`, `toggleDarkMode`, `resetTheme`.

### `useAuth.js` (hook)
Thin wrapper around `useContext(AuthContext)` with a guard that throws if used outside the provider.

---

## 8. Firebase Client Configuration (`src/config/firebase.js`)

- Reads all `REACT_APP_FIREBASE_*` vars and calls `initializeApp`.
- **Auth**: `getAuth`; sets local persistence; initializes `GoogleAuthProvider` (`prompt: select_account`); sets up `RecaptchaVerifier` + `signInWithPhoneNumber` for OTP flow; optional test-mode disables app verification.
- **Firestore**: `initializeFirestore` with `persistentLocalCache` + `persistentMultipleTabManager` (offline multi-tab).
- **Analytics**: lazy `isSupported()` gate.
- **Storage** (`getStorage`), **Realtime DB** (`getDatabase`).
- **Emulator support**: when `REACT_APP_USE_EMULATOR === "true"` connects DB `:9000`, Firestore `:8080`, Auth `http://127.0.0.1:9099`, Storage `:9199`. `firebaseEmulatorConfig.js` is an alternate (mostly commented) helper with URL utilities.

---

## 9. Internationalization (i18n)

`src/i18n/config.js` initializes i18next with 5 resources:
- `en`, `hi` (Hindi), `ta` (Tamil), `ml` (Malayalam), `kn` (Kannada).

Behavior:
- Reads initial language from `localStorage['language']` (default `en`), fallback Lng `en`.
- On `languageChanged`, persists to localStorage and sets `<html lang>`.
- React config uses `useSuspense: false`.

Each locale JSON has exactly **300 keys, 100% synchronized** (verified by `verify_langs.js` / `check_keys.js`). Every text string in pages flows through `useTranslation()` so the whole UI switches language live without a page reload. Content fields like tooltips, placeholders, navigation, and app labels are fully translated.

---

## 10. Services Layer Deep-Dive

### `authService.js`
Wraps Firebase Auth and is optimized for speed (blocking required only for the credential creation):
- `signup(email, password, userData)` — create user (blocking), then `updateProfile`, `setDoc(users/{uid})`, and `sendEmailVerification` run in **parallel** (non-blocking).
- `login(email, password)` — sign in, then non-blocking `lastLogin` update.
- `logout`, `sendPasswordReset`, `sendVerificationEmail`, `getCurrentUserData`.
- `listenToAuthStateChange(callback)` — wraps `onAuthStateChanged`.
- `updateUserProfile(updates)` — Firestore + Auth display-name.
- `loginWithGoogle` / `signupWithGoogle` — popup, creates/updates Firestore profile with `authProvider: 'google'`; gracefully suppresses known COOP/popup console noise.
- `sendPhoneOTP`, `verifyPhoneOTP`, `loginWithPhone`, `completePhoneLogin` — full OTP phone-auth flow with Firestore profile creation (`authProvider: 'phone'`, `phoneVerified: true`).

### `firebaseDataService.js` (primary data layer)
User-isolated storage under `users/{uid}/`:
- **Profile**: `saveUserProfile`, `getUserProfile`.
- **Bills**: `saveUserBill`, `getUserBills` (10s in-memory cache), `getUserBillById`, `updateUserBill` (graceful "no doc to update" handling), `deleteUserBill`.
- **GST forms**: `saveUserGSTForm`, `getUserGSTForms`.
- **Stats**: `updateUserStats`, `getUserStats`.
- **Settings**: `saveUserSettings`, `getUserSettings` (with defaults).
- **Reminders**: `createBillReminder`, `getUserReminders`.
- **Documents metadata**: `saveUserDocument`, `getUserDocuments`.
- **Storage file ops**: `uploadBillDocument`, `.Batch`, `downloadBillDocument`, `deleteBillDocument`, `getBillDocuments`, `uploadGSTFormDocument`, `uploadSupportingDocument`, `getUserStorageUsage`, `getFileContentAsBlob` — all enforce the file lives under `users/{uid}/`.
- **Activity**: `logUserActivity`, `getUserActivityLogs`.
- **Export**: `exportAllUserData` (aggregates profile/bills/forms/stats/settings/reminders/documents/logs), `deleteAllUserData` (placeholder).
- `invalidateBillsCache()`, `verifyUserOwnership()`, `getCurrentUserInfo()`.

### `userDatabaseService.js` (Realtime DB + email-key storage)
- Uses RTDB at `users/{uid}/profile|settings|stats` and generic `{collectionName}` lists.
- **Email-based storage**: `emails/{sanitizedEmail}/{collection}` where the email key is sanitized (`.` → `_dot_`, `@` → `_at_`). Full CRUD + real-time listeners (`onEmailDataChange`, `setupEmailDataListener`, `refreshEmailData`, `emailDataExists`, `getEmailDataCount`).
- New-user init, lastLogin tracking.

### `billService.js`
Thin Firestore helpers: `saveBillToFirebase`, `getBillsFromFirebase`, `deleteBillFromFirebase`, `updateBillInFirebase`, `getBillsDueSoon`.

### `reminderService.js`
- `calculateGSTDueDates(invoiceDate)` → GSTR-1 due 11th of next month, GSTR-3B due 20th.
- `createBillReminders(userId, billData)` — creates a GSTR-1, GSTR-3B, and payment reminder docs.
- `getPendingReminders`, `markReminderSent`, `dismissReminder`, `getAllReminders`, `generateReminderAlerts`.

### `emailReminderService.js` (Brevo client)
- `sendReminderEmail(emailData)` — POST to `/api/email` (relative). Rich error mapping (EAUTH, ECONNREFUSED, network).
- `checkAndSendBillReminders(userId)` — iterates bills, dedupes within 24h, sends via `sendReminderEmail`, records in `users/{uid}/emailReminders`.
- `sendBillUploadReminder(billData, userEmail)` — sends email on upload if overdue/due-soon, with urgency-tiered subjects/bodies and penalty info.
- `sendManualReminder`, `getBillReminderHistory`, `calculateBillUrgency`, `sendTestEmail`.

### `billReminderService.js`
- `getBillReminderStatus(userId, billId)` — determines `hasReminder`, `reminderDaysLeft`, `reminderType`, last sent email/date; gracefully handles offline.
- `getBillReminderHistory`, `recordReminderEmailSent`, `getReminderSeverity`.

### `perfService.js`
Tracks operations with `performance.now()` (`start`, `end`, `getAll`, `getTotal`, `summary`, `clear`) and emoji feedback (🚀<100ms, ⚡<300ms, ⏳<800ms, 🐢<1500ms, 🐌>1500ms). Used throughout auth flows.

### `otpService.js` — empty stub (functionality is inside `authService.js`).

### `seederService.js`
`seedUserInvoicesIfEmpty(userId)` populates a demo user's `bills` subcollection with **8 realistic 2026 invoices** (Apex/NexGen/Phoenix) if empty, then dispatches a `window` "billUpdated" event. `clearAndReseedInvoices(userId)` wipes and reseeds.

### `passwordResetService.js`
`sendPasswordResetEmail` with `actionCodeSettings` (url `${origin}/login`, `handleCodeInApp`). Maps friendly errors (user-not-found, invalid-email, too-many-requests, etc). Also `verifyPasswordResetCode`, `confirmPasswordReset`, and Firebase Email Template info helper.

### `handle FirebaseDebug.js`
Console debug suite: `debugFirebaseConnection()` (tests auth, RTDB write/read/listen, email storage, Firestore, config), `debugEmailDataIsolation`, `debugListAllUsers`, `debugRealtimeListener`. Exposes `window.debugFirebase`.

### `testDatabaseConnection.js`
`testDatabaseConnection()` and `clearTestData()` for browser-console diagnostic of write/read.

---

## 11. Utility Layer

### `rateLimiter.js`
Class with sliding-window logic (`isAllowed`, `getRemaining`, `getResetTime`, `reset`, `clearAll`). Exports three instances: `apiRateLimiter` (20/min), `authRateLimiter` (5/5min prevent brute-force), `chatRateLimiter` (30/min).

### `storageUtils.js`
Centralized localStorage wrapper for bills keyed by user: `getBillsStorageKey`, `saveBills`, `getBills`, `addBill`, `updateBill`, `deleteBill`, `clearBills`, `migrateOldBillsKey`.

### `validators.js`
- `sanitizeString` (XSS escaping), `validateEmail`, `validatePassword` (8+ chars, upper/lower/number/special), `validatePhone` (10+ digits), `validateFileSize` (default 10MB), `validateFileType`, `validateGSTNumber` (`XXAAAAAXXXXXZ#`), `validatePANNumber` (`AAAAA9999A`), `sanitizeNumber`, `isInRange`, `validateForm` (rule-driven batch validation).

---

## 12. UI Layout Components (the Shell)

- **`ProtectedRoute.jsx`** — gate; shows spinner while loading, renders `<Outlet/>` when authed, else `<Navigate to="/login">`.
- **`DashboardLayout.jsx`** — flex shell with mobile overlay, fixed `Sidebar`, and a sticky `Header`; scroll resets on route change; the `<main>` region renders `<Outlet/>`.
- **`Sidebar.jsx`** — left navigation with custom SVG iconMap (dashboard, agent, upload, invoices, compliance, health, audit, forecast, reports, insights, etc.), NavLinks, business switcher, Logout.
- **`Header.jsx`** — top bar: active business selector, global search (`/search?q=`), language switcher, dark-mode toggle, WhatsApp/Chat links.
- **`Navbar.jsx`** — marketing top-nav with many themed states, dark/light, mobile drawer; largely used by the marketing/logged-out flows.
- **`AIAssistant.jsx`** — the chat widget (see AI section).
- **`GSTFilingStatus.jsx`** — deadline & filing timeline widget (fed `bills`).
- **`PenaltyLateFeeEstimator.jsx`** — calculates late-filing penalty/fee estimates interactively.
- **`ReminderPanel.jsx`** — upcoming deadlines & outstanding invoices card.
- **`Notification.jsx`** — toast/banner component.
- **`ErrorBoundary.jsx`** — class component catching render errors → friendly fallback.
- **`FirebaseDebugPanel.jsx`** — dev panel to test Firestore queries.
- **`LanguageDiagnostic.jsx`** — i18n health-check component.
- **`AuthPerfTest.jsx`** — benchmark widget for signup/login timings.
- **`Header.jsx`** (see above), **`Logo.jsx`** (multi-variant SVG), **`ScrollToTop.jsx`**, **`PhoneAuthModal.jsx`**.

---

## 13. All 27 Pages Map

1. **LoginPage.jsx** → `login` auth form.
2. **SignupPage.jsx** → multi-field signup (name, shop, GSTIN, email, phone, password). Handles both signup and login (via `isLoginInitial`), incl. Google + phone.
3. **ForgotPasswordPage.jsx** → email recovery via `passwordResetService`.
4. **Dashboard.jsx** → business switcher, financial metrics, health/compliance scores, charts, quick actions, embedded AI Finance Agent, search.
5. **BillUpload.jsx** → invoice capture/extraction (details below).
6. **BillDetails.jsx** → verify/edit a single bill before storing.
7. **GSTForms.jsx** → GSTR-1/GSTR-3B generation + PDF/JSON export + one-click auto-file.
8. **Reports.jsx** → fiscal statements/summaries.
9. **AIFinanceAgent.jsx** → interactive finance audit evaluator (business context).
10. **AIInsights.jsx** → strategic tips & spending evaluation.
11. **Invoices.jsx** → ledger of verified client sales/expenses.
12. **ComplianceCenter.jsx** → compliance ratings, status, anomaly flags.
13. **BusinessHealth.jsx** → profitability ratios, cash-flow, assets.
14. **AuditCenter.jsx** → reconciliation logs.
15. **TaxForecast.jsx** → future liability prediction.
16. **ExpenseAnalytics.jsx** → category-wise expense charts.
17. **VendorIntelligence.jsx** → supplier scoring profiles.
18. **BusinessDirectory.jsx** → business categories/parameters.
19. **NotificationCenter.jsx** → system alerts & deadline warn.
20. **DocumentAssistant.jsx** → document repository.
21. **GlobalSearch.jsx** → instant search across pages/logs/bills.
22. **Profile.jsx** → contacts/business info update.
23. **Settings.jsx** → language, dark mode, notifications, security.
24. **ChatPage.jsx** → AI chat wrapper.
25. **Support.jsx** → support channels/WhatsApp/FAQ.
26. **Recommendations.jsx** → AI-generated saving suggestions.
27. **Home.jsx** → landing page with animated counters & monthly data.

---

## 14. AI Features

### Bill Upload / Extraction (`BillUpload.jsx`)

Three-phase pipeline:
1. **Optional Vision AI** (`extractDataWithVisionAI`) — calls Groq `llama-3.2-11b-vision-preview`, passing a compressed base64 image, requesting JSON plus `boundingBoxes` (percentage coords) for overlay highlighting. If this succeeds, AI also returns `gstDocumentType`, `invoiceNumber`, `invoiceDate`, `supplierName`, `gstin`, `amount`, `taxPercent`, `taxAmount`, `totalAmount`, `expenseType`, `category`, `extractionConfidence`, `taxAnalysis`, `riskAnalysis`, `aiSuggestions`.
2. **Fallback OCR + LLM** — uses `Tesseract.recognize(file, 'eng', { logger })` then `extractDataWithAI` calls `llama-3.3-70b-versatile` with the OCR text and the same JSON shape.
3. **Validate & compute** — coerces numerics, forces `taxAmount`/`totalAmount` if missing, fills default bounding boxes, computes `taxBreakdown { cgst, sgst, igst }` (CGST/SGST split).

The extraction form is fully editable; hovering a field shows the bounding highlight overlay. **Confirm & Sync to Firebase** (`handleConfirm`) saves via `saveUserBill` with a computed GSTR deadline (13th of next month) and a business ID.

Also supports live **camera capture** (`getUserMedia`), with flip button, capture, retake, accept.

### Chat Assistant (`AIAssistant.jsx`)
- Loads `getUserBills(user.uid)` and filters by `activeBusiness` (from `localStorage['activeBusinessId']`).
- Builds a dynamic `systemPrompt` that inlines all invoice rows + GSTIN + state, then streams `llama-3.3-70b-versatile` (SSE parsing of `data:` chunks) and renders the response token-by-token.
- Includes a **localized welcome message** (en/hi/ta) and preset chips (Check ITC Balance, Find Expense Leakage, Optimize Taxes, Audit Invoices).
- The **Dashboard** has a second voice, `handleAgentAction`, an inline "GST Buddy Finance Agent" that summarizes financials into the prompt and enforces **feature tier gating** (free cannot ask audit/compliance/risk prompts; pro cannot do risk/audit → redirects to upgrade modal).

---

## 15. GST & PDF Generation (`GSTForms.jsx`)

- Loads bills, filters by `activeBusiness`, computes:
  - `generateGSTR1` → per-invoice rows with GSTIN/supplier/invoice #/taxable price/CGST/SGST.
  - `generateGSTR3B` → totals `outwardSupplies = totalTaxable*1.5`, `inwardSupplies`, `totalTax`*, `itc = input tax`, `netPayable = max(0, totalTax*1.5 - itc)`.
- **Filing Readiness**: readiness % ring from checklist (math check, dup detection, valid GSTIN errors, low-confidence warnings). Blocks filing while errors exist; "one-click auto-file" marks all pending bills `filed:true`, records activity, reloads.
- **Exports**: PDF download (HTML → `html2pdf`) for GSTR-1 (landscape table) and GSTR-3B (portrait summary), plus raw JSON export.

---

## 16. Email & Reminder System (Brevo SMTP)

Multiple layers reinforce reliability:

- **Local Express server** `api/_server.js`:
  - `GET/health`, `GET/POST /api/sendEmail`, `GET/POST /api/email`.
  - Uses `nodemailer` → `smtp-relay.brevo.com:587`, auth user `a26ddc001@smtp-brevo.com`, sender from `EMAIL_FROM` (default `devendranp.it2024@citchennai.net`).
  - Interpreted plaintext → HTML and adds sender + replyTo.
  - Also mounts the billing router at `/api/payment/*` and `/api/subscription/*`.
  - Run with `node api/server.js` on port 5000.

2. **Vercel serverless** `api/email.js` — same Brevo logic, env-config from Vercel Settings; GET gives diagnostic, POST sends (strict email validation).

3. **Cron jobs** (Vercel, defined in `vercel.json`, run `0 9 * * *` = 09:00 IST):
   - `api/checkOverdueBills.js` — flags **past-due** bills and sends rich overdue HTML emails, records to `emailReminders`, respects "already sent today".
   - `api/scheduledReminders.js` — for bills due within 7 days, sends tiered urgency emails (overdue/today/one-day/three-days/one-week), records sent, and flags the bill `reminderSent`.
   - `api/reminders.js` — same but with optional `CRON_SECRET`/`ADMIN_KEY` authorization path.
4. **Deprecated** legacy (SendGrid) functions under `functions/` and `api/scheduledBillReminder.js` are kept for reference only.

Client-side sends go to the relative `/api/email` endpoint (works locally via proxy and in production via Vercel).

---

## 17. Payments & Subscriptions (Razorpay)

### Frontend
- **`CheckoutPage.jsx`**: for the chosen plan (`pro` ₹299/mo or `business` ₹999/mo), loads the Razorpay SDK script, obtains a Firebase ID token, POSTs to `/api/payment/create-order`, opens the Razorpay modal with UPI/options, then POSTs the signature to `/api/payment/verify`.
- **`PricingBilling.jsx`**: shows plan tiers, monthly/yearly switcher, an interactive ROI slider calculator (invoices count, CA cost, hours), fetches `/api/subscription/status` + `/api/payment/history`, and shows billing history table.
- `getApiUrl(path)` routes to `http://localhost:5000` during local dev (port != 5000), otherwise same-origin.
- `PaymentSuccess.jsx` confirms.

### Backend (`api/billing.js`)
Auth via Firebase Admin `verifyIdToken`. Routes:
- `POST create-order` — picks monthly/yearly INR amount (Pro 199/mo, 159*12 yearly; Business 499/mo, 399*12 yearly), creates a Razorpay order, returns order + `key_id`.
- `POST verify` — double-spend check against history, HMAC-SHA256 signature verify (`order_id|payment_id`), then writes subscription + payment doc. Also supports a `free` "reset_signature" test path.
- `GET history`, `GET status`.

### DB abstraction (`_utils/database.js`)
Either uses **Firebase Admin Firestore** (if `FIREBASE_CLIENT_EMAIL`/`PRIVATE_KEY` present) or a **mock-mode** (`USE_MOCK_DATABASE=true` / `mock_db.json`), with automatic fall-back and recursive mock retry on Firestore errors. Stores in `users/{uid}` and `payments/{paymentId}`, transactional when available. `getUserSubscription`, `updateUserSubscription`, `saveFailedPayment`, `getPaymentHistory`.

---

## 18. Security Rules

### Firestore (`firestore.rules`)
- **Strict user isolation** — `/users/{uid}` and all subcollections writable/readable only by `request.auth.uid == uid`.
- `reminders/{id}` — read/write limited to owners via `userId`.
- Legacy root-level `bills`, `documents`, `gstForms`, `reports` — ownership-gated.
- `mail/{mailId}` — auth users can create; the Firebase SMTP extension may read/update.
- Everything not matched is denied.

### Realtime DB (`database.rules.json`)
- `users/$uid` — only the owner; inner objects validated (profile must have `name`,`email`; bills need `billNumber`).
- `reminders` — owner-scoped with specific userId.
- `test/$uid` — owner-only (debug).

### Storage (`storage.rules`)
- `users/{userId}/{allPaths=**}` — read/write/delete limited to the matching authenticated user; file size capped at **100MB**.
- Everything else denied.

---

## 19. Deployment (Vercel)

`vercel.json`:
- `buildCommand`: `CI=false GENERATE_SOURCEMAP=false npm run build`
- `outputDirectory`: `build`
- `crons`: `/api/checkOverdueBills` and `/api/scheduledReminders` daily 09:00.
- `rewrites`: maps `/api/payment/create-order` → `/api/billing?action=create-order` (and verify/history/status), passes `/api/*` through, and `/` pref wildcard to `index.html` (SPA fallback so client routes work).
- `headers`: sets COOP/COEP/CORP, Referrer-Policy, and permissive CORS headers (note: permissive CORS is intentional for a serverless polyglot, though you should harden in production).

---

## 20. Scripts & Tooling

- `npm run build` — production build (react-scripts).
- `npm start` — dev server (`http://localhost:3000`).
- `npm test` — react-scripts test.
- `verify_langs.js` — checks all locale JSON have identical key sets (fails with exit 1 on mismatch).
- `check_keys.py` — Python parity check (expected "All keys match").
- `scripts/testReminders.js`, `scripts/test_groq.js` — backend / AI smoke tests.
- `scripts/generate_assets.py` — favicon/logo generation.
- `testOverdue.js`, `triggerReminders.js` — manual reminder/overdue jobs.
- `push-to-github.bat` / `push-to-github.ps1` — git helpers.
- `CORRECT_COMPONENT_EXAMPLE.jsx` — reference snippet for correct component conventions.

---

## 21. Data Models & Seed Schema

### Bill (subcollection `users/{uid}/bills/{billId}`)
```
invoiceNumber, invoiceDate, supplierName, gstin,
amount, taxPercent, taxAmount, totalAmount,
taxBreakdown: { cgst, sgst, igst },
expenseType, category,
gstrDeadline, gstrForm, filed, filedDate,
status (pending|approved|rejected|filed),
notes, businessId, extractionConfidence,
userId, uploadedAt, updatedAt
```
Seed data includes KV 2026 invoices for the three demo businesses (Apex, NexGen, Phoenix), with consistent CGST/SGST/IGST splits, GSTIN integrity, and `filed` status.

### User `users/{uid}` profile
`uid, name, email, shopName, gstin, phone, address, city, state, pincode, authProvider, emailVerified, phoneVerified, createdAt, lastLogin, subscriptionPlan, subscriptionStatus, subscriptionExpiry`.

### Others
- `users/{uid}/gstForms`, `settings/preferences`, `stats/overview`, `reminders`, `documents`, `activityLogs`, `emailReminders`.
- Realtime: `users/{uid}/*`, and `emails/{sanitizedEmail}/{collection}`.
- Payments: `payments/{paymentId}`.

---

## 21. Observability & Debug Tooling

- **Performance**: `perfService` annotations in all auth operations.
- **Firebase debug suite**: `window.debugFirebase.*` (connection / email isolation / list users / realtime listener).
- **Debug UI components**: `FirebaseDebugPanel`, `AuthPerfTest`, `LanguageDiagnostic`.
- **Console logging**: Every service prints emoji-prefixed, color-coded logs (✅/❌/⚠️) to aid tracing.
- **Error boundary** stops silent white-screens.

---

## 22. Running the Whole Stack

### Development (full stack)
1. `cd demorepo-openai-main/demorepo-openai-main`
2. Configure `.env` (copy `.env.example`), add Groq + Firebase keys.
3. Terminal 1 — Express backend:
   ```bash
   npm install
   node api/server.js     # http://localhost:5000
   ```
4. Terminal 2 — frontend:
   ```bash
   npm install
   npm start              # http://localhost:3000, proxy → :5000
   ```
5. (Optional) Firebase emulators: `firebase emulators:start`.

### Production build
```bash
npm run build
npx serve -s build -l 3000   # SPA fallback needed for Client-Side Routing
```
Or deploy to Vercel (`vercel --prod`) which runs `CI=false ... build` and wires the rewrites/crons header.

### Verification
```bash
node verify_langs.js        # locale parity
npm test
```

---

## 23. Troubleshooting the "Z"

| Issue | Root cause / Fix |
|-------|------------------|
| 400 Firebase API key | `.env.production` has placeholder credentials — replace with real keys from `.env` and rebuild. |
| Routing 404 on deep links | Must serve with `-s` (SPA fallback), or rely on Vercel rewrite to `index.html`. |
| Groq non-JSON/HTML response | Corporate firewall / captive network / Service Worker interference — retry in incognito or clear browser cache; confirm the API key. |
| Email `EAUTH` | Wrong `BREVO_API_KEY` / `EMAIL_FROM`; verify key is the SMTP "password", check Vercel env. |
| Email `ECONNREFUSED` | `smtp-relay.brevo.com` down or local server not running — run `node api/server.js`. |
| Razorpay order fails | Ensure `RAZORPAY_KEY_ID`/`SECRET` set; billing layer falls back to mock mode otherwise. |
| Firestore permission denied | Log in and confirm data is under your own `users/{uid}`; rules enforce isolation. |
| No bills shown | If brand-new user, `seederService` seeds demo invoices on first `onAuthStateChanged`; else upload a bill. |
| Features locked | Free/Pro tier-gating in Dashboard AI Agent and Pricing; upgrade via Checkout. |
| Localization missing text | Run `node verify_langs.js`; if a key is missing, add it in all 5 locale files (must stay 300 keys). |

---

## 24. Appendix — What Not to Do & Security Notes

- Keep `.env` secret keys out of version control (`.gitignore` should exclude `.env` / `.env.local`, `.env.production`).
- Server-side secrets (`BREVO_API_KEY`, `RAZORPAY_KEY_SECRET`, Firebase service account) must **never** be read into a React `REACT_APP_*` variable or shipped in the bundle.
- India GST compliance logic (deadline 11th/13th/20th, ITC=1.5x model) is a **simulation** for demo; production must integrate the official GST portal.
- Hardened CORS (setting CORS `*` is intentionally permissive in the demo `api/_server.js` and `vercel.json`; restrict origins before real deployment).
- All demo businesses use fixed GSTINs for illustration, pass the `validateGSTNumber` regex.

---

*This document is the full **A to Z** implementation reference for the codebase contained in this repository. Refer to the source for the live, canonical behavior.*