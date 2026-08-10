/**
 * Health check endpoint.
 *
 * GET /api/health
 *
 * Public, read-only, and reveals no secrets or environment details.
 * Returns a lightweight JSON status used by uptime monitors and CI.
 */

const { setCorsHeaders, handleCors } = require("../lib/cors");

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req);

  if (req.method === "GET" || req.method === "HEAD") {
    return res.status(200).json({
      status: "ok",
      service: "gst-buddy-api",
      time: new Date().toISOString(),
    });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
};
