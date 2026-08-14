/**
 * Smoke test for the streaming-chat fix (ALLOWED_ORIGINS ReferenceError).
 *
 * Exercises the REAL api/ai.js handler path for gst_assistant_stream
 * (the exact code that previously crashed with
 * "ReferenceError: ALLOWED_ORIGINS is not defined") end-to-end against the
 * real Gemini API.
 *
 * Auth is stubbed so NO Firebase Admin init and NO Firestore writes happen —
 * this test has zero side effects on the production project.
 */
require("dotenv").config();

const assert = require("assert");
const admin = require("../lib/admin");

// Stub auth BEFORE the handler is required: api/ai.js destructures
// { verifyAuth } from lib/admin at module load, so patching the export here
// is captured by the handler. This prevents initAdmin() from ever running
// (no Firebase service-account usage, no Firestore writes).
let tokenVerified = false;
admin.verifyAuth = async (req) => {
  tokenVerified = true;
  const header = req.headers.authorization || "";
  if (header !== "Bearer test-bearer-token") {
    const { AiHttpError } = require("../lib/admin");
    throw new AiHttpError(401, "UNAUTHORIZED", "Authentication required.");
  }
  return { uid: "smoke-test-uid" };
};

// Minimal fake req/res (what the streaming path touches).
function makeReq() {
  return {
    method: "POST",
    url: "/api/ai",
    headers: { "content-length": "0", authorization: "Bearer test-bearer-token" },
    query: {},
    body: {
      task: "gst_assistant_stream",
      messages: [{ role: "user", content: "Reply with exactly: STREAM-OK" }],
      business: { name: "Smoke Test Co" },
      invoiceSummary: "No invoices loaded.",
      language: "en",
    },
  };
}

function makeRes() {
  const res = {
    statusCode: 0,
    body: "",
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(k, v) {
      this.headers[k] = v;
    },
    json(obj) {
      this.body = JSON.stringify(obj);
    },
    writeHead(code, headers) {
      this.statusCode = code;
      Object.assign(this.headers, headers || {});
    },
    flushHeaders() {},
    write(chunk) {
      this.body += chunk;
    },
    end() {},
  };
  return res;
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY missing — cannot run live streaming test");
  }

  const handler = require("../api/ai");
  const req = makeReq();
  const res = makeRes();

  await handler(req, res);

  console.log("tokenVerified:", tokenVerified);
  console.log("statusCode:", res.statusCode);
  console.log("stream body:", JSON.stringify(res.body.slice(0, 120)));
  console.log("cors header:", res.headers["Access-Control-Allow-Origin"]);

  // 1. Auth stub was consulted (proves we hit the real handler).
  assert.equal(tokenVerified, true, "verifyAuth was not reached");
  // 2. Streaming succeeded: 200 + a non-empty body and NO ReferenceError.
  assert.equal(res.statusCode, 200, `expected 200, got ${res.statusCode}`);
  assert.ok(res.body.length > 0, "stream produced no output");
  // 3. The previously-crashing line now resolves to the configured origin.
  assert.ok(
    /^https?:\/\//.test(res.headers["Access-Control-Allow-Origin"] || ""),
    "Access-Control-Allow-Origin header missing/invalid"
  );

  console.log("\n✅ STREAMING CHAT FIX VERIFIED END-TO-END (real Gemini, no Firebase writes)");
}

main().catch((err) => {
  console.error("❌ STREAM TEST FAILED:", err.message);
  process.exitCode = 1;
});
