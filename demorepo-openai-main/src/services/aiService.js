import { auth } from "../config/firebase";

/**
 * Client helper for the GST Buddy AI Gateway (/api/ai).
 *
 * The Gemini API key is server-side only. This module attaches the Firebase
 * ID token (Authorization: Bearer) so the server can verify the caller and
 * look up the caller's invoices.
 */

const getApiUrl = (path) => {
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
    window.location.port !== "5000"
  ) {
    return `http://localhost:5000${path}`;
  }
  return path;
};

export class AIError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = "AIError";
    this.code = code;
    this.status = status;
  }
}

const getToken = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new AIError("Please sign in to use AI features.", "NOT_AUTHENTICATED", 401);
  }
  try {
    return await user.getIdToken();
  } catch (err) {
    throw new AIError("Session expired. Please sign in again.", "TOKEN_ERROR", 401);
  }
};

/**
 * Run any supported AI task and return the parsed result.
 */
export const runAITask = async (task, payload = {}) => {
  const token = await getToken();
  let response;
  try {
    response = await fetch(getApiUrl("/api/ai"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ task, ...payload }),
    });
  } catch (err) {
    throw new AIError("Network error reaching the AI service.", "NETWORK_ERROR", 0);
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new AIError("Invalid response from the AI service.", "BAD_RESPONSE", response.status);
  }

  if (!response.ok || !data || data.success === false) {
    throw new AIError(
      (data && data.error) || "AI request failed.",
      (data && data.code) || "AI_ERROR",
      response.status
    );
  }
  return data;
};

/**
 * Normalize an image to the compact object form { data, mimeType } where
 * `data` is RAW base64 (the "data:...;base64," header is stripped).
 * Stripping the header shrinks the JSON payload by ~25% and keeps the
 * request comfortably under Vercel's body-size limit.
 */
const normalizeImage = (image) => {
  if (!image) return undefined;
  if (typeof image === "object" && !Array.isArray(image) && image.data) {
    return { data: image.data, mimeType: image.mimeType || "image/jpeg" };
  }
  if (typeof image === "string" && image.trim()) {
    let mimeType = "image/jpeg";
    let body = image.trim();
    const commaIndex = body.indexOf(",");
    if (commaIndex > 0 && body.slice(0, commaIndex).includes("base64")) {
      const header = body.slice(0, commaIndex);
      const m = header.match(/data:([\w/+-]+);/);
      if (m) mimeType = m[1];
      body = body.slice(commaIndex + 1);
    }
    body = body.replace(/\s+/g, "");
    return body ? { data: body, mimeType } : undefined;
  }
  return undefined;
};

/**
 * Invoice extraction from Tesseract OCR text or an image data URL.
 *
 * Input contract:
 *   { ocrText: string }           — OCR-extracted text
 *   OR
 *   { image: string }             — base64 data URL (e.g. "data:image/jpeg;base64,...")
 *   OR
 *   { image: { data, mimeType } } — object form
 */
export const extractInvoiceData = async ({ ocrText, image, business }) => {
  const normalizedImage = normalizeImage(image);
  const hasOcrText = typeof ocrText === "string" && ocrText.trim().length >= 5;

  // Validate: must have either a usable image or OCR text
  if (!normalizedImage && !hasOcrText) {
    throw new AIError(
      "Invoice image or OCR text is required for extraction.",
      "INVALID_INPUT",
      400
    );
  }
  if (!normalizedImage && ocrText && !hasOcrText) {
    throw new AIError(
      "OCR text is too short to be a valid invoice.",
      "INVALID_INPUT",
      400
    );
  }

  console.log("[AI] extractInvoiceData:", {
    mode: normalizedImage ? "vision" : "ocr",
    hasImage: !!normalizedImage,
    hasOcrText: hasOcrText,
    imageSize: normalizedImage?.data?.length || 0,
  });

  return runAITask("invoice_extraction", {
    ocrText: hasOcrText ? ocrText.trim() : undefined,
    image: normalizedImage,
    business,
  });
};

/**
 * Compliance analysis for the current user's invoices.
 */
export const analyzeCompliance = async ({ businessId } = {}) => {
  return runAITask("compliance_analysis", { businessId });
};

/**
 * Tax forecast explanation for the current user's invoices.
 */
export const forecastTax = async ({ businessId } = {}) => {
  return runAITask("tax_forecast", { businessId });
};

/**
 * Business intelligence insights for the current user's invoices.
 */
export const getBusinessInsights = async ({ businessId } = {}) => {
  return runAITask("business_insight", { businessId });
};

/**
 * Official document analysis (GST notice / legal document) from OCR text or image.
 */
export const analyzeDocument = async ({ ocrText, image }) => {
  const hasOcrText = typeof ocrText === "string" && ocrText.trim().length >= 5;
  return runAITask("document_analysis", {
    ocrText: hasOcrText ? ocrText.trim() : undefined,
    image: normalizeImage(image),
  });
};

/**
 * Single-turn / non-streaming assistant chat.
 */
export const aiChat = async ({ messages, business, invoiceSummary, language }) => {
  return runAITask("gst_assistant", { messages, business, invoiceSummary, language });
};

/**
 * Streaming assistant chat. Returns a ReadableStream of text chunks.
 */
export const aiChatStream = async ({ messages, business, invoiceSummary, language }) => {
  const token = await getToken();
  const response = await fetch(getApiUrl("/api/ai"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ task: "gst_assistant_stream", messages, business, invoiceSummary, language }),
  });
  if (!response.ok || !response.body) {
    let data = {};
    try {
      data = await response.json();
    } catch (err) {
      /* ignore */
    }
    throw new AIError(data.error || "AI request failed.", data.code || "AI_ERROR", response.status);
  }
  return response.body;
};
