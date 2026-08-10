/* Remove the corrupted Vercel env vars (they contain dotenv log output +
 * trailing newlines) and re-add clean values parsed directly from .env.
 * Uses spawnSync with shell:true (Windows .cmd) and exact bytes via stdin. */
const fs = require("fs");
const { spawnSync } = require("child_process");

function parseDotenv(src) {
  const out = {};
  const lines = src.split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const name = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (val.startsWith('"') && val.endsWith('"') && val.length >= 2) {
      val = val.slice(1, -1)
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    } else if (val.startsWith("'") && val.endsWith("'") && val.length >= 2) {
      val = val.slice(1, -1);
    }
    out[name] = val;
  }
  return out;
}

const local = parseDotenv(fs.readFileSync(".env", "utf8"));
const names = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "GEMINI_API_KEY",
  "CRON_SECRET",
  "GEMINI_MODEL",
];

function run(cmd) {
  const r = spawnSync(cmd, { shell: true, encoding: "utf8", timeout: 120000 });
  return { ok: r.status === 0, out: ((r.stdout || "") + (r.stderr || "")).trim().slice(-160) };
}

for (const n of names) {
  const val = local[n];
  if (val === undefined || val === "") {
    console.log(n + ": NOT in local .env -> skipping");
    continue;
  }
  const lead = (val.match(/^\s+/) || [""])[0].length;
  const trail = (val.match(/\s+$/) || [""])[0].length;
  if (lead > 0 || trail > 0) {
    console.log("WARN " + n + ": local value itself has lead=" + lead + " trail=" + trail);
  }
  const rm = run("npx -y vercel env rm " + n + " production --yes");
  console.log(n + " rm  -> " + (rm.ok ? "ok" : "FAIL: " + rm.out));
  // write the exact bytes (no trailing newline) to a temp file, then pipe it
  fs.writeFileSync("scratch/.env-" + n + ".tmp", val);
  const add = run("npx -y vercel env add " + n + " production < scratch/.env-" + n + ".tmp");
  fs.unlinkSync("scratch/.env-" + n + ".tmp");
  console.log(n + " add -> " + (add.ok ? "ok (len=" + val.length + ")" : "FAIL: " + add.out));
}
console.log("DONE");
