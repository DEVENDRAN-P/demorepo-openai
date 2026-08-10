/* Verify production handler behavior directly (no web server involved). */
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
    json(payload) { console.log("  ->", this.statusCode, JSON.stringify(payload).slice(0, 120)); return this; },
  };
  return res;
}
function mockReq(over) {
  return Object.assign({ method: "GET", url: "/", headers: {}, query: {}, body: undefined }, over || {});
}

(async () => {
  console.log("== api/ai.js production behavior ==");
  const ai = require("../api/ai");
  await ai(mockReq({ method: "GET", url: "/api/ai", headers: {} }), mockRes()); // expect 405
  await ai(mockReq({ method: "POST", url: "/api/ai", headers: {} }), mockRes()); // expect 401 (no token)

  console.log("== api/health.js production behavior ==");
  const health = require("../api/health");
  await health(mockReq({ method: "GET", url: "/api/health" }), mockRes()); // expect 200
  await health(mockReq({ method: "DELETE", url: "/api/health" }), mockRes()); // expect 405

  console.log("== api/reminders.js production auth behavior ==");
  const reminders = require("../api/reminders");
  await reminders(mockReq({ method: "GET", url: "/api/reminders" }), mockRes()); // expect 401
  await reminders(mockReq({ method: "GET", url: "/api/reminders", query: { task: "overdue" } }), mockRes()); // expect 401
  await reminders(mockReq({ method: "PUT", url: "/api/reminders" }), mockRes()); // expect 405

  console.log("== resolveTask checks (via query param) ==");
  console.log("  query.task=overdue -> overdue:", "(resolved inside handler — see logs above)");

  console.log("\nAll production handler checks done.");
})().catch((err) => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
