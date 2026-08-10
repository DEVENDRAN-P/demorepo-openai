/**
 * /api/chat — Alias for the GST Assistant task in /api/ai.
 *
 * This route exists for backwards-compatible URL routing.
 * It forwards the request to the main AI gateway handler
 * with task="gst_assistant".
 *
 * POST /api/chat
 * Body: { messages, business, invoiceSummary, language, stream? }
 */

const aiHandler = require("./ai");
const { handleCors, setCorsHeaders } = require("./_utils/cors");

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req);

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed.", code: "METHOD_NOT_ALLOWED" });
  }

  // Inject task into the request body and delegate to the main AI handler
  const body = req.body || {};
  const task = body.stream === true ? "gst_assistant_stream" : "gst_assistant";
  req.body = { ...body, task };

  return aiHandler(req, res);
};
