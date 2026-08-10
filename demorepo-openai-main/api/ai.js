/**
 * GST Buddy AI Gateway — Vercel serverless function.
 *
 * POST /api/ai
 *
 * Authenticated endpoint (Firebase ID token via `Authorization: Bearer <token>`)
 * that fronts Google Gemini. The Gemini API key lives ONLY on the server
 * (GEMINI_API_KEY) and is never sent to the browser.
 *
 * Supported tasks:
 *   - invoice_extraction   (Tesseract OCR text or image → normalized invoice JSON)
 *   - compliance_analysis  (deterministic rules + Gemini reasoning)
 *   - tax_forecast         (deterministic math + Gemini explanation)
 *   - business_insight     (deterministic metrics + Gemini insights)
 *   - gst_assistant        (multilingual English / Hindi / Tamil chat, text or stream)
 *   - document_analysis    (GST notices / legal documents)
 *
 * Error responses are always `{ success:false, error, code }` — never stack
 * traces and never secret material.
 */

const config = require("./lib/config");
const { verifyAuth, AiHttpError } = require("./lib/admin");
const { aiLog } = require("./lib/logger");
const handlers = require("./lib/aiTasks");
const { checkUsageLimit, incrementUsage } = require("./lib/usage");
const { setCorsHeaders, handleCors } = require("./_utils/cors");

// Friendly user-facing messages for known error codes (never stack traces).
const ERROR_MESSAGES = {
  AI_RATE_LIMITED:
    "AI analysis is temporarily busy. Please try again in a few minutes.",
  AI_MISSING_KEY:
    "AI analysis is temporarily unavailable. Please try again shortly.",
  AI_TIMEOUT:
    "AI analysis took too long. Please try again.",
  AI_SERVICE_ERROR:
    "AI analysis is temporarily unavailable. Please try again shortly.",
  AI_INVALID_OUTPUT:
    "The AI could not produce a valid result. Please try again with a clearer document.",
  PAYLOAD_TOO_LARGE:
    "The uploaded file is too large. Please upload a smaller file.",
  LIMIT_EXCEEDED:
    "You have reached the monthly limit for this feature on your current plan.",
};

const USAGE_TASKS = {
  invoice_extraction: "invoice_extractions",
  document_analysis: "document_analyses",
};

const TEXT_TASKS = new Set([
  "invoice_extraction",
  "compliance_analysis",
  "tax_forecast",
  "business_insight",
  "gst_assistant",
  "document_analysis",
]);

async function readBody(req) {
  const length = Number(req.headers["content-length"] || 0);
  if (length > config.maxPayloadBytes) {
    throw new AiHttpError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
  }
  let body = req.body;

  // Fallback: some serverless runtimes / proxies deliver an unparsed body.
  if (!body || typeof body !== "object" || Object.keys(body).length === 0) {
    if (length > 0) {
      const chunks = [];
      let total = 0;
      for await (const chunk of req) {
        total += chunk.length;
        if (total > config.maxPayloadBytes) {
          throw new AiHttpError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
        }
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (raw) {
        try {
          body = JSON.parse(raw);
        } catch (e) {
          throw new AiHttpError(400, "INVALID_JSON", "Request body is not valid JSON.");
        }
      }
    }
  }

  if (!body || typeof body !== "object") body = {};
  const raw = JSON.stringify(body);
  if (raw && raw.length > config.maxPayloadBytes) {
    throw new AiHttpError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
  }
  return body;
}

function sendError(res, err) {
  const normalized = err instanceof AiHttpError ? err : new AiHttpError(500, "INTERNAL_ERROR", "Unexpected server error.");
  const payload = {
    success: false,
    error: normalized.safeMessage,
    code: normalized.code,
  };
  if (ERROR_MESSAGES[normalized.code]) {
    payload.message = ERROR_MESSAGES[normalized.code];
  }
  return res.status(normalized.status).json(payload);
}

async function handleStream(req, res, decoded, body) {
  const generator = await handlers.gst_assistant_stream(body, decoded);
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
  });
  res.flushHeaders();
  let output = "";
  try {
    for await (const chunk of generator) {
      if (typeof chunk === "string" && chunk.length) {
        output += chunk;
        res.write(chunk);
      }
    }
  } catch (err) {
    res.end();
    throw err;
  }
  res.end();
  return { output };
}

module.exports = async (req, res) => {
  const startedAt = Date.now();

  if (handleCors(req, res)) return;
  setCorsHeaders(res, req);
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed.", code: "METHOD_NOT_ALLOWED" });
  }

  let decoded = null;
  let task = "unknown";

  try {
    decoded = await verifyAuth(req);
    const body = await readBody(req);

    task = typeof body.task === "string" ? body.task : "";
    if (!TEXT_TASKS.has(task) && task !== "gst_assistant_stream") {
      throw new AiHttpError(400, "INVALID_TASK", `Unsupported task: "${task}".`);
    }

    aiLog("start", {
      task,
      uid: decoded.uid,
      stream: task === "gst_assistant_stream" || body.stream === true,
    });

    let result;
    let output = "";
    if (task === "gst_assistant_stream" || (task === "gst_assistant" && body.stream === true)) {
      result = await handleStream(req, res, decoded, body);
      output = result.output;
    } else {
      // Log input shape for invoice extraction (without sensitive data)
      if (task === "invoice_extraction") {
        aiLog("input", {
          task,
          uid: decoded.uid,
          hasImage: !!body.image,
          imageDataType: typeof body.image,
          hasOcrText: typeof body.ocrText === "string" && body.ocrText.trim().length > 0,
          ocrTextLength: typeof body.ocrText === "string" ? body.ocrText.length : 0,
        });
      }
      // Server-side entitlement check BEFORE spending AI credits.
      if (USAGE_TASKS[task]) {
        const limit = await checkUsageLimit(decoded.uid, USAGE_TASKS[task]);
        if (!limit.allowed) {
          throw new AiHttpError(
            403,
            "LIMIT_EXCEEDED",
            `Monthly limit reached (${limit.used}/${limit.limit}). Please upgrade your plan to continue.`
          );
        }
      }
      result = await handlers[task](body, decoded);
      // Only count a usage unit when the AI task actually succeeded.
      if (USAGE_TASKS[task] && result && result.success !== false) {
        try {
          await incrementUsage(decoded.uid, USAGE_TASKS[task]);
        } catch (usageErr) {
          aiLog("error", { task, uid: decoded.uid, errorCategory: "USAGE_INCREMENT_FAILED" });
        }
      }
    }

    aiLog("complete", {
      task,
      uid: decoded.uid,
      latencyMs: Date.now() - startedAt,
      provider: "google",
      model: config.model,
      outputChars: output.length || (result ? JSON.stringify(result).length : 0),
    });

    if (task === "gst_assistant_stream" || output) {
      return undefined; // response already streamed
    }

    const payload = { success: true, task, ...result };
    return res.status(200).json(payload);
  } catch (err) {
    aiLog("error", {
      task,
      uid: decoded ? decoded.uid : undefined,
      latencyMs: Date.now() - startedAt,
      errorCategory: err instanceof AiHttpError ? err.code : "INTERNAL_ERROR",
    });
    return sendError(res, err);
  }
};
