# AI GST & Compliance Buddy — Full Project Details (A to Z)

## 1. Project Overview

**Name**: AI GST & Compliance Buddy
**Purpose**: A React SPA that helps small Indian businesses automate Goods and Services Tax (GST) compliance using AI
**Built for**: OpenAI x NxtWave BUILDATHON
**Demo Credentials**: `demo@shop.com` / `password123`

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 (CRA), React Router v6 |
| State | Context API (`AuthContext`, `DarkModeContext`) + localStorage |
| Styling | CSS variables + custom design system (Tailwind config present but unused at runtime) |
| AI (server-side) | **Google Gemini** (`@google/generative-ai`) — `gemini-2.0-flash` |
| OCR (client-side) | Tesseract.js |
| Charts | Recharts |
| i18n | i18next + react-i18next (5 languages) |
| Database | Firebase Firestore (primary) + Realtime DB (secondary) |
| Storage | Firebase Storage (optional, ≤100MB) |
| Auth | Firebase Auth (email/password, Google OAuth, phone OTP) |
| Email | **Brevo SMTP** (nodemailer) |
| Payments | **Cashfree** (server-side verification + webhooks) |
| Backend (local) | Express.js (`server.js`) on port 5000 |
| Serverless | Vercel functions (`api/...`) |
| Utilities | Axios, html2pdf.js, framer-motion, dotenv, lucide-react |

### Key Dependencies (package.json)

- `firebase` v12, `firebase-admin` v14
- `@google/generative-ai` (Gemini SDK)
- `nodemailer`
- `react-router-dom`, `recharts`, `tesseract.js`, `html2pdf.js`
- `i18next`, `react-i18next`, `framer-motion`, `axios`
- `express`, `cors`, `dotenv`, `lucide-react`

---

## 3. Directory Structure

```
demorepo-openai-main/                 (repo root)
├── FULL_PROJECT_IMPLEMENTATION.md    (A-Z reference)
├── ANALYSIS_SUMMARY.md               (per-page/component audit)
├── GST_BUDDY_FULL_PROJECT.md         (THIS file)
├── deploy.log
├── package.json
│
└── demorepo-openai-main/             (React app root)
    ├── public/                       (index.html, favicons, manifest.json)
    ├── api/                          (Vercel serverless + local Express)
    │   ├── ai.js                     (AI Gateway — Gemini)
    │   ├── agent.js                  (Agent Orchestrator)
    │   ├── billing.js                (Cashfree payment API)
    │   ├── email.js                  (Brevo email endpoint)
    │   ├── health.js                 (Health check)
    │   ├── reminders.js              (Cron reminders)
    │   └── .env                      (server secrets)
    ├── lib/                          (Backend libraries)
    │   ├── admin.js                  (Firebase Admin, auth verify, AiHttpError)
    │   ├── aiTasks.js                (6 AI task handlers)
    │   ├── gemini.js                 (Google Gemini wrapper)
    │   ├── finance.js                (Deterministic GST math)
    │   ├── schemas.js                (Response validation schemas)
    │   ├── usage.js                  (Plan limits & usage tracking)
    │   ├── config.js                 (Model config)
    │   ├── cors.js                   (CORS helpers)
    │   ├── database.js               (Firestore/mock DB abstraction)
    │   ├── logger.js                 (Structured logging)
    │   └── agentRunLogger.js         (Agent run persistence)
    ├── functions/                    (Deprecated Firebase Cloud Functions)
    ├── scripts/                      (Build/test utilities)
    ├── scratch/                      (Debug/fix scripts)
    ├── src/
    │   ├── App.jsx                   (Root router)
    │   ├── index.js                  (ReactDOM entry)
    │   ├── config/                   (firebase.js, features.js)
    │   ├── context/                  (AuthContext, DarkModeContext)
    │   ├── hooks/                    (useAuth)
    │   ├── i18n/                     (config.js + 5 locale JSONs)
    │   ├── components/               (19 components)
    │   ├── pages/                    (32 page components)
    │   ├── services/                 (11 service modules)
    │   ├── styles/                   (auth-animations.css)
    │   ├── utils/                    (rateLimiter, storageUtils, validators)
    │   ├── App.css                   (Global design system)
    │   └── index.css
    ├── firebase.json                 (Emulator rules mapping)
    ├── firestore.rules               (Security rules)
    ├── database.rules.json           (RTDB rules)
    ├── storage.rules                 (Storage rules)
    ├── vercel.json                   (Crons, rewrites, headers)
    └── package.json
```

---

## 4. Environment & API Keys

### Client-side (`REACT_APP_*`)

