/**
 * Diagnostic: test the Cashfree credentials loaded from .env against the
 * sandbox Orders API exactly like the backend does. Prints the HTTP status
 * and Cashfree's response so we can see why order creation fails.
 *
 * Usage: node scratch/diagnose-cashfree.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const appId = process.env.CASHFREE_APP_ID;
const secret = process.env.CASHFREE_SECRET_KEY;
const env = String(process.env.CASHFREE_ENV || "sandbox").toLowerCase();
const base = env === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";

console.log("CASHFREE_APP_ID set:", !!appId, appId ? `(len ${appId.trim().length})` : "");
console.log("CASHFREE_SECRET_KEY set:", !!secret, secret ? `(len ${secret.trim().length}, trimmed? ${secret === secret.trim()})` : "");
console.log("CASHFREE_ENV:", env);
console.log("Webhook secret starts with URL?:", /^https?:/i.test(process.env.CASHFREE_WEBHOOK_SECRET || ""));
console.log("Calling:", `${base}/orders`);

const body = {
  order_id: `DIAG${Date.now()}`,
  order_amount: 199,
  order_currency: "INR",
  customer_details: {
    customer_id: "diag_user",
    customer_phone: "9999999999",
    customer_email: "diag@example.com",
  },
  order_meta: { return_url: "http://localhost:3000/payment-success?order_id=DIAGTEST" },
};

(async () => {
  try {
    const res = await fetch(`${base}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": appId,
        "x-client-secret": secret,
        "x-api-version": "2023-08-01",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    console.log("\nHTTP STATUS:", res.status);
    console.log("RESPONSE:", JSON.stringify(data, null, 2));

    if (res.ok && data.payment_session_id) {
      console.log("\n✅ Credentials are VALID — order created with payment_session_id.");
    } else {
      console.log("\n❌ Order creation FAILED — see message above.");
    }
  } catch (err) {
    console.log("\nNetwork error:", err.message);
  }
})();
