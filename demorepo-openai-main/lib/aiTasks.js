/**
 * Task handlers for the GST Buddy AI Gateway.
 *
 * Each handler receives the validated `input` object and the authenticated
 * user context ({ uid }). Handlers that need business data read the user's
 * Firestore invoices through the Admin SDK (server-side), compute any
 * required numbers deterministically (see ./finance), and use Gemini only
 * for reasoning, explanation, prioritization, and recommendations.
 */

const { AiHttpError, getBillsForUser } = require("./admin");
const gemini = require("./gemini");
const config = require("./config");
const {
  validateInvoice,
  validateCompliance,
  validateForecast,
  validateInsights,
  validateDocument,
} = require("./schemas");
const {
  checkCompliance,
  buildForecast,
  buildMetrics,
  summarizeBills,
} = require("./finance");

const SYSTEM_GUARD =
  "You are part of GST Buddy, a GST compliance platform for Indian small businesses. " +
  "NEVER invent GST laws, tax rates, percentages, or filing deadlines. " +
  "Base every statement strictly on the data provided. " +
  "If a figure or rule is not present in the provided data, say it is not available rather than guessing. " +
  "Never recommend illegal tax avoidance. When an action has legal or financial consequences, mark it as requiring human approval.";

const LANGUAGE_INSTRUCTIONS = {
  en: "Respond in English.",
  hi: "Respond in Hindi (Devanagari script).",
  ta: "Respond in Tamil (Tamil script).",
};

function assertText(value, field, maxChars = config.maxInputChars) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    throw new AiHttpError(400, "INVALID_INPUT", `Missing required field: ${field}`);
  }
  if (text.length > maxChars) {
    throw new AiHttpError(413, "PAYLOAD_TOO_LARGE", `Field "${field}" exceeds the maximum allowed size.`);
  }
  return text;
}

/**
 * Accept an image in any of these shapes and normalize it to
 * { data: <raw base64>, mimeType }:
 *   - { image: "data:image/jpeg;base64,..." }
 *   - { image: "<raw base64>" }
 *   - { image: { data, mimeType } }
 *   - { imageBase64: ... } / { imageData: ... } (aliases)
 * Returns null when no image is present (caller decides the fallback).
 */
function parseImageInput(input) {
  if (!input || typeof input !== "object") return null;
  let raw =
    input.image !== undefined
      ? input.image
      : input.imageBase64 !== undefined
        ? input.imageBase64
        : input.imageData !== undefined
          ? input.imageData
          : null;
  if (raw === null || raw === undefined) return null;

  let data = "";
  let mimeType = "image/jpeg";

  if (typeof raw === "object" && !Array.isArray(raw)) {
    data = typeof raw.data === "string" ? raw.data : "";
    mimeType = raw.mimeType || "image/jpeg";
  } else if (typeof raw === "string" && raw.trim()) {
    data = raw.trim();
  } else {
    return null;
  }

  // Strip any "data:image/...;base64," header so we always pass raw base64.
  const comma = data.indexOf(",");
  if (comma > 0 && data.slice(0, comma).includes("base64")) {
    const header = data.slice(0, comma);
    const m = header.match(/data:([\w/+-]+);/);
    if (m) mimeType = m[1];
    data = data.slice(comma + 1);
  }
  data = data.replace(/\s+/g, "");

  if (!data) {
    throw new AiHttpError(400, "INVALID_INPUT", "Image data is required.");
  }
  if (data.length > config.maxImageChars) {
    throw new AiHttpError(413, "PAYLOAD_TOO_LARGE", "Image file is too large.");
  }
  return { data, mimeType };
}

// ---------------------------------------------------------------------------
// Task: invoice_extraction
// ---------------------------------------------------------------------------

