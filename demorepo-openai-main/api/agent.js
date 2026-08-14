/**
 * Agent Orchestrator — routes events through a chain of AI agents.
 *
 * Endpoints:
 *   POST /api/agent          — execute an agent chain
 *   GET  /api/agent          — list recent agent runs
 *
 * Supported triggers:
 *   invoice_uploaded        — Invoice Agent → Compliance Agent → Finance Agent → Reminder Agent
 *   run_compliance          — Compliance Agent
 *   run_forecast            — Tax Forecast Agent
 *   run_insights            — Business Intelligence Agent
 *   run_full_analysis       — all agents in sequence
 *
 * Each agent:
 *   1. Reads data from Firestore
 *   2. Runs deterministic rules (finance.js)
 *   3. Calls Gemini for reasoning / prioritization
 *   4. Returns structured decisions + actions
 *   5. Orchestrator executes actions (writes to Firestore)
 *   6. Everything is logged to agentRuns collection
 */

const { verifyAuth, getDb, getBillsForUser, AiHttpError } = require("../lib/admin");
const gemini = require("../lib/gemini");
const config = require("../lib/config");
const { checkCompliance, buildForecast, buildMetrics, computeFacts, summarizeBills, GSTIN_REGEX, toNumber } = require("../lib/finance");
const { createRun, completeRun, addDecision, addAction } = require("../lib/agentRunLogger");
const { validateCompliance, validateForecast, validateInsights } = require("../lib/schemas");
const { saveBill } = require("../lib/database");
const { getPlanForUser, checkLimit } = require("../lib/usage");
const { checkFeatureAccess } = require("../lib/entitlements");

/**
 * Secondary server-side guard for the invoice_uploaded chain.
 * The authoritative invoiceUploads reservation happens in POST /api/invoices
 * (lib/usage.reserveUsage — atomic + idempotent). This check mirrors the
 * same limit from the shared plan config so a chain triggered directly via
 * POST /api/agent is still bounded.
 */
async function enforceInvoiceLimit(uid) {
  const check = await checkLimit(uid, "invoiceUploads");
  if (!check.allowed) {
    const plan = await getPlanForUser(uid);
    return {
      status: 403,
      body: {
        success: false,
        code: check.reason,
        error:
          check.reason === "FAIR_USE_LIMIT_REACHED"
            ? `Fair-use processing threshold reached (${check.used}). Please try again later or contact support.`
            : `Monthly invoice limit reached (${check.used}/${check.limit}). Please upgrade your plan to continue.`,
        usage: { used: check.used, limit: check.limit, plan },
      },
    };
  }
  return null;
}

const SYSTEM_GUARD =
  "You are part of GST Buddy, a GST compliance platform for Indian small businesses. " +
  "NEVER invent GST laws, tax rates, percentages, or filing deadlines. " +
  "Base every statement strictly on the data provided. " +
  "If a figure or rule is not present in the provided data, say it is not available rather than guessing. " +
  "Never recommend illegal tax avoidance.";

// ---------------------------------------------------------------------------
// Agent: Invoice Intelligence
// ---------------------------------------------------------------------------

async function invoiceAgent(uid, invoiceData, businessContext, currentBillId) {
  const decisions = [];
  const actions = [];
  let result = null;

  // 1. Validate GSTIN (deterministic)
  const gstin = invoiceData.gstin || "";
  const gstinClean = gstin.toUpperCase().trim();
  if (!gstin || gstinClean.includes("XXXXX")) {
    decisions.push("GSTIN missing — ITC claim at risk for this invoice");
  } else if (!GSTIN_REGEX.test(gstinClean)) {
    decisions.push(`GSTIN "${gstin}" is invalid — does not match 15-character format`);
  } else {
    decisions.push("GSTIN validated — format is correct");
  }

  // 2. Validate amounts (deterministic)
  const amount = toNumber(invoiceData.amount);
  const taxAmount = toNumber(invoiceData.taxAmount);
  const totalAmount = toNumber(invoiceData.totalAmount);

  if (totalAmount > 0 && Math.abs(amount + taxAmount - totalAmount) > 2) {
    decisions.push(`Tax arithmetic mismatch: ${amount} + ${taxAmount} ≠ ${totalAmount}`);
  } else if (totalAmount > 0) {
    decisions.push("Invoice amounts are consistent");
  }

  // 3. Check for duplicates against OTHER invoices (deterministic).
  //    The invoice itself was already stored by the application, so we
  //    exclude it from the comparison to avoid self-matching on every upload.
  const bills = await getBillsForUser(uid, businessContext?.id);
  const duplicate = bills.find(
    (b) =>
      b.id !== currentBillId &&
      b.invoiceNumber &&
      String(b.invoiceNumber).toUpperCase() === String(invoiceData.invoiceNumber || "").toUpperCase() &&
      (b.supplierName || "").toLowerCase() === (invoiceData.supplierName || "").toLowerCase()
  );
  if (duplicate) {
    decisions.push(`Potential duplicate: invoice #${invoiceData.invoiceNumber} already exists`);
    actions.push({ type: "FLAG_DUPLICATE", invoiceNumber: invoiceData.invoiceNumber });
  }

  // 4. Check missing fields
  const missingFields = [];
  if (!invoiceData.invoiceNumber) missingFields.push("invoiceNumber");
  if (!invoiceData.invoiceDate) missingFields.push("invoiceDate");
  if (!invoiceData.supplierName) missingFields.push("supplierName");
  if (missingFields.length > 0) {
    decisions.push(`Missing fields: ${missingFields.join(", ")}`);
  }

  // 5. The application (client) already persisted this invoice before
  //    triggering the agent chain, so the agent never writes it again.
  result = duplicate
    ? "Invoice flagged as potential duplicate — kept for review"
    : "Invoice validated — no duplicates found";

  return { decisions, actions, result };
}

