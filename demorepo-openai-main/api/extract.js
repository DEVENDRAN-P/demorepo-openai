/**
 * /api/extract — Alias for the invoice_extraction task in /api/ai.
 *
 * This route exists for backwards-compatible URL routing.
 * It forwards the request to the main AI gateway handler
 * with task="invoice_extraction".
 *
 * POST /api/extract
 * Body: { image?, ocrText?, business? }
 *
 * The Gemini API key is server-side only and never exposed to the browser.
 */

const aiHandler = require("./ai");
const { handleCors, setCorsHeaders } = require("./_utils/cors");

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req);

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed.", code: "METHOD_NOT_ALLOWED" });
  }

  // Inject task and delegate to the main AI handler
  const body = req.body || {};
  req.body = { ...body, task: "invoice_extraction" };

  return aiHandler(req, res);
};
