/**
 * Inspect real Firestore data for a user (Recent Workspace audit).
 * Uses the admin SDK with .env credentials — read-only.
 */
const { getDb } = require("../lib/admin");

const UID = process.argv[2] || "mu1kHFTU0CgTeNq3CmLrXYDGf543";

async function main() {
  const db = getDb();
  for (const sub of ["activityLogs", "bills", "agentRuns", "documents", "reminders", "payments", "alerts"]) {
    try {
      const snap = await db.collection("users").doc(UID).collection(sub).get();
      console.log(`\n=== users/{uid}/${sub}: ${snap.size} docs ===`);
      let i = 0;
      snap.forEach((doc) => {
        if (i >= 3) return;
        const d = doc.data();
        const pick = {};
        for (const k of Object.keys(d).slice(0, 10)) {
          let v = d[k];
          if (v && typeof v.toDate === "function") v = v.toDate().toISOString();
          if (typeof v === "string" && v.length > 60) v = v.slice(0, 60) + "...";
          pick[k] = v;
        }
        console.log("  ", JSON.stringify(pick));
        i++;
      });
    } catch (e) {
      console.log(`\n=== users/{uid}/${sub}: ERROR ${e.message} ===`);
    }
  }
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
