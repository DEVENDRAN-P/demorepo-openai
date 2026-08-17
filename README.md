# AI GST & Compliance Buddy (GST Buddy AI)

An AI-powered GST compliance SaaS for Indian small businesses, MSMEs, retailers, freelancers, and service providers. Upload invoices, extract and validate GST data, monitor compliance, forecast tax liabilities, and get proactive, data-grounded recommendations from an intelligent agent system.

- **Live app:** https://gstbuddy.vercel.app
- **Repository:** https://github.com/DEVENDRAN-P/demorepo-openai
- **Language support:** English, हिन्दी (Hindi), தமிழ் (Tamil), മലയാളം (Malayalam), ಕನ್ನಡ (Kannada)

> All AI functionality is powered by the **Google Gemini API**, called server-side through a single gateway (`lib/gemini.js`). The API key is never exposed to the browser. See [AI Features & Agents](#-ai-features--agents) for details.

---

## Table of Contents

- [✨ Features](#-features)
- [🛠 Tech Stack](#-tech-stack)
- [🏗 Architecture](#-architecture)
- [📁 Repository Layout](#-repository-layout)
- [🚀 Getting Started](#-getting-started)
- [🔑 Environment Variables](#-environment-variables)
- [🤖 AI Features & Agents](#-ai-features--agents)
- [💳 Payments & Subscriptions](#-payments--subscriptions)
- [🌐 API Endpoints](#-api-endpoints)
- [🌍 Localization](#-localization)
- [🔒 Security](#-security)
- [🧪 Testing](#-testing)
- [☁️ Deployment](#️-deployment)
- [🧰 Scripts & Tooling](#-scripts--tooling)
- [🛠 Troubleshooting](#-troubleshooting)
- [📋 Demo Credentials & Sample Queries](#-demo-credentials--sample-queries)
- [📄 License](#-license)

---

## ✨ Features

### 1. Smart Invoice Upload & AI Extraction

- Upload invoices as **PDF, JPG, PNG, or WEBP** (up to 10 MB)
- **Gemini Vision** reads image invoices directly; **Tesseract.js OCR** is used as fallback for poor-quality scans
- Server-side AI extracts supplier details, GSTIN, invoice number/date, line items, tax splits (CGST/SGST/IGST), and category
- Structured JSON output validated against response schemas — no hallucinated values
- Editable extraction form with bounding-box overlay before saving
- Duplicate-invoice detection and GSTIN format validation
- Deterministic tax math (GST rates 5%, 12%, 18%, 28%) — **Gemini is used for interpretation only, never for financial calculations**

### 2. GST Preparation Data (GSTR-1 / GSTR-3B)

- **GSTR-1 (Outward Supplies)** — preparation-ready draft built from uploaded invoices
- **GSTR-3B (Summary Return)** — calculated automatically with ITC and net-payable
- Filing-readiness % ring, checklist with math/duplicate/GSTIN validation that blocks filing while errors exist
- Download as **PDF** (html2pdf.js) or export **JSON**
- One-click auto-file that marks invoices as filed

### 3. AI Assistant & Finance Agent

- Server-side **Google Gemini** streaming chat (key never exposed to the browser)
- GST compliance expertise in 5 languages
- AI Finance Agent with plan-gated prompts (audit, compliance, risk on paid plans)
- Answers are grounded in the user's own invoice data

### 4. Compliance & Agent Monitoring

- **Compliance Monitor Agent** — deterministic rule checks + Gemini reasoning and prioritization
- **Tax Forecast Agent** — calculations in code, Gemini explains drivers and risks
- **Business Intelligence Agent** — spend concentration, ITC opportunity, filing-risk insights
- **Reminder Scheduler Agent** — GSTR-1 (due 11th) and GSTR-3B (due 20th) deadline tracking
- Every agent run is persisted to Firestore (`users/{uid}/agentRuns`) and visible in the Agent Activity log
- Daily scheduled analysis via Vercel Cron

### 5. Analytics, Reports & Intelligence

- Monthly GST trends, category-wise expense breakdown, ITC tracking (Recharts)
- Business Health index and compliance scores computed from real filing data
- Tax forecasting from monthly averages
- Vendor intelligence and risk scoring
- Penalty estimator (Section 47, CGST Act formulas)
- Global search across invoices, vendors, businesses, and documents

### 6. Subscriptions & Payments

- **FREE / PRO / BUSINESS** plans with server-side entitlements and monthly usage limits
- Real **Cashfree** hosted checkout (UPI, cards, net banking) with server-side verification and HMAC-signed webhooks
- Usage reservation/release with per-period (YYYY-MM) accounting

### 7. Multi-language Support

- English, Hindi, Tamil, Malayalam, Kannada — **300 keys per locale, verified in sync**
- Live switching without reload via i18next

### 8. Reminders & Notifications

- Brevo SMTP email reminders with urgency tiers (overdue / today / 1 day / 3 days / 7 days)
- 24-hour deduplication, manual reminder sending, notification center

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 (Create React App), React Router v6, Context API |
| **Styling** | Custom CSS design system (light/dark mode), CSS variables |
| **Charts** | Recharts |
| **Animations** | framer-motion |
| **i18n** | i18next + react-i18next (5 languages) |
| **AI** | **Google Gemini** (`@google/generative-ai`) — server-side only |
| **OCR** | Tesseract.js + Gemini Vision |
| **Database** | Cloud Firestore (primary) + Firebase Realtime DB (secondary) |
| **Auth** | Firebase Authentication (email/password, Google OAuth, phone OTP) |
| **Storage** | Firebase Storage (optional) |
| **Email** | Brevo SMTP (nodemailer) |
| **Payments** | Cashfree (server-side verification + signed webhooks) |
| **Backend (local)** | Express.js (`server.js`, port 5000) |
| **Serverless** | Vercel Functions (`api/…`) |
| **PDF** | html2pdf.js, pdfjs-dist |
| **Hosting** | Vercel (SPA + serverless API + Cron) |

---

## 🏗 Architecture

```
┌─────────────────────────────┐        ┌──────────────────────────────────┐
│        React SPA            │        │          Backend (API)           │
│  src/ (pages, components,   │ ─────► │  api/*        — Vercel serverless │
│  services, i18n, context)   │  HTTPS  │  server.js    — local Express    │
└─────────────┬───────────────┘        └───────┬──────────────────────────┘
              │ Firebase Auth / Firestore      │ Firebase Admin (ID-token auth)
              ▼                                ▼
      ┌────────────────┐              ┌──────────────────────────────┐
      │ Firebase (client)│             │ lib/                        │
      │ Firestore · RTDB  │             │  gemini.js  — Gemini gateway│
      │ Storage · Auth    │             │  aiTasks.js — 6 AI tasks   │
      └────────────────┘              │  finance.js — deterministic │
                                      │  schemas.js — JSON validation│
                                      │  usage.js / entitlements.js │
                                      │  plans.js   — plan matrix   │
                                      │  database.js— DB abstraction│
                                      └──────────────┬───────────────┘
                                                     ▼
                                           Google Gemini API (GEMINI_API_KEY,
                                           never exposed to the browser)
```

- **Client → Server:** the browser only ever talks to authenticated API routes; every AI/payment/email call requires a Firebase ID token (`Authorization: Bearer …`).
- **AI Gateway (`api/ai.js`):** rate-limited, size-limited endpoint that routes to 6 Gemini-backed task handlers.
- **Agent Orchestrator (`api/agent.js`):** chains agents (Invoice → Compliance → Finance → Reminder) and persists every run.

---

## 📁 Repository Layout

```
demorepo-openai-main/                 ← app root (this directory)
├── api/                              Vercel serverless functions
│   ├── ai.js                         AI Gateway (Gemini, 6 tasks)
│   ├── agent.js                      Agent Orchestrator
│   ├── billing.js                    Cashfree payments + subscriptions + usage
│   ├── email.js                      Brevo SMTP endpoint
│   ├── reminders.js                  Scheduled/overdue reminder cron
│   └── health.js                     Health check
├── lib/                              Backend libraries
│   ├── gemini.js                     Single point of Gemini invocation
│   ├── aiTasks.js                    AI task handlers
│   ├── finance.js                    Deterministic GST math & compliance rules
│   ├── schemas.js                    Response schemas + validators
│   ├── plans.js                      Plan prices, limits & entitlements (source of truth)
│   ├── usage.js / entitlements.js    Monthly usage & feature gating
│   ├── database.js                   Firestore / mock DB abstraction
│   ├── admin.js                      Firebase Admin + auth + AiHttpError
│   └── agentRunLogger.js             Agent run persistence
├── src/                              React application
│   ├── pages/                        32 pages (lazy-loaded)
│   ├── components/                   UI components
│   ├── services/                     API/data services (11 modules)
│   ├── context/                      AuthContext, DarkModeContext
│   ├── i18n/                         i18next config + 5 locale files
│   ├── config/                       Firebase, features, plans mirror
│   ├── hooks/ · utils/ · styles/
├── test/                             node:test backend suite (run-all.js)
├── scripts/                          Build/test utilities
├── scratch/                          Debug/diagnostic scripts
├── server.js                         Local Express server (port 5000)
├── vercel.json                       Rewrites, crons, security headers
├── firestore.rules / storage.rules / database.rules.json
├── verify_langs.js                   Locale parity check
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** and npm
- A **Google Gemini API key** (https://aistudio.google.com/apikey)
- A **Firebase project** (Auth, Firestore, Realtime DB, optional Storage)
- A **Cashfree merchant account** (sandbox for testing)
- A **Brevo SMTP** account for email reminders (optional for core features)

### 1. Clone & install

```bash
git clone https://github.com/DEVENDRAN-P/demorepo-openai.git
cd demorepo-openai/demorepo-openai-main
npm install
```

### 2. Configure environment

Copy the template and fill in your values:

```bash
cp .env.example .env.local   # client-side (REACT_APP_*) variables
cp .env.example .env         # server-side secrets
```

> ⚠️ **Never commit `.env` files.** All `REACT_APP_*` values are public; server secrets (`GEMINI_API_KEY`, `FIREBASE_PRIVATE_KEY`, `CASHFREE_SECRET_KEY`, `BREVO_API_KEY`, `CRON_SECRET`) must stay server-side only.

### 3. Run locally (full stack)

```bash
# Terminal 1 — Express backend (port 5000)
node server.js

# Terminal 2 — React frontend (port 3000, proxies /api to :5000)
npm start
```

Open **http://localhost:3000** and sign in with the demo account below.

### 4. Production build

```bash
npm run build
npx serve -s build -l 3000
```

---

## 🔑 Environment Variables

### Client-side (`REACT_APP_*` — public)

| Variable | Purpose |
|----------|---------|
| `REACT_APP_FIREBASE_API_KEY` | Firebase API key |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | Auth domain |
| `REACT_APP_FIREBASE_PROJECT_ID` | Project ID |
| `REACT_APP_FIREBASE_DATABASE_URL` | Realtime DB URL |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `REACT_APP_FIREBASE_APP_ID` | App ID |
| `REACT_APP_FIREBASE_MEASUREMENT_ID` | Analytics ID (optional) |
| `REACT_APP_ENVIRONMENT` | `development` \| `production` |
| `REACT_APP_AUTH_REDIRECT_URL` | Post-auth redirect URL |
| `REACT_APP_USE_EMULATOR` | `true` to use Firebase emulators locally |
| `REACT_APP_ENABLE_DOCUMENT_STORAGE` | `true` to enable Firebase Storage uploads (default `false`) |

### Server-side secrets (never in the browser)

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | **Required.** Google Gemini API key |
| `GEMINI_MODEL` | Optional. Default `gemini-3.1-flash-lite` (must support `responseSchema`) |
| `GEMINI_MAX_OUTPUT_TOKENS` | Optional. Default `8192` (keep high — the invoice schema is large) |
| `GEMINI_TIMEOUT_MS` | Optional. Default `55000` |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK (required for AI, billing, agents) |
| `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY` | Cashfree Payment Gateway credentials |
| `CASHFREE_ENV` | `sandbox` \| `production` |
| `CASHFREE_WEBHOOK_SECRET` | Cashfree webhook HMAC secret |
| `BREVO_API_KEY` / `EMAIL_FROM` | Brevo SMTP email delivery |
| `CRON_SECRET` | Authenticates Vercel Cron calls |
| `USE_MOCK_DATABASE` | `true` to use the in-memory mock DB (dev only) |
| `BUSINESS_FAIR_USE_*` | Optional internal safety ceilings for the Business plan |

Full reference with comments: `.env.example`.

---

## 🤖 AI Features & Agents

All LLM functionality uses the **Google Gemini API** through `lib/gemini.js` — the single module that holds the API key and normalizes errors, timeouts, rate-limit retries (exponential backoff, max 2 retries), and JSON recovery (fenced blocks → brace matching → truncated-JSON salvage).

### Gemini task types (`lib/aiTasks.js`)

| Task | Input | Process | Output |
|------|-------|---------|--------|
| `invoice_extraction` | Image (base64) or OCR text | Gemini Vision (image) / Gemini LLM (text) | Structured JSON: supplier, GSTIN, amounts, tax split, category, bounding boxes |
| `compliance_analysis` | User's invoices | Deterministic rules + Gemini reasoning | Findings, risk level, recommendations, `requiresHumanApproval` flag |
| `tax_forecast` | User's invoices | Deterministic math + Gemini explanation | Liability prediction, drivers, risks, recommended actions |
| `business_insight` | User's invoices | Deterministic metrics + Gemini insights | Headline, risk level, spend/ITC/filing insights |
| `gst_assistant` / `gst_assistant_stream` | Chat messages + invoice context | Gemini conversational generation (text or SSE streaming) | GST guidance in 5 languages, grounded in real invoices |
| `document_analysis` | Image or OCR text | Gemini Vision/LLM | Structured analysis of GST notices / legal documents |

**Design principle:** financial numbers are always computed deterministically in code (`lib/finance.js`); Gemini is used for reasoning, explanation, extraction, and prioritization — never for arithmetic.

### Agent Orchestrator (`api/agent.js`)

- **Triggers:** `invoice_uploaded`, `run_compliance`, `run_forecast`, `run_insights`, `run_full_analysis`, plus a scheduled daily run (`/api/agent?schedule=true`).
- Each agent: reads data from Firestore → runs deterministic rules → calls Gemini for reasoning → returns structured decisions → the orchestrator executes actions and logs the run to `users/{uid}/agentRuns`.

---

## 💳 Payments & Subscriptions

### Plans (INR / month)

| Plan | Price | Invoice uploads / month | AI extractions / month | Documents / month | Multi-business |
|------|-------|-------------------------|------------------------|-------------------|----------------|
| **Free** | ₹0 | 10 | 10 | 5 | 1 |
| **Pro** | ₹199 | 50 | 50 | 20 | 2 |
| **Business** | ₹499 | Fair-use* | Fair-use* | Fair-use* | 5 |

\* *Business plans are advertised as unlimited/fair-use with configurable internal safety ceilings (defaults: 1,000 uploads, 1,000 extractions, 500 documents) so external AI/API costs cannot run away. Reports and AI insights are unlimited on Business.*

Prices, limits, and the full feature-entitlement matrix live in **`lib/plans.js`** (server-side source of truth, mirrored by `src/config/plans.js` and verified by tests). A price sent by the client is never trusted — the backend resolves amounts.

### Payment flow (Cashfree)

1. `POST /api/payment/create-order` — server creates a Cashfree order with a backend-resolved price.
2. User pays via the hosted Cashfree checkout (UPI, cards, net banking).
3. `POST /api/payment/verify` — server verifies the HMAC-SHA256 signature (`order_id|payment_id`) and the order status, with a double-spend check against history.
4. `POST /api/payment/webhook` — Cashfree webhook acknowledged and signature-verified server-side.

---

## 🌐 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Local server health check |
| GET | `/api/health` | API health check |
| POST | `/api/ai` | AI Gateway (6 Gemini tasks) |
| GET/POST | `/api/agent` | Agent Orchestrator (also `POST /api/invoices`) |
| POST | `/api/payment/create-order` | Cashfree order creation |
| POST | `/api/payment/verify` | Cashfree order verification |
| POST | `/api/payment/webhook` | Cashfree webhook (HMAC verified) |
| POST | `/api/subscription/downgrade` | Reset plan to Free |
| GET | `/api/payment/history` | Payment history |
| GET | `/api/subscription/status` | Current plan |
| GET | `/api/usage` | Monthly usage counters |
| GET | `/api/entitlements` | Feature entitlements for the user's plan |
| POST | `/api/usage/reserve` / `/api/usage/release` | Usage reservation/release |
| POST | `/api/businesses` | Create business |
| GET/POST | `/api/email` | Brevo SMTP email |
| GET/POST | `/api/sendEmail` | Brevo SMTP email (legacy alias) |
| GET/POST | `/api/reminders` | Reminder cron (`?task=overdue` / `?task=scheduled`) |

Every protected endpoint requires `Authorization: Bearer <firebase-id-token>`.

---

## 🌍 Localization

- **Languages:** English, Hindi, Tamil, Malayalam, Kannada
- **Scope:** 300 keys per locale, perfectly synced (verified by `node verify_langs.js` and `check_keys.py`)
- Live switching without reload; reads/writes `localStorage['language']` and sets `<html lang>`

---

## 🔒 Security

- **Firestore rules:** every collection is owner-scoped (`request.auth.uid == uid`); everything else is denied
- **Server-side secrets only:** Gemini, Firebase Admin, Cashfree, and Brevo credentials never reach the browser
- **Authenticated APIs:** all AI, payment, and email endpoints verify Firebase ID tokens
- **Webhook integrity:** Cashfree webhooks verified with `base64(hmac_sha256(timestamp + "." + body, secret))`
- **Rate limiting:** API 20 req/min, auth 5 req/5 min (brute-force protection), chat 30 req/min
- **Input hardening:** payload size limits, XSS sanitization, GSTIN/PAN/email/phone validators
- **Error hygiene:** normalized errors that never leak stack traces
- **Headers (Vercel):** HSTS, `X-Frame-Options: DENY`, nosniff, strict referrer policy, permissions policy

---

## 🧪 Testing

```bash
# Backend test suite (node:test) — plans, payments, usage, invoice limits, entitlements
npm run test:backend

# Locale parity check (5 languages × 300 keys)
npm run verify:langs

# AI extraction contract test (input parsing → reaches Gemini)
node scripts/test-extraction-contract.js

# End-to-end AI test (requires a valid GEMINI_API_KEY in .env)
node scripts/e2e-ai-test.js
```

The suite lives in `test/` and uses an in-memory `FakeFirestore`, so it runs without external services. Live integration cases (real Cashfree sandbox, Firebase emulator journeys) are reported as BLOCKED rather than passed.

---

## ☁️ Deployment

### Vercel (recommended)

```bash
vercel --prod
```

Configuration lives in `vercel.json`:

- **Build:** `CI=false GENERATE_SOURCEMAP=false npm run build`, output `build`
- **Rewrites:** SPA fallback + `/api/*` → serverless functions (including legacy aliases like `/api/extract` → AI extraction, `/api/chat` → assistant)
- **Crons:**
  - `0 9 * * *` → `/api/reminders?task=overdue` (past-due bills)
  - `0 9 * * *` → `/api/reminders?task=scheduled` (bills due within 7 days)
  - `0 7 * * *` → `/api/agent?schedule=true` (daily agent analysis)
- **Headers:** HSTS, X-Frame-Options, nosniff, X-XSS-Protection, referrer & permissions policy

Set all server secrets in **Vercel Dashboard → Project → Settings → Environment Variables**.

### Firebase emulators (local)

```bash
firebase emulators:start
# then set REACT_APP_USE_EMULATOR=true in .env
```

---

## 🧰 Scripts & Tooling

| Command | Purpose |
|---------|---------|
| `npm start` | Dev server (port 3000, proxies `/api` to :5000) |
| `npm run server` | Express backend (port 5000) |
| `npm run build` | Production build |
| `npm test` | React tests |
| `npm run test:backend` | Backend test suite (`test/run-all.js`) |
| `npm run verify:langs` | Locale parity check |
| `node testOverdue.js` | Manual overdue-reminder test |
| `node triggerReminders.js` | Manual reminder trigger |
| `node scratch/debug-gemini.js` | Debug Gemini integration |
| `node scratch/diagnose-cashfree.js` | Diagnose Cashfree credentials |

---

## 🛠 Troubleshooting

| Issue | Fix |
|-------|-----|
| `AI_MISSING_KEY` (503) | Set `GEMINI_API_KEY` on the server / Vercel |
| `AI_INVALID_OUTPUT` (502) | Usually truncated JSON — raise `GEMINI_MAX_OUTPUT_TOKENS` (default 8192) |
| Cashfree order fails | Confirm `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY` / `CASHFREE_ENV` on the server |
| Email `EAUTH` | Wrong `BREVO_API_KEY` / `EMAIL_FROM` — check Brevo SMTP settings |
| Email `ECONNREFUSED` | Local server not running — start `node server.js` |
| Firestore permission denied | Rules are owner-scoped — sign in and confirm data lives under `users/{uid}` |
| Routing 404 on deep links | Serve with SPA fallback (`npx serve -s build`) or rely on the Vercel rewrite |
| Missing translations | Run `node verify_langs.js`; add the missing key to all 5 locale files |
| Features locked | Free/Pro gating — upgrade via Checkout |

---

## 📋 Demo Credentials & Sample Queries

**Demo account (local testing only):**

```
Email:    demo@shop.com
Password: password123
```

New users are seeded with realistic invoices for three demo businesses (Apex Retailers, NexGen, Phoenix Logistics) so every dashboard is populated immediately.

**Sample queries for the AI Assistant:**

- *English:* "What is the GST rate for electronics?" · "How do I claim input tax credit?" · "When is GSTR-3B due?"
- *Hindi:* "GST दर क्या है?" · "इनपुट टैक्स क्रेडिट कैसे क्लेम करें?"
- *Tamil:* "GST விகிதம் என்ன?" · "GSTR-1 எப்போது தாக்கல் செய்ய வேண்டும்?"

---

## 📄 License

MIT License
