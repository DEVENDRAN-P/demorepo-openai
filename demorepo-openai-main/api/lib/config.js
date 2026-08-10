/**
 * Server-side configuration for the GST Buddy AI Gateway.
 *
 * All values here are read from server environment variables only.
 * NEVER reference REACT_APP_* / VITE_* values here, and never return
 * these values (or the API key) to the browser.
 */

module.exports = {
  // Google Gemini model used for structured agent tasks.
  // Supported structured-output models include gemini-2.0-flash / gemini-2.5-flash.
  model: process.env.GEMINI_MODEL || "gemini-2.0-flash",

  // Maximum allowed characters for text inputs (OCR text, document text).
  maxInputChars: parseInt(process.env.AI_MAX_INPUT_CHARS || "60000", 10),

  // Maximum serialized JSON body size accepted by /api/ai (bytes).
  // Kept under Vercel's serverless request body limit (~4.5 MB).
  maxPayloadBytes: parseInt(process.env.AI_MAX_PAYLOAD_BYTES || "4000000", 10),

  // Maximum accepted base64 image size in characters (~3 MB file).
  maxImageChars: parseInt(process.env.AI_MAX_IMAGE_CHARS || "4000000", 10),

  // Per-call timeout for non-streaming Gemini calls.
  timeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS || "55000", 10),

  // Maximum output tokens for Gemini responses. The invoice_extraction
  // schema is large (lineItems, boundingBoxes, aiSuggestions, analysis
  // strings), so a low cap truncates the JSON mid-response and produces
  // "AI returned a malformed response" (502 AI_INVALID_OUTPUT). 8192 is the
  // max supported by gemini-2.5-flash without thinking.
  maxOutputTokens: parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS || "8192", 10),
};
