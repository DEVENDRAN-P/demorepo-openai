/**
 * Express Server for Local Development / Testing
 *
 * For production on Vercel, the API lives in consolidated serverless
 * functions under api/ (ai, agent, billing, email, reminders, health).
 * This server mirrors those routes for local development.
 *
 * Uses Brevo (formerly Sendinblue) SMTP for reliable email delivery
 *
 * Installation:
 * npm install express cors axios dotenv nodemailer
 *
 * Run locally:
 * node api/server.js
 *
 * Then update .env for development:
 * REACT_APP_SEND_EMAIL_API=http://localhost:5000/api/sendEmail
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");
const { getApps, cert } = require("firebase-admin/app");

// Initialize Firebase Admin for local Express server.
// Use the service-account credentials from .env when present so ID-token
// verification (billing, AI) and Firestore calls work locally — without them
// the SDK falls back to Application Default Credentials, which are only
// available on Google-hosted runtimes (Cloud Run / Vercel via env vars).
if (getApps().length === 0) {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    "finalopenai-fc9c5";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (clientEmail && privateKey) {
    admin.initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
    console.log("[Server] Firebase Admin initialized with service-account credentials");
  } else {
    admin.initializeApp({ projectId });
  }
}

// Import Payment & Subscription Handlers (Unified)
const billingHandler = require("./api/billing");

// Import AI Gateway Handler (Gemini)
const aiHandler = require("./api/ai");

// Import Agent Orchestrator Handler
const agentHandler = require("./api/agent");

// Import consolidated Reminders handler (scheduled + overdue tasks)
const remindersHandler = require("./api/reminders");

// Import consolidated Health handler
const healthHandler = require("./api/health");


// Auth helper (Firebase ID token verification) for the local email endpoint.
const { verifyAuth } = require("./lib/admin");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
// Capture the exact raw request body (used to verify the Cashfree webhook
// HMAC signature — signature = base64(hmac_sha256(timestamp + "." + rawBody, secret))).
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  })
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Email API is running" });
});

// GET endpoint for testing (returns status)
app.get("/api/sendEmail", (req, res) => {
  res.status(200).json({
    message: "Email API is running",
    method: "POST /api/sendEmail",
    usage: "Send POST request with { subject, body, email }",
    example: {
      subject: "Test Email",
      body: "This is a test email",
      email: "recipient@example.com",
    },
  });
});

// POST endpoint for sending emails via Brevo SMTP
app.post("/api/sendEmail", async (req, res) => {
  // This endpoint sends emails from the Brevo account — require a valid
  // Firebase ID token (parity with POST /api/email).
  try {
    await verifyAuth(req);
  } catch (authErr) {
    const status = authErr && authErr.status ? authErr.status : 401;
    return res.status(status).json({
      error: authErr && authErr.safeMessage ? authErr.safeMessage : "Authentication required.",
    });
  }

  try {
    const { subject, body, email } = req.body;

    // Validate input
    if (!subject || !body || !email) {
      return res.status(400).json({
        error: "Missing required fields: subject, body, email",
      });
    }

    const brevoSmtpKey = process.env.BREVO_API_KEY;
    const brevoSmtpUser = "a26ddc001@smtp-brevo.com"; // Brevo SMTP username
    const senderEmail =
      process.env.EMAIL_FROM || "devendranp.it2024@citchennai.net";

    if (!brevoSmtpKey) {
      console.error("❌ BREVO_API_KEY not configured in .env");
      return res.status(500).json({
        error: "Email service not configured - missing Brevo API key",
      });
    }

    // Configure Brevo SMTP transporter
    // Use Brevo SMTP username and key
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false, // TLS - not SSL
      auth: {
        user: brevoSmtpUser, // Brevo SMTP username: a26ddc001@smtp-brevo.com
        pass: brevoSmtpKey, // Brevo SMTP key
      },
      logger: true, // Enable logging to debug
      debug: true, // Enable debug output
    });

    // Convert plain text to HTML
    const htmlBody = body
      .split("\n")
      .map((line) => `<p>${line}</p>`)
      .join("");

    // Send email
    const info = await transporter.sendMail({
      from: `"GST Buddy" <${senderEmail}>`,
      to: email,
      subject: subject,
      text: body,
      html: htmlBody,
      replyTo: "support@gstbuddy.ai",
    });

    console.log(`✅ Email sent successfully to ${email} via Brevo SMTP`);
    console.log(`   Message ID: ${info.messageId}`);

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      message: "Email sent successfully via Brevo SMTP",
      recipient: email,
      statusCode: 200,
    });
  } catch (error) {
    console.error("❌ Brevo SMTP error:", error.message);

    // Detailed error logging
    if (error.code === "EAUTH") {
      console.error(
        "   → Authentication failed - check BREVO_API_KEY and EMAIL_FROM",
      );
      return res.status(401).json({
        error: "Brevo authentication failed - invalid API key or sender email",
        details: error.message,
      });
    }

    if (error.code === "ETIMEDOUT" || error.code === "ECONNREFUSED") {
      console.error("   → Connection failed - Brevo SMTP server unreachable");
      return res.status(503).json({
        error: "Brevo SMTP server temporarily unavailable",
        details: error.message,
      });
    }

    return res.status(500).json({
      error: `Failed to send email: ${error.message}`,
      code: error.code,
      details: error.message,
    });
  }
});

// GET endpoint for /api/email (diagnostic - matches Vercel serverless function)
app.get("/api/email", (req, res) => {
  const brevoKey = process.env.BREVO_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;

  return res.status(200).json({
    status: "Email API Running",
    environment: "development",
    brevoConfigured: {
      BREVO_API_KEY: brevoKey ? "✅ SET" : "❌ NOT SET",
      EMAIL_FROM: emailFrom ? `✅ SET (${emailFrom})` : "❌ NOT SET",
    },
    endpoints: {
      "GET /api/email": "This diagnostic endpoint",
      "POST /api/email": "Send email (requires BREVO_API_KEY and EMAIL_FROM)",
    },
    note: "If env vars show NOT SET, add them to your .env file",
  });
});

// POST endpoint for /api/email (main email endpoint - matches Vercel serverless function)
app.post("/api/email", async (req, res) => {
  // Require a valid Firebase ID token — matches the production serverless
  // function. This endpoint sends emails from the Brevo account.
  try {
    await verifyAuth(req);
  } catch (authErr) {
    const status = authErr && authErr.status ? authErr.status : 401;
    return res.status(status).json({
      errorCode: "UNAUTHORIZED",
      error: authErr && authErr.safeMessage ? authErr.safeMessage : "Authentication required.",
    });
  }

  try {
    const { subject, body, email } = req.body;

    // Validate input
    if (!subject || !body || !email) {
      return res.status(400).json({
        errorCode: "MISSING_FIELDS",
        error: "Missing required fields: subject, body, email",
      });
    }

    const brevoSmtpKey = process.env.BREVO_API_KEY;
    const brevoSmtpUser = "a26ddc001@smtp-brevo.com";
    const senderEmail =
      process.env.EMAIL_FROM || "devendranp.it2024@citchennai.net";

    if (!brevoSmtpKey) {
      console.error("❌ BREVO_API_KEY not configured in .env");
      return res.status(500).json({
        errorCode: "EAUTH",
        error: "Brevo Authentication Failed",
        details: "BREVO_API_KEY not set",
        solution:
          "Add BREVO_API_KEY to your .env file (from Brevo SMTP settings)",
      });
    }

    // Configure Brevo SMTP transporter
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false, // TLS - not SSL
      auth: {
        user: brevoSmtpUser,
        pass: brevoSmtpKey,
      },
      logger: true,
      debug: true,
    });

    // Convert plain text to HTML
    const htmlBody = body
      .split("\n")
      .map((line) => `<p>${line}</p>`)
      .join("");

    // Send email
    const info = await transporter.sendMail({
      from: `"GST Buddy" <${senderEmail}>`,
      to: email,
      subject: subject,
      text: body,
      html: htmlBody,
      replyTo: "support@gstbuddy.ai",
    });

    console.log(`✅ Email sent successfully to ${email} via Brevo SMTP`);
    console.log(`   Message ID: ${info.messageId}`);

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      message: "Email sent successfully via Brevo SMTP",
      provider: "Brevo SMTP",
      recipient: email,
      statusCode: 200,
    });
  } catch (error) {
    console.error("❌ Brevo SMTP error:", error.message);
    console.error("   Error code:", error.code);
    console.error("   Full error:", error);

    // Detailed error handling
    if (error.code === "EAUTH") {
      console.error(
        "   → Authentication failed - check BREVO_API_KEY and EMAIL_FROM",
      );
      return res.status(401).json({
        errorCode: "EAUTH",
        error: "Brevo Authentication Failed",
        message: "Invalid API key or configuration",
        details: error.message,
        solution:
          "Check BREVO_API_KEY and EMAIL_FROM in your .env file match Brevo SMTP settings",
      });
    }

    if (error.code === "ETIMEDOUT" || error.code === "ECONNREFUSED") {
      console.error("   → Connection failed - Brevo SMTP server unreachable");
      return res.status(503).json({
        errorCode: "ECONNREFUSED",
        error: "Cannot reach Brevo SMTP server",
        details: error.message,
        solution: "Check Brevo status at https://status.brevo.com",
      });
    }

    // Generic error
    return res.status(500).json({
      errorCode: "UNKNOWN_ERROR",
      error: "Failed to send email",
      message: error.message,
      code: error.code,
    });
  }
});

// Payment & Subscription API Routes (Unified)
app.post("/api/payment/create-order", billingHandler);
app.post("/api/payment/verify", billingHandler);
app.post("/api/payment/webhook", billingHandler); // Cashfree webhook (signature verified)
app.post("/api/subscription/downgrade", billingHandler);
app.get("/api/payment/history", billingHandler);
app.get("/api/subscription/status", billingHandler);

// Usage & entitlement routes (mirror the Vercel rewrites, which pass ?action=)
app.get("/api/usage", billingHandler);
app.get("/api/entitlements", billingHandler);
app.post("/api/usage/reserve", (req, res) => {
  req.query.action = "usage-reserve";
  return billingHandler(req, res);
});
app.post("/api/usage/release", (req, res) => {
  req.query.action = "usage-release";
  return billingHandler(req, res);
});
app.post("/api/businesses", (req, res) => {
  req.query.action = "businesses-create";
  return billingHandler(req, res);
});
app.post("/api/businesses/check", (req, res) => {
  req.query.action = "businesses-create";
  return billingHandler(req, res);
});

// Invoice upload (authoritative, quota-enforced) — handled by the agent
// orchestrator (reserve → save → agent chain).
app.post("/api/invoices", agentHandler);


// GET diagnostics for the POST-only payment routes — prevents Express's
// default "Cannot GET ..." HTML when someone opens these URLs in a browser
// tab (parity with the GET diagnostics on /api/email and /api/ai).
const paymentGetDiagnostic = (route, usage) => (req, res) => {
  res.status(200).json({
    status: `Payment API running (${route})`,
    method: "POST",
    usage,
  });
};
app.get("/api/payment/create-order", paymentGetDiagnostic(
  "create-order",
  "Authenticated POST with { plan: 'pro' | 'business', phone } and Authorization: Bearer <firebase-id-token>."
));
app.get("/api/payment/verify", paymentGetDiagnostic(
  "verify",
  "Authenticated POST with { orderId } and Authorization: Bearer <firebase-id-token>."
));
app.get("/api/payment/webhook", paymentGetDiagnostic(
  "webhook",
  "POST from Cashfree with x-webhook-signature and x-webhook-timestamp headers (signature verified server-side)."
));
app.get("/api/subscription/downgrade", paymentGetDiagnostic(
  "downgrade",
  "Authenticated POST with Authorization: Bearer <firebase-id-token> to reset the plan to Free."
));

// AI Gateway Route (Gemini) — matches Vercel serverless api/ai.js
app.post("/api/ai", aiHandler);
app.get("/api/ai", (req, res) => {
  return res.status(200).json({
    status: "AI Gateway Running",
    method: "POST /api/ai",
    usage: "Authenticated POST with { task, ...payload }. Requires Authorization: Bearer <firebase-id-token>.",
    tasks: [
      "invoice_extraction",
      "compliance_analysis",
      "tax_forecast",
      "business_insight",
      "gst_assistant",
      "document_analysis",
    ],
  });
});

// Agent Orchestrator Route — matches Vercel serverless api/agent.js
app.post("/api/agent", agentHandler);
app.get("/api/agent", agentHandler);

// Reminders Route — consolidated (scheduled + overdue cron tasks)
app.get("/api/reminders", remindersHandler);
app.post("/api/reminders", remindersHandler);

// Health check — matches Vercel serverless api/health.js
app.get("/api/health", healthHandler);

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ✅ GST Buddy Email API Server Running                       ║
║                                                               ║
║   📧 Email Endpoints:                                         ║
║      POST/GET http://localhost:${PORT}/api/email               ║
║      POST/GET http://localhost:${PORT}/api/sendEmail           ║
║   💳 Payment Endpoints:                                        ║
║      POST http://localhost:${PORT}/api/payment/create-order   ║
║      POST http://localhost:${PORT}/api/payment/verify         ║
║      POST http://localhost:${PORT}/api/payment/webhook        ║
║   🏥 Health Check: http://localhost:${PORT}/health             ║
║                                                               ║
║   Required Environment Variables (.env):                     ║
║      BREVO_API_KEY=your_brevo_smtp_key                       ║
║      EMAIL_FROM=your_verified_email@domain.com               ║
║                                                               ║
║   Frontend will call: http://localhost:${PORT}/api/email      ║
║   (No need to update React env for local dev)                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});