- `REACT_APP_FIREBASE_API_KEY` — Firebase API key
- `REACT_APP_FIREBASE_AUTH_DOMAIN` — Auth domain
- `REACT_APP_FIREBASE_PROJECT_ID` — Project ID
- `REACT_APP_FIREBASE_DATABASE_URL` — Realtime DB URL
- `REACT_APP_FIREBASE_STORAGE_BUCKET` — Storage bucket
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` — Sender ID
- `REACT_APP_FIREBASE_APP_ID` — App ID
- `REACT_APP_FIREBASE_MEASUREMENT_ID` — Analytics ID
- `REACT_APP_ENABLE_DOCUMENT_STORAGE` — Optional, default `false`
- `REACT_APP_USE_EMULATOR` — Firebase emulators
- `REACT_APP_PHONE_AUTH_TEST_MODE` — Phone auth test mode
- `REACT_APP_AUTH_REDIRECT_URL` — Auth redirect URL
- `REACT_APP_ENVIRONMENT` — development/production

### Server-side (never in browser)

- `GEMINI_API_KEY` — Google Gemini API key
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — Admin SDK
- `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_ENV`, `CASHFREE_WEBHOOK_SECRET` — Payments
- `BREVO_API_KEY`, `EMAIL_FROM` — Email SMTP
- `CRON_SECRET`, `ADMIN_KEY` — Cron authorization
- `USE_MOCK_DATABASE` — Fallback to mock DB
- `PORT` — Server port (default 5000)

---

## 5. Application Bootstrap & Routing

### Entry: `src/index.js` → `src/App.jsx`

**Provider hierarchy**:
```
ErrorBoundary → I18nextProvider → AuthProvider → DarkModeProvider → AppContent
```

**Router**: BrowserRouter with v7 future flags (`v7_startTransition`, `v7_relativeSplatPath`)

### All 27+ Routes

| Route | Page | Auth | Notes |
|-------|------|------|-------|
| `/` | Home | Public | Landing page with animated counters |
| `/login` | SignupPage (login mode) | Public | Redirect if authed |
| `/signup` | SignupPage (signup mode) | Public | Redirect if authed |
| `/forgot-password` | ForgotPasswordPage | Public | Redirect if authed |
| `/pricing` | PricingBilling | Public | In DashboardLayout |
| `/dashboard` | Dashboard | Protected | Main dashboard |
| `/agent` | AIFinanceAgent | Protected | AI finance agent |
| `/agent-activity` | AgentActivityPage | Protected | Agent run logs |
| `/bill-upload` | BillUpload | Protected | Invoice capture |
| `/bill/:billId` | BillDetails | Protected | Verify/edit bill |
| `/invoices` | Invoices | Protected | Invoice ledger |
| `/compliance` | ComplianceCenter | Protected | Compliance ratings |
| `/health` | BusinessHealth | Protected | Business health score |
| `/audit` | AuditCenter | Protected | Reconciliation logs |
| `/forecast` | TaxForecast | Protected | Tax liability prediction |
| `/reports` | Reports | Protected | Fiscal statements |
| `/insights` | AIInsights | Protected | Strategic tips |
| `/recommendations` | Recommendations | Protected | AI suggestions |
| `/gst-forms` | GSTForms | Protected | GSTR-1/3B generation |
| `/expenses` | ExpenseAnalytics | Protected | Expense charts |
| `/vendors` | VendorIntelligence | Protected | Supplier scoring |
| `/business` | BusinessDirectory | Protected | Business management |
| `/notifications` | NotificationCenter | Protected | System alerts |
| `/documents` | DocumentAssistant | Protected | Document analysis |
| `/chat` | ChatPage | Protected | AI chat |
| `/search` | GlobalSearch | Protected | Cross-page search |
| `/settings` | Settings | Protected | Preferences |
| `/penalty` | PenaltyCenter | Protected | Penalty calculator |
| `/checkout` | CheckoutPage | Protected | Cashfree checkout |
| `/payment-success` | PaymentSuccess | Protected | Transaction confirm |
| `/support` | Support | Protected | Help & FAQ |
| `/profile` | Profile | Protected | User profile |
| `*` | Catch-all | — | Redirect to dashboard or login |

**Code-splitting**: All pages are lazy-loaded. `ProtectedRoute` + `DashboardLayout` wrap protected routes.

---

## 6. State Management

### `AuthContext.jsx`
- **State**: `user`, `loading`, `error`, `isAuthenticated`
- **Actions**: `logout`, `clearError`, `setUser`
- Subscribes to Firebase `onAuthStateChanged`
- Cached-user-first strategy:
  1. Show cached `localStorage['user']` immediately
  2. Freshen from Firestore `getDoc(users/{uid})` in background
  3. Fall back to minimal Firebase Auth user object
- Seeds demo invoices for new users via `seedUserInvoicesIfEmpty(uid)`
- Stores `user` and `userToken` in localStorage; clears on logout

### `DarkModeContext.jsx`
- **State**: `isDarkMode`
- **Actions**: `toggleDarkMode`, `resetTheme`
- Persistent via `localStorage['darkMode']`
- Swaps CSS variables between light and dark palettes
- Forces light mode when logged out

### `useAuth.js`
- Thin wrapper: `useContext(AuthContext)` with provider guard

---

## 7. Firebase Configuration (`src/config/firebase.js`)

- **Auth**: `getAuth`, local persistence, `GoogleAuthProvider` (prompt: select_account), `RecaptchaVerifier` + `signInWithPhoneNumber`
- **Firestore**: `initializeFirestore` with `persistentLocalCache` + `persistentMultipleTabManager` (offline multi-tab)
- **Storage**: `getStorage` (optional)
- **Realtime DB**: `getDatabase`
- **Analytics**: lazy `isSupported()` gate
- **Emulator support**: when `REACT_APP_USE_EMULATOR=true`, connects to local emulators (DB:9000, Firestore:8080, Auth:9099, Storage:9199)

---

## 8. Internationalization (i18n)

### Languages
- **English** (en), **Hindi** (hi), **Tamil** (ta), **Malayalam** (ml), **Kannada** (kn)

### Implementation
- `src/i18n/config.js` initializes i18next with 5 locale resources
- **300 keys per locale**, perfectly synced (verified by `verify_langs.js` and `check_keys.py`)
- Reads/writes `localStorage['language']`, default `en`
- Sets `<html lang>` on language change
- React config: `useSuspense: false`
- All UI strings use `useTranslation()` — live switching without reload

---

## 9. Services Layer (11 modules)

### `authService.js`
- `signup(email, password, userData)` — create user, parallel `updateProfile`, `setDoc`, `sendEmailVerification`
- `login(email, password)` — sign in, non-blocking `lastLogin` update
- `logout()`, `sendPasswordReset(email)`, `sendVerificationEmail()`
- `getCurrentUserData(uid)`
- `listenToAuthStateChange(callback)`
- `updateUserProfile(updates)` — Firestore + Auth display name
- `loginWithGoogle()` / `signupWithGoogle()` — popup, creates/updates Firestore profile
- `sendPhoneOTP(phoneNumber)`, `verifyPhoneOTP(verificationId, code)`, `loginWithPhone()`, `completePhoneLogin()`

### `firebaseDataService.js` (primary data layer)
User-isolated under `users/{uid}/`:

| Domain | Methods |
|--------|---------|
| Profile | `saveUserProfile`, `getUserProfile` |
| Bills | `saveUserBill`, `getUserBills` (10s cache), `getUserBillById`, `updateUserBill`, `deleteUserBill` |
| GST Forms | `saveUserGSTForm`, `getUserGSTForms` |
| Stats | `updateUserStats`, `getUserStats` |
| Settings | `saveUserSettings`, `getUserSettings` |
| Reminders | `createBillReminder`, `getUserReminders` |
| Documents | `saveUserDocument`, `getUserDocuments` |
| Storage | `uploadBillDocument`, `downloadBillDocument`, `deleteBillDocument`, `getBillDocuments` |
| Activity | `logUserActivity`, `getUserActivityLogs` |
| Export | `exportAllUserData`, `deleteAllUserData` |
| Cache | `invalidateBillsCache()`, `verifyUserOwnership()`, `getCurrentUserInfo()` |

### `userDatabaseService.js` (Realtime DB + email-key storage)
- RTDB at `users/{uid}/profile|settings|stats`
- Email-based storage: `emails/{sanitizedEmail}/{collection}`
- Full CRUD + real-time listeners (`onEmailDataChange`, `setupEmailDataListener`)
- New-user init, lastLogin tracking

### `billService.js`
- `saveBillToFirebase`, `getBillsFromFirebase`, `deleteBillFromFirebase`, `updateBillInFirebase`, `getBillsDueSoon`

### `reminderService.js`
- `calculateGSTDueDates(invoiceDate)` → GSTR-1 due 11th, GSTR-3B due 20th
- `createBillReminders(userId, billData)` — creates GSTR-1, GSTR-3B, payment reminders
- `getPendingReminders`, `markReminderSent`, `dismissReminder`, `getAllReminders`, `generateReminderAlerts`

### `emailReminderService.js`
- `sendReminderEmail(emailData)` — POST `/api/email` (Brevo SMTP)
- `checkAndSendBillReminders(userId)` — iterate bills, dedupe within 24h
- `sendBillUploadReminder(billData, userEmail)` — urgency-tiered emails
- `sendManualReminder`, `getBillReminderHistory`, `calculateBillUrgency`, `sendTestEmail`

### `billReminderService.js`
- `getBillReminderStatus(userId, billId)` — hasReminder, reminderDaysLeft, reminderType
- `getBillReminderHistory`, `recordReminderEmailSent`, `getReminderSeverity`

### `perfService.js`
- Tracks operations with `performance.now()` — emoji feedback (🚀<100ms, ⚡<300ms, ⏳<800ms, 🐢<1500ms, 🐌>1500ms)

### `aiService.js`
- Client helper for `/api/ai` — attaches Firebase ID token
- `extractInvoiceData({ ocrText, image, business })`
- `analyzeCompliance({ businessId })`
- `forecastTax({ businessId })`
- `getBusinessInsights({ businessId })`
- `analyzeDocument({ ocrText, image })`
- `aiChat({ messages, business, invoiceSummary, language })`
- `aiChatStream({ messages, business, invoiceSummary, language })` — SSE streaming

### `subscriptionService.js`
- `fetchActivePlan()` — fetches plan from server

### `otpService.js`
- Empty stub (functionality inside `authService.js`)

---

## 10. Utility Layer

### `rateLimiter.js`
- Sliding-window class with methods: `isAllowed`, `getRemaining`, `getResetTime`, `reset`, `clearAll`
- Three instances:
  - `apiRateLimiter` — 20 requests/minute
  - `authRateLimiter` — 5 requests/5 minutes (brute-force prevention)
  - `chatRateLimiter` — 30 requests/minute

### `storageUtils.js`
- Centralized localStorage wrapper for bills keyed by user
- `getBillsStorageKey`, `saveBills`, `getBills`, `addBill`, `updateBill`, `deleteBill`, `clearBills`, `migrateOldBillsKey`

### `validators.js`
- `sanitizeString` (XSS escaping)
- `validateEmail` — email format
- `validatePassword` — 8+ chars, upper/lower/number/special
- `validatePhone` — 10+ digits
- `validateFileSize` — default 10MB
- `validateFileType` — allowed extensions
- `validateGSTNumber` — `XXAAAAAXXXXXZ#` pattern
- `validatePANNumber` — `AAAAA9999A` pattern
- `sanitizeNumber`, `isInRange`, `validateForm` (rule-driven batch validation)

