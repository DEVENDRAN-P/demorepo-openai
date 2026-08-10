/**
 * Shared CORS configuration for Vercel serverless functions.
 *
 * In production the React SPA and API live on the same Vercel domain,
 * so same-origin requests don't need CORS headers at all.  We only
 * need to allow cross-origin calls during local development (localhost).
 *
 * Set CORS_ORIGIN in your .env for local dev if needed; defaults to
 * http://localhost:3000.
 */

const ALLOWED_ORIGINS = [
  process.env.CORS_ORIGIN || "http://localhost:3000",
  "https://finalopenai-fc9c5.web.app",
  "https://gstbuddy.vercel.app",
];

function setCorsHeaders(res, req) {
  const origin = req && req.headers && req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    // Same-origin or server-to-server requests (no Origin header)
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGINS[0]);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function handleCors(req, res) {
  if (req.method === "OPTIONS") {
    setCorsHeaders(res, req);
    res.status(200).end();
    return true; // caller should return after this
  }
  setCorsHeaders(res, req);
  return false; // caller should continue processing
}

module.exports = { setCorsHeaders, handleCors, ALLOWED_ORIGINS };
