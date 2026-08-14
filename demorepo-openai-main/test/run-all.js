/**
 * Test report runner (Part 42).
 *
 * Usage:  npm run test:backend
 *         node test/run-all.js
 *
 * Executes every *.test.js in test/ with node:test and prints a summary
 * report. Live integration cases (real Cashfree sandbox, Firebase emulator
 * user journeys) cannot run without configuration — they are reported as
 * BLOCKED, never as passed.
 */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const testDir = __dirname;
const files = fs
  .readdirSync(testDir)
  .filter((f) => f.endsWith(".test.js"))
  .sort();

console.log("=".repeat(72));
console.log("  GST BUDDY — SUBSCRIPTION + USAGE + GSTIN TEST SUITE");
console.log("=".repeat(72));

let totalPass = 0;
let totalFail = 0;
let totalFiles = 0;

for (const file of files) {
  const filePath = path.join(testDir, file);
  const result = spawnSync(process.execPath, ["--test", filePath], {
    encoding: "utf8",
    timeout: 120000,
  });

  const output = result.stdout || "";
  const stderr = result.stderr || "";
  const summaryMatch = output.match(/tests (\d+)\s+pass (\d+)\s+fail (\d+)/) ||
                       output.match(/# tests (\d+)[\s\S]*?# pass (\d+)[\s\S]*?# fail (\d+)/);
  const tests = summaryMatch ? parseInt(summaryMatch[1], 10) : 0;
  const pass = summaryMatch ? parseInt(summaryMatch[2], 10) : 0;
  const fail = summaryMatch ? parseInt(summaryMatch[3], 10) : 0;

  totalFiles += 1;
  totalPass += pass;
  totalFail += fail;
  const status = result.status === 0 ? "PASS" : "FAIL";
  console.log(`\n[${status}] ${file}  (${pass}/${tests} tests)`);
  if (result.status !== 0) {
    // Print failing test names + diagnostics (trimmed).
    const failing = output
      .split("\n")
      .filter((l) => /✖|not ok|AssertionError|Error:/.test(l))
      .slice(0, 12)
      .join("\n");
    console.log(failing || stderr.trim().slice(0, 2000) || "unknown failure");
  }
}

console.log("\n" + "=".repeat(72));
console.log("  SUMMARY");
console.log("=".repeat(72));
console.log(`  Files:      ${totalFiles}`);
console.log(`  Tests pass: ${totalPass}`);
console.log(`  Tests fail: ${totalFail}`);
console.log(`  Overall:    ${totalFail === 0 ? "PASS" : "FAIL"}`);
console.log("");

// Per-area report (map suite files to report sections).
const sections = [
  { name: "SUBSCRIPTIONS", files: ["payments.test.js", "usage.test.js"], live: "Cashfree sandbox + Firebase emulator" },
  { name: "INVOICE LIMITS", files: ["invoice.test.js", "usage.test.js"], live: "Firebase emulator (two-browser-tab uploads)" },
  { name: "FEATURE GATES", files: ["entitlements.test.js", "plans.test.js"], live: "Firebase emulator" },
  { name: "PAYMENT", files: ["payments.test.js"], live: "Cashfree sandbox (create-order/verify/webhook)" },
  { name: "EDGE CASES", files: ["usage.test.js", "payments.test.js", "invoice.test.js"], live: "Firebase emulator (concurrency, refresh, retries)" },
];

console.log("=".repeat(72));
console.log("  TEST PLAN OUTPUT");
console.log("=".repeat(72));
for (const section of sections) {
  const pass = section.files.reduce((s, f) => s + (files.includes(f) ? countPassFor(f) : 0), 0);
  const total = section.files.reduce((s, f) => s + (files.includes(f) ? countTestsFor(f) : 0), 0);
  const liveNote = `BLOCKED — requires configuration (${section.live})`;
  console.log(`${section.name.padEnd(22)} PASS ${pass}/${total}  · live: ${liveNote}`);
}

function countFor(f) {
  const result = spawnSync(process.execPath, ["--test", path.join(testDir, f)], {
    encoding: "utf8",
    timeout: 120000,
  });
  const m = (result.stdout || "").match(/tests (\d+)\s+pass (\d+)\s+fail (\d+)/) ||
            (result.stdout || "").match(/# tests (\d+)[\s\S]*?# pass (\d+)[\s\S]*?# fail (\d+)/);
  return m ? { tests: parseInt(m[1], 10), pass: parseInt(m[2], 10) } : { tests: 0, pass: 0 };
}
function countPassFor(f) {
  return countFor(f).pass;
}
function countTestsFor(f) {
  return countFor(f).tests;
}

process.exit(totalFail === 0 ? 0 : 1);