---

## 11. UI Components (19)

| Component | Purpose | Data Source |
|-----------|---------|-------------|
| `ProtectedRoute.jsx` | Auth gate — spinner while loading, Outlet when authed | AuthContext |
| `DashboardLayout.jsx` | Flex shell with mobile overlay, Sidebar, Header, Outlet | — |
| `Sidebar.jsx` | Left navigation with SVG icon map, NavLinks, business switcher | `getUserBusinesses()`, `fetchActivePlan()` |
| `Header.jsx` | Top bar: business selector, global search, language switcher, dark-mode toggle | — |
| `Navbar.jsx` | Marketing top-nav (logged-out flows) | — |
| `AIAssistant.jsx` | Chat widget (streaming Gemini) | `aiChat()`, `getUserBills()` |
| `GSTFilingStatus.jsx` | Deadline & filing timeline widget | Bills data |
| `PenaltyLateFeeEstimator.jsx` | Late-filing penalty calculator (Section 47 CGST Act) | User input |
| `ReminderPanel.jsx` | Upcoming deadlines & outstanding invoices | `getPendingReminders()` |
| `Notification.jsx` | Toast/banner component | — |
| `ErrorBoundary.jsx` | Catches render errors → friendly fallback | — |
| `FirebaseDebugPanel.jsx` | Dev panel to test Firestore queries | Firestore |
| `LanguageDiagnostic.jsx` | i18n health-check | i18next |
| `AuthPerfTest.jsx` | Benchmark for signup/login timings | perfService |
| `EndToEndComplianceSuite.jsx` | Compliance test suite | Real bill data |
| `Logo.jsx` | Multi-variant SVG | — |
| `ScrollToTop.jsx` | Scroll reset on route change | — |
| `PhoneAuthModal.jsx` | Phone auth modal (empty file) | — |
| `AgentActivity.jsx` | Activity log wrapper | `user.uid` |

