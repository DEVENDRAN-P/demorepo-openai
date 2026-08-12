# AI GST & Compliance Buddy

A production-ready, AI-powered GST compliance SaaS for Indian small businesses, MSMEs, retailers, freelancers, and service providers. Upload invoices, extract and validate GST data, monitor compliance, forecast tax liabilities, and receive proactive recommendations from an intelligent compliance system.

## 🚀 Features

### ✅ Implemented Features

1. **Smart Invoice Upload & AI Extraction**

   - Upload invoices (PDF, JPG, PNG, WEBP)
   - Server-side AI extracts supplier details, GSTIN, line items, taxes, and totals
   - Tesseract OCR fallback when vision cannot read the document
   - Edit and verify extracted data before saving
   - Duplicate invoice detection and GSTIN validation
   - Original documents are preserved in secure cloud storage

2. **GST Preparation Data**

   - GSTR-1 (Outward Supplies) — preparation-ready draft from uploaded invoices
   - GSTR-3B (Summary Return) — calculated automatically
   - Download as PDF or export JSON
   - Real-time deterministic calculations

3. **AI Assistant**

   - Powered by server-side Google Gemini (key never exposed to the browser)
   - Real-time streaming responses
   - GST compliance expertise in English, Hindi, Tamil, Malayalam, and Kannada
   - Explains tax rules in simple language

4. **Compliance & Agent Monitoring**

   - Compliance Monitor Agent with deterministic rule checks
   - AI Tax Forecast Agent (calculations in code, AI explains)
   - AI Business Intelligence Agent
   - Reminder Scheduler Agent
   - Every agent run is persisted to Firestore (users/{uid}/agentRuns)
   - Scheduled daily analysis via Vercel Cron

5. **Analytics & Reports**

   - Monthly GST trends
   - Category-wise expense breakdown
   - Input tax credit tracking
   - Visual charts and graphs

6. **Subscriptions & Payments**

   - FREE / PRO / BUSINESS plans
   - Real Cashfree checkout with server-side verification + webhooks
   - Server-side entitlement and monthly usage limits

7. **Multi-language Support**
   - English, Hindi, Tamil, Malayalam, Kannada (fully synced)
   - Dynamic language switching
   - Localized content

## 📋 Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Verify translation parity
node verify_langs.js
```

## 🔑 API Setup

### Server-Side Secrets (never exposed to the browser)

Add these to your `.env` / Vercel environment variables:

```bash
# Google Gemini API Key (server-side only)
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Admin SDK (required for AI + billing + agents)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Cashfree Payments (server-side secrets — never expose to the browser)
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret_key
CASHFREE_ENV=sandbox
CASHFREE_WEBHOOK_SECRET=your_cashfree_webhook_secret

# Cron authentication for the scheduled agent
CRON_SECRET=your_cron_secret

# Brevo SMTP for email notifications
BREVO_API_KEY=your_brevo_key
EMAIL_FROM=noreply@your-domain.com
```

### Public Client Variables

```bash
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
# No Cashfree client key is needed — order creation is 100% server-side.
```

Get your Gemini API key from: https://aistudio.google.com/apikey

## 🎯 How It Works

### 1. Upload Invoices

- Click "Upload Invoice" from the dashboard
- Select a PDF or image file (up to 10MB)
- The server analyses the document: Gemini Vision first, Tesseract OCR as fallback
- AI extracts supplier name & GSTIN, invoice number & date, amounts, and category

### 2. Verify & Confirm

- Review AI-extracted data
- Edit any field if needed
- The system validates GSTIN format, totals, and tax math
- Save to your records — agents then analyse the invoice automatically

### 3. Generate GST Preparation Data

- Go to "GST Forms"
- View preparation-ready drafts for GSTR-1 & GSTR-3B
- Download or export data
- Review before filing on the GST portal

### 4. Get AI Help

- Click "AI Assistant"
- Ask questions in any language
- Get instant, data-grounded GST guidance
- Explanations in simple terms

## 💡 Key Features Explained

### AI Invoice Extraction

- Server-side Gemini Vision for image invoices; Tesseract OCR fallback
- Handles various invoice formats and layouts
- Smart defaults for missing data
- Editable before saving

### Real-time Calculations

- Auto-calculates GST amounts deterministically (CGST/SGST/IGST)
- Updates totals instantly
- Supports GST rates (5%, 12%, 18%, 28%)
- Gemini is used for interpretation only — never for financial math

### Data-Driven Insights

- All stats use your actual uploaded data
- Empty states guide you to upload invoices
- No synthetic or seeded business data is generated for real users

## 🎨 Tech Stack

- **Frontend**: React.js 18, React Router, Context API
- **Styling**: Custom CSS design system (light/dark mode)
- **Charts**: Recharts
- **i18n**: react-i18next (5 languages, verified parity)
- **AI**: Google Gemini (server-side only)
- **OCR**: Tesseract.js + Gemini Vision
- **Database**: Cloud Firestore (strict user isolation)
- **Storage**: Firebase Storage
- **Auth**: Firebase Authentication (email/password + Google)
- **Payments**: Cashfree (server-side verification + webhooks)
- **Email**: Brevo SMTP
- **Hosting**: Vercel (serverless API routes + Cron)

## 🔐 Demo Credentials

For local testing only:

```
Email: demo@shop.com
Password: password123
```

## 📊 Sample Queries for AI Assistant

**English:**

- "What is the GST rate for electronics?"
- "How do I claim input tax credit?"
- "When is GSTR-3B due?"

**Hindi:**

- "GST दर क्या है?"
- "इनपुट टैक्स क्रेडिट कैसे क्लेम करें?"

**Tamil:**

- "GST விகிதம் என்ன?"
- "GSTR-1 எப்போது தாக்கல் செய்ய வேண்டும்?"

## 📄 License

MIT License
