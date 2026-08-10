/**
 * Diagnostic: reproduce the /api/ai invoice_extraction Gemini call directly
 * to see why the server returns 502 "AI returned a malformed response."
 * Loads the root .env exactly like the running server does.
 * The API key is read from env but never printed.
 */
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { RESPONSE_SCHEMAS } = require("../api/lib/schemas");
const config = require("../api/lib/config");

async function main() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.log("❌ GEMINI_API_KEY missing from .env");
    return;
  }
  console.log("ℹ️ model:", config.model, "| maxOutputTokens:", config.maxOutputTokens);

  // Build a ~900-char invoice OCR text (similar to the user's failing uploads)
  const lines = [];
  for (let i = 1; i <= 20; i++) {
    lines.push(`Item ${i}  Widget Part No ${1000 + i}  Qty ${(i % 5) + 1}  Rate Rs.${(i * 137.5).toFixed(2)}  Taxable Rs.${(i * 137.5 * ((i % 5) + 1)).toFixed(2)}  GST 18%`);
  }
  const ocr = [
    "TAX INVOICE",
    "GSTIN: 33ABCDE1234F1Z5",
    "INV-2026-001",
    "Date: 15-07-2026",
    "Supplier: Chennai Traders Pvt Ltd",
    "Buyer: Demo Shop",
    ...lines,
    "Subtotal Rs.85000.00",
    "CGST Rs.7650.00",
    "SGST Rs.7650.00",
    "Total Rs.100300.00",
  ].join("\n");
  console.log("ℹ️ ocrText length:", ocr.length);

  const client = new GoogleGenerativeAI(key);

  // ---- Test 1: EXACT server path (schema + 2048 tokens) ----
  try {
    const model1 = client.getGenerativeModel({
      model: config.model,
      systemInstruction: "Extract GST metadata from the invoice. Return ONLY JSON.",
    });
    const r1 = await model1.generateContent({
      contents: [{ role: "user", parts: [{ text: "Extract the GST invoice metadata as JSON only. Invoice text:\n" + ocr }] }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        maxOutputTokens: config.maxOutputTokens,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMAS.invoice_extraction,
      },
    });
    const resp1 = r1.response;
    const cand = resp1.candidates && resp1.candidates[0];
    const blocked = (cand && cand.safetyRatings || []).filter((s) => s.blocked).map((s) => s.category);
    const t1 = resp1.text();
    let parse1 = "PARSE-OK";
    try { JSON.parse(t1); } catch (e) { parse1 = "PARSE-FAIL: " + e.message.slice(0, 100); }
    console.log("\n[Test1: schema + 2048 tokens]");
    console.log("  finishReason:", cand && cand.finishReason);
    console.log("  blockedSafety:", blocked.length ? blocked.join(",") : "none");
    console.log("  promptFeedback blocked:", JSON.stringify(resp1.promptFeedback || "n/a").slice(0, 120));
    console.log("  text length:", t1.length);
    console.log("  text head:", JSON.stringify(t1.slice(0, 120)));
    console.log("  text tail:", JSON.stringify(t1.slice(-120)));
    console.log("  →", parse1);
  } catch (e) {
    console.log("\n[Test1 error]", e.message.slice(0, 300));
  }

  // ---- Test 2: schema + higher token ceiling (8192) ----
  try {
    const model2 = client.getGenerativeModel({
      model: config.model,
      systemInstruction: "Extract GST metadata from the invoice. Return ONLY JSON.",
    });
    const r2 = await model2.generateContent({
      contents: [{ role: "user", parts: [{ text: "Extract the GST invoice metadata as JSON only. Invoice text:\n" + ocr }] }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMAS.invoice_extraction,
      },
    });
    const cand2 = r2.response.candidates && r2.response.candidates[0];
    const t2 = r2.response.text();
    let parse2 = "PARSE-OK";
    try { JSON.parse(t2); } catch (e) { parse2 = "PARSE-FAIL: " + e.message.slice(0, 100); }
    console.log("\n[Test2: schema + 8192 tokens]");
    console.log("  finishReason:", cand2 && cand2.finishReason);
    console.log("  text length:", t2.length);
    console.log("  →", parse2);
  } catch (e) {
    console.log("\n[Test2 error]", e.message.slice(0, 300));
  }
}

main().catch((e) => console.error("SCRIPT ERROR:", e.message, "|", e.code || ""));
