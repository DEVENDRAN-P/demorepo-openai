/* Verifies ai.js task resolution: body.task wins, req.query.task is the
 * fallback (used by the /api/extract and /api/chat alias rewrites).
 * External services (admin auth, usage, handlers, logger) are stubbed via
 * require.cache so this test never touches real Firebase/Gemini. */
const path = require("path");

function stub(absPath, exports) {
  require.cache[absPath] = {
    id: absPath,
    filename: absPath,
    loaded: true,
    exports,
  };
}

const root = path.resolve(__dirname, "..");
class AiHttpError extends Error {
  constructor(status, code, safeMessage) {
    super(safeMessage);
    this.status = status;
    this.code = code;
    this.safeMessage = safeMessage;
  }
}
stub(path.join(root, "lib", "admin.js"), {
  verifyAuth: async () => ({ uid: "test-uid" }),
  AiHttpError,
  getDb: () => null,
});
stub(path.join(root, "lib", "usage.js"), {
  checkUsageLimit: async () => ({ allowed: true }),
  incrementUsage: async () => {},
});
stub(path.join(root, "lib", "aiTasks.js"), {
  invoice_extraction: async () => ({ extracted: true }),
});
stub(path.join(root, "lib", "logger.js"), { aiLog: () => {} });

const ai = require(path.join(root, "api", "ai.js"));

function mockRes() {
  const res = {
    statusCode: 0,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    writeHead() {},
    write() {},
    end() {},
    flushHeaders() {},
    status(c) { this.statusCode = c; return this; },
    json(payload) { console.log("  ->", this.statusCode, JSON.stringify(payload)); return this; },
  };
  return res;
}

(async () => {
  console.log("== test 1: no task in body, task via query (alias rewrite) ==");
  // Expected: 200 { success: true, task: "invoice_extraction", extracted: true }
  await ai(
    {
      method: "POST",
      url: "/api/ai?task=invoice_extraction",
      query: { task: "invoice_extraction" },
      headers: { authorization: "Bearer x" },
      body: {},
    },
    mockRes()
  );

  console.log("== test 2: no task anywhere ==");
  // Expected: 400 INVALID_TASK
  await ai(
    {
      method: "POST",
      url: "/api/ai",
      query: {},
      headers: { authorization: "Bearer x" },
      body: {},
    },
    mockRes()
  );

  console.log("== test 3: body.task wins over query ==");
  // Expected: 200 with task "invoice_extraction" (not overridden)
  await ai(
    {
      method: "POST",
      url: "/api/ai?task=gst_assistant",
      query: { task: "gst_assistant" },
      headers: { authorization: "Bearer x" },
      body: { task: "invoice_extraction" },
    },
    mockRes()
  );
})().catch((err) => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