---

## 12. All 32 Pages

### 1. Home (`/`)
- Landing page with animated counters, monthly data chart
- Marketing stats (50K+ invoices, 200+ businesses)
- Hardcoded marketing data

### 2. SignupPage (`/login`, `/signup`)
- Multi-field signup (name, shop, GSTIN, email, phone, password)
- Handles both signup and login via `isLoginInitial`
- Google OAuth + phone OTP
- Auth validation, loading states

### 3. ForgotPasswordPage (`/forgot-password`)
- Firebase `sendPasswordResetEmail()`
- Validation, loading, error, success states

### 4. Dashboard (`/dashboard`)
- Business switcher, financial metrics
- Health/compliance scores, charts (Recharts)
- Quick actions, embedded AI Finance Agent
- Global search, plan gating enforced

### 5. BillUpload (`/bill-upload`)
- Invoice capture: file upload + camera capture (getUserMedia)
- Three-phase extraction pipeline:
  1. Optional Vision AI (Gemini Vision)
  2. Fallback: Tesseract.js OCR → Gemini LLM
  3. Validate & compute (CGST/SGST/IGST)
- Editable extraction form, bounding box overlay
- Confirm & sync to Firebase

### 6. BillDetails (`/bill/:billId`)
- Loads bill by ID from Firestore
- Edit, update via `updateUserBill()`
- Reminder services integration

### 7. GSTForms (`/gst-forms`)
- GSTR-1: per-invoice rows with GSTIN/supplier/amounts
- GSTR-3B: totals (outward supplies, inward, ITC, net payable)
- Filing readiness % ring
- PDF download (html2pdf.js), JSON export
- One-click auto-file

### 8. Reports (`/reports`)
- Fiscal statements/summaries
- Charts computed from real bill data
- AI insights derived from data

### 9. AIFinanceAgent (`/agent`)
- Interactive finance audit evaluator
- AI chat via `aiChat()`, alerts via `runFullAnalysis()`
- Firestore activity logs
- Plan gating enforced

### 10. AIInsights (`/insights`)
- Strategic tips & spending evaluation
- All numbers from Firestore bills

