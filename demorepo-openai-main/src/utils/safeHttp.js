/**
 * Safe HTTP helpers.
 *
 * Never blindly `await response.json()`: a proxy or serverless runtime may
 * return an HTML error page (502/503) whose body is not JSON, which makes
 * JSON.parse throw a confusing SyntaxError. `safeJson` returns an object in
 * every case so callers can render a useful error instead of crashing.
 */

/**
 * Parse a fetch Response as JSON. Guaranteed not to throw.
 * When the body is empty, not JSON, or malformed, the returned object
 * includes a `_raw` field with the raw text so callers can detect it.
 *
 * @param {Response} res - a fetch Response
 * @returns {Promise<object>}
 */
export const safeJson = async (res) => {
  let text = "";
  try {
    text = await res.text();
  } catch (e) {
    return { _raw: "", _error: "Could not read the server response." };
  }

  const trimmed = text.trim();
  if (!trimmed) return {};

  const contentType = (res.headers && res.headers.get("content-type")) || "";
  if (contentType.includes("application/json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      return { _raw: text, _error: "Server returned malformed JSON." };
    }
  }
  return { _raw: text, _error: `Server returned an unexpected response (HTTP ${res.status}).` };
};

/**
 * Produce a human-readable error message from a safeJson result + HTTP status.
 */
export const httpErrorText = (data, status = 0, fallback = "Request failed.") => {
  if (data && typeof data.error === "string") return data.error;
  if (data && typeof data.message === "string") return data.message;
  if (data && data._error) return `${data._error}${status ? ` (HTTP ${status})` : ""}`;
  return fallback;
};
