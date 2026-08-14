/**
 * Feature entitlement tests (Parts 13, 14, 31).
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { stubAdmin } = require("./helpers/stubAdmin");

async function seedUser(fake, uid, plan = "free") {
  await fake.collection("users").doc(uid).set({
    subscriptionPlan: plan,
    subscriptionStatus: "active",
    subscriptionExpiry: null,
  });
}

async function seedCount(fake, uid, metric, n) {
  const d = new Date();
  const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  await fake.collection("users").doc(uid).collection("usage").doc(period).set({ [metric]: n, period });
}

test("AI Accountant: blocked on free with requiredPlan pro, allowed on pro/business", async () => {
  const fake = stubAdmin();
  const { checkFeatureAccess } = require("../lib/entitlements");

  await seedUser(fake, "free-user");
  const free = await checkFeatureAccess("free-user", "ai_accountant");
  assert.equal(free.allowed, false);
  assert.equal(free.reason, "FEATURE_NOT_INCLUDED");
  assert.equal(free.currentPlan, "free");
  assert.equal(free.requiredPlan, "pro");

  await seedUser(fake, "pro-user", "pro");
  const pro = await checkFeatureAccess("pro-user", "ai_accountant");
  assert.equal(pro.allowed, true);

  await seedUser(fake, "biz-user", "business");
  const biz = await checkFeatureAccess("biz-user", "ai_accountant");
  assert.equal(biz.allowed, true);
});

test("unknown features fail closed", async () => {
  const fake = stubAdmin();
  const { checkFeatureAccess } = require("../lib/entitlements");
  await seedUser(fake, "u1", "business");
  const r = await checkFeatureAccess("u1", "not_a_real_feature");
  assert.equal(r.allowed, false);
});

test("invoice upload: allowed until the monthly limit is reached", async () => {
  const fake = stubAdmin();
  const { checkFeatureAccess } = require("../lib/entitlements");
  await seedUser(fake, "u1", "free");

  const ok = await checkFeatureAccess("u1", "invoice_upload");
  assert.equal(ok.allowed, true);

  await seedCount(fake, "u1", "invoiceUploads", 10);
  const blocked = await checkFeatureAccess("u1", "invoice_upload");
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, "PLAN_LIMIT_REACHED");
  assert.equal(blocked.used, 10);
  assert.equal(blocked.limit, 10);
  assert.equal(blocked.requiredPlan, null);
});

test("business fair-use: FAIR_USE_LIMIT_REACHED at the internal ceiling", async () => {
  process.env.BUSINESS_FAIR_USE_INVOICES = "3";
  const fake = stubAdmin();
  const { checkFeatureAccess } = require("../lib/entitlements");
  await seedUser(fake, "u1", "business");
  await seedCount(fake, "u1", "invoiceUploads", 3);
  const blocked = await checkFeatureAccess("u1", "invoice_upload");
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, "FAIR_USE_LIMIT_REACHED");
  assert.equal(blocked.fairUse, true);
  delete process.env.BUSINESS_FAIR_USE_INVOICES;
});

test("documents: free 5, pro 20, business fair-use via checkFeatureAccess", async () => {
  const fake = stubAdmin();
  const { checkFeatureAccess } = require("../lib/entitlements");
  await seedUser(fake, "free-user", "free");
  await seedCount(fake, "free-user", "documents", 5);
  const blocked = await checkFeatureAccess("free-user", "document_assistant");
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, "PLAN_LIMIT_REACHED");

  await seedUser(fake, "pro-user", "pro");
  await seedCount(fake, "pro-user", "documents", 5);
  const proOk = await checkFeatureAccess("pro-user", "document_assistant");
  assert.equal(proOk.allowed, true);
  assert.equal(proOk.limit, 20);

  await seedUser(fake, "biz-user", "business");
  const bizOk = await checkFeatureAccess("biz-user", "document_assistant");
  assert.equal(bizOk.allowed, true);
  assert.equal(bizOk.fairUse, true);
});

test("autonomous compliance is business-only", async () => {
  const fake = stubAdmin();
  const { checkFeatureAccess } = require("../lib/entitlements");
  await seedUser(fake, "free-user");
  assert.equal((await checkFeatureAccess("free-user", "automated_compliance")).allowed, false);
  await seedUser(fake, "pro-user", "pro");
  assert.equal((await checkFeatureAccess("pro-user", "automated_compliance")).allowed, false);
  await seedUser(fake, "biz-user", "business");
  assert.equal((await checkFeatureAccess("biz-user", "automated_compliance")).allowed, true);
});

test("entitlement snapshot exposes plan, usage, limits and per-feature status", async () => {
  const fake = stubAdmin();
  const { getEntitlementSnapshot } = require("../lib/entitlements");
  await seedUser(fake, "u1", "pro");
  await seedCount(fake, "u1", "invoiceUploads", 4);

  const snap = await getEntitlementSnapshot("u1");
  assert.equal(snap.plan, "pro");
  assert.equal(snap.price, 199);
  assert.equal(snap.usage.invoiceUploads, 4);
  assert.equal(snap.limits.invoiceUploads.limit, 50);
  assert.equal(snap.features.ai_accountant.status, "available");
  assert.equal(snap.features.ai_accountant.requiredPlan, "pro");
  assert.equal(snap.features.automated_compliance.status, "blocked");
  assert.equal(snap.features.invoice_upload.status, "available");

  // Free snapshot: ai_accountant blocked.
  await seedUser(fake, "u2");
  const freeSnap = await getEntitlementSnapshot("u2");
  assert.equal(freeSnap.price, 0);
  assert.equal(freeSnap.features.ai_accountant.status, "blocked");
});