async function handleInvoiceExtraction(input) {
  const business = input.business || {};
  const image = parseImageInput(input);
  const ocrText = typeof input.ocrText === "string" ? input.ocrText.trim() : "";

  let mode;
  if (image) {
    mode = "image";
    console.log("[AI] Invoice extraction: image mode, mimeType:", image.mimeType, "dataLength:", image.data.length);
  } else if (ocrText) {
    mode = "ocr";
    console.log("[AI] Invoice extraction: OCR mode, textLength:", ocrText.length);
  } else {
    console.error("[AI] Invoice extraction: no image or ocrText provided");
    throw new AiHttpError(
      400,
      "INVALID_INPUT",
      "Provide either input.image (base64 data) or input.ocrText to extract invoice data."
    );
  }

  const systemInstruction = [
    SYSTEM_GUARD,
    "You are an expert Indian B2B accountant and tax auditor.",
    "Extract GST metadata from the Indian business invoice.",
    "Rules:",
    "- Do NOT invent values. If a field is absent or unreadable, set it to null and add it to missingFields.",
    "- If a value is partially readable or uncertain, set it to null and add it to ambiguousFields.",
    "- Validate the supplier GSTIN: it must be 15 characters (2-digit state code, 10-char PAN-derived, entity digit, Z, checksum).",
    "- amount = taxable value, taxAmount = total GST, totalAmount = grand total.",
    "- expenseType must be one of: Raw Material | Utilities | Office Supplies | Services | Others.",
    "- extractionConfidence must be 'high', 'medium', or 'low'.",
    "- Return ONLY a JSON object matching the required schema.",
  ].join("\n");

  const businessLine = business.gstin
    ? `Buyer/business context (for buyerGstin): name="${business.name || ""}", gstin="${business.gstin}", state="${business.state || ""}".`
    : "";

  if (mode === "image") {
    const prompt = [
      `Analyze this invoice image and extract the GST metadata. ${businessLine}`,
      "Also estimate boundingBoxes (percentage 0-100: top, left, width, height) for supplierName, gstin, invoiceNumber, invoiceDate, amount, taxAmount, totalAmount.",
      "Return JSON only.",
    ].join("\n");

    const parsed = await gemini.runStructured("invoice_extraction", {
      systemInstruction,
      prompt,
      base64: image.data,
      mimeType: image.mimeType,
    });
    return { data: validateInvoice(parsed), mode };
  }

  const validatedOcr = assertText(ocrText, "ocrText");
  const prompt = [
    `Invoice text extracted by OCR:`,
    "```",
    validatedOcr,
    "```",
    businessLine,
    "Return JSON only.",
  ].join("\n");

  const parsed = await gemini.runStructured("invoice_extraction", {
    systemInstruction,
    prompt,
  });
  return { data: validateInvoice(parsed), mode };
}

// ---------------------------------------------------------------------------
// Task: compliance_analysis
// ---------------------------------------------------------------------------

async function handleComplianceAnalysis(input, { uid }) {
  const businessId = typeof input.businessId === "string" ? input.businessId : null;
  const bills = await getBillsForUser(uid, businessId);

  if (bills.length === 0) {
    return {
      success: true,
      task: "compliance_analysis",
      decision: "no_data",
      riskLevel: "low",
      findings: [],
      recommendations: [
        "Upload your invoices so the Compliance Agent can begin monitoring your transactions.",
      ],
      requiresHumanApproval: false,
      explanation: "No invoices available for compliance analysis yet.",
      counts: { invoicesChecked: 0 },
    };
  }

  const deterministicFindings = checkCompliance(bills);
  const summary = summarizeBills(bills, 40);

  const systemInstruction = [
    SYSTEM_GUARD,
    "You are the GST Compliance Agent for a small business.",
    "You are given: (1) invoices, (2) findings produced by deterministic compliance rules, (3) metrics.",
    "Do NOT invent new compliance violations or tax laws. Only reason about the findings you were given.",
    "Prioritize findings, explain their business impact, and produce concrete, safe recommendations.",
    "If an action would file a return, claim ITC, or otherwise have legal/financial consequences, set requiresHumanApproval=true.",
  ].join("\n");

  const prompt = [
    `Business invoices (up to 40):`,
    summary,
    ``,
    `Deterministic findings (rule-based, treat as facts):`,
    deterministicFindings.length
      ? deterministicFindings
          .map(
            (f, i) =>
              `${i + 1}. [${f.severity}] ${f.type} | invoice=${f.invoiceNumber} | ${f.description}`
          )
          .join("\n")
      : "None detected.",
    ``,
    `Totals: invoices=${bills.length}.`,
    "Return JSON only.",
  ].join("\n");

  const parsed = await gemini.runStructured("compliance_analysis", {
    systemInstruction,
    prompt,
  });
  const validated = validateCompliance(parsed);

  // Keep deterministic findings as the source of truth; Gemini orders them.
  const order = new Map(
    validated.prioritizedFindings.map((id, i) => [id.toLowerCase(), i])
  );
  const findings = [...deterministicFindings].sort((a, b) => {
    const ia = order.has(a.type.toLowerCase()) ? order.get(a.type.toLowerCase()) : 99;
    const ib = order.has(b.type.toLowerCase()) ? order.get(b.type.toLowerCase()) : 99;
    if (ia !== ib) return ia - ib;
    return 0;
  });

  return {
    success: true,
    task: "compliance_analysis",
    decision: validated.decision,
    riskLevel: validated.riskLevel,
    findings,
    recommendations: validated.recommendations,
    requiresHumanApproval: validated.requiresHumanApproval,
    explanation: validated.explanation,
    counts: { invoicesChecked: bills.length, findings: findings.length },
  };
}