### 11. Invoices (`/invoices`)
- Full ledger with search, filter, sort, pagination
- Bulk delete, inline editing
- Empty states

### 12. ComplianceCenter (`/compliance`)
- Compliance ratings from real bill data
- Status, anomaly flags
- Plan gating enforced

### 13. BusinessHealth (`/health`)
- Profitability ratios, cash-flow, assets
- Health score from real filing status

### 14. AuditCenter (`/audit`)
- Reconciliation logs
- Compliance score from real data
- Plan gating enforced

### 15. TaxForecast (`/forecast`)
- Future liability prediction from monthly averages
- Real bill data analysis
- Plan gating enforced

### 16. ExpenseAnalytics (`/expenses`)
- Category-wise expense charts (BarChart, PieChart)
- Computed from real bill data

### 17. VendorIntelligence (`/vendors`)
- Supplier scoring profiles from real bill data

### 18. BusinessDirectory (`/business`)
- Business categories/parameters
- CRUD operations via `getUserBusinesses()`, `saveUserBusinesses()`

### 19. NotificationCenter (`/notifications`)
- System alerts & deadline warnings
- Bills loaded from Firestore, alerts partially hardcoded

### 20. DocumentAssistant (`/documents`)
- OCR via Tesseract.js, AI via `analyzeDocument()`
- Plan gating (3 free, 50 pro)

### 21. GlobalSearch (`/search`)
- Instant search across pages, logs, bills, businesses, vendors

### 22. Profile (`/profile`)
- Profile from Firestore via `getUserProfile()`
- Save via `setDoc()`, activity logs

### 23. Settings (`/settings`)
- Language, dark mode, notifications, security
- Profile/settings load/save via Firestore
- 2FA toggle disabled, API key manager disabled

### 24. ChatPage (`/chat`)
- Wrapper around `AIAssistant` component

### 25. Support (`/support`)
- Static FAQ, WhatsApp link, email support, Firebase support

### 26. Recommendations (`/recommendations`)
- Bills loaded from Firestore, recommendations hardcoded

### 27. PricingBilling (`/pricing`)
- Plan tiers, monthly/yearly switcher
- ROI slider calculator (invoices count, CA cost, hours)
- Fetches `/api/subscription/status` + `/api/payment/history`

### 28. CheckoutPage (`/checkout`)
- Cashfree hosted checkout (UPI, cards, netbanking)
- Creates order → verifies signature

### 29. PaymentSuccess (`/payment-success`)
- Transaction confirmation from `location.state`

### 30. AgentActivityPage (`/agent-activity`)
- Wrapper around `AgentActivity` component

### 31. PenaltyCenter (`/penalty`)
- Penalty calculator (Section 47 CGST Act)
- Real GST law formulas
- Plan gating enforced

### 32. Home (`/`)
- Marketing landing page

---

## 13. AI Features (Server-side Gemini)

### 6 AI Tasks (`lib/aiTasks.js`)

#### 1. `invoice_extraction`
- **Input**: Image (base64) or OCR text
- **Process**: Gemini Vision (image) or Gemini LLM (OCR text)
- **Output**: Structured JSON — supplier, GSTIN, amounts, tax, category, bounding boxes
- **System prompt**: Expert Indian B2B accountant, no invented values, validate GSTIN format

#### 2. `compliance_analysis`
- **Input**: User's invoices from Firestore
- **Process**: Deterministic rules (`finance.js`) + Gemini reasoning
- **Output**: Findings, risk level, recommendations, requiresHumanApproval flag
- **System prompt**: GST Compliance Agent, no invented violations

#### 3. `tax_forecast`
- **Input**: User's invoices from Firestore
- **Process**: Deterministic math (monthly averages) + Gemini explanation
- **Output**: Liability prediction, drivers, risks, recommended actions
- **System prompt**: Tax Forecast Agent, never recompute numbers

#### 4. `business_insight`
- **Input**: User's invoices from Firestore
- **Process**: Deterministic metrics + Gemini insights
- **Output**: Headline, risk level, insights (spend concentration, ITC opportunity, filing risk)
- **System prompt**: Business Intelligence Agent

#### 5. `gst_assistant` / `gst_assistant_stream`
- **Input**: Chat messages, business context, invoice summary
- **Process**: Gemini conversational generation (text or streaming)
- **Output**: GST guidance in English/Hindi/Tamil
- **System prompt**: GST Buddy, multilingual, references real invoices

#### 6. `document_analysis`
- **Input**: Image (base64) or OCR text
- **Process**: Gemini Vision/LLM for document analysis
- **Output**: Structured analysis of GST notices/legal documents
- **System prompt**: Expert Indian tax attorney

### AI Gateway (`api/ai.js`)
- POST `/api/ai` — authenticated (Firebase ID token via `Authorization: Bearer`)
- Routes to task handlers
- Rate limiting, payload size limits (maxPayloadBytes)
- Error normalization (never exposes stack traces)
- Usage tracking per plan

