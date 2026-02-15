/**
 * Vercel Serverless Function for Sending Emails via Brevo SMTP
 *
 * This function is deployed to Vercel and handles email sending for the GST Buddy app.
 *
 * Environment Variables (set on Vercel):
 * - BREVO_API_KEY: Your Brevo SMTP password/API key
 * - EMAIL_FROM: Sender email address
 *
 * Usage:
 * POST /api/email
 * Content-Type: application/json
 *
 * {
 *   "subject": "Email subject",
 *   "body": "Email body text",
 *   "email": "recipient@example.com"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "messageId": "...",
 *   "message": "Email sent successfully via Brevo SMTP",
 *   "provider": "Brevo SMTP",
 *   "recipient": "recipient@example.com"
 * }
 */

const nodemailer = require("nodemailer");

export default async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // GET endpoint for diagnostics
  if (req.method === "GET") {
    const brevoKey = process.env.BREVO_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;

    return res.status(200).json({
      status: "Email API Running",
      environment: "production",
      brevoConfigured: {
        BREVO_API_KEY: brevoKey ? "✅ SET" : "❌ NOT SET",
        EMAIL_FROM: emailFrom ? `✅ SET (${emailFrom})` : "❌ NOT SET",
      },
      endpoints: {
        "GET /api/email": "This diagnostic endpoint",
        "POST /api/email": "Send email (requires BREVO_API_KEY and EMAIL_FROM)",
      },
      note: "If env vars show NOT SET, configure them in Vercel Settings → Environment Variables",
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed. Use POST /api/email",
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Invalid email format",
      });
    }

    // Get Brevo credentials from environment variables
    const brevoSmtpKey = process.env.BREVO_API_KEY;
    const brevoSmtpUser = "a26ddc001@smtp-brevo.com"; // Brevo SMTP username
    const emailFrom = process.env.EMAIL_FROM;

    if (!brevoSmtpKey || !emailFrom) {
      console.error("❌ Missing Brevo environment variables on Vercel:");
      console.error("BREVO_API_KEY:", brevoSmtpKey ? "SET" : "❌ NOT SET");
      console.error("EMAIL_FROM:", emailFrom ? "SET" : "❌ NOT SET");
      console.error("");
      console.error("⚠️ TO FIX: Set environment variables on Vercel:");
      console.error(
        "1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables",
      );
      console.error("2. Add: BREVO_API_KEY = xsmtpsib-a8cfdcda7d6e...");
      console.error("3. Add: EMAIL_FROM = your_verified_email@domain.com");
      console.error("4. Redeploy the project");

      return res.status(500).json({
        error:
          "Email service not configured - BREVO_API_KEY or EMAIL_FROM missing on Vercel",
        details:
          "Set these in Vercel Dashboard: Settings → Environment Variables",
        missingVariables: {
          BREVO_API_KEY: !brevoSmtpKey,
          EMAIL_FROM: !emailFrom,
        },
      });
    }

    // Configure Brevo SMTP transporter
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false, // TLS
      auth: {
        user: brevoSmtpUser, // Brevo SMTP username
        pass: brevoSmtpKey, // Brevo API key
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: emailFrom,
      to: email,
      subject: subject,
      text: body,
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        ${body
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>")}
      </div>`,
    });

    console.log(
      `✅ Email sent successfully to ${email} via Brevo SMTP (MessageId: ${info.messageId})`,
    );

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      message: "Email sent successfully via Brevo SMTP",
      provider: "Brevo SMTP",
      recipient: email,
      statusCode: 200,
    });
  } catch (error) {
    console.error("❌ BREVO SMTP ERROR:");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Command:", error.command);
    console.error("SMTP Response:", error.response);

    // Check for authentication errors
    if (
      error.code === "EAUTH" ||
      error.message.includes("Invalid login") ||
      error.message.includes("authentication")
    ) {
      return res.status(401).json({
        success: false,
        error: "Invalid Brevo Credentials",
        message:
          "SMTP authentication failed. Check BREVO_API_KEY in Vercel Settings.",
        code: "EAUTH",
        details: error.message,
        help: "1. Go to https://dashboard.brevo.com/smtp\n2. Copy SMTP Key (password) - should start with 'xsmtpsib-'\n3. Set BREVO_API_KEY in Vercel Environment Variables\n4. Redeploy",
      });
    }

    // Check for connection errors
    if (
      error.code === "ECONNREFUSED" ||
      error.code === "EHOSTUNREACH" ||
      error.code === "ETIMEDOUT"
    ) {
      return res.status(503).json({
        success: false,
        error: "Brevo Server Unreachable",
        message:
          "Cannot connect to smtp-relay.brevo.com. Check server status at https://status.brevo.com",
        code: error.code,
        details: error.message,
      });
    }

    // Check for invalid email
    if (error.message.includes("Invalid email")) {
      return res.status(400).json({
        success: false,
        error: "Invalid Email Address",
        message: "Recipient email format is invalid",
        code: "INVALID_EMAIL",
      });
    }

    // Generic error - show all details
    return res.status(500).json({
      success: false,
      error: error.message || "Email sending failed",
      message:
        error.message || "An unexpected error occurred while sending email",
      code: error.code || "UNKNOWN",
      type: error.name,
      details: error.toString(),
      help: "Check Vercel logs for more details or contact support",
    });
  }
};