// ---------------------------------------------------------------------------
// Agent: Compliance Monitor
// ---------------------------------------------------------------------------

async function complianceAgent(uid, businessId) {
  const decisions = [];
  const actions = [];
  let result = null;

  const bills = await getBillsForUser(uid, businessId);
  if (bills.length === 0) {
    return {
      decisions: ["No invoices available for compliance analysis"],
      actions: [],
      result: "No data to analyze",
    };
  }

  // STEP 1: Code detects issues + computes facts (deterministic — no AI)
  const findings = checkCompliance(bills);
  const criticalFindings = findings.filter((f) => f.severity === "critical" || f.severity === "high");
  const { facts } = computeFacts(bills);

  // Record what the code found
  if (findings.length > 0) {
    for (const f of findings) {
      decisions.push(`[DETECTED] [${f.severity.toUpperCase()}] ${f.type}: ${f.description}`);
    }
  } else {
    decisions.push("[DETECTED] No compliance issues found by rule engine");
  }

  // Record computed facts
  for (const fact of facts) {
    decisions.push(`[FACT] ${fact}`);
  }

  // STEP 2: Gemini reasons ONLY from supplied evidence (AI interpretation)
  const systemInstruction = [
    SYSTEM_GUARD,
    "You are the Compliance Monitor Agent for a small business.",
    "You are given: (1) compliance findings detected by the system, (2) computed business facts.",
    "CRITICAL RULE: You may ONLY make claims that are directly supported by the supplied findings and facts.",
    "Do NOT invent new compliance issues. Do NOT assume facts not listed.",
    "Your role: prioritize the detected findings by business risk and recommend actions.",
    "Return structured JSON only.",
  ].join("\n");

  const prompt = [
    `DETECTED COMPLIANCE FINDINGS (do not add new issues):`,
    ``,
    findings.length > 0
      ? findings.map((f, i) => `${i + 1}. [${f.severity}] ${f.type}: ${f.description}`).join("\n")
      : "No issues detected.",
    ``,
    `COMPUTED BUSINESS FACTS:`,
    facts.map((f, i) => `${i + 1}. ${f}`).join("\n"),
    ``,
    `PRIORITIZATION RULES:`,
    `- Only reference findings and facts listed above`,
    `- Do not claim "X is happening" unless a finding or fact states it`,
    `- If findings are insufficient for prioritization, say so`,
    ``,
    `How should the business prioritize these findings?`,
    `Return JSON: { riskAssessment: string, prioritizedFindings: string[], recommendations: string[], priorityLevel: "low"|"medium"|"high" }`,
  ].join("\n");

  try {
    const parsed = await gemini.runStructured("compliance_analysis", {
      systemInstruction,
      prompt,
    });

    if (parsed.riskAssessment) {
      decisions.push(`[AI ASSESSMENT] ${parsed.riskAssessment}`);
    }
    if (parsed.prioritizedFindings && parsed.prioritizedFindings.length > 0) {
      decisions.push(`[AI PRIORITIZATION] ${parsed.prioritizedFindings.join(" → ")}`);
    }
    if (parsed.recommendations) {
      for (const rec of parsed.recommendations) {
        decisions.push(`[AI RECOMMENDATION] ${rec}`);
      }
    }

    // STEP 3: Application decides actions based on findings + AI
    if (parsed.priorityLevel === "high" || criticalFindings.length > 0) {
      actions.push({ type: "CREATE_COMPLIANCE_ALERT", severity: "high", count: criticalFindings.length });
    }
  } catch (err) {
    decisions.push("[SYSTEM] Gemini analysis unavailable — using detected findings only");
    if (criticalFindings.length > 0) {
      actions.push({ type: "CREATE_COMPLIANCE_ALERT", severity: "high", count: criticalFindings.length });
    }
  }

  // ITC tracking (deterministic)
  const itcEligible = bills.filter((b) => b.gstin && GSTIN_REGEX.test((b.gstin || "").toUpperCase()));
  const itcTotal = itcEligible.reduce((s, b) => s + toNumber(b.taxAmount), 0);
  if (itcTotal > 0) {
    decisions.push(`[FACT] ITC eligible: ₹${itcTotal} across ${itcEligible.length} invoices`);
    actions.push({ type: "TRACK_ITC", amount: itcTotal, invoiceCount: itcEligible.length });
  }

  // Filing check (deterministic)
  const unfiled = bills.filter((b) => !b.filed && b.status !== "draft");
  if (unfiled.length > 0) {
    decisions.push(`[DETECTED] ${unfiled.length} invoices not yet filed`);
    actions.push({ type: "SCHEDULE_FILING_REMINDER", count: unfiled.length });
  }

  result = findings.length === 0
    ? "All invoices compliant"
    : `${findings.length} compliance issues found — ${criticalFindings.length} require attention`;

  return { decisions, actions, result };
}

