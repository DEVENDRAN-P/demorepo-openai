/**
 * Verify the three backend fixes against the RUNNING local server:
 *  1. extractJson salvage of truncated JSON (unit check, no network)
 *  2. POST /api/ai with a LONG OCR text (previously 502 malformed response)
 *  3. POST /api/agent (previously 400 "Invalid JSON")
 *  4. GET /api/subscription/status (was ERR_CONNECTION_REFUSED when down)
 *
 * Reuses the same custom-token minting as scripts/e2e-ai-test.js.
 */
require("dotenv").config();
const { getApps, cert } = require("firebase-admin/app");
const admin = require("firebase-admin");
const { getAuth } = require("firebase-admin/auth");

const BASE = `http://localhost:${process.env.PORT || 5000}`;

// ---- 1. Unit: truncated JSON salvage ----
const { extractJson } = require("../lib/gemini");
function checkSalvage() {
  const truncated = '{"amount": 85000, "supplierName": "Chennai Trade';
  try {
    const obj = extractJson(truncated);
    const ok = obj && obj.amount === 85000 && obj.supplierName === "Chennai Trade";
    console.log(`[1] salvage truncated JSON: ${ok ? "PASS" : "FAIL"} →`, JSON.stringify(obj));
  } catch (e) {
    console.log("[1] salvage truncated JSON: FAIL →", e.message);
  }
}

async function getToken() {
  if (!getApps().length) {
    admin.initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  }
  const customToken = await getAuth().createCustomToken("e2e-perftest-user");
  const exchange = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.REACT_APP_FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const exch = await exchange.json();
  if (!exch.idToken) throw new Error(`Token exchange failed: ${exch.error?.message || "unknown"}`);
  return exch.idToken;
}

// Build a long-ish invoice OCR text (~1200 chars) — the shape that previously
// exceeded the 2048-token output cap and returned 502.
function buildLongOcr() {
  const lines = [];
  for (let i = 1; i <= 28; i++) {
    lines.push(`Item ${i}  Widget Part No ${1000 + i}  Qty ${(i % 5) + 1}  Rate Rs.${(i * 137.5).toFixed(2)}  Taxable Rs.${(i * 137.5 * ((i % 5) + 1)).toFixed(2)}  GST 18%`);
  }
  return [
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
}

async function main() {
  checkSalvage();
  const token = await getToken();

  // ---- 2. POST /api/ai (long OCR) ----
  try {
    const ocrText = buildLongOcr();
    console.log(`[2] POST /api/ai (ocrText=${ocrText.length} chars)...`);
    const res = await fetch(`${BASE}/api/ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ task: "invoice_extraction", ocrText }),
    });
    const body = await res.json();
    const ok = res.ok && body.success && body.data && body.data.supplierName;
    console.log(`[2] /api/ai: ${ok ? "PASS" : "FAIL"} → HTTP ${res.status}${body.error ? " | " + body.error : ""}`);
    if (body.data) console.log("     supplierName:", body.data.supplierName, "| invoiceDate:", body.data.invoiceDate, "| amount:", body.data.amount);
  } catch (e) {
    console.log("[2] /api/ai: FAIL →", e.message);
  }

  // ---- 3. POST /api/agent (previously 400 Invalid JSON) ----
  try {
    const res = await fetch(`${BASE}/api/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ trigger: "run_compliance", business: {} }),
    });
    const body = await res.json();
    const ok = res.ok && body.success;
    console.log(`[3] /api/agent: ${ok ? "PASS" : "FAIL"} → HTTP ${res.status}${body.error ? " | " + body.error : ""}${body.results ? " | agents: " + body.results.length : ""}`);
  } catch (e) {
    console.log("[3] /api/agent: FAIL →", e.message);
  }

  // ---- 4. GET /api/subscription/status ----
  try {
    const res = await fetch(`${BASE}/api/subscription/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    const ok = res.ok && (body.subscription || body.plan || body.success !== false);
    console.log(`[4] /api/subscription/status: ${ok ? "PASS" : "FAIL"} → HTTP ${res.status} | plan: ${body.subscription?.subscriptionPlan || "free"}`);
  } catch (e) {
    console.log("[4] /api/subscription/status: FAIL →", e.message);
  }
}

main().catch((e) => console.error("SCRIPT ERROR:", e.message));
