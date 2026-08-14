/**
 * Central plan configuration tests (Part 1, 2, 3, 14).
 * Pure logic — no Firebase required.
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const plans = require("../lib/plans");

test("prices are exactly ₹0 / ₹199 / ₹499", () => {
  assert.equal(plans.PLAN_PRICES.free, 0);
  assert.equal(plans.PLAN_PRICES.pro, 199);
  assert.equal(plans.PLAN_PRICES.business, 499);
  // No ₹299 / ₹999 anywhere in the pricing configuration.
  assert.ok(!Object.values(plans.PLAN_PRICES).includes(299));
  assert.ok(!Object.values(plans.PLAN_PRICES).includes(999));
});

test("no hardcoded 299/999 prices in server code", () => {
  const files = [
    "../lib/plans.js",
    "../api/billing.js",
    "../lib/usage.js",
    "../lib/entitlements.js",
  ].map((f) => path.resolve(__dirname, f));
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    assert.ok(!/\b299\b/.test(content), `${path.basename(file)} must not reference 299`);
    assert.ok(!/\b999\b/.test(content), `${path.basename(file)} must not reference 999`);
  }
});

test("monthly limits match the entitlement spec", () => {
  const L = plans.PLAN_LIMITS;
  // Invoice uploads: 10 / 50 / fair-use
  assert.equal(L.invoiceUploads.free, 10);
  assert.equal(L.invoiceUploads.pro, 50);
  assert.equal(L.invoiceUploads.business, "fair_use");
  // AI extraction: 10 / 50 / fair-use
  assert.equal(L.aiExtractions.free, 10);
  assert.equal(L.aiExtractions.pro, 50);
  assert.equal(L.aiExtractions.business, "fair_use");
  // Documents: 5 / 20 / fair-use
  assert.equal(L.documents.free, 5);
  assert.equal(L.documents.pro, 20);
  assert.equal(L.documents.business, "fair_use");
  // Reports: 2 / 10 / unlimited
  assert.equal(L.reports.free, 2);
  assert.equal(L.reports.pro, 10);
  assert.equal(L.reports.business, "unlimited");
  // AI Insights: 3 / 20 / unlimited
  assert.equal(L.aiInsights.free, 3);
  assert.equal(L.aiInsights.pro, 20);
  assert.equal(L.aiInsights.business, "unlimited");
});

test("resolveLimit handles numbers, unlimited and fair_use safety ceilings", () => {
  assert.equal(plans.resolveLimit("free", "invoiceUploads"), 10);
  assert.equal(plans.resolveLimit("pro", "invoiceUploads"), 50);
  // unlimited → MAX_SAFE_INTEGER (never blocks)
  assert.equal(plans.resolveLimit("business", "reports"), Number.MAX_SAFE_INTEGER);
  // fair_use → configured ceiling (defaults)
  assert.equal(plans.resolveLimit("business", "invoiceUploads"), plans.FAIR_USE_CEILINGS.invoiceUploads);
  assert.ok(plans.isFairUse("business", "invoiceUploads"));
  assert.ok(!plans.isFairUse("pro", "invoiceUploads"));
  // unknown metric → effectively unlimited
  assert.equal(plans.resolveLimit("free", "nonsense"), Number.MAX_SAFE_INTEGER);
});

test("displayLimit is honest (Unlimited/Fair-use never advertised as hard numbers)", () => {
  assert.equal(plans.displayLimit("business", "reports"), "Unlimited");
  assert.equal(plans.displayLimit("business", "documents"), "Fair-use");
  assert.equal(plans.displayLimit("free", "invoiceUploads"), "10");
  assert.equal(plans.displayLimit("pro", "invoiceUploads"), "50");
});

test("multi-business limits: Free 1, Pro 2, Business 5", () => {
  assert.equal(plans.MULTI_BUSINESS_LIMITS.free, 1);
  assert.equal(plans.MULTI_BUSINESS_LIMITS.pro, 2);
  assert.equal(plans.MULTI_BUSINESS_LIMITS.business, 5);
});

test("feature matrix: AI Accountant blocked on free, available on pro, advanced on business", () => {
  assert.equal(plans.featureLevel("ai_accountant", "free"), "blocked");
  assert.equal(plans.featureLevel("ai_accountant", "pro"), "available");
  assert.equal(plans.featureLevel("ai_accountant", "business"), "advanced");
  assert.equal(plans.requiredPlanFor("ai_accountant"), "pro");
  assert.ok(!plans.featureAllowed("ai_accountant", "free"));
  assert.ok(plans.featureAllowed("ai_accountant", "pro"));
});

test("feature matrix: key gates from the spec", () => {
  // Advanced reconciliation: free blocked, pro basic, business available
  assert.equal(plans.featureLevel("advanced_reconciliation", "free"), "blocked");
  assert.equal(plans.featureLevel("advanced_reconciliation", "pro"), "basic");
  assert.equal(plans.featureLevel("advanced_reconciliation", "business"), "available");
  // Automated compliance workflows: business only
  assert.equal(plans.featureLevel("automated_compliance", "free"), "blocked");
  assert.equal(plans.featureLevel("automated_compliance", "pro"), "blocked");
  assert.equal(plans.featureLevel("automated_compliance", "business"), "available");
  assert.equal(plans.requiredPlanFor("automated_compliance"), "business");
  // Team members: business only
  assert.equal(plans.featureLevel("team_members", "pro"), "blocked");
  assert.equal(plans.featureLevel("team_members", "business"), "available");
  // Email reminders: pro+
  assert.equal(plans.featureLevel("email_reminders", "free"), "blocked");
  assert.equal(plans.featureLevel("email_reminders", "pro"), "available");
  // Basic compliance / GSTR preview / penalty estimator: all plans
  assert.equal(plans.featureLevel("basic_compliance", "free"), "available");
  assert.equal(plans.featureLevel("gstr_preview", "free"), "available");
  assert.equal(plans.featureLevel("penalty_estimator", "free"), "available");
});

test("frontend mirror (src/config/plans.js) is in sync with lib/plans.js", () => {
  const src = fs.readFileSync(path.resolve(__dirname, "../src/config/plans.js"), "utf8");
  const code = src
    .replace(/^import .*$/gm, "")
    .replace(/export const /g, "const ")
    .replace(/export default .*/g, "");
  const sandbox = { process: { env: {} }, Number, String, Object, Array, Infinity, Math };
  // Top-level consts don't attach to the sandbox global, so evaluate the file
  // and return the constants via a trailing expression.
  const dumped = vm.runInNewContext(
    code + "\n;JSON.stringify({ PLAN_PRICES, PLAN_LIMITS, MULTI_BUSINESS_LIMITS, FEATURES })",
    sandbox
  );
  const parsed = JSON.parse(dumped);

  assert.deepEqual(parsed.PLAN_PRICES, plans.PLAN_PRICES, "PLAN_PRICES out of sync");
  assert.deepEqual(parsed.PLAN_LIMITS, plans.PLAN_LIMITS, "PLAN_LIMITS out of sync");
  assert.deepEqual(parsed.MULTI_BUSINESS_LIMITS, plans.MULTI_BUSINESS_LIMITS, "MULTI_BUSINESS_LIMITS out of sync");

  // Feature matrix must match field-for-field (label/description may differ
  // only in wording, but levels + required + metric must be identical).
  for (const key of Object.keys(plans.FEATURES)) {
    assert.ok(parsed.FEATURES[key], `feature ${key} missing from frontend mirror`);
    assert.deepEqual(
      parsed.FEATURES[key].plans,
      plans.FEATURES[key].plans,
      `feature ${key}: plans levels out of sync`
    );
    assert.equal(
      parsed.FEATURES[key].required,
      plans.FEATURES[key].required,
      `feature ${key}: required out of sync`
    );
    assert.equal(
      parsed.FEATURES[key].metric,
      plans.FEATURES[key].metric,
      `feature ${key}: metric out of sync`
    );
  }
  // And no extras in the mirror that the backend doesn't know about.
  for (const key of Object.keys(parsed.FEATURES)) {
    assert.ok(plans.FEATURES[key], `feature ${key} exists only in the frontend mirror`);
  }
});

test("feature matrix has no duplicate feature keys and every plan is defined", () => {
  for (const [key, def] of Object.entries(plans.FEATURES)) {
    assert.ok(def.label, `${key} needs a label`);
    for (const p of ["free", "pro", "business"]) {
      assert.ok(
        ["available", "basic", "advanced", "blocked"].includes(def.plans[p]),
        `${key} has invalid level for ${p}: ${def.plans[p]}`
      );
    }
    if (def.metric) {
      assert.ok(plans.PLAN_LIMITS[def.metric], `${key} references unknown metric ${def.metric}`);
    }
  }
});
