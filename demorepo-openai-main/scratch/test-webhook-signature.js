/**
 * Smoke test: Cashfree webhook signature verification on the local server.
 *
 * Usage: node scratch/test-webhook-signature.js <secret>
 * The secret defaults to CASHFREE_WEBHOOK_SECRET (or CASHFREE_SECRET_KEY,
 * which Cashfree actually uses to sign webhooks).
 * Sends four webhook POSTs to http://localhost:5000/api/payment/webhook.
 * All are acknowledged with HTTP 200 (never processed without a verified
 * signature):
 *   1. valid signature (unknown order) → 200, ignored "unknown_order" (HMAC passed)
 *   2. missing signature → 200, processed:false, reason "missing_signature"
 *   3. tampered signature → 200, processed:false, reason "invalid_signature"
 *   4. no-dot signature (wrong algorithm) → 200, processed:false, reason "invalid_signature"
 */
const crypto = require("crypto");
const http = require("http");

const SECRET = process.argv[2] || "testsecret123";
const PORT = process.argv[3] || "5000";

const body = JSON.stringify({
  data: {
    order: {
      order_id: "GBTEST123",
      order_amount: 199,
      order_currency: "INR",
      customer_details: { customer_id: "uid_test" },
    },
    payment: {
      payment_id: "pay_1",
      payment_status: "SUCCESS",
      payment_amount: 199,
      payment_currency: "INR",
    },
  },
});
const ts = "1700000000";
// Official Cashfree algorithm: base64(hmac_sha256(timestamp + "." + body, secret))
const validSig = crypto
  .createHmac("sha256", SECRET)
  .update(ts + "." + body)
  .digest("base64");
// Wrong algorithm (missing dot separator) — must be rejected.
const noDotSig = crypto
  .createHmac("sha256", SECRET)
  .update(ts + body)
  .digest("base64");

function post(sig, label) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "localhost",
        port: PORT,
        path: "/api/payment/webhook",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sig ? { "x-webhook-signature": sig, "x-webhook-timestamp": ts } : {}),
        },
      },
      (res) => {
    let data = "";
    res.on("data", (c) => (data += c));
    res.on("end", () => {
      console.log(`[${label}] HTTP ${res.statusCode} → ${data}`);
      resolve({ status: res.statusCode, body: data });
    });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  const results = [];
  results.push(await post(validSig, "valid signature (dot format)"));
  results.push(await post("", "missing signature"));
  results.push(await post("tampered==", "tampered signature"));
  results.push(await post(noDotSig, "no-dot signature (wrong algorithm)"));

  const ok =
    results.every((r) => r.status === 200) &&
    /unknown_order/.test(results[0].body) &&
    /missing_signature/.test(results[1].body) &&
    /invalid_signature/.test(results[2].body) &&
    /invalid_signature/.test(results[3].body);
  console.log(ok ? "\n✅ ALL WEBHOOK SIGNATURE TESTS PASSED" : "\n❌ TEST FAILURES");
  process.exit(ok ? 0 : 1);
})();
