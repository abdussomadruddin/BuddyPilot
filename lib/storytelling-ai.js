// AI text provider for Facebook Storytelling. Server-side only: the key is read
// from the environment and never reaches the browser. Gemini is the one
// provider today; another is added by writing one more entry in PROVIDERS.
const DEFAULT_MODEL = "gemini-3.8-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const RETRY_DELAYS_MS = [1500, 4000];
const MAX_RETRY_WAIT_MS = 15000;
const REQUEST_TIMEOUT_MS = 45000;

class AiError extends Error {
  constructor(code, message, statusCode = 502) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

function aiConfig(env = process.env) {
  const provider = String(env.STORYTELLING_AI_PROVIDER || "gemini").trim().toLowerCase();
  return {
    provider,
    model: String(env.STORYTELLING_AI_MODEL || env.GEMINI_MODEL || DEFAULT_MODEL).trim(),
    keyConfigured: Boolean(String(env.GEMINI_API_KEY || "").trim()),
  };
}

function requireKey(env) {
  const key = String(env.GEMINI_API_KEY || "").trim();
  if (!key) throw new AiError("not_configured", "GEMINI_API_KEY belum ditetapkan pada server. Tambah di Vercel Environment Variables.", 503);
  return key;
}

// Seconds from Google's RetryInfo ("17s"), if the error carries one.
function retryDelayMs(payload) {
  const info = (payload?.error?.details || []).find((item) => String(item?.["@type"] || "").endsWith("RetryInfo"));
  const seconds = Number.parseFloat(String(info?.retryDelay || ""));
  return Number.isFinite(seconds) ? Math.ceil(seconds * 1000) : null;
}

// A daily or free-tier quota will not recover by waiting a few seconds.
function quotaExhausted(payload) {
  const text = JSON.stringify(payload?.error || {}).toLowerCase();
  return /perday|per_day|per day|daily|free_tier_requests|limit: 0|billing/.test(text);
}

function geminiError(status, payload) {
  const message = String(payload?.error?.message || "").slice(0, 300);
  if (status === 429) {
    return quotaExhausted(payload)
      ? new AiError("quota", "Kuota percuma Gemini dah habis buat masa ini. Cuba semula esok; BuddyPilot tidak akan bertukar ke model berbayar.", 429)
      : new AiError("rate_limit", "Gemini sedang hadkan permintaan. Tunggu seminit dan cuba semula.", 429);
  }
  if (status === 404) return new AiError("model_unavailable", "Model AI tidak dijumpai atau tidak boleh diakses dengan API key ini. Semak nama model di AI Settings.", 502);
  if (status === 400 && /api key/i.test(message)) return new AiError("auth", "GEMINI_API_KEY tidak sah.", 502);
  if (status === 401 || status === 403) return new AiError("auth", "GEMINI_API_KEY ditolak oleh Gemini. Semak key dan kebenarannya.", 502);
  if (status >= 500) return new AiError("unavailable", "Gemini tidak tersedia buat sementara. Cuba semula sebentar lagi.", 503);
  return new AiError("provider_error", `Gemini menolak permintaan (${status}).${message ? ` ${message}` : ""}`, 502);
}

async function geminiCall(path, { method = "GET", body, env, deps }) {
  const key = requireKey(env);
  for (let attempt = 0; ; attempt += 1) {
    let response;
    try {
      response = await deps.fetch(`${GEMINI_BASE}/${path}`, {
        method,
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      if (attempt < RETRY_DELAYS_MS.length && error?.name !== "TimeoutError") {
        await deps.sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw new AiError("network", error?.name === "TimeoutError" ? "Gemini mengambil masa terlalu lama. Cuba semula." : "Tidak dapat menghubungi Gemini. Semak sambungan dan cuba semula.", 504);
    }
    const payload = await response.json().catch(() => ({}));
    if (response.ok) return payload;
    const error = geminiError(response.status, payload);
    const retryable = error.code === "rate_limit" || error.code === "unavailable";
    const wait = retryDelayMs(payload) ?? RETRY_DELAYS_MS[attempt];
    if (!retryable || attempt >= RETRY_DELAYS_MS.length || wait > MAX_RETRY_WAIT_MS) throw error;
    await deps.sleep(wait);
  }
}

const PROVIDERS = {
  gemini: {
    async generate({ model, system, prompt, json, maxOutputTokens, temperature }, context) {
      const payload = await geminiCall(`models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        body: {
          ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature, maxOutputTokens, ...(json ? { responseMimeType: "application/json" } : {}) },
        },
        ...context,
      });
      const candidate = payload?.candidates?.[0];
      const text = (candidate?.content?.parts || []).map((part) => part?.text || "").join("").trim();
      if (!text) {
        const reason = payload?.promptFeedback?.blockReason || candidate?.finishReason || "";
        throw new AiError("empty", reason ? `Gemini tidak memulangkan teks (${reason}). Ubah topik atau cuba semula.` : "Gemini tidak memulangkan teks. Cuba semula.", 502);
      }
      return { text, incomplete: candidate?.finishReason === "MAX_TOKENS", usage: payload?.usageMetadata || null };
    },
    async verify({ model }, context) {
      const info = await geminiCall(`models/${encodeURIComponent(model)}`, context);
      return {
        model: String(info?.name || "").replace(/^models\//, "") || model,
        displayName: info?.displayName || "",
        inputTokenLimit: info?.inputTokenLimit || null,
        outputTokenLimit: info?.outputTokenLimit || null,
        canGenerate: (info?.supportedGenerationMethods || []).includes("generateContent"),
      };
    },
  },
};

function resolve(env, deps) {
  const config = aiConfig(env);
  const provider = PROVIDERS[config.provider];
  if (!provider) throw new AiError("not_configured", `Provider AI "${config.provider}" tidak disokong.`, 503);
  const context = { env, deps: { fetch: deps?.fetch || fetch, sleep: deps?.sleep || ((ms) => new Promise((done) => setTimeout(done, ms))) } };
  return { config, provider, context };
}

async function generateText({ system = "", prompt, json = false, maxOutputTokens = 8192, temperature = 0.9 }, { env = process.env, deps } = {}) {
  const { config, provider, context } = resolve(env, deps);
  const result = await provider.generate({ model: config.model, system, prompt, json, maxOutputTokens, temperature }, context);
  return { ...result, model: config.model, provider: config.provider };
}

async function verifyModel({ env = process.env, deps } = {}) {
  const { config, provider, context } = resolve(env, deps);
  return { provider: config.provider, ...await provider.verify({ model: config.model }, context) };
}

// Models sometimes wrap JSON in a code fence even in JSON mode.
function parseJson(text) {
  const body = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(body);
  } catch {
    const start = body.indexOf("{");
    const end = body.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try { return JSON.parse(body.slice(start, end + 1)); } catch {}
    }
    throw new AiError("bad_output", "Jawapan AI tidak lengkap. Cuba semula.", 502);
  }
}

module.exports = { AiError, DEFAULT_MODEL, aiConfig, generateText, parseJson, verifyModel };
