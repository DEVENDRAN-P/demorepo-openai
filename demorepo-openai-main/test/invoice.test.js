/**
 * Invoice upload endpoint tests (Parts 6, 7, 8, 9).
 * Exercises the real api/agent.js /api/invoices branch against the
 * FakeFirestore with a stubbed verifyAuth — no credentials required.
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { stubAdmin } = require("./helpers/stubAdmin");

function makeReq(body) {
  return {
    method: "POST",
    url: "/api/invoices",
    headers: { authorization: "Bearer t", "x-test-uid": "u1" },
    body,
  };
}

function makeRes() {
  const res = {
    statusCode: 200,
    payload: null,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(p) {
      this.payload = p;
      return this;
    },
    setHeader() {
      return this;
    },
    end() {
      return this;
    },
  };
  return res;
}

async function seedFreeUser(fake) {
  await fake
    .collection("users")
    .doc("u1")
    .set({ subscriptionPlan: "free", subscriptionStatus: "active", subscriptionExpiry: null });
}

test("free user: 10 uploads accepted, 11th rejected with 403 (never 11/10)", async () => {
  const fake = stubAdmin();
  const handler = require("../api/agent");
  await seedFreeUser(fake);

  for (let i = 1; i <= 10; i++) {
    const res = makeRes();
    await handler(
      makeReq({ uploadId: `up-${i}`, businessId: "b1", invoice: { supplierName: "S", invoiceNumber: `INV-${i}` } }),
      res
    );
    assert.equal(res.statusCode, 200, `upload ${i} should be accepted`);
    assert.ok(res.payload.billId, "accepted upload returns a billId");
    assert.equal(res.payload.success, true);
  }

  const res11 = makeRes();
  await handler(makeReq({ uploadId: "up-11", invoice: { supplierName: "S", invoiceNumber: "INV-11" } }), res11);
  assert.equal(res11.statusCode, 403);
  assert.equal(res11.payload.code, "PLAN_LIMIT_REACHED");
  assert.equal(res11.payload.usage.used, 10);
  assert.equal(res11.payload.usage.limit, 10);
  assert.equal(res11.payload.requiredPlan, "pro");

  const bills = await fake.collection("users").doc("u1").collection("bills").get();
  assert.equal(bills.size, 10, "no bill should exist for the rejected upload");
});

test("replay of the same uploadId returns the SAME bill (no duplicate, no double count)", async () => {
  const fake = stubAdmin();
  const handler = require("../api/agent");
  await seedFreeUser(fake);

  const res1 = makeRes();
  await handler(makeReq({ uploadId: "same", invoice: { supplierName: "S", invoiceNumber: "INV-1" } }), res1);
  const billId = res1.payload.billId;

  // Network retry / double-click / refresh — same uploadId.
  const res2 = makeRes();
  await handler(makeReq({ uploadId: "same", invoice: { supplierName: "S", invoiceNumber: "INV-1" } }), res2);
  assert.equal(res2.statusCode, 200);
  assert.equal(res2.payload.billId, billId, "replay must return the original billId");
  assert.equal(res2.payload.alreadyProcessed, true);

  const bills = await fake.collection("users").doc("u1").collection("bills").get();
  assert.equal(bills.size, 1, "replay must not create a duplicate bill");

  const usage = await fake.collection("users").doc("u1").collection("usage").get();
  usage.forEach((d) => {
    assert.equal(d.data().invoiceUploads, 1, "replay must not double-count usage");
  });
});

test("missing uploadId → 400 MISSING_UPLOAD_ID (nothing counted)", async () => {
  const fake = stubAdmin();
  const handler = require("../api/agent");
  await seedFreeUser(fake);

  const res = makeRes();
  await handler(makeReq({ invoice: { supplierName: "S" } }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.code, "MISSING_UPLOAD_ID");

  const usage = await fake.collection("users").doc("u1").collection("usage").get();
  assert.equal(usage.size, 0, "invalid requests must never consume quota");
});

test("save failure refunds the reserved slot (quota not consumed for rejected work)", async () => {
  const fake = stubAdmin();
  const path = require("path");
  const AGENT = path.resolve(__dirname, "../api/agent.js");

  // 1. Load agent.js with a saveBill that throws (Firestore outage).
  const db = require("../lib/database");
  const originalSaveBill = db.saveBill;
  db.saveBill = async () => {
    throw new Error("Firestore temporarily unavailable");
  };
  delete require.cache[AGENT];
  const failingHandler = require("../api/agent");
  await seedFreeUser(fake);

  const res = makeRes();
  await failingHandler(makeReq({ uploadId: "fail-1", invoice: { supplierName: "S", invoiceNumber: "INV-F" } }), res);
  assert.equal(res.statusCode, 502);
  assert.equal(res.payload.code, "SAVE_FAILED");

  // 2. Restore saveBill and re-load the handler — quota was refunded, so a
  //    fresh upload works and the counter shows exactly 1.
  db.saveBill = originalSaveBill;
  delete require.cache[AGENT];
  const handler = require("../api/agent");
  const res2 = makeRes();
  await handler(makeReq({ uploadId: "ok-1", invoice: { supplierName: "S", invoiceNumber: "INV-1" } }), res2);
  assert.equal(res2.statusCode, 200);

  const usage = await fake.collection("users").doc("u1").collection("usage").get();
  usage.forEach((d) => {
    assert.equal(d.data().invoiceUploads, 1, "failed save must not consume the quota");
  });
});

test("business fair-use safety ceiling enforced on the endpoint", async () => {
  process.env.BUSINESS_FAIR_USE_INVOICES = "2";
  const fake = stubAdmin();
  const handler = require("../api/agent");
  await fake
    .collection("users")
    .doc("u1")
    .set({ subscriptionPlan: "business", subscriptionStatus: "active", subscriptionExpiry: null });

  const res1 = makeRes();
  await handler(makeReq({ uploadId: "b-1", invoice: { supplierName: "S" } }), res1);
  assert.equal(res1.statusCode, 200);
  const res2 = makeRes();
  await handler(makeReq({ uploadId: "b-2", invoice: { supplierName: "S" } }), res2);
  assert.equal(res2.statusCode, 200);

  const res3 = makeRes();
  await handler(makeReq({ uploadId: "b-3", invoice: { supplierName: "S" } }), res3);
  assert.equal(res3.statusCode, 403);
  assert.equal(res3.payload.code, "FAIR_USE_LIMIT_REACHED");
  delete process.env.BUSINESS_FAIR_USE_INVOICES;
});