// ---------------------------------------------------------------------------
// Agent: Tax Forecast
// ---------------------------------------------------------------------------

async function forecastAgent(uid, businessId) {
  const decisions = [];
  const actions = [];
  let result = null;

  const bills = await getBillsForUser(uid, businessId);

  // STEP 1: Code computes all facts (deterministic — no AI)
  const { hasData, facts, forecast } = computeFacts(bills);

  if (!hasData) {
    return {
      decisions: ["No invoices available for forecasting"],
      actions: [],
      result: "No data to analyze",
    };
  }

  // Record what the code computed
  for (const fact of facts) {
    decisions.push(`[FACT] ${fact}`);
  }

  // STEP 2: Gemini reasons ONLY from supplied facts (AI interpretation)
  const systemInstruction = [
    SYSTEM_GUARD,
    "You are the AI Tax Forecast Agent for a small business.",
    "You are given a list of FACTS computed by the system.",
    "CRITICAL RULE: You may ONLY make claims that are directly supported by the supplied facts.",
    "Do NOT invent, assume, or infer any numbers or trends not present in the facts.",
    "If a fact is not listed, you cannot reference it.",
    "Your role: interpret what these facts mean for the business's cash flow and tax obligations.",
    "Return structured JSON only.",
  ].join("\n");

  const prompt = [
    `FACTS (all computed by system — do not add new facts):`,
    ``,
    facts.map((f, i) => `${i + 1}. ${f}`).join("\n"),
    ``,
    `INTERPRETATION RULES:`,
    `- Only reference facts listed above`,
    `- Do not claim "X increased by Y%" unless the facts state that`,
    `- Do not recommend actions unless supported by the facts`,
    `- If facts are insufficient, say so`,
    ``,
    `What do these facts mean for the business?`,
    `Return JSON: { interpretation: string, risks: string[], recommendations: string[], priorityLevel: "low"|"medium"|"high" }`,
  ].join("\n");

  try {
    const parsed = await gemini.runStructured("tax_forecast", {
      systemInstruction,
      prompt,
    });

    // Validate: only store interpretations that reference actual facts
    if (parsed.interpretation) {
      decisions.push(`[AI INTERPRETATION] ${parsed.interpretation}`);
    }
    if (parsed.risks) {
      for (const risk of parsed.risks) {
        decisions.push(`[AI RISK] ${risk}`);
      }
    }
    if (parsed.recommendations) {
      for (const rec of parsed.recommendations) {
        decisions.push(`[AI RECOMMENDATION] ${rec}`);
      }
    }

    // STEP 3: Application decides actions based on facts + AI
    if (parsed.priorityLevel === "high" || forecast.netPayable > 50000) {
      actions.push({ type: "ALERT_HIGH_LIABILITY", amount: forecast.netPayable });
    }
  } catch (err) {
    decisions.push("[SYSTEM] Gemini analysis unavailable — facts only");
    if (forecast.netPayable > 50000) {
      actions.push({ type: "ALERT_HIGH_LIABILITY", amount: forecast.netPayable });
    }
  }

  if (forecast.confidence === "low") {
    decisions.push("[SYSTEM] Low confidence — more invoice data needed");
  }

  result = `Forecast: ₹${forecast.netPayable} net payable next month`;
  return { decisions, actions, result, forecast };
}

// ---------------------------------------------------------------------------
// Agent: Business Intelligence
// ---------------------------------------------------------------------------

