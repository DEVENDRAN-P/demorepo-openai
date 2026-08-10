/**
 * Agent Service — client-side helper for the Agent Orchestrator.
 *
 * All calls go through POST /api/agent or GET /api/agent with a Firebase
 * ID token. No secrets are exposed to the browser.
 */

import { auth } from '../config/firebase';
import { safeJson } from '../utils/safeHttp';

class AgentError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = 'AgentError';
    this.code = code;
    this.status = status;
  }
}

async function getToken() {
  const user = auth.currentUser;
  if (!user) throw new AgentError('Not authenticated', 'UNAUTHORIZED', 401);
  return user.getIdToken();
}

function getApiUrl(path = '/api/agent') {
  if (window.location.hostname === 'localhost') {
    return `http://localhost:5000${path}`;
  }
  return path;
}

/**
 * Execute an agent chain.
 * @param {string} trigger - e.g. "invoice_uploaded", "run_compliance", etc.
 * @param {object} payload - e.g. { invoice: {...}, business: {...} }
 * @returns {Promise<object>} chain result
 */
export async function runAgentChain(trigger, payload = {}) {
  const token = await getToken();
  const url = getApiUrl();

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ trigger, ...payload }),
  });

  const data = await safeJson(res);
  if (!data.success) {
    const message =
      data.error ||
      (data._raw ? `The agent service returned an unexpected response (HTTP ${res.status}).` : 'Agent chain failed');
    throw new AgentError(message, data.code || 'AGENT_ERROR', res.status);
  }
  return data;
}

/**
 * Fetch recent agent runs for the current user.
 * @param {number} limit - max runs to return (default 50)
 * @returns {Promise<object[]>} array of agent run documents
 */
export async function getAgentRuns(limit = 50) {
  const token = await getToken();
  const url = getApiUrl(`/api/agent?limit=${limit}`);

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await safeJson(res);
  if (!data.success) {
    const message =
      data.error ||
      (data._raw ? `The agent service returned an unexpected response (HTTP ${res.status}).` : 'Failed to fetch agent runs');
    throw new AgentError(message, data.code || 'AGENT_ERROR', res.status);
  }
  return data.runs;
}

/**
 * Process an uploaded invoice through the full agent chain.
 * This is the main entry point for invoice upload → agent execution.
 * `billId` is the Firestore id of the already-saved invoice so agents can
 * exclude it from duplicate detection.
 */
export async function processInvoice(invoiceData, businessContext, billId) {
  return runAgentChain('invoice_uploaded', {
    invoice: invoiceData,
    business: businessContext,
    billId,
  });
}

/**
 * Run compliance analysis agent.
 */
export async function runCompliance(businessId) {
  return runAgentChain('run_compliance', { business: { id: businessId } });
}

/**
 * Run tax forecast agent.
 */
export async function runForecast(businessId) {
  return runAgentChain('run_forecast', { business: { id: businessId } });
}

/**
 * Run business intelligence agent.
 */
export async function runInsights(businessId) {
  return runAgentChain('run_insights', { business: { id: businessId } });
}

/**
 * Run all agents in sequence.
 */
export async function runFullAnalysis(businessId) {
  return runAgentChain('run_full_analysis', { business: { id: businessId } });
}

export { AgentError };