### Agent Orchestrator (`api/agent.js`)
- **Triggers**:
  - `invoice_uploaded` — Invoice → Compliance → Finance → Reminder Agent chain
  - `run_compliance` — Compliance Agent
  - `run_forecast` — Tax Forecast Agent
  - `run_insights` — Business Intelligence Agent
  - `run_full_analysis` — All agents in sequence
- Each agent:
  1. Reads data from Firestore
  2. Runs deterministic rules (`finance.js`)
  3. Calls Gemini for reasoning
  4. Returns structured decisions
  5. Orchestrator executes actions (writes to Firestore)
  6. Everything logged to `agentRuns` collection
- Monthly invoice limit enforcement per plan (10/500/5000)

### Gemini Wrapper (`lib/gemini.js`)
- Single point of Gemini invocation, key never exposed to browser
- `runStructured(task, { systemInstruction, prompt, base64, mimeType })` — JSON output
- `generateText({ systemInstruction, messages })` — conversational
- `streamText({ systemInstruction, messages })` — streaming async generator
- Rate-limit retry with exponential backoff (max 2 retries)
- Timeout handling, error normalization
- JSON extraction: parse → fenced code blocks → brace matching → salvage truncated JSON

### Finance Module (`lib/finance.js`)
- `checkCompliance(bills)` — deterministic compliance rules
- `buildForecast(bills)` — monthly averages, liability prediction
- `buildMetrics(bills)` — revenue, GST, ITC, net payable, top vendors/categories
- `summarizeBills(bills, maxChars)` — bill summary for AI prompts
- `computeFacts(bills)` — computed facts
- GST rate support: 5%, 12%, 18%, 28%

---

## 14. GST Forms & PDF Generation

### GSTR-1 (Outward Supplies)
- Per-invoice rows: GSTIN, supplier, invoice #, taxable price, CGST, SGST
- Filing readiness % ring from checklist

### GSTR-3B (Summary Return)
- `outwardSupplies = totalTaxable * 1.5`
- `inwardSupplies`, `totalTax`
- `itc = input tax`
- `netPayable = max(0, totalTax * 1.5 - itc)`

### Filing Checklist
- Math check, duplicate detection, valid GSTIN errors, low-confidence warnings
- Blocks filing while errors exist

### Exports
- PDF download: HTML → `html2pdf.js` (GSTR-1 landscape, GSTR-3B portrait)
- JSON export
- One-click auto-file: marks bills `filed:true`, records activity

---

## 15. Email & Reminder System

### Brevo SMTP
- Local Express: `POST /api/sendEmail`, `POST /api/email`
- Vercel serverless: `api/email.js`
- SMTP: `smtp-relay.brevo.com:587`
- Auth: user `a26ddc001@smtp-brevo.com`, pass = `BREVO_API_KEY`
- Sender: `EMAIL_FROM` (default `devendranp.it2024@citchennai.net`)
- Converts plaintext to HTML, adds sender + replyTo

### Cron Jobs (Vercel, defined in `vercel.json`)
| Schedule | Endpoint | Purpose |
|----------|----------|---------|
| `0 9 * * *` | `/api/reminders?task=overdue` | Past-due bills → overdue HTML emails |
| `0 9 * * *` | `/api/reminders?task=scheduled` | Bills due within 7 days → tiered urgency emails |
| `0 7 * * *` | `/api/agent?schedule=true` | Daily agent analysis |

### Email Urgency Tiers
- Overdue (past due)
- Today (due today)
- One day (due tomorrow)
- Three days (due in 3 days)
- One week (due in 7 days)

### Client-side
- `emailReminderService.js` → POST `/api/email`
- Deduplication within 24h
- Records in `users/{uid}/emailReminders`

---

## 16. Payments & Subscriptions

### Plans

| Plan | Monthly | Yearly | Invoice Limit |
|------|---------|--------|---------------|
| Free | ₹0 | ₹0 | 10/month |
| Pro | ₹199/mo | ₹199/mo | 500/month |
| Business | ₹499/mo | ₹499/mo | 5000/month |

### Frontend
- `PricingBilling.jsx` — plan tiers, ROI calculator, billing history
- `CheckoutPage.jsx` — Cashfree Web SDK hosted checkout (UPI, cards, netbanking)
- `PaymentSuccess.jsx` — transaction confirmation
- `getApiUrl(path)` — routes to `localhost:5000` during local dev

### Backend (`api/billing.js`)
- Auth: Firebase Admin `verifyIdToken`
- Routes:
  - `POST /api/payment/create-order` — Cashfree order creation
  - `POST /api/payment/verify` — HMAC-SHA256 signature verification (`order_id|payment_id`)
  - `GET /api/payment/history` — payment history
  - `GET /api/subscription/status` — current plan
- Double-spend check against history
- Supports `free` "reset_signature" test path

### DB Abstraction (`lib/database.js`)
- Firebase Admin Firestore (when `FIREBASE_CLIENT_EMAIL`/`PRIVATE_KEY` present)
- Mock-mode fallback (`USE_MOCK_DATABASE=true` / `mock_db.json`)
- `getUserSubscription`, `updateUserSubscription`, `getPaymentHistory`, `saveFailedPayment`

---

## 17. Security Rules

