/**
 * Server-side Google Gemini service.
 *
 * This module is the single place where Gemini is invoked. The API key is
 * read from the server environment (GEMINI_API_KEY) and is NEVER exposed to
 * the browser. Responses are converted to validated structured JSON before
 * returning to the caller.
 *
 * Env vars:
 *   GEMINI_API_KEY          (required, server-side secret)
 *   GEMINI_MODEL            (optional, default gemini-2.0-flash)
 *   GEMINI_MAX_OUTPUT_TOKENS
 *   GEMINI_TIMEOUT_MS
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { AiHttpError } = require("./admin");
const config = require("./config");
const { RESPONSE_SCHEMAS } = require("./schemas");

let client = null;

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    const err = new AiHttpError(
      503,
      "AI_MISSING_KEY",
      "AI service is not configured yet. Please contact support."
    );
    throw err;
  }
  if (!client) {
    client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return client;
}

function buildModel({ systemInstruction, schema }) {
  const model = getClient().getGenerativeModel({
    model: config.model,
    systemInstruction: systemInstruction || undefined,
  });

  const generationConfig = {
    temperature: 0.2,
    topP: 0.95,
    maxOutputTokens: config.maxOutputTokens,
  };

  if (schema) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = schema;
  }

  return { model, generationConfig };
}

/**
 * Robustly extract a JSON object from a model's free-form response.
 */
function extractJson(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    throw new AiHttpError(502, "AI_INVALID_OUTPUT", "AI returned an empty response.");
  }
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    /* continue */
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch (e) {
      /* continue */
    }
  }
  const brace = trimmed.indexOf("{");
  if (brace >= 0) {
    try {
      return JSON.parse(trimmed.slice(brace));
    } catch (e) {
      /* continue */
    }
  }
  // Last resort: the response may have been truncated mid-token (hitting the
  // model's maxOutputTokens cap). Try to close unterminated strings and open
  // braces/brackets so we still return a usable result.
  const salvaged = salvageJson(trimmed);
  if (salvaged !== null) return salvaged;
  throw new AiHttpError(502, "AI_INVALID_OUTPUT", "AI returned a malformed response.");
}

/**
 * Best-effort repair of a JSON document that was cut off mid-token.
 * Closes unterminated strings and open braces/brackets. Returns the parsed
 * object, or null when the text cannot be salvaged.
 */
function salvageJson(text) {
  const s = (text || "").trim();
  if (!s) return null;
  const first = s.search(/[[{]/);
  if (first < 0) return null;

  let candidate = s.slice(first);
  let inString = false;
  let escaped = false;
  const closers = []; // stack of expected closing chars for open { [

  for (let i = 0; i < candidate.length; i++) {
    const c = candidate[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") closers.push("}");
    else if (c === "[") closers.push("]");
    else if (c === "}" || c === "]") {
      if (closers.pop() !== c) return null; // structurally broken beyond repair
    }
  }

  if (inString) candidate += '"'; // close the unterminated string value
  while (closers.length) candidate += closers.pop();

  try {
    return JSON.parse(candidate);
  } catch (e) {
    return null;
  }
}

function withTimeout(promise, ms) {
  if (!ms || ms <= 0) return promise;
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new AiHttpError(504, "AI_TIMEOUT", "AI service took too long to respond."));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Retry rate-limited (429) calls with limited exponential backoff.
 * Never retries more than twice, never retries non-rate-limit errors.
 */
async function withRateLimitRetry(fn) {
  let attempts = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      const normalized = err instanceof AiHttpError ? err : normalizeError(err);
      if (normalized.code === "AI_RATE_LIMITED" && attempts < 2) {
        attempts += 1;
        await sleep(1500 * Math.pow(2, attempts - 1)); // 1.5s, 3s
        continue;
      }
      throw normalized;
    }
  }
}

