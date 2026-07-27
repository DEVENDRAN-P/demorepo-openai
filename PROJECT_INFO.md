# AI GST & Compliance Buddy - Project Status & Information

This document provides a comprehensive overview of the **AI GST & Compliance Buddy** web application, its features, architecture, build status, translation verification, and how to access the local preview.

---

## 🚀 Active Local Preview
The application has been successfully built and is currently running locally.

* **Local Preview URL**: [http://localhost:3000](http://localhost:3000)
* **Access Status**: Active (running via `serve -s build`)
* **Default Demo Credentials**:
  * **Email**: `demo@shop.com`
  * **Password**: `password123`

---

## 🛠️ Verification & Build Status

### 1. Production Build
* **Command Executed**: `npm run build` inside `demorepo-openai-main`
* **Status**: ✅ **SUCCESSFUL**
* **Primary Output Bundle**:
  * JS Bundle: `build/static/js/main.8cb4e38c.js` (~295.46 kB gzipped)
  * CSS Bundle: `build/static/css/main.4a9327f5.css` (~5.46 kB gzipped)

### 2. Localization & Language Sync Check
* **Script Executed**: `node verify_langs.js`
* **Status**: ✅ **PASSED** (100% synchronized)
* **Locale Key Counts**:
  * 🇬🇧 **English (EN)**: 300 keys
  * 🇮🇳 **Hindi (HI)**: 300 keys
  * 🇮🇳 **Tamil (TA)**: 300 keys
  * 🇮🇳 **Malayalam (ML)**: 300 keys *(Fixed: Added missing `schedule_call_action` translation)*
  * 🇮🇳 **Kannada (KN)**: 300 keys
* **Verification Detail**: All 5 translation files have identical keys with no missing entries.

---

## 📂 Core Folder & Architecture Map

The project is divided into an outer wrapper and a nested folder containing the React application (`demorepo-openai-main`).

```
demorepo-openai-main/             # React/Vite/Firebase root
├── public/                       # Static public assets
├── src/                          # Application source code
│   ├── components/               # Reusable UI layout & custom components
│   ├── config/                   # Configuration (Firebase Client, Emulators)
│   ├── context/                  # State management providers (Auth, DarkMode)
│   ├── hooks/                    # Custom React hooks (useAuth, etc.)
│   ├── i18n/                     # Localization config & JSON translations
│   ├── pages/                    # 27 view pages representing features
│   ├── services/                 # Firebase integration, API calls & reminders
│   ├── styles/                   # Custom styling sheets
│   └── utils/                    # Helper helper functions
├── check_keys.py                 # Locale key verification script (Python)
├── verify_langs.js               # Locale key verification script (Node.js)
├── database.rules.json           # Firebase RTDB rules
├── firestore.rules               # Firestore Database security rules
├── storage.rules                 # Firebase Storage rules
└── package.json                  # NPM packages & commands
```

### Key Source Files & Directories:

#### 1. Page Components (`src/pages/`)
Here is a breakdown of the primary pages mapping to the application features:
* **`Dashboard.jsx`**: Main user landing board displaying interactive graphs (monthly GST trends, expense category breakdowns), recent invoices, active filing reminders, and quick actions.
* **`BillUpload.jsx`**: Smart invoice capture. Supports file formats (`PDF`, `JPG`, `PNG`, `WEBP`) and triggers Llama 3.3 70B (via Groq AI) to automatically parse vendor details, GSTIN, invoice dates, line items, and taxes.
* **`GSTForms.jsx`**: Automatic draft generation for standard Indian GST forms (GSTR-1 and GSTR-3B) with calculation modules, PDF download, and JSON export capabilities.
* **`ChatPage.jsx`**: Real-time interactive AI chatbot (Llama 3.3 70B via Groq) to clarify compliance questions in English, Hindi, and Tamil.
* **`LoginPage.jsx` / `SignupPage.jsx` / `ForgotPasswordPage.jsx`**: Fully optimized authentications using Firebase Auth with fast responsiveness and performance telemetry checks.
* **`ComplianceCenter.jsx` / `AuditCenter.jsx` / `TaxForecast.jsx`**: Interactive sections to assess business health, review historical logs, and preview future tax forecast estimates.

#### 2. Layout Components (`src/components/`)
* **`Navbar.jsx`**: Top navigation header containing the real-time language selector, WhatsApp support links, and dark/light theme mode selector.
* **`Sidebar.jsx`**: Interactive left panel representing the routing tree.
* **`AIAssistant.jsx`**: Dedicated chatbot widget wrapper.
* **`ReminderPanel.jsx`**: Panel highlighting tax filing deadlines and alerts.

#### 3. Core Logic & Services (`src/services/`)
* **`authService.js`**: Wraps Firebase Authentication SDK (Email/Password registration, Google popup OAuth, Phone OTP Auth, session storage caching).
* **`firebaseDataService.js`**: Interface for CRUD actions on Firestore (invoices, client details, transaction ledgers).
* **`perfService.js`**: Custom helper measuring performance timings of key operations (like login, API calls).

---

## 🔑 Configuration & Environment Variables

All integrations are driven by the project `.env` file containing client configuration options:

| Environment Variable | Description / Purpose | Status |
| :--- | :--- | :--- |
| `REACT_APP_FIREBASE_API_KEY` | Client Firebase API Token | Configured |
| `REACT_APP_FIREBASE_PROJECT_ID` | Firestore / Firebase Project Target ID | Configured (`finalopenai-fc9c5`) |
| `REACT_APP_GROQ_API_KEY` | Groq Client Key (Llama 3.3 70B Assistant & Bill Extract) | Configured |
| `BREVO_API_KEY` | Brevo SMTP API Key for email alerts | Configured |
| `REACT_APP_SEND_EMAIL_API` | Target API URL for dispatching email updates | Local (`http://localhost:5000/api/sendEmail`) |

---

## 💻 Instructions for Running Locally

To switch execution modes or run tests manually, use the following guidelines:

### Development Mode (Hot Reloading)
1. Navigate to the inner directory:
   ```bash
   cd demorepo-openai-main
   ```
2. Start the React development server:
   ```bash
   npm start
   ```
3. Open `http://localhost:3000` in your web browser.

### Verification Scripts
To verify language keys:
```bash
node verify_langs.js
```
To run unit and lint checks:
```bash
npm test
```
