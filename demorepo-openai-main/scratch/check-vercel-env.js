/* Compare local .env values vs Vercel production env (pulled to .env.check).
 * Reports leading/trailing whitespace and mismatches for the server-side vars. */
const fs = require("fs");

function parseEnv(src) {
  const out = {};
  const re = /^([A-Z0-9_]+)="((?:[^"\\]|\\.)*)"$/gm;
  let m;
  while ((m = re.exec(src))) {
    out[m[1]] = m[2]
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
  return out;
}

let local = {};
try {
  const dotenv = require("dotenv");
  dotenv.config({ path: ".env" });
  local = process.env;
} catch (e) {
  // fallback: parse .env manually
  try {
    local = parseEnv(fs.readFileSync(".env", "utf8"));
  } catch (e2) {
    console.log("WARN: cannot read local .env:", e2.message);
  }
}

const vercel = parseEnv(fs.readFileSync(".env.check", "utf8"));

const names = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "GEMINI_API_KEY",
  "CRON_SECRET",
  "GEMINI_MODEL",
];

for (const n of names) {
  const vv = vercel[n];
  const lv = local[n] || "";
  const lead = (s) => (s.match(/^\s+/) || [""])[0].length;
  const trail = (s) => (s.match(/\s+$/) || [""])[0].length;
  const v = vv || "";
  console.log("--- " + n + " ---");
  console.log("  local   len=" + lv.length + " lead=" + lead(lv) + " trail=" + trail(lv) + "  head=" + JSON.stringify(lv.slice(0, 28)));
  console.log("  vercel  len=" + v.length + " lead=" + lead(v) + " trail=" + trail(v) + "  head=" + JSON.stringify(v.slice(0, 28)));
  console.log("  exact match: " + (v === lv));
}
