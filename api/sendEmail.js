/**
 * Vercel Serverless API for Sending Emails
 * No Firebase dependency - works directly with SendGrid
 * Deploy to Vercel for automatic email sending
 *
 * To deploy:
 * 1. Install Vercel CLI: npm install -g vercel
 * 2. Run: vercel deploy
 * 3. Set environment variable: SENDGRID_API_KEY=your_key
 * 4. Update .env: REACT_APP_SEND_EMAIL_API=https://your-vercel-url/api/sendEmail
 */

const axios = require("axios");

export default async (req, res) => {
  // Enable CORS for all origins and methods
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, X-Requested-With, Authorization",
  );
  res.setHeader("Access-Control-Max-Age", "86400");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(200).json({ status: "ok" });
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Content-Type", "application/json");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { subject, body, email } = req.body;

    // Validate input
    if (!subject || !body || !email) {
      res.setHeader("Content-Type", "application/json");
      return res.status(400).json({
        error: "Missing required fields: subject, body, email",
      });
    }

    const sendGridApiKey = process.env.SENDGRID_API_KEY;

    if (!sendGridApiKey) {
      console.error("❌ SENDGRID_API_KEY not configured");
      res.setHeader("Content-Type", "application/json");
      return res.status(500).json({
        error: "Email service not configured - missing SendGrid API key",
      });
    }

    // Send email via SendGrid
    const response = await axios.post(
      "https://api.sendgrid.com/v3/mail/send",
      {
        personalizations: [
          {
            to: [{ email: email }],
            subject: subject,
          },
        ],
        from: {
          email: process.env.EMAIL_FROM || "noreplygstbuddy@gmail.com",
          name: "GST Buddy",
        },
        content: [
          {
            type: "text/plain",
            value: body,
          },
          {
            type: "text/html",
            value: `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap; color: #333;">${body
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")}</pre>`,
          },
        ],
        replyTo: {
          email: "support@gstbuddy.ai",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${sendGridApiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log(`✅ Email sent successfully to ${email}`);

    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({
      success: true,
      messageId: `sendgrid-${Date.now()}`,
      message: "Email sent successfully",
      recipient: email,
      statusCode: response.status,
    });
  } catch (error) {
    console.error("❌ Email sending error:", error.message);

    res.setHeader("Content-Type", "application/json");

    if (error.response?.status === 401) {
      return res.status(401).json({
        error: "Invalid SendGrid API key",
      });
    }

    if (error.response?.status === 429) {
      return res.status(429).json({
        error: "Too many requests - rate limited",
      });
    }

    return res.status(500).json({
      error: `Failed to send email: ${error.message}`,
      details: error.response?.data || error.message,
    });
  }
};
