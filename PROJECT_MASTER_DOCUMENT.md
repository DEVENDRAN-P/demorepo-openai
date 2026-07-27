# AI GST & Compliance Buddy — Project Master Document (A to Z Reference Guide)

This document is the ultimate technical specification and reference guide for the **AI GST & Compliance Buddy** web application built for the **OpenAI x NxtWave BUILDATHON**. It covers all aspects of the application, including the tech stack, security rules, environment configuration, database structure, page and component breakdown, and local hosting instructions.

---

## 📋 Table of Contents
1. [Project Overview & Key Features](#-project-overview--key-features)
2. [Active Preview & Hosting Status](#-active-preview--hosting-status)
3. [Technology Stack](#-technology-stack)
4. [Environment Settings & API Keys](#-environment-settings--api-keys)
5. [Codebase Architecture & Directory Tree](#-codebase-architecture--directory-tree)
6. [Detailed Page-by-Page Map (27 Pages)](#-detailed-page-by-page-map-27-pages)
7. [Detailed Layout Component Map (16 Components)](#-detailed-layout-component-map-16-components)
8. [Service & Integration Layers](#-service--integration-layers)
9. [Localization Parity & Translation Check](#-localization-parity--translation-check)
10. [Firebase Security & Storage Rules](#-firebase-security--storage-rules)
11. [Execution & Troubleshooting Guide](#-execution--troubleshooting-guide)

---

## 🚀 Project Overview & Key Features

The **AI GST & Compliance Buddy** is a specialized React-based single-page web application designed to simplify tax compliance and invoice tracking for small businesses and merchants using AI models.

### Primary Features:
* **AI Bill Extraction**: Uploads invoices (PDF, PNG, JPG, WEBP) and extracts metadata (Supplier name, GSTIN, invoice date, amount, tax, category) using Groq Llama 3.3 70B.
* **Auto GST Form Generation**: Pre-fills and generates ready-to-file Indian tax forms: **GSTR-1** (Outward supplies report) and **GSTR-3B** (Summary return form), allowing PDF export.
* **AI Chat Assistant**: Provides multi-lingual conversational compliance help in English, Hindi, and Tamil powered by Groq.
* **Intelligent Reminder System**: Triggers filing due alerts and sends notification emails using Brevo SMTP.
* **Business Analytics & Expense Charts**: Displays interactive charts for tax trends and category-wise spending using Recharts.
* **Responsive Multi-language Layout**: Includes full dynamic dark/light mode switching and multi-language support (English, Hindi, Tamil, Malayalam, Kannada).

---

## ⚡ Active Preview & Hosting Status

The application is built and actively running locally on your computer.

* **Preview Address**: **[http://localhost:3000](http://localhost:3000)**
* **Local Hosting Command**: `npx serve -s build -l 3000` (executed from the project folder)
* **Access Mode**: Single-Page App (SPA) fallback enabled (routing `/login`, `/dashboard`, etc. maps correctly to `index.html`).
* **Demo Credentials**:
  * **Email**: `demo@shop.com`
  * **Password**: `password123`

---

## 🛠️ Technology Stack

* **Core UI Engine**: React.js v18 (Single Page App)
* **Routing**: React Router DOM v6
* **State Management**: React Context API (`AuthContext`, `DarkModeContext`)
* **Styling System**: CSS Variables + Custom Professional Design System (no Tailwind dependencies)
* **AI Platform**: Groq SDK (running Llama 3.3 70B Versatile model)
* **Analytics Engine**: Recharts (Vector SVG-based data rendering)
* **Database & Cloud Support**: Firebase Web SDK v12:
  * **Authentication**: Email/Password + Google OAuth Popup login
  * **Cloud Firestore**: Document-store for bills, user profiles, and logs
  * **Realtime Database**: Live reminders and state synching
  * **Cloud Storage**: Invoice file uploads (PDF & Image uploads up to 100MB)
* **SMTP Delivery**: Brevo SMTP API (for reminders and alerts dispatch)
* **Localization**: i18next & react-i18next

---


---

## 📂 Codebase Architecture & Directory Tree

```
demorepo-openai-main/             # React codebase root folder
├── public/                       # HTML entry point and static assets
│   ├── favicon.ico
│   ├── index.html
│   └── manifest.json
├── src/                          # Project Source Files
│   ├── components/               # UI components and layout widgets
│   ├── config/                   # Firebase initialization configs
│   ├── context/                  # Context providers for dark mode and auth
│   ├── hooks/                    # Custom hooks (e.g. useAuth, useTranslation)
│   ├── i18n/                     # Translation files and i18next configuration
│   ├── pages/                    # 27 views representing distinct pages
│   ├── services/                 # Firebase hooks, SMTP emailing, and timer scripts
│   ├── styles/                   # Global stylesheets and animation utilities
│   ├── utils/                    # Common formatting and parsing math rules
│   ├── App.css                   # Global styling overrides
│   ├── App.jsx                   # Main routing tree and lazy loading
│   ├── index.css                 # Base CSS values
│   └── index.js                  # Entry point linking React to DOM
├── check_keys.py                 # Locale key verification script (Python)
├── verify_langs.js               # Locale key verification script (Node.js)
├── database.rules.json           # Firebase RTDB rules
├── firestore.rules               # Firestore security rules
├── storage.rules                 # Cloud Storage upload security rules
└── package.json                  # Dependencies configuration
```

---

## 📋 Detailed Page-by-Page Map (27 Pages)

All components inside `src/pages/` handle distinct routes in the application:

1. **`LoginPage.jsx`**: Handles user authentication via email/password or Google sign-in. Saves user credentials to local cache for fast reload.
2. **`SignupPage.jsx`**: User registration page capturing full name, shop details, and GSTIN. Sets up corresponding database profiles.
3. **`ForgotPasswordPage.jsx`**: Generates and sends account password recovery links.
4. **`Dashboard.jsx`**: High-level panel compiling visual charts, recent expense summaries, and GSTR due reminders.
5. **`BillUpload.jsx`**: Main portal for invoice uploads. Manages dragging and dropping, OCR previews, and Groq-powered AI form fields generation.
6. **`BillDetails.jsx`**: Granular bill details page allowing values configuration and item-wise verification before database storage.
7. **`GSTForms.jsx`**: Dynamic tax calculator assembling data to generate output drafts for GSTR-1 and GSTR-3B filings.
8. **`Reports.jsx`**: Generates detailed fiscal statements and summaries for monthly or annual business audits.
9. **`AIFinanceAgent.jsx`**: Interactive compliance evaluator page executing audits on records.
10. **`AIInsights.jsx`**: Lists strategic tips and automated spending evaluations based on uploaded records.
11. **`Invoices.jsx`**: Detailed ledger presenting past verified client sales and outgoing expenses.
12. **`ComplianceCenter.jsx`**: Highlights current compliance ratings, tax status, and flags anomalies.
13. **`BusinessHealth.jsx`**: Visual dashboard presenting quick profitability ratios, cash flows, and operating assets.
14. **`AuditCenter.jsx`**: Detailed logs matching billing receipts against accounting journals.
15. **`TaxForecast.jsx`**: Previews future tax liability predictions based on historical trends.
16. **`ExpenseAnalytics.jsx`**: Features charts mapping business overheads by category.
17. **`VendorIntelligence.jsx`**: Analyzes supplier profiles, categorizing them by compliance scores and delivery history.
18. **`BusinessManagement.jsx`**: Central panel to update business categories and tax parameters.
19. **`NotificationCenter.jsx`**: Displays a log of system alerts, deadline warnings, and reminders.
20. **`Documents.jsx`**: Document repository hosting user files, tax invoices, and exported forms.
21. **`GlobalSearch.jsx`**: Instant search index filtering across pages, logs, bills, and settings.
22. **`Profile.jsx`**: Editable profile form to modify contact info, phone, and business address.
23. **`Settings.jsx`**: Detailed panel for UI customization, language selector, security settings, and notifications toggle.
24. **`ChatPage.jsx`**: Multi-language AI assistant page offering real-time tax guidelines chat.
25. **`Support.jsx`**: Assembles support channels, WhatsApp linkages, and a FAQ search.
26. **`Recommendations.jsx`**: Uses AI to suggest tax saving opportunities and vendor optimizations.
27. **`Home.jsx`**: Landing page presenting app features and access options.

---

## 🎨 Detailed Layout Component Map (16 Components)

These reusable UI blocks are imported across various pages in `src/components/`:

1. **`Navbar.jsx`**: Top application bar containing:
   * Language selector dropdown (English, Hindi, Tamil, Malayalam, Kannada)
   * System dark/light theme toggle
   * Live WhatsApp and Chat support tooltip buttons
2. **`Sidebar.jsx`**: Navigation panel with dynamic routes mapping.
3. **`DashboardLayout.jsx`**: Grid structure housing the Sidebar and Main page panel.
4. **`AIAssistant.jsx`**: Interactive chat assistant panel.
5. **`GSTFilingStatus.jsx`**: Mini-widget presenting filing timelines.
6. **`PenaltyLateFeeEstimator.jsx`**: Interactive calculator computing potential fees for late filings.
7. **`ReminderPanel.jsx`**: Lists upcoming deadlines and outstanding invoices.
8. **`Notification.jsx`**: Pop-up toast notifications.
9. **`ProtectedRoute.jsx`**: Router guard blocking access to dashboard pages for unauthenticated users.
10. **`ErrorBoundary.jsx`**: Catches React errors and shows a fallback UI instead of crashing.
11. **`FirebaseDebugPanel.jsx`**: Helper panel for testing real-time Firebase queries.
12. **`LanguageDiagnostic.jsx`**: Utility checking local i18n configurations.
13. **`AuthPerfTest.jsx`**: Internal performance benchmark widget measuring signup and login timings.
14. **`Header.jsx`**: Top header widget showing current path details and quick alerts.
15. **`PhoneAuthModal.jsx`**: Modal component handling phone verification flow.
16. **`Sidebar.css` / `Navbar.css`**: Layout stylesheets defining modern visual aesthetics.

---

## ⚙️ Service & Integration Layers

* **`authService.js`**: Handles account flows (Email login, OAuth pop-ups, Phone OTP verification).
* **`firebaseDataService.js`**: Manages reading, writing, updating, and querying user invoices and settings in Firestore.
* **`emailReminderService.js`**: Sends email reminders using the Brevo SMTP API.
* **`perfService.js`**: Tracks load times, login latency, and query duration.
* **`otpService.js`**: Manages verification codes for phone authentication.
* **`reminderService.js`**: Handles client-side schedule configurations and notifications.

---

## 🌍 Localization Parity & Translation Check

All translation strings are stored in `src/i18n/locales/` as JSON documents. 

### Parity Check Details:
* **Unique Keys**: **300** keys per language file.
* **Status**: ✅ **100% Synchronized**. All files match key-for-key.
* **Malayalam Fix**: Resolved a bug by adding the missing `"schedule_call_action": "ഇപ്പോൾ വിളിക്കുക"` key, bringing all files to perfect parity.

---

## 🔒 Firebase Security & Storage Rules

The database security rules are configured to ensure user isolation and prevent unauthorized access:

### 1. Cloud Firestore Rules (`firestore.rules`)
* **Strict User Isolation**: Users can only read and write documents inside their own user folder (`/users/{uid}`).
* **Reminders collection rules**: Authenticated users can only CRUD reminders where `userId` matches their authenticated `uid`.
* **SMTP Mail collection**: Allowed create permissions for logged-in users to queue automated notifications.

### 2. Realtime Database Rules (`database.rules.json`)
* `/users/$uid`: Secured so only authenticated owner has read/write privileges.
* `/reminders`: Access allowed for authenticated users.

### 3. Cloud Storage Rules (`storage.rules`)
* `/users/{userId}/{allPaths=**}`: Only authenticated users can access their folder. Files must be under 100MB.

---

## 💻 Execution & Troubleshooting Guide

### Build Commands
Navigate to the directory `demorepo-openai-main\demorepo-openai-main` and run:
* **Production Build**: `npm run build`
* **Development Server**: `npm start`
* **Translation Keys Check**: `node verify_langs.js`

### Common Solutions:
* **400 API Key Error**: Check if `.env.production` has been modified with your actual Firebase API keys. If it contains `your-firebase-api-key`, copy the credentials from `.env` to `.env.production` and run `npm run build` again.
* **Routing 404 Errors on Sub-paths**: If serving production builds via `serve`, you must use the `-s` flag (`npx serve -s build -l 3000`) so all client routes fallback to `index.html`.
