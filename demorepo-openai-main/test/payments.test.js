/**
 * Payment lifecycle tests (Parts 11, 12, 25).
 *
 * Verifies the CORE idempotency guarantees of the subscription activation
 * path (lib/database.activateSubscriptionFromOrder + savePendingOrder +
 * saveFailedPayment) using the in-memory FakeFirestore. The Cashfree HTTP
 * integration itself requires sandbox credentials (marked BLOCKED in the
 * report), but the server-side state transitions are fully testable.
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { stubAdmin } = require("./helpers/stubAdmin");

const expiryDate = (days = 30) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

test("duplicate payment callbacks never double-activate or double-extend", async () => {
  const fake = stubAdmin();
  const db = require("../lib/database");

  // Pending order created before checkout.
  await db.savePendingOrder("u1", { orderId: "GB1111", plan: "pro", amount: 199, currency: "INR" });

  // First webhook delivery.
  const first = await db.activateSubscriptionFromOrder("u1", "GB1111", {
    paymentId: "pay_123",
    amount: 199,
    currency: "INR",
    plan: "pro",
    provider: "cashfree",
    expiryDate: expiryDate(),
  });
  assert.equal(first.alreadyProcessed, false);

  const expiryAfterFirst = (await fake.collection("users").doc("u1").get()).data().subscriptionExpiry;

  // Duplicate delivery (webhook retry / refresh-after-payment / double click).
  const second = await db.activateSubscriptionFromOrder("u1", "GB1111", {
    paymentId: "pay_123",
    amount: 199,
    currency: "INR",
    plan: "pro",
    provider: "cashfree",
    expiryDate: expiryDate(90), // a malicious/buggy retry with a later expiry
  });
  assert.equal(second.alreadyProcessed, true, "duplicate callback must be a no-op");

  const userData = (await fake.collection("users").doc("u1").get()).data();
  assert.equal(userData.subscriptionPlan, "pro");
  assert.equal(userData.subscriptionStatus, "active");
  assert.equal(
    String(userData.subscriptionExpiry),
    String(expiryAfterFirst),
    "expiry must not be extended by a duplicate callback"
  );

  // Exactly one payment ledger record.
  const payments = await fake.collection("users").doc("u1").collection("payments").get();
  assert.equal(payments.size, 1);
});

test("two DIFFERENT orders (renewals) activate normally", async () => {
  const fake = stubAdmin();
  const db = require("../lib/database");

  await db.savePendingOrder("u1", { orderId: "GB-1", plan: "pro", amount: 199, currency: "INR" });
  await db.activateSubscriptionFromOrder("u1", "GB-1", {
    paymentId: "pay-1",
    amount: 199,
    currency: "INR",
    plan: "pro",
    expiryDate: expiryDate(30),
  });

  await db.savePendingOrder("u1", { orderId: "GB-2", plan: "business", amount: 499, currency: "INR" });
  const renewal = await db.activateSubscriptionFromOrder("u1", "GB-2", {
    paymentId: "pay-2",
    amount: 499,
    currency: "INR",
    plan: "business",
    expiryDate: expiryDate(60),
  });
  assert.equal(renewal.alreadyProcessed, false);

  const userData = (await fake.collection("users").doc("u1").get()).data();
  assert.equal(userData.subscriptionPlan, "business");
  assert.equal(userData.subscriptionOrderId, "GB-2");
});

test("failed payments are recorded and NEVER upgrade the plan", async () => {
  const fake = stubAdmin();
  const db = require("../lib/database");

  // User starts free with an existing free subscription.
  await fake.collection("users").doc("u1").set({
    subscriptionPlan: "free",
    subscriptionStatus: "active",
    subscriptionExpiry: null,
  });

  // Failed payment recorded (status FAILED / USER_DROPPED / CANCELLED path).
  await db.savePendingOrder("u1", { orderId: "GB-FAIL", plan: "pro", amount: 199, currency: "INR" });
  await db.saveFailedPayment({
    paymentId: "pay_fail_1",
    orderId: "GB-FAIL",
    amount: 199,
    plan: "pro",
    currency: "INR",
    provider: "cashfree",
    uid: "u1",
  });

  const userData = (await fake.collection("users").doc("u1").get()).data();
  assert.equal(userData.subscriptionPlan, "free", "a failed payment must not upgrade the plan");
  assert.equal(userData.subscriptionStatus, "active");

  const failedPayments = await fake
    .collection("users")
    .doc("u1")
    .collection("payments")
    .where("status", "==", "failed")
    .get();
  assert.equal(failedPayments.size, 1);
});

test("activating an order that was already marked failed is a no-op", async () => {
  const fake = stubAdmin();
  const db = require("../lib/database");

  await db.savePendingOrder("u1", { orderId: "GB-X", plan: "pro", amount: 199, currency: "INR" });
  await db.updateOrderStatus("u1", "GB-X", "failed");

  const outcome = await db.activateSubscriptionFromOrder("u1", "GB-X", {
    paymentId: "pay-x",
    amount: 199,
    currency: "INR",
    plan: "pro",
    expiryDate: expiryDate(),
  });
  assert.equal(outcome.alreadyProcessed, true);
  const userData = (await fake.collection("users").doc("u1").get()).data();
  assert.equal(userData && userData.subscriptionPlan, undefined, "no plan write for a failed order");
});

test("downgrade resets the plan to free without deleting user data", async () => {
  const fake = stubAdmin();
  const db = require("../lib/database");

  // Pro user with invoices.
  await fake.collection("users").doc("u1").set({
    subscriptionPlan: "pro",
    subscriptionStatus: "active",
    subscriptionExpiry: expiryDate(),
  });
  await fake.collection("users").doc("u1").collection("bills").doc("b1").set({ invoiceNumber: "INV-1" });

  await db.downgradeUserToFree("u1");

  const userData = (await fake.collection("users").doc("u1").get()).data();
  assert.equal(userData.subscriptionPlan, "free");
  assert.equal(userData.subscriptionStatus, "active");
  assert.equal(userData.subscriptionExpiry, null);

  // Historical invoices remain readable (nothing deleted).
  const bills = await fake.collection("users").doc("u1").collection("bills").get();
  assert.equal(bills.size, 1);
});
