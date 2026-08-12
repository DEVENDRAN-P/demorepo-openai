/**
 * set-cashfree-keys.js
 *
 * Writes the Cashfree Payment Gateway credentials into BOTH env files the
 * backend reads (.env and api/.env) while preserving every other line.
 *
 * Usage:
 *   node scratch/set-cashfree-keys.js <CLIENT_ID> <CLIENT_SECRET> [sandbox|production]
 *
 * Example:
 *   node scratch/set-cashfree-keys.js 1AaBbCcDdEeFf 2XyZ9qWeRtY0U iOpLkMnBvCx1 sandbox
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const FILES = [path.join(ROOT, ".env"), path.join(ROOT, "api", ".env")];

function fail(msg) {
  console.error("✗ " + msg);
  process.exit(1);
}

const [, , appId, secret, envRaw] = process.argv;
const env = (envRaw || "sandbox").toLowerCase();

if (!appId || !secret) {
  fail('Usage: node scratch/set-cashfree-keys.js <CLIENT_ID> <CLIENT_SECRET> [sandbox|production]');
}
if (!/^[A-Za-z0-9_-]{8,}$/.test(appId)) {
  fail("Client ID looks invalid — expected alphanumeric (min 8 chars, no spaces).");
}
if (!/^[A-Za-z0-9_=+-]{8,}$/.test(secret)) {
  fail("Client Secret looks invalid — expected alphanumeric (min 8 chars, no spaces).");
}
if (secret.startsWith("cfsk_")) {
  fail("This secret has the 'cfsk_' prefix — that is NOT a Cashfree Payment Gateway client secret. Get the Client Secret from Payment Gateway → Developers → API Keys (Test mode).");
}
if (env !== "sandbox" && env !== "production") {
  fail("Environment must be 'sandbox' or 'production'.");
}

function upsert(lines, key, value) {
  const prefix = key + "=";
  const idx = lines.findIndex((l) => l.startsWith(prefix));
  if (idx >= 0) lines[idx] = prefix + value;
  else lines.push(prefix + value);
  return lines;
}

for (const file of FILES) {
  let lines = [];
  if (fs.existsSync(file)) {
    lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  }
  lines = upsert(lines, "CASHFREE_APP_ID", appId);
  lines = upsert(lines, "CASHFREE_SECRET_KEY", secret);
  lines = upsert(lines, "CASHFREE_ENV", env);
  fs.writeFileSync(file, lines.join("\n") + "\n", "utf8");
  console.log("✓ wrote CASHFREE_APP_ID / CASHFREE_SECRET_KEY / CASHFREE_ENV to " + path.relative(ROOT, file));
}

const mask = (s) => s.slice(0, 6) + "****";
console.log("\nInstalled: APP_ID=" + mask(appId) + " (" + appId.length + " chars), SECRET=" + mask(secret) + " (" + secret.length + " chars), ENV=" + env);
console.log("Restart the backend:  kill node server.js, then  node server.js");
