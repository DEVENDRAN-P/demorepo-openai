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
        error:
          "Missing required fields: subject, body, email",
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
      console.error(
        "❌ Missing environment variables: BREVO_API_KEY or EMAIL_FROM"
      );
      return res.status(500).json({
        error:
          "Email service not configured - missing Brevo credentials on server",
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
      `✅ Email sent successfully to ${email} via Brevo SMTP (MessageId: ${info.messageId})`
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
    console.error("❌ Brevo SMTP error:", error.message);

    // Return appropriate error based on error type
    if (error.code === "EAUTH") {
      return res.status(401).json({
        error: "Authentication failed - check Brevo credentials",
        details: error.message,
      });
    }

    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        error: "Email service unavailable - SMTP connection failed",
        details: error.message,
      });
    }

    return res.status(500).json({
      error: `Failed to send email: ${error.message}`,
      details: error.toString(),
    });
  }
};
