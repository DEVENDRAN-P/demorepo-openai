/**
 * Verify against the LIVE Firestore project:
 *   1. The OLD composite queries FAIL with FAILED_PRECONDITION (missing index)
 *   2. The NEW single-field query shapes SUCCEED (automatic indexes)
 * Uses the .env service-account credentials via lib/admin.js.
 */
const { getDb } = require("../lib/admin");

async function main() {
  const db = getDb();
  const uid = "mu1kHFTU0CgTeNq3CmLrXYDGf543"; // a real user from the logs
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  console.log("=== OLD composite shapes (expect FAILED_PRECONDITION) ===");

  // alerts: type ==, createdAt >=, read ==  (the Agent Activity error)
  try {
    await db
      .collection("users").doc(uid).collection("alerts")
      .where("type", "==", "compliance_alert")
      .where("createdAt", ">=", since)
      .where("read", "==", false)
      .limit(10)
      .get();
    console.log("  alerts OLD: unexpectedly OK");
  } catch (e) {
    console.log("  alerts OLD: FAILS as expected ->", e.code || e.message);
  }

  // emailReminders: billId ==, type ==, sentDate >=
  try {
    await db
      .collection("users").doc(uid).collection("emailReminders")
      .where("billId", "==", "some-bill")
      .where("type", "==", "overdue")
      .where("sentDate", ">=", new Date())
      .limit(1)
      .get();
    console.log("  reminders OLD: unexpectedly OK");
  } catch (e) {
    console.log("  reminders OLD: FAILS as expected ->", e.code || e.message);
  }

  console.log("=== NEW single-field shapes (expect OK) ===");

  // alerts: orderBy createdAt desc, limit 50 (createAlert dedup)
  try {
    const snap = await db
      .collection("users").doc(uid).collection("alerts")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    console.log("  alerts NEW: OK, returned", snap.size, "docs");
  } catch (e) {
    console.log("  alerts NEW: FAILED ->", e.code || e.message);
    process.exitCode = 1;
  }

  // emailReminders: billId ==, limit 20 (hasReminderBeenSent / hasOverdueEmailBeenSent)
  try {
    const snap = await db
      .collection("users").doc(uid).collection("emailReminders")
      .where("billId", "==", "some-bill")
      .limit(20)
      .get();
    console.log("  reminders NEW: OK, returned", snap.size, "docs");
  } catch (e) {
    console.log("  reminders NEW: FAILED ->", e.code || e.message);
    process.exitCode = 1;
  }

  console.log(process.exitCode ? "=== RESULT: FAILURE ===" : "=== RESULT: ALL PASS ===");
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