// ---------------------------------------------------------------------------
// Task: tax_forecast
// ---------------------------------------------------------------------------

async function handleTaxForecast(input, { uid }) {
  const businessId = typeof input.businessId === "string" ? input.businessId : null;
  const bills = await getBillsForUser(uid, businessId);
  const forecast = buildForecast(bills);

  const systemInstruction = [
    SYSTEM_GUARD,
    "You are the Tax Forecast Agent.",
    "All numbers below were computed deterministically by the system — never change, recompute, or guess them.",
    "Your job is to explain the forecast in plain language: what drives it, what risks exist, and what the business owner should prepare.",
    "Keep the explanation honest about confidence; if data is thin (low confidence), say so.",
  ].join("\n");

  const prompt = [
    `Deterministic forecast for the business:`,
    `- Invoices analysed: ${forecast.invoiceCount}`,
    `- Current month estimated GST liability: ₹${forecast.currentLiability}`,
    `- Next month estimated GST liability: ₹${forecast.nextMonthLiability}`,
    `- Projected change: ${forecast.growth}%`,
    `- Input tax credit available: ₹${forecast.itc}`,
    `- Estimated net GST payable: ₹${forecast.netPayable}`,
    `- Estimated savings buffer: ₹${forecast.savings}`,
    `- Confidence: ${forecast.confidence}`,
    `- 4-month projection chart: ${JSON.stringify(forecast.chart)}`,
    "Return JSON only.",
  ].join("\n");

  const parsed = await gemini.runStructured("tax_forecast", {
    systemInstruction,
    prompt,
  });
  const validated = validateForecast(parsed);

  return {
    success: true,
    task: "tax_forecast",
    forecast,
    explanation: validated.explanation,
    summary: validated.summary,
    drivers: validated.drivers,
    risks: validated.risks,
    recommendedActions: validated.recommendedActions,
    confidenceComment: validated.confidenceComment,
  };
}

// ---------------------------------------------------------------------------
// Task: business_insight
// ---------------------------------------------------------------------------

async function handleBusinessInsight(input, { uid }) {
  const businessId = typeof input.businessId === "string" ? input.businessId : null;
  const bills = await getBillsForUser(uid, businessId);
  const metrics = buildMetrics(bills);

  if (metrics.invoiceCount === 0) {
    return {
      success: true,
      task: "business_insight",
      headline: "No invoices available yet",
      riskLevel: "low",
      insights: [
        {
          title: "Start by uploading invoices",
          type: "Onboarding",
          description:
            "Upload your purchase invoices so the Business Intelligence Agent can analyse your spend, ITC, and compliance posture.",
          impact: "",
          severity: "low",
        },
      ],
    };
  }

  const systemInstruction = [
    SYSTEM_GUARD,
    "You are the Business Intelligence Agent for a small business.",
    "You are given metrics computed deterministically from the business invoices.",
    "Do NOT recompute or invent numbers. Surface observations the owner can act on: spend concentration, ITC opportunity, filing risk, category trends.",
    "Return JSON only.",
  ].join("\n");

  const prompt = [
    `Deterministic business metrics:`,
    `- Invoices: ${metrics.invoiceCount}`,
    `- Total invoice amount: ₹${metrics.totalInvoiceAmount}`,
    `- Total GST recorded: ₹${metrics.totalGSTAmount}`,
    `- Pending filings: ${metrics.pendingFilings}`,
    `- Revenue estimate: ₹${metrics.revenueEstimate}`,
    `- GST payable estimate: ₹${metrics.gstPayableEstimate}`,
    `- ITC available: ₹${metrics.itcAvailable}`,
    `- Net payable: ₹${metrics.netPayable}`,
    `- Top vendors: ${JSON.stringify(metrics.topVendors)}`,
    `- Top categories: ${JSON.stringify(metrics.topCategories)}`,
    "Return JSON only.",
  ].join("\n");

  const parsed = await gemini.runStructured("business_insight", {
    systemInstruction,
    prompt,
  });
  const validated = validateInsights(parsed);

  return {
    success: true,
    task: "business_insight",
    headline: validated.headline,
    riskLevel: validated.riskLevel,
    insights: validated.insights,
  };
}

