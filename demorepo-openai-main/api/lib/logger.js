/**
 * Structured logging helper for the GST Buddy AI Gateway.
 *
 * These logs will later feed the Agent Execution Log system, so they are
 * kept structured and consistent. NEVER log API keys, passwords, full
 * invoice documents, or sensitive personal information.
 */

function safeJson(fields) {
  try {
    return JSON.stringify(fields || {});
  } catch (e) {
    return "{serialization_error}";
  }
}

function aiLog(type, fields) {
  const ts = new Date().toISOString();
  const line = `[AI][${ts}] ${type} ${safeJson(fields)}`;
  if (type === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

module.exports = {
  aiLog,
};
