/**
 * REUSABLE BACKEND ENTITLEMENT AUTHORIZATION.
 *
 * Single entry point for "may this user use feature X right now?"
 *
 *   checkFeatureAccess(userId, feature)
 *     → { allowed: true }
 *     → { allowed: false, reason, currentPlan, requiredPlan, used?, limit? }
 *
 * Every protected backend endpoint (invoice upload, AI tasks, document
 * analysis, reports, agents) must call this BEFORE spending money on OCR /
 * AI / storage. Frontend hiding is NOT security — this is the enforcement
 * layer. It is also exposed read-only to the frontend via GET
 * /api/entitlements so the UI can render locks, counters and upgrade
 * prompts from the SAME configuration.
 */

const {
  getFeature,
  featureLevel,
  featureAllowed,
  requiredPlanFor,
  resolveLimit,
  isFairUse,
  PLAN_LIMITS,
} = require("./plans");
const { getPlanForUser, getUsageForUser } = require("./usage");

const FEATURE_REASONS = {
  FEATURE_NOT_INCLUDED: "FEATURE_NOT_INCLUDED",
  PLAN_LIMIT_REACHED: "PLAN_LIMIT_REACHED",
  FAIR_USE_LIMIT_REACHED: "FAIR_USE_LIMIT_REACHED",
};

/**
 * Authorize a feature for a user.
 *
 * @param {string} uid - Firebase Auth UID
 * @param {string} feature - feature key from lib/plans.js FEATURES
 * @returns {Promise<{allowed: boolean, ...}>}
 */
async function checkFeatureAccess(uid, feature) {
  const featureDef = getFeature(feature);
  if (!featureDef) {
    // Unknown features are denied (fail closed) — never silently allowed.
    return {
      allowed: false,
      reason: FEATURE_REASONS.FEATURE_NOT_INCLUDED,
      currentPlan: await getPlanForUser(uid),
      requiredPlan: null,
      error: `Unknown feature: ${feature}`,
    };
  }

  const currentPlan = await getPlanForUser(uid);
  const level = featureLevel(feature, currentPlan);
  const requiredPlan = requiredPlanFor(feature) || featureDef.required;

  if (level === "blocked") {
    return {
      allowed: false,
      reason: FEATURE_REASONS.FEATURE_NOT_INCLUDED,
      currentPlan,
      requiredPlan,
    };
  }

  // Features with a usage metric must also pass the monthly limit check.
  if (featureDef.metric && PLAN_LIMITS[featureDef.metric]) {
    const usage = await getUsageForUser(uid);
    const limit = resolveLimit(currentPlan, featureDef.metric);
    const used = usage.counts[featureDef.metric] || 0;
    if (used >= limit) {
      return {
        allowed: false,
        reason:
          currentPlan === "business"
            ? FEATURE_REASONS.FAIR_USE_LIMIT_REACHED
            : FEATURE_REASONS.PLAN_LIMIT_REACHED,
        currentPlan,
        requiredPlan,
        used,
        limit,
        fairUse: isFairUse(currentPlan, featureDef.metric),
      };
    }
    return {
      allowed: true,
      currentPlan,
      used,
      limit,
      fairUse: isFairUse(currentPlan, featureDef.metric),
      level,
    };
  }

  return { allowed: true, currentPlan, level };
}

/**
 * Build the full entitlement snapshot for a user (used by GET
 * /api/entitlements and for the frontend feature matrix).
 * Returns the effective plan, per-feature status, usage counters and limits.
 */
async function getEntitlementSnapshot(uid) {
  const currentPlan = await getPlanForUser(uid);
  const usage = await getUsageForUser(uid);

  const features = {};
  for (const key of Object.keys(require("./plans").FEATURES)) {
    const def = getFeature(key);
    const level = featureLevel(key, currentPlan);
    const requiredPlan = requiredPlanFor(key) || def.required;
    let status = "blocked";
    if (level !== "blocked") {
      status = "available";
      if (def.metric) {
        const limit = resolveLimit(currentPlan, def.metric);
        const used = usage.counts[def.metric] || 0;
        status = used >= limit ? "limit_reached" : "available";
      }
    }
    features[key] = {
      label: def.label,
      description: def.description,
      level,
      status,
      requiredPlan,
      planAvailability: def.plans,
    };
  }

  return {
    plan: currentPlan,
    price: require("./plans").PLAN_PRICES[currentPlan] || 0,
    period: usage.period,
    usage: usage.counts,
    limits: usage.limits,
    features,
  };
}

module.exports = {
  FEATURE_REASONS,
  checkFeatureAccess,
  getEntitlementSnapshot,
};
