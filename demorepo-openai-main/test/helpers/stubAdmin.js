/**
 * Stubs lib/admin.js (getDb) with the in-memory FakeFirestore so
 * lib/usage.js / lib/entitlements.js / lib/database.js can be unit tested
 * without Firebase credentials or a network connection.
 */

const path = require("path");
const { FakeFirestore } = require("./fakeFirestore");

const ADMIN_MODULE = path.resolve(__dirname, "../../lib/admin.js");
const USAGE_MODULE = path.resolve(__dirname, "../../lib/usage.js");
const ENTITLEMENTS_MODULE = path.resolve(__dirname, "../../lib/entitlements.js");
const DATABASE_MODULE = path.resolve(__dirname, "../../lib/database.js");
const PLANS_MODULE = path.resolve(__dirname, "../../lib/plans.js");
const AGENT_MODULE = path.resolve(__dirname, "../../api/agent.js");
const AI_MODULE = path.resolve(__dirname, "../../api/ai.js");
const BILLING_MODULE = path.resolve(__dirname, "../../api/billing.js");

class AiHttpErrorStub extends Error {
  constructor(status, code, safeMessage) {
    super(safeMessage);
    this.status = status;
    this.code = code;
    this.safeMessage = safeMessage;
  }
}

/** Install the stub (fresh FakeFirestore per call) and return { fake, requireLib }. */
function stubAdmin() {
  const fake = new FakeFirestore();
  const fakeModule = {
    exports: {
      getDb: () => fake,
      initAdmin: () => {},
      getAuthService: () => ({ verifyIdToken: async () => ({ uid: "test-user" }) }),
      getBillsForUser: async () => [],
      verifyAuth: async (req) => ({ uid: (req.headers && req.headers["x-test-uid"]) || "test-user" }),
      verifyCronAuth: () => false,
      AiHttpError: AiHttpErrorStub,
    },
  };
  require.cache[ADMIN_MODULE] = fakeModule;
  // Force fresh copies of dependent modules so they bind to the stub.
  for (const m of [PLANS_MODULE, USAGE_MODULE, ENTITLEMENTS_MODULE, DATABASE_MODULE, AGENT_MODULE, AI_MODULE, BILLING_MODULE]) {
    delete require.cache[m];
  }
  return fake;
}

/** Clear any previous stub (restore real admin for non-test code). */
function unstubAdmin() {
  delete require.cache[ADMIN_MODULE];
}

module.exports = { stubAdmin, unstubAdmin, ADMIN_MODULE };