// ---------------------------------------------------------------------------
// Task: gst_assistant
// ---------------------------------------------------------------------------

function normalizeMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new AiHttpError(400, "INVALID_INPUT", "Assistant requires a non-empty messages array.");
  }
  if (messages.length > 24) {
    messages = messages.slice(messages.length - 24);
  }
  const contents = [];
  for (const m of messages) {
    const role = m.role === "assistant" || m.role === "model" ? "model" : "user";
    const text = typeof m.content === "string" ? m.content.trim() : "";
    if (!text) continue;
    contents.push({ role, parts: [{ text }] });
  }
  if (contents.length === 0) {
    throw new AiHttpError(400, "INVALID_INPUT", "No valid message content provided.");
  }
  // Gemini requires alternating roles; collapse consecutive same roles.
  const collapsed = [];
  for (const c of contents) {
    const prev = collapsed[collapsed.length - 1];
    if (prev && prev.role === c.role) {
      prev.parts.push(...c.parts);
    } else {
      collapsed.push({ role: c.role, parts: [...c.parts] });
    }
  }
  return collapsed;
}

function buildAssistantSystem(input) {
  const business = input.business || {};
  const invoiceSummary =
    typeof input.invoiceSummary === "string" && input.invoiceSummary.trim()
      ? input.invoiceSummary
      : "No invoices loaded.";
  const language = LANGUAGE_INSTRUCTIONS[input.language] || LANGUAGE_INSTRUCTIONS.en;

  return [
    SYSTEM_GUARD,
    `You are "GST Buddy", an AI accountant and GST compliance assistant for the business "${business.name || 'a small business'}"${business.gstin ? ` (GSTIN: ${business.gstin})` : ""}${business.state ? `, ${business.state}` : ""}.`,
    `Invoices currently loaded for this business:`,
    invoiceSummary,
    "Structure answers clearly: direct answer first, then reasoning referencing the provided invoices, then the recommended next action.",
    "Keep answers concise, professional, and explainable. You may reference invoice numbers and amounts only when they appear in the loaded invoices.",
    language,
  ].join("\n");
}

async function handleGSTAssistant(input) {
  const messages = normalizeMessages(input.messages);
  const systemInstruction = buildAssistantSystem(input);
  const text = await gemini.generateText({ systemInstruction, messages });
  return {
    success: true,
    task: "gst_assistant",
    reply: text,
    model: gemini.model,
  };
}

async function* handleGSTAssistantStream(input) {
  const messages = normalizeMessages(input.messages);
  const systemInstruction = buildAssistantSystem(input);
  yield* gemini.streamText({ systemInstruction, messages });
}

// ---------------------------------------------------------------------------
// Task: document_analysis
// ---------------------------------------------------------------------------

async function handleDocumentAnalysis(input) {
  const image = parseImageInput(input);
  const ocrText = typeof input.ocrText === "string" ? input.ocrText.trim() : "";

  let mode;
  if (image) {
    mode = "image";
  } else if (ocrText) {
    mode = "ocr";
  } else {
    throw new AiHttpError(400, "INVALID_INPUT", "Provide either input.image or input.ocrText.");
  }

  const systemInstruction = [
    SYSTEM_GUARD,
    "You are an expert Indian tax attorney and corporate legal advisor.",
    "Analyse the official document (GST notice, tax demand, contract, legal notice, vendor statement).",
    "Do NOT invent deadlines or legal sections that are not stated in the document.",
    "riskLevel must be one of: low | medium | high | critical.",
    "deadlines must be 'YYYY-MM-DD', 'Immediate', or 'N/A'.",
    "Return ONLY a JSON object matching the required schema.",
  ].join("\n");

  const prompt =
    mode === "image"
      ? "Analyse this official document image and extract the structured details. Return JSON only."
      : `Document text extracted by OCR:\n"""\n${assertText(
          ocrText,
          "ocrText"
        )}\n"""\nReturn JSON only.`;

  const parsed = await gemini.runStructured("document_analysis", {
    systemInstruction,
    prompt,
    base64: image ? image.data : undefined,
    mimeType: image ? image.mimeType : undefined,
  });
  return { success: true, task: "document_analysis", data: validateDocument(parsed), mode };
}

module.exports = {
  invoice_extraction: handleInvoiceExtraction,
  compliance_analysis: handleComplianceAnalysis,
  tax_forecast: handleTaxForecast,
  business_insight: handleBusinessInsight,
  gst_assistant: handleGSTAssistant,
  document_analysis: handleDocumentAnalysis,
  gst_assistant_stream: handleGSTAssistantStream,
};
