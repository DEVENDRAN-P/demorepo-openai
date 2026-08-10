/**
 * End-to-end AI extraction test.
 *
 * Verifies, in order:
 *   1. The Gemini API key in .env can reach Google (model list).
 *   2. A real generateContent call succeeds (catches 429 quota errors).
 *   3. The actual invoice_extraction handler parses a sample invoice via
 *      the configured model (config.model).
 *   4. The full HTTP path: mint a Firebase custom token → exchange it for an
 *      ID token → POST /api/ai with Authorization: Bearer.
 *
 * NOTE: step 4 auto-provisions a throwaway Firebase Auth user
 * ('e2e-perftest-user') in the project — delete it afterwards if you don't
 * want it. Steps 1–3 have no side effects.
 *
 * Run from the project root:
 *   node scripts/e2e-ai-test.js
 */
require("dotenv").config();

const { getApps, cert } = require("firebase-admin/app");
const admin = require("firebase-admin");
const { getAuth } = require("firebase-admin/auth");

const SAMPLE_INVOICE_TEXT = [
  "TAX INVOICE INV-2024-1187",
  "Supplier: TechNova Solutions Pvt Ltd",
  "GSTIN: 33AABCT1334L1Z5",
  "Invoice Date: 2024-11-24",
  "Items: Laptop Stand x2 @ 850, HDMI Cable x5 @ 320",
  "Taxable Value: 3300",
  "CGST 9%: 297  SGST 9%: 297",
  "Total: 3894",
].join("  ");

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const API_KEY = process.env.REACT_APP_FIREBASE_API_KEY;

function fail(step, err) {
  console.error(`❌ [${step}] FAILED:`, err.message || err);
  process.exitCode = 1;
}

async function step1_keyReachable() {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",
    { headers: { "x-goog-api-key": GEMINI_KEY } }
  );
  if (res.status !== 200) throw new Error(`API key rejected (HTTP ${res.status})`);
  console.log("✅ [1] Gemini key is valid");
}

async function step2_generateContent() {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Reply: OK" }] }] }),
    }
  );
  const j = await res.json();
  if (res.status !== 200) {
    throw new Error(
      `generateContent ${res.status} — ${j.error?.message || "no message"}. ` +
        (String(j.error?.message || "").includes("quota")
          ? "This key has no quota for the model. Fix the key/billing in AI Studio."
          : "")
    );
  }
  console.log("✅ [2] generateContent works:", JSON.stringify(j.candidates?.[0]?.content?.parts?.[0]?.text).slice(0, 60));
}

async function step3_handlerExtraction() {
  const handlers = require("../lib/aiTasks");
  const config = require("../lib/config");
  const result = await handlers.invoice_extraction(
    { ocrText: SAMPLE_INVOICE_TEXT },
    { uid: "e2e-test" }
  );
  console.log(`✅ [3] extraction handler (model=${config.model}) returned:`);
  console.log(JSON.stringify(result, null, 2).slice(0, 1600));
  return result;
}

async function step4_httpGateway() {
  if (!API_KEY) throw new Error("REACT_APP_FIREBASE_API_KEY missing from .env");
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
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const exch = await exchange.json();
  if (!exch.idToken) throw new Error(`Token exchange failed: ${exch.error?.message || "unknown"}`);

  const base = `http://localhost:${process.env.PORT || 5000}`;
  const res = await fetch(`${base}/api/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${exch.idToken}` },
    body: JSON.stringify({ task: "invoice_extraction", ocrText: SAMPLE_INVOICE_TEXT }),
  });
  const body = await res.json();
  if (!res.ok || body.success === false) {
    throw new Error(`HTTP ${res.status}: ${body.error || JSON.stringify(body).slice(0, 300)}`);
  }
  console.log(`✅ [4] full HTTP gateway (POST /api/ai) succeeded:`);
  console.log(JSON.stringify(body, null, 2).slice(0, 1400));
  console.log(
    "\nℹ️  Note: a throwaway Firebase Auth user 'e2e-perftest-user' was created by step 4. Delete it from Firebase Console → Authentication if not wanted."
  );
}

(async () => {
  console.log("🔑 GEMINI key:", GEMINI_KEY ? `present (${GEMINI_KEY.length} chars)` : "MISSING");
  if (!GEMINI_KEY) return fail("setup", new Error("GEMINI_API_KEY missing in .env"));

  try { await step1_keyReachable(); } catch (e) { return fail(1, e); }
  try { await step2_generateContent(); } catch (e) { return fail(2, e); }
  try { await step3_handlerExtraction(); } catch (e) { return fail(3, e); }
  try { await step4_httpGateway(); } catch (e) { return fail(4, e); }
  console.log("\n🎉 ALL CHECKS PASSED");
})();