### Firestore (`firestore.rules`)
```
- /users/{uid} — read/write: request.auth.uid == uid
- /users/{uid}/** — all subcollections: owner-only
- /reminders/{id} — read/write: userId == request.auth.uid
- /bills, /documents, /gstForms, /reports — ownership-gated
- /mail/{mailId} — auth users create; Firebase SMTP extension reads
- Everything else: denied
```

### Realtime DB (`database.rules.json`)
```
- users/$uid — owner-only
  - profile: must have name, email
  - bills: must have billNumber
- reminders — owner-scoped with userId
- test/$uid — owner-only
```

### Storage (`storage.rules`)
```
- users/{userId}/{allPaths=**} — read/write/delete: auth user only, ≤100MB
- Everything else: denied
```

---

## 18. Deployment (Vercel)

### `vercel.json` Configuration

```json
{
  "buildCommand": "CI=false GENERATE_SOURCEMAP=false npm run build",
  "outputDirectory": "build",
  "crons": [
    { "path": "/api/reminders?task=overdue", "schedule": "0 9 * * *" },
    { "path": "/api/reminders?task=scheduled", "schedule": "0 9 * * *" },
    { "path": "/api/agent?schedule=true", "schedule": "0 7 * * *" }
  ],
  "rewrites": [
    { "source": "/api/payment/create-order", "destination": "/api/billing?action=create-order" },
    { "source": "/api/payment/verify", "destination": "/api/billing?action=verify" },
    { "source": "/api/payment/history", "destination": "/api/billing?action=history" },
    { "source": "/api/subscription/status", "destination": "/api/billing?action=status" },
    { "source": "/api/extract", "destination": "/api/ai?task=invoice_extraction" },
    { "source": "/api/chat", "destination": "/api/ai?task=gst_assistant" },
    { "source": "/api/sendEmail", "destination": "/api/email" },
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains; preload" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

---

## 19. Data Models

### Bill (`users/{uid}/bills/{billId}`)
```json
{
  "invoiceNumber": "INV-2026-001",
  "invoiceDate": "2026-01-15",
  "supplierName": "Apex Retailers",
  "gstin": "27AAPFU0939F1ZV",
  "amount": 10000,
  "taxPercent": 18,
  "taxAmount": 1800,
  "totalAmount": 11800,
  "taxBreakdown": { "cgst": 900, "sgst": 900, "igst": 0 },
  "expenseType": "Raw Material",
  "category": "Electronics",
  "gstrDeadline": "2026-02-13",
  "gstrForm": "GSTR-1",
  "filed": false,
  "filedDate": null,
  "status": "pending",
  "notes": "",
  "businessId": "apex-retailers",
  "extractionConfidence": "high",
  "userId": "abc123",
  "uploadedAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-01-15T10:30:00Z"
}
```

### User (`users/{uid}`)
```json
{
  "uid": "abc123",
  "name": "Demo User",
  "email": "demo@shop.com",
  "shopName": "Demo Shop",
  "gstin": "27AAPFU0939F1ZV",
  "phone": "9876543210",
  "address": "123 Main St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "authProvider": "email",
  "emailVerified": true,
  "phoneVerified": false,
  "createdAt": "2026-01-01T00:00:00Z",
  "lastLogin": "2026-01-15T10:00:00Z",
  "subscriptionPlan": "free",
  "subscriptionStatus": "active",
  "subscriptionExpiry": null
}
```

### Other Collections
- `users/{uid}/gstForms` — GSTR forms
- `users/{uid}/settings` — User preferences
- `users/{uid}/stats` — Statistics
- `users/{uid}/reminders` — Bill reminders
- `users/{uid}/documents` — Supporting documents
- `users/{uid}/activityLogs` — Activity history
- `users/{uid}/emailReminders` — Email reminder records
- `users/{uid}/agentRuns` — Agent execution logs
- `users/{uid}/businesses` — Multi-business support
- `emails/{sanitizedEmail}/{collection}` — Realtime DB email-key storage
- `payments/{paymentId}` — Payment records

### Seed Data
- 8 realistic 2026 invoices for 3 demo businesses:
  - **Apex Retailers** — Electronics supplier
  - **NexGen** — IT services
  - **Phoenix Logistics** — Logistics provider
- Consistent CGST/SGST/IGST splits, valid GSTINs, `filed` status

---

## 20. Scripts & Tooling

| Script | Purpose |
|--------|---------|
| `npm start` | Dev server (port 3000, proxies to :5000) |
| `npm run build` | Production build (react-scripts) |
| `npm test` | React tests |
| `node server.js` | Express backend (port 5000) |
| `node verify_langs.js` | Locale parity check (5 languages × 300 keys) |
| `node testOverdue.js` | Manual overdue reminder test |
| `node triggerReminders.js` | Manual reminder trigger |
| `node scripts/testReminders.js` | Backend reminder smoke test |
| `node scripts/e2e-ai-test.js` | End-to-end AI test |
| `node scripts/test-extraction-contract.js` | Extraction contract test |
| `python scripts/generate_assets.py` | Favicon/logo generation |
| `python check_keys.py` | Python locale parity check |
| `node scratch/debug-gemini.js` | Debug Gemini integration |
| `node scratch/verify-prod-handlers.js` | Verify production handlers |
| `node scratch/verify-query-shapes.js` | Verify Firestore query shapes |

---

## 21. Observability & Debug

### Performance
- `perfService` annotations in all auth operations
- Emoji feedback: 🚀<100ms, ⚡<300ms, ⏳<800ms, 🐢<1500ms, 🐌>1500ms

### Firebase Debug Suite
- `window.debugFirebase.*` methods:
  - `debugFirebaseConnection()` — tests auth, RTDB, Firestore, config
  - `debugEmailDataIsolation`
  - `debugListAllUsers`
  - `debugRealtimeListener`

### Debug UI Components
- `FirebaseDebugPanel` — dev panel to test Firestore queries
- `AuthPerfTest` — benchmark widget for signup/login timings
- `LanguageDiagnostic` — i18n health-check

### Console Logging
- Every service prints emoji-prefixed, color-coded logs (✅/❌/⚠️)
- Structured JSON logging for server-side errors

### Error Boundary
- `ErrorBoundary.jsx` — catches render errors, shows friendly fallback

---

## 22. How to Run

### Development (full stack)

```bash
# Terminal 1 — Express backend
cd demorepo-openai-main/demorepo-openai-main
npm install
node server.js              # http://localhost:5000

