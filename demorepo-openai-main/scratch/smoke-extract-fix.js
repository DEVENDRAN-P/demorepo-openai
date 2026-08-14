/**
 * Smoke test for invoice extraction through the REAL /api/ai gateway.
 *
 * Exercises: auth → body parse → reserveUsage → handlers.invoice_extraction
 * (real Gemini + schema validation) → response. Usage reservation is
 * stubbed so NO Firestore writes happen against the production project.
 */
require("dotenv").config();

const assert = require("assert");
const admin = require("../lib/admin");
const usage = require("../lib/usage");

// Stub auth (see smoke-stream-fix.js for why this must be patched first).
let authChecked = false;
admin.verifyAuth = async (req) => {
  authChecked = true;
  const header = req.headers.authorization || "";
  if (header !== "Bearer test-bearer-token") {
    const { AiHttpError } = require("../lib/admin");
    throw new AiHttpError(401, "UNAUTHORIZED", "Authentication required.");
  }
  return { uid: "smoke-test-uid" };
};

// Stub the quota layer so nothing is written to Firestore, but record what
// would have been reserved/released so we can assert the flow.
let reservedMetric = null;
let releasedKey = null;
usage.reserveUsage = async (uid, metric, key) => {
  reservedMetric = metric;
  return { allowed: true, alreadyProcessed: false, key: key || "stub-key", used: 1, limit: 5, plan: "free" };
};
usage.releaseUsage = async (uid, metric, key) => {
  releasedKey = key;
  return { released: true };
};

function makeReq() {
  return {
    method: "POST",
    url: "/api/ai",
    headers: { "content-length": "0", authorization: "Bearer test-bearer-token" },
    query: {},
    body: {
      task: "invoice_extraction",
      ocrText: [
        "TAX INVOICE INV-2026-001",
        "Supplier: Chennai Traders Pvt Ltd",
        "GSTIN: 33ABCDE1234F1Z5",
        "Invoice Date: 15-07-2026",
        "Items: Laptop Stand x2 @ 850, HDMI Cable x5 @ 320",
        "Taxable Value: 3300",
        "CGST 9%: 297  SGST 9%: 297",
        "Total: 3894",
      ].join("  "),
      business: { name: "Demo Shop", gstin: "33ABCDE1234F1Z5", state: "Tamil Nadu" },
    },
  };
}

function makeRes() {
  const res = {
    statusCode: 0,
    body: "",
    headers: {},
    status(code) { this.statusCode = code; return this; },
    setHeader(k, v) { this.headers[k] = v; },
    json(obj) { this.body = JSON.stringify(obj); },
    writeHead() {},
    flushHeaders() {},
    write() {},
    end() {},
  };
  return res;
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY missing — cannot run live extraction test");
  }

  const handler = require("../api/ai");
  const req = makeReq();
  const res = makeRes();

  await handler(req, res);

  console.log("authChecked:", authChecked);
  console.log("reservedMetric:", reservedMetric);
  console.log("statusCode:", res.statusCode);

  const payload = JSON.parse(res.body);
  console.log("success:", payload.success);
  if (payload.data) {
    console.log("supplier:", payload.data.supplierName);
    console.log("gstin:", payload.data.gstin);
    console.log("invoiceNumber:", payload.data.invoiceNumber);
    console.log("amount:", payload.data.amount, "| tax:", payload.data.taxAmount, "| total:", payload.data.totalAmount);
    console.log("confidence:", payload.data.extractionConfidence);
  } else {
    console.log("response:", res.body.slice(0, 300));
  }

  assert.equal(authChecked, true, "verifyAuth not reached");
  assert.equal(reservedMetric, "aiExtractions", "usage metric should be aiExtractions");
  assert.equal(res.statusCode, 200, `expected 200, got ${res.statusCode} (${res.body.slice(0, 200)})`);
  assert.equal(payload.success, true, "extraction failed");
  assert.ok(payload.data, "no extracted data");
  assert.ok(payload.data.invoiceNumber, "missing invoiceNumber");
  assert.equal(releasedKey, null, "successful extraction must NOT release the slot");

  console.log("\n✅ INVOICE EXTRACTION FIX VERIFIED END-TO-END (real Gemini, no Firebase writes)");
}

main().catch((err) => {
  console.error("❌ EXTRACTION TEST FAILED:", err.message);
  process.exitCode = 1;
});
