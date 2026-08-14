/**
 * CENTRALIZED FRONTEND USAGE SERVICE.
 *
 * All usage counters, limits and feature locks read from the backend
 * (GET /api/usage, GET /api/entitlements, POST /api/usage/reserve). The
 * browser NEVER decides entitlement on its own — localStorage is display
 * cache only and the authoritative plan comes from the server.
 *
 * Pages that previously counted usage in localStorage (Document Assistant,
 * BillUpload) must migrate here so counters always match the backend.
 */

import { auth } from "../config/firebase";
import { safeJson } from "../utils/safeHttp";

const getApiUrl = (path) => {
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
    window.location.port !== "5000"
  ) {
    return `http://localhost:5000${path}`;
  }
  return path;
};

const getToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  return user.getIdToken();
};

// Module-level cache with short TTL so multiple components on one page do
// not each fire a request. invalidateUsageCache() forces a fresh read.
let cachedUsage = null;
let cachedAt = 0;
const CACHE_TTL = 15000;

export const invalidateUsageCache = () => {
  cachedUsage = null;
  cachedAt = 0;
};

/**
 * Fetch the user's real monthly usage + limits from the backend.
 * @returns {Promise<{period: string, plan: string, counts: object, limits: object}>}
 */
export const fetchUsage = async (force = false) => {
  const now = Date.now();
  if (!force && cachedUsage && now - cachedAt < CACHE_TTL) {
    return cachedUsage;
  }
  try {
    const token = await getToken();
    const res = await fetch(getApiUrl("/api/usage"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Usage request failed (HTTP ${res.status})`);
    const data = await safeJson(res);
    if (!data || !data.usage) throw new Error("Invalid usage payload");
    cachedUsage = data.usage;
    cachedAt = now;
    return data.usage;
  } catch (err) {
    // Never guess counters — return a safe empty shape so the UI shows 0
    // rather than fabricated numbers.
    return {
      period: "",
      plan: "free",
      counts: { invoiceUploads: 0, aiExtractions: 0, documents: 0, reports: 0, aiInsights: 0 },
      limits: {},
    };
  }
};

/**
 * Fetch the full entitlement snapshot (plan + per-feature status + usage).
 */
export const fetchEntitlements = async () => {
  try {
    const token = await getToken();
    const res = await fetch(getApiUrl("/api/entitlements"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Entitlements request failed (HTTP ${res.status})`);
    const data = await safeJson(res);
    return data;
  } catch (err) {
    return { plan: "free", usage: {}, limits: {}, features: {} };
  }
};

/**
 * Atomically reserve one unit of a monthly metric on the backend
 * (idempotent by requestId). Returns the raw backend response.
 * Throws { code, message, usage } on 403 PLAN_LIMIT_REACHED.
 */
export const reserveUsage = async (metric, requestId) => {
  const token = await getToken();
  const res = await fetch(getApiUrl("/api/usage/reserve"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ metric, requestId }),
  });
  const data = await safeJson(res);
  if (!res.ok || !data.success) {
    const err = new Error(data.error || "Usage reservation failed");
    err.code = data.code || "USAGE_ERROR";
    err.usage = data.usage;
    throw err;
  }
  invalidateUsageCache();
  return data;
};

/**
 * Refund a reserved slot (compensating action on failure).
 */
export const releaseUsage = async (metric, requestId) => {
  try {
    const token = await getToken();
    const res = await fetch(getApiUrl("/api/usage/release"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ metric, requestId }),
    });
    await safeJson(res);
    invalidateUsageCache();
  } catch (err) {
    // Non-fatal — release is best-effort compensation.
  }
};

/** Generate a unique idempotency key (uploadId / requestId). */
export const generateRequestId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

/** Human display for a metric's limit ("5", "100", "Unlimited", "Fair-use"). */
export const displayMetricLimit = (usage, metric) => {
  const lim = (usage && usage.limits && usage.limits[metric]) || {};
  if (lim.display) {
    if (lim.display === "9007199254740991") return "Unlimited";
    return lim.display;
  }
  if (!lim.limit || lim.limit === Number.MAX_SAFE_INTEGER || String(lim.limit) === "9007199254740991" || lim.fairUse || lim.limit >= Number.MAX_SAFE_INTEGER) {
    return lim.fairUse ? "Fair-use" : "Unlimited";
  }
  return String(lim.limit);
};

/** Usage count for a metric (0 when missing). */
export const metricCount = (usage, metric) => {
  return (usage && usage.counts && typeof usage.counts[metric] === "number")
    ? usage.counts[metric]
    : 0;
};

const usageService = {
  fetchUsage,
  fetchEntitlements,
  reserveUsage,
  releaseUsage,
  generateRequestId,
  invalidateUsageCache,
  displayMetricLimit,
  metricCount,
};

export default usageService;
