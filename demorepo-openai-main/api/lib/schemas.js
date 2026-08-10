/**
 * JSON schemas + validators for the structured output of each AI task.
 *
 * Two purposes:
 *  1. `responseSchemas` are passed to Gemini as `responseSchema` so the model
 *     is constrained to emit JSON matching the required shape.
 *  2. `validate*` functions run AFTER generation so the server never returns
 *     malformed or unexpected AI output to the client.
 */

const { AiHttpError } = require("./admin");

const invoiceSchema = {
  type: "OBJECT",
  properties: {
    gstDocumentType: { type: "STRING" },
    invoiceNumber: { type: "STRING" },
    invoiceDate: { type: "STRING" },
    supplierName: { type: "STRING" },
    gstin: { type: "STRING" },
    buyerGstin: { type: "STRING" },
    amount: { type: "NUMBER" },
    taxPercent: { type: "NUMBER" },
    taxAmount: { type: "NUMBER" },
    totalAmount: { type: "NUMBER" },
    hsn: { type: "STRING" },
    invoiceType: { type: "STRING" },
    expenseType: { type: "STRING" },
    category: { type: "STRING" },
    lineItems: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          description: { type: "STRING" },
          hsn: { type: "STRING" },
          quantity: { type: "NUMBER" },
          unitPrice: { type: "NUMBER" },
          taxableValue: { type: "NUMBER" },
          cgst: { type: "NUMBER" },
          sgst: { type: "NUMBER" },
          igst: { type: "NUMBER" },
        },
      },
    },
    extractionConfidence: { type: "STRING" },
    missingFields: { type: "ARRAY", items: { type: "STRING" } },
    ambiguousFields: { type: "ARRAY", items: { type: "STRING" } },
    taxAnalysis: { type: "STRING" },
    riskAnalysis: { type: "STRING" },
    aiSuggestions: { type: "ARRAY", items: { type: "STRING" } },
    boundingBoxes: { type: "OBJECT" },
  },
};

const complianceSchema = {
  type: "OBJECT",
  properties: {
    decision: { type: "STRING" },
    riskLevel: { type: "STRING" },
    explanation: { type: "STRING" },
    prioritizedFindings: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    recommendations: { type: "ARRAY", items: { type: "STRING" } },
    requiresHumanApproval: { type: "BOOLEAN" },
  },
};

const forecastSchema = {
  type: "OBJECT",
  properties: {
    explanation: { type: "STRING" },
    summary: { type: "STRING" },
    drivers: { type: "ARRAY", items: { type: "STRING" } },
    risks: { type: "ARRAY", items: { type: "STRING" } },
    recommendedActions: { type: "ARRAY", items: { type: "STRING" } },
    confidenceComment: { type: "STRING" },
  },
};

const insightSchema = {
  type: "OBJECT",
  properties: {
    headline: { type: "STRING" },
    riskLevel: { type: "STRING" },
    insights: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          type: { type: "STRING" },
          description: { type: "STRING" },
          impact: { type: "STRING" },
          severity: { type: "STRING" },
        },
      },
    },
  },
};

const documentSchema = {
  type: "OBJECT",
  properties: {
    documentType: { type: "STRING" },
    summary: { type: "STRING" },
    clauses: { type: "ARRAY", items: { type: "STRING" } },
    riskLevel: { type: "STRING" },
    deadlines: { type: "STRING" },
    actionItems: { type: "ARRAY", items: { type: "STRING" } },
    suggestedResponse: { type: "STRING" },
  },
};

const RESPONSE_SCHEMAS = {
  invoice_extraction: invoiceSchema,
  compliance_analysis: complianceSchema,
  tax_forecast: forecastSchema,
  business_insight: insightSchema,
  document_analysis: documentSchema,
};

function invalid(code, message) {
  return new AiHttpError(502, code, message);
}

function asStringArray(v) {
  return Array.isArray(v) ? v.map(String).filter(Boolean) : [];
}

function validateInvoice(obj) {
  if (!obj || typeof obj !== "object") {
    throw invalid("AI_INVALID_OUTPUT", "Gemini returned no invoice data.");
  }
  const clean = { ...obj };
  clean.amount = Number(clean.amount);
  clean.taxAmount = Number(clean.taxAmount);
  clean.totalAmount = Number(clean.totalAmount);
  clean.taxPercent = Number(clean.taxPercent) || 18;
  clean.missingFields = asStringArray(clean.missingFields);
  clean.ambiguousFields = asStringArray(clean.ambiguousFields);
  clean.aiSuggestions = asStringArray(clean.aiSuggestions);
  if (!Array.isArray(clean.lineItems)) clean.lineItems = [];
  return clean;
}

function validateCompliance(obj) {
  if (!obj || typeof obj !== "object") {
    throw invalid("AI_INVALID_OUTPUT", "Gemini returned no compliance analysis.");
  }
  return {
    decision: String(obj.decision || "review_required"),
    riskLevel: String(obj.riskLevel || "medium"),
    explanation: String(obj.explanation || ""),
    prioritizedFindings: asStringArray(obj.prioritizedFindings),
    recommendations: asStringArray(obj.recommendations),
    requiresHumanApproval: obj.requiresHumanApproval !== false,
  };
}

function validateForecast(obj) {
  if (!obj || typeof obj !== "object") {
    throw invalid("AI_INVALID_OUTPUT", "Gemini returned no forecast explanation.");
  }
  return {
    explanation: String(obj.explanation || ""),
    summary: String(obj.summary || ""),
    drivers: asStringArray(obj.drivers),
    risks: asStringArray(obj.risks),
    recommendedActions: asStringArray(obj.recommendedActions),
    confidenceComment: String(obj.confidenceComment || ""),
  };
}

function validateInsights(obj) {
  if (!obj || typeof obj !== "object") {
    throw invalid("AI_INVALID_OUTPUT", "Gemini returned no business insights.");
  }
  const insights = Array.isArray(obj.insights) ? obj.insights : [];
  return {
    headline: String(obj.headline || ""),
    riskLevel: String(obj.riskLevel || "medium"),
    insights: insights.map((i) => ({
      title: String(i.title || "Insight"),
      type: String(i.type || "Observation"),
      description: String(i.description || ""),
      impact: String(i.impact || ""),
      severity: String(i.severity || "medium"),
    })),
  };
}

function validateDocument(obj) {
  if (!obj || typeof obj !== "object") {
    throw invalid("AI_INVALID_OUTPUT", "Gemini returned no document analysis.");
  }
  return {
    documentType: String(obj.documentType || "Other"),
    summary: String(obj.summary || ""),
    clauses: asStringArray(obj.clauses),
    riskLevel: String(obj.riskLevel || "low"),
    deadlines: String(obj.deadlines || "N/A"),
    actionItems: asStringArray(obj.actionItems),
    suggestedResponse: String(obj.suggestedResponse || ""),
  };
}

module.exports = {
  RESPONSE_SCHEMAS,
  validateInvoice,
  validateCompliance,
  validateForecast,
  validateInsights,
  validateDocument,
};