function normalizeError(err) {
  if (err instanceof AiHttpError) return err;
  const msg = String((err && err.message) || "Unknown AI error");
  const lower = msg.toLowerCase();

  if (lower.includes("rate limit") || lower.includes("resource_exhausted") || lower.includes("429")) {
    return new AiHttpError(503, "AI_RATE_LIMITED", "AI service is busy. Please try again shortly.");
  }
  if (lower.includes("permission") || lower.includes("api key") || lower.includes("invalid key") || lower.includes("403")) {
    return new AiHttpError(503, "AI_MISSING_KEY", "AI service is not configured correctly.");
  }
  if (lower.includes("not found") || lower.includes("model") || lower.includes("404")) {
    return new AiHttpError(503, "AI_SERVICE_ERROR", "AI model configuration error.");
  }
  console.error("[AI] Gemini call error:", msg);
  return new AiHttpError(502, "AI_SERVICE_ERROR", "AI service temporarily unavailable.");
}

/**
 * Run a structured (JSON) task against Gemini and return the raw response text.
 */
async function generateJsonText({ systemInstruction, prompt, schema }) {
  const { model, generationConfig } = buildModel({ systemInstruction, schema });
  return withRateLimitRetry(async () => {
    try {
      const result = await withTimeout(
        model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig,
        }),
        config.timeoutMs
      );
      const text = result.response.text();
      if (!text) {
        throw new AiHttpError(502, "AI_INVALID_OUTPUT", "AI returned an empty response.");
      }
      return text;
    } catch (err) {
      throw normalizeError(err);
    }
  });
}

/**
 * Run a structured task with image input (inline base64).
 */
async function generateJsonWithImage({ systemInstruction, prompt, schema, base64, mimeType }) {
  const { model, generationConfig } = buildModel({ systemInstruction, schema });
  return withRateLimitRetry(async () => {
    try {
      const result = await withTimeout(
        model.generateContent({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                { inlineData: { mimeType, data: base64 } },
              ],
            },
          ],
          generationConfig,
        }),
        config.timeoutMs
      );
      const text = result.response.text();
      if (!text) {
        throw new AiHttpError(502, "AI_INVALID_OUTPUT", "AI returned an empty response.");
      }
      return text;
    } catch (err) {
      throw normalizeError(err);
    }
  });
}

/**
 * Run a structured task, parse + return the object.
 * `schema` selects both the Gemini response schema and the validator.
 */
async function runStructured(task, { systemInstruction, prompt, base64, mimeType }) {
  const schema = RESPONSE_SCHEMAS[task];
  if (!schema) {
    throw new AiHttpError(400, "INVALID_TASK", `No schema defined for task "${task}".`);
  }
  const rawText = base64
    ? await generateJsonWithImage({
        systemInstruction,
        prompt,
        schema,
        base64,
        mimeType,
      })
    : await generateJsonText({ systemInstruction, prompt, schema });
  return extractJson(rawText);
}

/**
 * Non-streaming conversational generation (gst_assistant).
 */
async function generateText({ systemInstruction, messages }) {
  const { model, generationConfig } = buildModel({ systemInstruction });
  return withRateLimitRetry(async () => {
    try {
      const result = await withTimeout(
        model.generateContent({
          contents: messages,
          generationConfig,
        }),
        config.timeoutMs
      );
      return result.response.text();
    } catch (err) {
      throw normalizeError(err);
    }
  });
}

/**
 * Streaming conversational generation. Returns an async generator that
 * yields text chunks. Errors are normalized to AiHttpError.
 */
async function* streamText({ systemInstruction, messages }) {
  const { model, generationConfig } = buildModel({ systemInstruction });
  try {
    const result = await model.generateContentStream({
      contents: messages,
      generationConfig,
    });
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  } catch (err) {
    throw normalizeError(err);
  }
}

module.exports = {
  runStructured,
  generateText,
  streamText,
  extractJson,
  get model() {
    return config.model;
  },
};