async function insightsAgent(uid, businessId) {
  const decisions = [];
  const actions = [];
  let result = null;

  const bills = await getBillsForUser(uid, businessId);

  // STEP 1: Code computes all facts (deterministic — no AI)
  const { hasData, facts, metrics } = computeFacts(bills);

  if (!hasData) {
    return {
      decisions: ["No invoices available for analysis"],
      actions: [],
      result: "No data to analyze",
    };
  }

  // Record what the code computed
  for (const fact of facts) {
    decisions.push(`[FACT] ${fact}`);
  }

  // STEP 2: Gemini reasons ONLY from supplied facts (AI interpretation)
  const systemInstruction = [
    SYSTEM_GUARD,
    "You are the AI Business Intelligence Agent for a small business.",
    "You are given a list of FACTS computed by the system.",
    "CRITICAL RULE: You may ONLY make claims that are directly supported by the supplied facts.",
    "Do NOT invent, assume, or infer any numbers, trends, or patterns not present in the facts.",
    "If a fact is not listed, you cannot reference it.",
    "Your role: interpret what these facts reveal about the business's spending, vendors, and compliance.",
    "Return structured JSON only.",
  ].join("\n");

  const prompt = [
    `FACTS (all computed by system — do not add new facts):`,
    ``,
    facts.map((f, i) => `${i + 1}. ${f}`).join("\n"),
    ``,
    `INTERPRETATION RULES:`,
    `- Only reference facts listed above`,
    `- Do not claim "X is Y%" unless the facts state that`,
    `- Do not claim "vendor concentration is high" unless a fact says so`,
    `- Do not recommend actions unless supported by the facts`,
    `- If facts are insufficient, say so`,
    ``,
    `What do these facts reveal about the business?`,
    `Return JSON: { insights: {title, description, severity}[], spendAnalysis: string, recommendations: string[] }`,
  ].join("\n");

  try {
    const parsed = await gemini.runStructured("business_insight", {
      systemInstruction,
      prompt,
    });

    if (parsed.spendAnalysis) {
      decisions.push(`[AI ANALYSIS] ${parsed.spendAnalysis}`);
    }
    if (parsed.insights) {
      for (const insight of parsed.insights) {
        decisions.push(`[AI INSIGHT] ${insight.title}: ${insight.description}`);
      }
    }
    if (parsed.recommendations) {
      for (const rec of parsed.recommendations) {
        decisions.push(`[AI RECOMMENDATION] ${rec}`);
      }
    }
  } catch (err) {
    decisions.push("[SYSTEM] Gemini analysis unavailable — facts only");
  }

  // STEP 3: Application decides actions based on facts + AI
  if (metrics.pendingFilings > 5) {
    actions.push({ type: "ALERT_FILING_BACKLOG", count: metrics.pendingFilings });
  }

  result = `Analyzed ${metrics.invoiceCount} invoices — ₹${metrics.totalInvoiceAmount} total spend`;
  return { decisions, actions, result, metrics };
}

// ---------------------------------------------------------------------------
// Agent: Reminder Scheduler
// ---------------------------------------------------------------------------

async function reminderAgent(uid, businessId) {
  const decisions = [];
  const actions = [];

  const bills = await getBillsForUser(uid, businessId);
  const now = new Date();

  for (const bill of bills) {
    if (bill.filed) continue;

    const deadline = bill.gstrDeadline ? new Date(bill.gstrDeadline) : null;
    if (!deadline) continue;

    const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

    if (daysUntil <= 0) {
      decisions.push(`OVERDUE: Invoice #${bill.invoiceNumber || "unknown"} — deadline passed`);
      actions.push({ type: "CREATE_URGENT_REMINDER", invoiceId: bill.invoiceId, daysOverdue: -daysUntil });
    } else if (daysUntil <= 7) {
      decisions.push(`DUE SOON: Invoice #${bill.invoiceNumber || "unknown"} — ${daysUntil} days until deadline`);
      actions.push({ type: "CREATE_REMINDER", invoiceId: bill.invoiceId, daysUntil });
    }
  }

  const result = actions.length === 0
    ? "No reminders needed"
    : `${actions.length} reminders created`;

  return { decisions, actions, result };
}

// ---------------------------------------------------------------------------
// Orchestrator: chains agents based on trigger
// ---------------------------------------------------------------------------

const AGENT_CHAINS = {
  invoice_uploaded: ["invoice", "compliance", "forecast", "insights", "reminder"],
  run_compliance: ["compliance"],
  run_forecast: ["forecast"],
  run_insights: ["insights"],
  run_full_analysis: ["compliance", "forecast", "insights", "reminder"],
};

const AGENT_FNS = {
  invoice: { name: "Invoice Intelligence Agent", fn: invoiceAgent },
  compliance: { name: "Compliance Monitor Agent", fn: complianceAgent },
  forecast: { name: "AI Tax Forecast Agent", fn: forecastAgent },
  insights: { name: "AI Business Intelligence Agent", fn: insightsAgent },
  reminder: { name: "Reminder Scheduler Agent", fn: reminderAgent },
};

