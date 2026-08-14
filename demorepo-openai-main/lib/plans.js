/**
 * CENTRAL SUBSCRIPTION CONFIGURATION — single source of truth.
 *
 * Every limit, price and feature entitlement in GST Buddy is derived from
 * this module (server-side). The browser mirror lives at
 * src/config/plans.js and MUST stay in sync (verified by tests).
 *
 * Plans: free | pro | business
 * Prices (INR / month): 0 | 199 | 499
 *
 * Limits are per calendar month and stored with an explicit period key
 * (YYYY-MM). "unlimited" means no hard cap; "fair_use" means the plan is
 * advertised as unlimited/fair-use but has a configurable internal safety
 * ceiling so external AI/API costs cannot run away. The safety ceiling is
 * never advertised to the user unless it is actually reached.
 */

// ---------------------------------------------------------------------------
// Prices (INR per month). The backend resolves amounts from here — a price
// sent by the client is NEVER trusted (see api/billing.js).
// ---------------------------------------------------------------------------
const PLAN_PRICES = {
  free: 0,
  pro: 199,
  business: 499,
};

// ---------------------------------------------------------------------------
// Monthly usage limits.
//
// Values are either a number, "unlimited", or "fair_use". The fair-use
// safety ceiling for each metric can be overridden with environment
// variables so operators can tune external AI/API cost control per plan.
// ---------------------------------------------------------------------------
const PLAN_LIMITS = {
  invoiceUploads: {
    free: 10,
    pro: 50,
    business: "fair_use",
  },
  aiExtractions: {
    free: 10,
    pro: 50,
    business: "fair_use",
  },
  documents: {
    free: 5,
    pro: 20,
    business: "fair_use",
  },
  reports: {
    free: 2,
    pro: 10,
    business: "unlimited",
  },
  aiInsights: {
    free: 3,
    pro: 20,
    business: "unlimited",
  },
};

// Internal safety ceilings for "fair_use" plans (never advertised).
const FAIR_USE_CEILINGS = {
  invoiceUploads: parseInt(process.env.BUSINESS_FAIR_USE_INVOICES || "1000", 10),
  aiExtractions: parseInt(process.env.BUSINESS_FAIR_USE_AI_EXTRACTIONS || "1000", 10),
  documents: parseInt(process.env.BUSINESS_FAIR_USE_DOCUMENTS || "500", 10),
};

// ---------------------------------------------------------------------------
// Multi-business limits (number of businesses allowed per plan).
// Free users may keep their primary profile only.
// ---------------------------------------------------------------------------
const MULTI_BUSINESS_LIMITS = {
  free: 1,
  pro: 2,
  business: 5,
};

