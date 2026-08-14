/**
 * Usage service tests (Parts 5, 6, 7, 9, 10, 25, 28, 29, 30).
 * Uses the in-memory FakeFirestore — no credentials required.
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Timestamp } = require("firebase-admin/firestore");
const { stubAdmin } = require("./helpers/stubAdmin");

async function seedUser(fake, uid, { plan = "free", expiry = null, status = "active" } = {}) {
  await fake
    .collection("users")
    .doc(uid)
    .set({
      subscriptionPlan: plan,
      subscriptionStatus: status,
      subscriptionExpiry: expiry,
    });
}

async function seedCount(fake, uid, metric, n) {
  const period = monthKeyNow();
  await fake.collection("users").doc(uid).collection("usage").doc(period).set({ [metric]: n, period });
}

function monthKeyNow() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

test("lazy month reset: no usage doc for the current period yields zeros", async () => {
  const fake = stubAdmin();
  const usage = require("../lib/usage");
  await seedUser(fake, "u1");
  const result = await usage.getUsageForUser("u1");
  assert.equal(result.period, monthKeyNow());
  assert.equal(result.plan, "free");
  assert.equal(result.counts.invoiceUploads, 0);
  assert.equal(result.counts.aiExtractions, 0);
  assert.equal(result.counts.documents, 0);
  assert.equal(result.counts.reports, 0);
  assert.equal(result.counts.aiInsights, 0);
  assert.equal(result.limits.invoiceUploads.limit, 10);
});

test("free user: 10 invoice uploads allowed, 11th blocked (never 11/10)", async () => {
  const fake = stubAdmin();
  const usage = require("../lib/usage");
  await seedUser(fake, "u1", { plan: "free" });

  for (let i = 1; i <= 10; i++) {
    const r = await usage.reserveUsage("u1", "invoiceUploads", `up-${i}`);
    assert.equal(r.allowed, true, `upload ${i} should be allowed`);
    assert.equal(r.used, i);
  }
  const blocked = await usage.reserveUsage("u1", "invoiceUploads", "up-11");
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, "PLAN_LIMIT_REACHED");
  assert.equal(blocked.used, 10);
  assert.equal(blocked.limit, 10);

  // Counter never exceeds 10 even after the rejection.
  const final = await usage.getUsageForUser("u1");
  assert.equal(final.counts.invoiceUploads, 10);
});

test("idempotency: same uploadId counted only once (retry / double-click / refresh)", async () => {
  const fake = stubAdmin();
  const usage = require("../lib/usage");
  await seedUser(fake, "u1", { plan: "free" });

  const first = await usage.reserveUsage("u1", "invoiceUploads", "same-upload");
  assert.equal(first.allowed, true);
  assert.equal(first.alreadyProcessed, false);

  const replay = await usage.reserveUsage("u1", "invoiceUploads", "same-upload");
  assert.equal(replay.allowed, true);
  assert.equal(replay.alreadyProcessed, true);
  assert.equal(replay.used, 1);

  const after = await usage.getUsageForUser("u1");
  assert.equal(after.counts.invoiceUploads, 1, "replay must not double-count");
});

test("release refunds a slot when the save failed; re-reserving then counts again", async () => {
  const fake = stubAdmin();
  const usage = require("../lib/usage");
  await seedUser(fake, "u1", { plan: "free" });

  const r1 = await usage.reserveUsage("u1", "invoiceUploads", "up-a");
  assert.equal(r1.used, 1);
  const released = await usage.releaseUsage("u1", "invoiceUploads", "up-a");
  assert.equal(released.released, true);

  const afterRelease = await usage.getUsageForUser("u1");
  assert.equal(afterRelease.counts.invoiceUploads, 0, "failed upload must not consume quota");

  // The same key can be used again after a release (fresh reservation).
  const r2 = await usage.reserveUsage("u1", "invoiceUploads", "up-a");
  assert.equal(r2.allowed, true);
  assert.equal(r2.alreadyProcessed, false);
  assert.equal(r2.used, 1);
});

test("release is idempotent and a double release cannot drive the counter negative", async () => {
  const fake = stubAdmin();
  const usage = require("../lib/usage");
  await seedUser(fake, "u1", { plan: "free" });

  await usage.reserveUsage("u1", "documents", "doc-1");
  await usage.releaseUsage("u1", "documents", "doc-1");
  const again = await usage.releaseUsage("u1", "documents", "doc-1");
  assert.equal(again.released, false);

  const after = await usage.getUsageForUser("u1");
  assert.equal(after.counts.documents, 0);
});

test("pro plan: 50 invoice uploads allowed, 51st blocked", async () => {
  const fake = stubAdmin();
  const usage = require("../lib/usage");
  await seedUser(fake, "u1", { plan: "pro" });

  for (let i = 1; i <= 50; i++) {
    const r = await usage.reserveUsage("u1", "invoiceUploads", `p-${i}`);
    assert.equal(r.allowed, true, `upload ${i} should be allowed`);
  }
  const blocked = await usage.reserveUsage("u1", "invoiceUploads", "p-51");
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, "PLAN_LIMIT_REACHED");
  assert.equal(blocked.used, 50);
  assert.equal(blocked.limit, 50);
});

test("document assistant: free 5/month, pro 20/month (parts 28)", async () => {
  const fake = stubAdmin();
  const usage = require("../lib/usage");
  await seedUser(fake, "u1", { plan: "free" });

  for (let i = 1; i <= 5; i++) {
    const r = await usage.reserveUsage("u1", "documents", `d-${i}`);
    assert.equal(r.allowed, true);
  }
  const sixth = await usage.reserveUsage("u1", "documents", "d-6");
  assert.equal(sixth.allowed, false, "free document #6 must be blocked");

  // Upgrade to pro: usage preserved, limit expands to 20/month.
  await seedUser(fake, "u1", { plan: "pro" });
  const pro = await usage.getUsageForUser("u1");
  assert.equal(pro.counts.documents, 5);
  assert.equal(pro.limits.documents.limit, 20);
  // 15 more allowed (keys 6..20 → used 20), then the 21st block.
  for (let i = 6; i <= 20; i++) {
    const r = await usage.reserveUsage("u1", "documents", `d-${i}`);
    assert.equal(r.allowed, true, `pro document #${i} should be allowed`);
  }
  const d21 = await usage.reserveUsage("u1", "documents", "d-21");
  assert.equal(d21.allowed, false, "pro document #21 must be blocked");
});

test("ai insights: free 3/month, pro 20/month, business unlimited", async () => {
  const fake = stubAdmin();
  const usage = require("../lib/usage");
  await seedUser(fake, "u1", { plan: "free" });
  for (let i = 1; i <= 3; i++) {
    const r = await usage.reserveUsage("u1", "aiInsights", `i-${i}`);
    assert.equal(r.allowed, true);
  }
  const fourth = await usage.reserveUsage("u1", "aiInsights", "i-4");
  assert.equal(fourth.allowed, false, "free insight #4 must be blocked");

  // Pro: 20/month — the 21st must be blocked.
  await seedUser(fake, "u1", { plan: "pro" });
  for (let i = 4; i <= 20; i++) {
    const r = await usage.reserveUsage("u1", "aiInsights", `i-${i}`);
    assert.equal(r.allowed, true, `pro insight #${i} should be allowed`);
  }
  const pro21 = await usage.reserveUsage("u1", "aiInsights", "i-21");
  assert.equal(pro21.allowed, false, "pro insight #21 must be blocked");

  // Business: unlimited.
  await seedUser(fake, "u1", { plan: "business" });
  const unlimited = await usage.reserveUsage("u1", "aiInsights", "i-100");
  assert.equal(unlimited.allowed, true, "business insights are unlimited");
});

test("reports: free 2/month, pro 10/month, business unlimited", async () => {
  const fake = stubAdmin();
  const usage = require("../lib/usage");
  await seedUser(fake, "u1", { plan: "free" });
  await usage.reserveUsage("u1", "reports", "r-1");
  await usage.reserveUsage("u1", "reports", "r-2");
  const third = await usage.reserveUsage("u1", "reports", "r-3");
  assert.equal(third.allowed, false, "free report #3 must be blocked");

  // Pro: 10/month — report #3 allowed, #11 blocked.
  await seedUser(fake, "u1", { plan: "pro" });
  for (let i = 3; i <= 10; i++) {
    const r = await usage.reserveUsage("u1", "reports", `r-${i}`);
    assert.equal(r.allowed, true, `pro report #${i} should be allowed`);
  }
  const pro11 = await usage.reserveUsage("u1", "reports", "r-11");
  assert.equal(pro11.allowed, false, "pro report #11 must be blocked");

  // Business: unlimited.
  await seedUser(fake, "u1", { plan: "business" });
  const allowed = await usage.reserveUsage("u1", "reports", "r-50");
  assert.equal(allowed.allowed, true, "business reports are unlimited");
});

test("business fair-use: internal safety ceiling blocks, never an advertised hard limit", async () => {
  process.env.BUSINESS_FAIR_USE_INVOICES = "4";
  const fake = stubAdmin();
  const usage = require("../lib/usage");
  await seedUser(fake, "u1", { plan: "business" });

  for (let i = 1; i <= 4; i++) {
    const r = await usage.reserveUsage("u1", "invoiceUploads", `b-${i}`);
    assert.equal(r.allowed, true);
  }
  const blocked = await usage.reserveUsage("u1", "invoiceUploads", "b-5");
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, "FAIR_USE_LIMIT_REACHED", "fair-use ceiling reports a controlled reason");
  assert.equal(blocked.used, 4);
  delete process.env.BUSINESS_FAIR_USE_INVOICES;
});

test("expired/cancelled paid subscriptions fall back to free entitlements", async () => {
  const fake = stubAdmin();
  const usage = require("../lib/usage");
  const expired = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
  await seedUser(fake, "u1", { plan: "pro", expiry: expired });
  assert.equal(await usage.getPlanForUser("u1"), "free");
  const r = await usage.reserveUsage("u1", "invoiceUploads", "x-1");
  assert.equal(r.limit, 10, "expired pro falls back to the free limit");

  await seedUser(fake, "u2", { plan: "business", status: "cancelled" });
  assert.equal(await usage.getPlanForUser("u2"), "free");

  // Active pro with a future expiry stays pro.
  const future = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  await seedUser(fake, "u3", { plan: "pro", expiry: future });
  assert.equal(await usage.getPlanForUser("u3"), "pro");
});

test("usage is preserved across an upgrade — never reset on plan change", async () => {
  const fake = stubAdmin();
  const usage = require("../lib/usage");
  await seedUser(fake, "u1", { plan: "free" });

  for (let i = 1; i <= 4; i++) {
    await usage.reserveUsage("u1", "invoiceUploads", `free-${i}`);
  }
  const before = await usage.getUsageForUser("u1");
  assert.equal(before.counts.invoiceUploads, 4);

  // User purchases Pro.
  await seedUser(fake, "u1", { plan: "pro" });
  const after = await usage.getUsageForUser("u1");
  assert.equal(after.counts.invoiceUploads, 4, "upgrade must NOT reset usage");
  assert.equal(after.limits.invoiceUploads.limit, 50);
  const next = await usage.reserveUsage("u1", "invoiceUploads", "pro-5");
  assert.equal(next.allowed, true, "pro user with 4 used can upload 46 more");
  assert.equal(next.used, 5);
});

test("concurrent reservations with different keys never lose an update", async () => {
  const fake = stubAdmin();
  const usage = require("../lib/usage");
  await seedUser(fake, "u1", { plan: "free" });

  const [a, b] = await Promise.all([
    usage.reserveUsage("u1", "invoiceUploads", "c-1"),
    usage.reserveUsage("u1", "invoiceUploads", "c-2"),
  ]);
  assert.equal(a.allowed, true);
  assert.equal(b.allowed, true);
  const after = await usage.getUsageForUser("u1");
  assert.equal(after.counts.invoiceUploads, 2, "two simultaneous uploads must count exactly 2");
});

test("checkLimit is non-mutating", async () => {
  const fake = stubAdmin();
  const usage = require("../lib/usage");
  await seedUser(fake, "u1", { plan: "free" });
  const before = await usage.getUsageForUser("u1");
  const check = await usage.checkLimit("u1", "invoiceUploads");
  assert.equal(check.allowed, true);
  const after = await usage.getUsageForUser("u1");
  assert.equal(after.counts.invoiceUploads, before.counts.invoiceUploads);
});

test("getPlanForUser ignores a plan value of 'free' even if status is active", async () => {
  const fake = stubAdmin();
  const usage = require("../lib/usage");
  await seedUser(fake, "u1", { plan: "free" });
  assert.equal(await usage.getPlanForUser("u1"), "free");
});