async function runAgentChain(uid, trigger, payload = {}) {
  const chain = AGENT_CHAINS[trigger];
  if (!chain) {
    throw new AiHttpError(400, "INVALID_TRIGGER", `Unknown trigger: ${trigger}`);
  }

  const chainRunId = await createRun(uid, {
    agent: "Agent Orchestrator",
    trigger,
    input: { payload, chain },
  });

  const results = [];
  let chainFailed = false;

  // Run initial invoice agent if present first
  if (chain.includes("invoice")) {
    const agent = AGENT_FNS["invoice"];
    const agentRunId = await createRun(uid, {
      agent: agent.name,
      trigger,
      input: payload,
    });

    try {
      const agentResult = await agent.fn(uid, payload.invoice || payload, payload.business, payload.billId);
      await completeRun(uid, agentRunId, {
        status: "completed",
        decisions: agentResult.decisions,
        actions: agentResult.actions.map((a) => JSON.stringify(a)),
        result: agentResult.result,
      });

      results.push({
        agent: agent.name,
        status: "completed",
        runId: agentRunId,
        decisions: agentResult.decisions,
        actions: agentResult.actions,
        result: agentResult.result,
      });

      for (const action of agentResult.actions) {
        await executeAction(uid, action);
      }
    } catch (err) {
      await completeRun(uid, agentRunId, {
        status: "error",
        error: err.message || "Agent execution failed",
      });

      results.push({
        agent: agent.name,
        status: "error",
        runId: agentRunId,
        error: err.message,
      });
    }
  }

  // Run remaining downstream agents concurrently in parallel
  const remainingKeys = chain.filter((k) => k !== "invoice");
  if (remainingKeys.length > 0) {
    const agentPromises = remainingKeys.map(async (agentKey) => {
      const agent = AGENT_FNS[agentKey];
      const agentRunId = await createRun(uid, {
        agent: agent.name,
        trigger,
        input: payload,
      });

      try {
        const agentResult = await agent.fn(uid, payload.business?.id);
        await completeRun(uid, agentRunId, {
          status: "completed",
          decisions: agentResult.decisions,
          actions: agentResult.actions.map((a) => JSON.stringify(a)),
          result: agentResult.result,
        });

        for (const action of agentResult.actions) {
          await executeAction(uid, action);
        }

        return {
          agent: agent.name,
          status: "completed",
          runId: agentRunId,
          decisions: agentResult.decisions,
          actions: agentResult.actions,
          result: agentResult.result,
        };
      } catch (err) {
        await completeRun(uid, agentRunId, {
          status: "error",
          error: err.message || "Agent execution failed",
        });

        return {
          agent: agent.name,
          status: "error",
          runId: agentRunId,
          error: err.message,
        };
      }
    });

    const parallelResults = await Promise.allSettled(agentPromises);
    parallelResults.forEach((res) => {
      if (res.status === "fulfilled" && res.value) {
        results.push(res.value);
      }
    });
  }

  await completeRun(uid, chainRunId, {
    status: chainFailed ? "error" : "completed",
    decisions: results.flatMap((r) => r.decisions || []),
    result: `Chain ${chainFailed ? "failed" : "completed"}: ${results.length} agents executed`,
  });

  return {
    trigger,
    chainRunId,
    results,
    status: chainFailed ? "error" : "completed",
  };
}

// ---------------------------------------------------------------------------
// Action executor (Firestore side effects)
// ---------------------------------------------------------------------------

const ALERT_DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Create an alert unless an identical unread alert already exists within
 * the dedup window (prevents notification spam from repeated agent runs).
 */
async function createAlert(uid, alert) {
  const db = getDb();
  const since = new Date(Date.now() - ALERT_DEDUP_WINDOW_MS).toISOString();
  // Dedup against the most recent alerts. We query with a single-field
  // orderBy (uses Firestore's automatic index) and filter in memory — alert
  // volume per user is tiny, and this avoids requiring a composite Firestore
  // index (which the firebase-adminsdk service account cannot create).
  // NOTE: createdAt is always written as an ISO string (executeAction uses
  // new Date().toISOString()), so string comparison with `since` is valid.
  const existing = await db
    .collection("users")
    .doc(uid)
    .collection("alerts")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  let found = false;
  existing.forEach((doc) => {
    const d = doc.data();
    if (
      d.type === alert.type &&
      !d.read &&
      String(d.createdAt) >= since &&
      d.message === alert.message
    ) {
      found = true;
    }
  });
  if (found) return null;
  const ref = await db
    .collection("users")
    .doc(uid)
    .collection("alerts")
    .add({ ...alert, read: false });
  return ref.id;
}