// ---------------------------------------------------------------------------
// Feature entitlement matrix.
//
// levels:
//   "available"  — fully available
//   "basic"      — available in a basic/limited form
//   "advanced"   — available in advanced form
//   "blocked"    — not included on this plan
//
// required: the plan a user must hold to unlock the feature at all
// (used by upgrade prompts). metric: optional usage metric tied to the
// feature (see PLAN_LIMITS).
// ---------------------------------------------------------------------------
const FEATURES = {
  invoice_upload: {
    label: "Invoice uploads",
    description: "Upload and process GST invoices with OCR + AI extraction.",
    plans: { free: "available", pro: "available", business: "available" },
    required: null,
    metric: "invoiceUploads",
  },
  ai_extraction: {
    label: "AI invoice extraction",
    description: "AI-powered invoice data extraction (OCR + Gemini).",
    plans: { free: "available", pro: "available", business: "available" },
    required: null,
    metric: "aiExtractions",
  },
  document_assistant: {
    label: "Document Assistant",
    description: "Analyze GST notices, legal documents and vendor statements with AI.",
    plans: { free: "available", pro: "available", business: "available" },
    required: null,
    metric: "documents",
  },
  ai_insights: {
    label: "AI Insights",
    description: "Automated business, spend and compliance insights from your invoices.",
    plans: { free: "available", pro: "available", business: "available" },
    required: null,
    metric: "aiInsights",
  },
  reports: {
    label: "PDF reports",
    description: "Executive financial & audit reports (PDF/CSV/JSON exports).",
    plans: { free: "available", pro: "available", business: "available" },
    required: null,
    metric: "reports",
  },
  ai_accountant: {
    label: "AI Accountant",
    description:
      "Your AI finance assistant analyzes invoices, expenses, GST liability and business performance.",
    plans: { free: "blocked", pro: "available", business: "advanced" },
    required: "pro",
  },
  ai_finance_agent: {
    label: "AI Finance Agent",
    description: "Ask your AI CFO anything about your finances, taxes and compliance.",
    plans: { free: "basic", pro: "available", business: "advanced" },
    required: null,
  },
  tax_forecast: {
    label: "Tax Forecast",
    description: "Forecast GST liability and cash-flow impact from your invoice history.",
    plans: { free: "basic", pro: "available", business: "advanced" },
    required: null,
  },
  penalty_estimator: {
    label: "Penalty Estimator",
    description: "Estimate late-filing penalties for GSTR-1 / GSTR-3B.",
    plans: { free: "available", pro: "available", business: "available" },
    required: null,
  },
  vendor_intelligence: {
    label: "Vendor Intelligence",
    description: "Vendor spend, concentration and risk analysis.",
    plans: { free: "basic", pro: "available", business: "advanced" },
    required: null,
  },
  business_health: {
    label: "Business Health",
    description: "Business health and compliance scoring from your data.",
    plans: { free: "basic", pro: "available", business: "advanced" },
    required: null,
  },
  basic_compliance: {
    label: "Basic compliance",
    description: "Core compliance checks, GST reminders and notifications.",
    plans: { free: "available", pro: "available", business: "available" },
    required: null,
  },
  gstr_preview: {
    label: "GSTR-1 / GSTR-3B preview",
    description: "Preview GSTR-1 and GSTR-3B returns from your invoices.",
    plans: { free: "available", pro: "available", business: "available" },
    required: null,
  },
  advanced_reconciliation: {
    label: "Advanced reconciliation",
    description: "Automated invoice-to-return reconciliation and anomaly matching.",
    plans: { free: "blocked", pro: "basic", business: "available" },
    required: "pro",
  },
  audit_center: {
    label: "Audit Center",
    description: "Audit findings, risk flags and remediation tracking.",
    plans: { free: "blocked", pro: "basic", business: "advanced" },
    required: "pro",
  },
  advanced_reports: {
    label: "Advanced reports",
    description: "Advanced/custom financial reports with PDF, CSV and JSON exports.",
    plans: { free: "blocked", pro: "available", business: "available" },
    required: "pro",
  },
  custom_reports: {
    label: "Custom reports",
    description: "Fully custom report builders and scheduled report delivery.",
    plans: { free: "blocked", pro: "blocked", business: "available" },
    required: "business",
  },
  email_reminders: {
    label: "Email reminders",
    description: "Automated email reminders for filing deadlines.",
    plans: { free: "blocked", pro: "available", business: "available" },
    required: "pro",
  },
  automated_compliance: {
    label: "Automated compliance workflows",
    description: "Autonomous compliance monitoring with approved workflows.",
    plans: { free: "blocked", pro: "blocked", business: "available" },
    required: "business",
  },
  autonomous_compliance: {
    label: "Autonomous compliance monitoring",
    description: "Continuous compliance checks with automated anomaly detection.",
    plans: { free: "blocked", pro: "blocked", business: "available" },
    required: "business",
  },
  cashflow_forecasting: {
    label: "Cash-flow forecasting",
    description: "Cash-flow and profitability forecasting from your data.",
    plans: { free: "blocked", pro: "blocked", business: "available" },
    required: "business",
  },
  team_members: {
    label: "Team members",
    description: "Add team members with role-based access.",
    plans: { free: "blocked", pro: "blocked", business: "available" },
    required: "business",
  },
  role_based_access: {
    label: "Role-based access",
    description: "Granular roles and permissions for your team.",
    plans: { free: "blocked", pro: "blocked", business: "available" },
    required: "business",
  },
  priority_support: {
    label: "Priority support",
    description: "Priority support with faster response times.",
    plans: { free: "blocked", pro: "blocked", business: "available" },
    required: "business",
  },
  activity_audit_logs: {
    label: "Activity / audit logs",
    description: "Full activity and audit log trail for your account.",
    plans: { free: "blocked", pro: "blocked", business: "available" },
    required: "business",
  },
  vendor_risk_scoring: {
    label: "Vendor risk scoring",
    description: "Advanced vendor risk scoring and monitoring.",
    plans: { free: "blocked", pro: "blocked", business: "available" },
    required: "business",
  },
  penalty_monitoring: {
    label: "Penalty monitoring",
    description: "Continuous penalty risk monitoring and deadline escalation.",
    plans: { free: "blocked", pro: "blocked", business: "available" },
    required: "business",
  },
  global_search: {
    label: "Global Search",
    description: "Search across invoices, vendors, documents and reminders.",
    plans: { free: "blocked", pro: "available", business: "available" },
    required: "pro",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLANS = ["free", "pro", "business"];

function isPlan(plan) {
  return PLANS.includes(plan);
}

/** Normalize any plan value to one of free|pro|business (default free). */
function normalizePlan(plan) {
  return isPlan(plan) ? plan : "free";
}

/**
 * Resolve the numeric monthly ceiling for a metric on a plan.
 * - "unlimited" → Number.MAX_SAFE_INTEGER (never enforced)
 * - "fair_use" → the configured internal safety ceiling
 * - number     → the number itself
 */
function resolveLimit(plan, metric) {
  const p = normalizePlan(plan);
  const limits = PLAN_LIMITS[metric];
  if (!limits) return Number.MAX_SAFE_INTEGER;
  const value = limits[p];
  if (value === "unlimited") return Number.MAX_SAFE_INTEGER;
  if (value === "fair_use") {
    const ceiling = FAIR_USE_CEILINGS[metric];
    return typeof ceiling === "number" && ceiling > 0 ? ceiling : 1000;
  }
  return typeof value === "number" ? value : Number.MAX_SAFE_INTEGER;
}

/** True when the metric's plan value is the "fair_use" marker. */
function isFairUse(plan, metric) {
  const p = normalizePlan(plan);
  const value = (PLAN_LIMITS[metric] || {})[p];
  return value === "fair_use";
}

/** Human display for a limit: number, "Unlimited" or "Fair-use". */
function displayLimit(plan, metric) {
  const p = normalizePlan(plan);
  const value = (PLAN_LIMITS[metric] || {})[p];
  if (value === "unlimited") return "Unlimited";
  if (value === "fair_use") return "Fair-use";
  return String(value);
}

/** Resolve the feature entry (or null). */
function getFeature(feature) {
  return FEATURES[feature] || null;
}

/** Plan level for a feature on a plan (available|basic|advanced|blocked). */
function featureLevel(feature, plan) {
  const f = getFeature(feature);
  if (!f) return "blocked";
  return f.plans[normalizePlan(plan)] || "blocked";
}

/** True when the feature is usable at all on this plan. */
function featureAllowed(feature, plan) {
  return featureLevel(feature, plan) !== "blocked";
}

/** The plan a user must hold to unlock a feature (null → available on all). */
function requiredPlanFor(feature) {
  const f = getFeature(feature);
  return f ? f.required : null;
}

module.exports = {
  PLANS,
  PLAN_PRICES,
  PLAN_LIMITS,
  FAIR_USE_CEILINGS,
  MULTI_BUSINESS_LIMITS,
  FEATURES,
  isPlan,
  normalizePlan,
  resolveLimit,
  isFairUse,
  displayLimit,
  getFeature,
  featureLevel,
  featureAllowed,
  requiredPlanFor,
};
