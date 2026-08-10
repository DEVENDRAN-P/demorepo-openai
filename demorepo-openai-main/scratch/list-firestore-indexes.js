/**
 * List existing Firestore composite indexes for key collections,
 * using the service-account credentials in .env (list permission works,
 * create does not for the firebase-adminsdk SA).
 */
const fs = require("fs");
const { JWT } = require("google-auth-library");

function parseDotenv(src) {
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
  for (const line of src.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const name = t.slice(0, eq).trim();
    if (out[name] !== undefined) continue;
    let val = t.slice(eq + 1).trim();
    if (val.startsWith('"') && val.endsWith('"') && val.length >= 2) val = val.slice(1, -1);
    out[name] = val;
  }
  return out;
}

const env = parseDotenv(fs.readFileSync(".env", "utf8"));
const pid = env.FIREBASE_PROJECT_ID;
const BASE = `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/collectionGroups`;

(async () => {
  const client = new JWT({
    email: env.FIREBASE_CLIENT_EMAIL,
    key: env.FIREBASE_PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/datastore"],
  });
  const token = await client.getAccessToken();
  for (const cg of ["alerts", "emailReminders", "agentRuns", "bills", "payments"]) {
    try {
      const res = await fetch(`${BASE}/${cg}/indexes`, {
        headers: { Authorization: `Bearer ${token.token}` },
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.log(`${cg}: LIST FAILED ${res.status} ${JSON.stringify(j).slice(0, 200)}`);
        continue;
      }
      const idx = (j.indexes || []).filter((i) => i.state === "READY" || i.state === "CREATING");
      console.log(`${cg}: ${idx.length} composite indexes`);
      for (const i of idx) {
        console.log(
          "   ",
          i.name.split("/").pop().slice(0, 24),
          i.state,
          JSON.stringify((i.fields || []).map((f) => f.fieldPath))
        );
      }
    } catch (e) {
      console.log(`${cg}: ERR ${e.message}`);
    }
  }
})().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
