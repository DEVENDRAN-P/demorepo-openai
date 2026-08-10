/**
 * Agent Run Logger — persists every agent execution to Firestore.
 *
 * Document path:
 *   users/{uid}/agentRuns/{runId}
 *
 * Fields stored:
 *   agent, trigger, status, startedAt, completedAt,
 *   input, decisions, actions, result, error
 */

const { getDb } = require("./admin");

/**
 * Create a new agent run document and return its ID.
 */
async function createRun(uid, { agent, trigger, input = {} }) {
  const db = getDb();
  const ref = await db
    .collection("users")
    .doc(uid)
    .collection("agentRuns")
    .add({
      agent,
      trigger,
      status: "running",
      startedAt: new Date().toISOString(),
      completedAt: null,
      input: sanitizeInput(input),
      decisions: [],
      actions: [],
      result: null,
      error: null,
    });
  return ref.id;
}

/**
 * Update an existing run with decisions, actions, result, or error.
 */
async function completeRun(uid, runId, { status, decisions, actions, result, error }) {
  const db = getDb();
  const update = {
    completedAt: new Date().toISOString(),
    status, // "completed" | "error" | "requires_approval"
  };
  if (Array.isArray(decisions)) update.decisions = decisions;
  if (Array.isArray(actions)) update.actions = actions;
  if (result !== undefined) update.result = result;
  if (error !== undefined) update.error = error;
  await db
    .collection("users")
    .doc(uid)
    .collection("agentRuns")
    .doc(runId)
    .update(update);
}

/**
 * Append a single decision to an in-progress run.
 */
async function addDecision(uid, runId, decision) {
  const db = getDb();
  await db
    .collection("users")
    .doc(uid)
    .collection("agentRuns")
    .doc(runId)
    .update({
      decisions: require("firebase-admin/firestore").FieldValue.arrayUnion(decision),
    });
}

/**
 * Append a single action to an in-progress run.
 */
async function addAction(uid, runId, action) {
  const db = getDb();
  await db
    .collection("users")
    .doc(uid)
    .collection("agentRuns")
    .doc(runId)
    .update({
      actions: require("firebase-admin/firestore").FieldValue.arrayUnion(action),
    });
}

/**
 * Fetch recent agent runs for a user (newest first).
 */
async function getRecentRuns(uid, limit = 50) {
  const db = getDb();
  const snapshot = await db
    .collection("users")
    .doc(uid)
    .collection("agentRuns")
    .orderBy("startedAt", "desc")
    .limit(limit)
    .get();
  const runs = [];
  snapshot.forEach((doc) => {
    runs.push({ id: doc.id, ...doc.data() });
  });
  return runs;
}

/**
 * Strip large payloads before storing (e.g. full invoice images).
 */
function sanitizeInput(input) {
  if (!input || typeof input !== "object") return {};
  const safe = { ...input };
  if (safe.image && typeof safe.image === "object") {
    safe.image = { mimeType: safe.image.mimeType, present: true };
  }
  if (typeof safe.ocrText === "string" && safe.ocrText.length > 2000) {
    safe.ocrText = safe.ocrText.slice(0, 2000) + "...(truncated)";
  }
  return safe;
}

module.exports = { createRun, completeRun, addDecision, addAction, getRecentRuns };