async function executeAction(uid, action) {
  if (!action || !action.type) return;

  const db = getDb();
  const now = new Date().toISOString();

  switch (action.type) {
    case "STORE_INVOICE":
      // Legacy action — invoice storage is handled by the application.
      break;

    case "FLAG_DUPLICATE":
      await createAlert(uid, {
        type: "duplicate_invoice",
        message: `Potential duplicate invoice: #${action.invoiceNumber}`,
        severity: "medium",
        createdAt: now,
      });
      break;

    case "CREATE_COMPLIANCE_ALERT":
      await createAlert(uid, {
        type: "compliance_alert",
        message: `${action.count} compliance issues require attention`,
        severity: action.severity,
        createdAt: now,
      });
      break;

    case "TRACK_ITC":
      await createAlert(uid, {
        type: "itc_tracking",
        message: `ITC eligible: ₹${action.amount} across ${action.invoiceCount} invoices`,
        severity: "info",
        createdAt: now,
      });
      break;

    case "SCHEDULE_FILING_REMINDER":
      await createAlert(uid, {
        type: "filing_reminder",
        message: `${action.count} invoices pending filing`,
        severity: "medium",
        createdAt: now,
      });
      break;

    case "ALERT_HIGH_LIABILITY":
      await createAlert(uid, {
        type: "high_liability",
        message: `High GST liability detected: ₹${action.amount}`,
        severity: "high",
        createdAt: now,
      });
      break;

    case "ALERT_FILING_BACKLOG":
      await createAlert(uid, {
        type: "filing_backlog",
        message: `${action.count} invoices need to be filed`,
        severity: "high",
        createdAt: now,
      });
      break;

    case "CREATE_URGENT_REMINDER":
      await createAlert(uid, {
        type: "urgent_deadline",
        message: `Invoice deadline passed — ${action.daysOverdue} days overdue`,
        severity: "critical",
        createdAt: now,
      });
      break;

    case "CREATE_REMINDER":
      await createAlert(uid, {
        type: "deadline_reminder",
        message: `Invoice due in ${action.daysUntil} days`,
        severity: "medium",
        createdAt: now,
      });
      break;

    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Scheduled Agent — runs autonomously via Vercel Cron
// ---------------------------------------------------------------------------

async function runScheduledAgent() {
  const db = getDb();
  const startTime = Date.now();
  const results = {
    businessesChecked: 0,
    invoicesReviewed: 0,
    complianceIssues: 0,
    remindersCreated: 0,
    alertsSent: 0,
    agentRuns: [],
  };

  // 1. Get all users with active businesses
  const usersSnapshot = await db.collection("users").get();
  const userIds = [];
  usersSnapshot.forEach((doc) => userIds.push(doc.id));

  console.log(JSON.stringify({
    type: "scheduled_agent_start",
    userCount: userIds.length,
    timestamp: new Date().toISOString(),
  }));

  for (const uid of userIds) {
    try {
      // Skip users who were already analysed by a scheduled run within 20 hours
      // (prevents duplicate daily execution if the cron fires more than once).
      const metaDoc = await db.collection("users").doc(uid).collection("agentMeta").doc("scheduler").get();
      if (metaDoc.exists && metaDoc.data().lastScheduledRunAt) {
        const last = new Date(metaDoc.data().lastScheduledRunAt);
        if (Date.now() - last.getTime() < 20 * 60 * 60 * 1000) continue;
      }

      // 2. Get user's businesses
      const businessSnapshot = await db
        .collection("users")
        .doc(uid)
        .collection("bills")
        .limit(1)
        .get();

      if (businessSnapshot.empty) continue;

      // 3. Autonomous scheduled analysis is a Business-tier entitlement
      //    (AI Operations Agent). Free/Pro users are skipped so autonomous
      //    workflows never run for plans that do not include them.
      const autonomyGate = await checkFeatureAccess(uid, "automated_compliance");
      if (!autonomyGate.allowed) continue;

      await db
        .collection("users")
        .doc(uid)
        .collection("agentMeta")
        .doc("scheduler")
        .set({ lastScheduledRunAt: new Date().toISOString() }, { merge: true });
      const chainResult = await runAgentChain(uid, "run_full_analysis", {});
      results.businessesChecked++;
      results.agentRuns.push({
        uid,
        status: chainResult.status,
        agentsExecuted: chainResult.results.length,
      });

      // 4. Count outcomes
      for (const r of chainResult.results) {
        if (r.decisions) {
          results.complianceIssues += r.decisions.filter(
            (d) => typeof d === "string" && (d.includes("[HIGH]") || d.includes("[CRITICAL]"))
          ).length;
        }
        if (r.actions) {
          results.remindersCreated += r.actions.filter(
            (a) => a.type === "CREATE_REMINDER" || a.type === "CREATE_URGENT_REMINDER"
          ).length;
          results.alertsSent += r.actions.filter(
            (a) => a.type === "CREATE_COMPLIANCE_ALERT" || a.type === "ALERT_HIGH_LIABILITY"
          ).length;
        }
      }
    } catch (err) {
      console.error(JSON.stringify({
        type: "scheduled_agent_user_error",
        uid,
        error: err.message,
      }));
    }
  }

  const elapsed = Date.now() - startTime;

  // 5. Log the scheduled run
  console.log(JSON.stringify({
    type: "scheduled_agent_complete",
    ...results,
    elapsedMs: elapsed,
    timestamp: new Date().toISOString(),
  }));

  return results;
}

// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------

module.exports = async function agentHandler(req, res) {
  const { handleCors, setCorsHeaders } = require("../lib/cors");
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req);

  try {
    // -------------------------------------------------------------------
    // POST /api/invoices — authoritative invoice upload endpoint.
    // Flow: auth → effective plan → atomic reserve (idempotent by uploadId)
    //       → server-side bill save → agent chain → response.
    // -------------------------------------------------------------------
    if (req.method === "POST" && (req.url.includes("/api/invoices") || req.url.endsWith("/invoices"))) {
      const { verifyAuth } = require("../lib/admin");
      const { reserveUsage, releaseUsage, getUsageEvent, finalizeUsage } = require("../lib/usage");
      const decoded = await verifyAuth(req);
      const uid = decoded.uid;

      let body = req.body;
      if (body === undefined) {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
          if (Buffer.concat(chunks).length > 4 * 1024 * 1024) {
            res.status(413).json({ success: false, error: "Payload too large", code: "PAYLOAD_TOO_LARGE" });
            return;
          }
        }
        const bodyStr = Buffer.concat(chunks).toString("utf8");
        try {
          body = JSON.parse(bodyStr);
        } catch {
          res.status(400).json({ success: false, error: "Invalid JSON", code: "INVALID_JSON" });
          return;
        }
      }
      if (!body || typeof body !== "object") body = {};

      const uploadId = String(body.uploadId || "").trim();
      const invoice = body.invoice || {};
      if (!uploadId) {
        res.status(400).json({ success: false, error: "Missing uploadId (idempotency key)", code: "MISSING_UPLOAD_ID" });
        return;
      }
      if (!invoice || typeof invoice !== "object" || (!invoice.supplierName && !invoice.invoiceNumber)) {
        res.status(400).json({ success: false, error: "Invoice data is required (supplierName or invoiceNumber)", code: "INVALID_INVOICE" });
        return;
      }

      // 1. Atomically reserve one monthly invoice slot (idempotent).
      const reserved = await reserveUsage(uid, "invoiceUploads", uploadId, {
        requiredPlan: null,
      });

      if (!reserved.allowed) {
        const plan = await getPlanForUser(uid);
        const bodyOut = {
          success: false,
          code: reserved.reason,
          error:
            reserved.reason === "FAIR_USE_LIMIT_REACHED"
              ? `Fair-use processing threshold reached (${reserved.used}). No further invoices can be processed right now — please try later or contact support.`
              : `Monthly invoice limit reached (${reserved.used}/${reserved.limit}). Upgrade to Pro for 100 invoice uploads/month, or to Business for higher/fair-use processing.`,
          usage: { used: reserved.used, limit: reserved.limit, plan },
          requiredPlan: "pro",
        };
        res.status(403).json(bodyOut);
        return;
      }

      // Idempotent replay: this uploadId was already accepted. Return the
      // previously created bill instead of saving a duplicate.
      if (reserved.alreadyProcessed) {
        const existingEvent = await getUsageEvent(uid, "invoiceUploads", uploadId).catch(() => null);
        if (existingEvent && existingEvent.billId) {
          res.status(200).json({
            success: true,
            billId: existingEvent.billId,
            alreadyProcessed: true,
            chainStatus: existingEvent.chainStatus || "skipped",
            usage: {
              used: reserved.used,
              limit: reserved.limit,
              plan: reserved.plan,
              period: reserved.period,
              fairUse: reserved.fairUse,
            },
          });
          return;
        }
      }

      try {
        // 2. Persist the invoice server-side (never trusted from the client).
        const businessId = body.businessId || null;
        const billId = await saveBill(uid, {
          ...invoice,
          businessId,
        });
        if (!billId) {
          throw new Error("Bill could not be saved");
        }

        // 3. Record the produced bill on the reservation so replays return
        //    the same billId (no duplicates) instead of re-saving.
        await finalizeUsage(uid, "invoiceUploads", uploadId, {
          billId,
          plan: reserved.plan,
          period: reserved.period,
        }).catch(() => {});

        // 4. Trigger the invoice agent chain (same behavior as before) — but
        //    FIRE-AND-FORGET. The invoice is already persisted; the chain is
        //    non-fatal and only produces insights/reminders. Blocking the HTTP
        //    response on 2-4 sequential Gemini calls made uploads feel slow.
        //    The chain still runs server-side and its results are recorded in
        //    agentRuns (visible on the AI Agent page).
        Promise.resolve()
          .then(() =>
            runAgentChain(uid, "invoice_uploaded", {
              invoice,
              business: body.business || (businessId ? { id: businessId } : {}),
              billId,
            })
          )
          .catch((chainErr) => {
            console.warn(`[invoices] Agent chain failed for bill ${billId}:`, chainErr.message);
          });

        res.status(200).json({
          success: true,
          billId,
          chainStatus: "started",
          usage: {
            used: reserved.used,
            limit: reserved.limit,
            plan: reserved.plan,
            period: reserved.period,
            fairUse: reserved.fairUse,
          },
        });
      } catch (saveErr) {
        // 5. Refund the reserved slot — the invoice was never accepted, so
        //    the user's quota must not be consumed.
        console.error(`[invoices] Save failed for uploadId ${uploadId}:`, saveErr.message);
        await releaseUsage(uid, "invoiceUploads", uploadId).catch(() => {});
        res.status(502).json({
          success: false,
          error: "Invoice could not be saved. Please try again.",
          code: "SAVE_FAILED",
        });
      }
      return;
    }

    // Scheduled agent endpoint (called by Vercel Cron)
    // Uses CRON_SECRET for auth instead of Firebase token
    if (req.method === "GET" && req.query.schedule === "true") {
      const authHeader = req.headers.authorization || "";
      const cronSecret = process.env.CRON_SECRET;

      // Verify cron secret
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      const results = await runScheduledAgent();
      res.status(200).json({ success: true, ...results });
      return;
    }

    // Authenticated user endpoints
    const decoded = await verifyAuth(req);
    const uid = decoded.uid;

    if (req.method === "GET") {
      const { getRecentRuns } = require("../lib/agentRunLogger");
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const runs = await getRecentRuns(uid, limit);
      res.status(200).json({ success: true, runs });
      return;
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      res.status(405).json({ success: false, error: "Method not allowed" });
      return;
    }

    // Read body. The local Express server (server.js) parses JSON into
    // req.body via express.json(), which CONSUMES the raw stream. Reading the
    // stream again yields nothing and every request fails with 400 "Invalid
    // JSON". On serverless runtimes (Vercel) req.body is undefined, so fall
    // back to reading the raw stream there.
    let body = req.body;
    if (body === undefined) {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
        if (Buffer.concat(chunks).length > 1024 * 1024) {
          res.status(413).json({ success: false, error: "Payload too large" });
          return;
        }
      }
      const bodyStr = Buffer.concat(chunks).toString("utf8");
      try {
        body = JSON.parse(bodyStr);
      } catch {
        res.status(400).json({ success: false, error: "Invalid JSON" });
        return;
      }
    }
    if (!body || typeof body !== "object") body = {};

    const { trigger, invoice, business, billId } = body;
    if (!trigger) {
      res.status(400).json({ success: false, error: "Missing 'trigger' field" });
      return;
    }

    // Server-side entitlement check for invoice processing.
    if (trigger === "invoice_uploaded") {
      const limitError = await enforceInvoiceLimit(uid);
      if (limitError) {
        res.status(limitError.status).json(limitError.body);
        return;
      }
    }

    // Autonomous/advanced workflows are Business-only (AI Operations Agent).
    if (trigger === "run_full_analysis") {
      const gate = await checkFeatureAccess(uid, "automated_compliance");
      if (!gate.allowed) {
        res.status(403).json({
          success: false,
          code: "FEATURE_NOT_INCLUDED",
          error:
            "Automated compliance workflows are available on the Business plan. Upgrade to unlock continuous monitoring and approved workflows.",
          requiredPlan: "business",
          currentPlan: gate.currentPlan,
        });
        return;
      }
    }

    const startTime = Date.now();
    const chainResult = await runAgentChain(uid, trigger, { invoice, business, billId });
    const elapsed = Date.now() - startTime;

    console.log(JSON.stringify({
      type: "agent_chain_complete",
      uid,
      trigger,
      status: chainResult.status,
      agentsExecuted: chainResult.results.length,
      elapsedMs: elapsed,
    }));

    res.status(200).json({ success: true, ...chainResult });
  } catch (err) {
    const status = err.status || 500;
    const code = err.code || "INTERNAL_ERROR";
    const message = err.safeMessage || "An unexpected error occurred";
    console.error(JSON.stringify({ type: "agent_error", status, code, message: err.message }));
    res.status(status).json({ success: false, error: message, code });
  }
};