# Terminal 2 — React frontend
npm install
npm start                   # http://localhost:3000 (proxies to :5000)
```

### With Firebase Emulators

```bash
firebase emulators:start
# Set REACT_APP_USE_EMULATOR=true in .env
```

### Production Build

```bash
npm run build
npx serve -s build -l 3000
```

### Deploy to Vercel

```bash
vercel --prod
```

### Verification

```bash
node verify_langs.js        # Locale parity check
npm test                     # Run tests
```

---

## 23. Common Issues & Fixes

| Issue | Root Cause / Fix |
|-------|-----------------|
| 400 Firebase API key | `.env.production` has placeholder credentials — replace with real keys |
| Routing 404 on deep links | Must serve with `-s` (SPA fallback) or rely on Vercel rewrite |
| Groq non-JSON/HTML response | Corporate firewall / Service Worker — retry in incognito, confirm API key |
| Email `EAUTH` | Wrong `BREVO_API_KEY` / `EMAIL_FROM` — verify Brevo SMTP settings |
| Email `ECONNREFUSED` | `smtp-relay.brevo.com` down or local server not running — run `node server.js` |
| Cashfree order fails | Ensure `CASHFREE_APP_ID`/`CASHFREE_SECRET_KEY` are set on the server |
| Firestore permission denied | Log in, confirm data under your own `users/{uid}`; rules enforce isolation |
| No bills shown | New users get seeded invoices on first auth; else upload a bill |
| Features locked | Free/Pro tier-gating; upgrade via Checkout |
| Localization missing text | Run `node verify_langs.js`; add missing key in all 5 locale files |

---

## 24. Feature Flags

### `src/config/features.js`

```javascript
export const ENABLE_DOCUMENT_STORAGE =
  process.env.REACT_APP_ENABLE_DOCUMENT_STORAGE === "true";
```

- Default: `false` — invoices processed entirely in browser memory
- When `true`: enables Firebase Storage uploads (requires bucket + rules + CORS)

---

## 25. Multi-Business Support

- 3 seeded demo businesses: Apex Retailers, NexGen, Phoenix Logistics
- `activeBusinessId` stored in `localStorage`
- `businessChanged` custom event for cross-component sync
- Business switcher in Dashboard and Sidebar
- Bills filtered by `activeBusiness` throughout the app

---

## 26. Plan Gating

Enforced on:
- **Dashboard** — AI agent features
- **BillUpload** — monthly invoice limit
- **AIFinanceAgent** — prompt restrictions (free: no audit/compliance/risk)
- **ComplianceCenter** — full analysis
- **TaxForecast** — full forecast
- **AuditCenter** — full audit
- **DocumentAssistant** — 3 free, 50 pro
- **PenaltyCenter** — full calculator

### Feature Tier Restrictions
- **Free**: Basic features, 10 invoices/month, limited AI prompts
- **Pro**: Full AI, 500 invoices/month, risk/audit prompts
- **Business**: Full everything, 5000 invoices/month

---

## 27. API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Server health check |
| GET/POST | `/api/email` | Brevo SMTP email |
| GET/POST | `/api/sendEmail` | Brevo SMTP email (legacy) |
| POST | `/api/ai` | AI Gateway (6 tasks) |
| GET/POST | `/api/agent` | Agent Orchestrator |
| POST | `/api/payment/create-order` | Cashfree order |
| POST | `/api/payment/verify` | Cashfree verification |
| GET | `/api/payment/history` | Payment history |
| GET | `/api/subscription/status` | Current plan |
| GET/POST | `/api/reminders` | Cron reminders |
| GET | `/api/health` | API health check |

---

*This document is the complete A-to-Z reference for the AI GST & Compliance Buddy project. Refer to the source code for live, canonical behavior.*
