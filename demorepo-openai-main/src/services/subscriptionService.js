/**
 * Subscription service — resolves the user's ACTIVE PLAN from the server
 * (GET /api/subscription/status). The browser never decides entitlement on
 * its own; localStorage values are treated as display cache only.
 */

import { auth } from '../config/firebase';
import { safeJson } from '../utils/safeHttp';

const getApiUrl = (path) => {
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return `http://localhost:5000${path}`;
  }
  return path;
};

// Module-level deduplication: multiple components mount on the same page and
// each would otherwise fire its own request to /api/subscription/status.
let cachedPlanPromise = null;

/**
 * Drop the cached plan so the next fetchActivePlan() call hits the server.
 * Called by payment/plan-change flows before dispatching 'planChanged'.
 */
export const invalidatePlanCache = () => {
  cachedPlanPromise = null;
};

/**
 * Fetch the user's plan from the backend (deduplicated per page load).
 * @returns {Promise<string>} 'free' | 'pro' | 'business'
 */
export const fetchActivePlan = async () => {
  if (!cachedPlanPromise) {
    cachedPlanPromise = fetchActivePlanFromServer();
  }
  return cachedPlanPromise;
};

const fetchActivePlanFromServer = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return 'free';
    const token = await user.getIdToken();
    const res = await fetch(getApiUrl('/api/subscription/status'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      // A server error must never silently downgrade a paying user to Free.
      // Fall back to the cached display value instead.
      const cached = localStorage.getItem('saas_active_plan');
      return cached === 'pro' || cached === 'business' ? cached : 'free';
    }
    const data = await safeJson(res);
    const plan = data?.subscription?.subscriptionPlan || 'free';
    if (plan === 'pro' || plan === 'business') {
      localStorage.setItem('saas_active_plan', plan);
    } else {
      localStorage.removeItem('saas_active_plan');
    }
    return plan === 'pro' || plan === 'business' ? plan : 'free';
  } catch (err) {
    // Fall back to cached display value (never an authorization source).
    const cached = localStorage.getItem('saas_active_plan');
    return cached === 'pro' || cached === 'business' ? cached : 'free';
  }
};
