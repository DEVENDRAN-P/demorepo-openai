/**
 * Create the missing Firestore composite index on the `alerts` collection:
 *   read ASC, type ASC, createdAt ASC, __name__ ASC
 * This index is required by the agent `createAlert()` dedup query
 * (where type ==, createdAt >=, read ==) in api/agent.js.
 *
 * Uses the service-account credentials in .env to mint an OAuth token
 * (google-auth-library is already a transitive dep of firebase-admin)
 * and calls the Firestore Admin REST API. No firebase CLI required.
 */
const fs = require("fs");
const { JWT } = require("google-auth-library");

// ---- minimal .env parser (handles quoted values + \n escapes) ----
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
  // also pick up unquoted simple values
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
const projectId = env.FIREBASE_PROJECT_ID;
const clientEmail = env.FIREBASE_CLIENT_EMAIL;
const privateKey = env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing FIREBASE_* credentials in .env");
  process.exit(1);
}

const INDEX_NAME = "alerts";
const INDEX_BODY = {
  queryScope: "COLLECTION",
  fields: [
    { fieldPath: "read", order: "ASCENDING" },
    { fieldPath: "type", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "ASCENDING" },
    { fieldPath: "__name__", order: "ASCENDING" },
  ],
};

const BASE = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups/${INDEX_NAME}/indexes`;

async function main() {
  const client = new JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/datastore"],
  });
  const token = await client.getAccessToken();
  const headers = { Authorization: `Bearer ${token.token}`, "Content-Type": "application/json" };

  // 1. List existing indexes on this collection
  const listRes = await fetch(BASE, { headers });
  const listJson = await listRes.json().catch(() => ({}));
  if (!listRes.ok) {
    console.error("LIST failed:", listRes.status, JSON.stringify(listJson).slice(0, 300));
    process.exit(1);
  }
  const existing = (listJson.indexes || []).filter((i) => i.state === "READY" || i.state === "CREATING");
  console.log("existing indexes on 'alerts':", existing.length);
  for (const i of existing) {
    console.log("  -", i.name.split("/").pop(), i.state, JSON.stringify(i.fields?.map((f) => f.fieldPath)));
  }

  const need = INDEX_BODY.fields.map((f) => f.fieldPath).join(",");
  const alreadyThere = existing.some((i) =>
    i.fields && i.fields.map((f) => f.fieldPath).join(",") === need
  );
  if (alreadyThere) {
    console.log("✅ Index already exists (fields: " + need + ") — nothing to do");
    return;
  }

  // 2. Create it
  console.log("Creating index:", need);
  const createRes = await fetch(BASE, {
    method: "POST",
    headers,
    body: JSON.stringify(INDEX_BODY),
  });
  const createJson = await createRes.json().catch(() => ({}));
  if (!createRes.ok) {
    console.error("CREATE failed:", createRes.status, JSON.stringify(createJson).slice(0, 500));
    process.exit(1);
  }
  console.log("✅ Index creation accepted:");
  console.log("   name :", createJson.name);
  console.log("   state:", createJson.state);

  // 3. Poll until READY (indexes usually build in seconds)
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const pollRes = await fetch(BASE, { headers });
    const pollJson = await pollRes.json().catch(() => ({}));
    const target = (pollJson.indexes || []).find((idx) => idx.name === createJson.name);
    if (!target) { console.log("   poll: not found yet"); continue; }
    console.log("   poll:", target.state);
    if (target.state === "READY") { console.log("✅ Index READY"); return; }
    if (target.state === "ERROR") { console.error("Index failed:", JSON.stringify(target).slice(0, 400)); return; }
  }
  console.log("   (still building — will finish shortly)");
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
