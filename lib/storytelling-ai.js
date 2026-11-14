// AI text provider for Facebook Storytelling. Server-side only: the key is read
// from encrypted app settings or the environment, never from browser requests.
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
  const defaults = { gemini: DEFAULT_MODEL, openai: "gpt-4.1-mini", deepseek: "deepseek-chat", openrouter: "google/gemma-4-31b-it:free" };
  const variables = { gemini: "GEMINI_API_KEY", openai: "OPENAI_API_KEY", deepseek: "DEEPSEEK_API_KEY", openrouter: "OPENROUTER_API_KEY" };
  return {
    provider,
    model: String(env.STORYTELLING_AI_MODEL || (provider === "gemini" ? env.GEMINI_MODEL : "") || defaults[provider] || "").trim(),
    keyConfigured: Boolean(String(env[variables[provider]] || "").trim()),
  };
}

async function runtimeEnvironment(env, deps) {
  // Explicit environments are used by offline fixtures; production always reads
  // shared settings freshly so a save takes effect across server instances.
  if (env !== process.env && !deps?.keySettings) return env;
  const settings = deps?.keySettings || require("./ai-key-settings");
  try {
    const config = await settings.getGenerationSettings();
    const key = await settings.resolveKey(config.provider);
    const variable = { gemini: "GEMINI_API_KEY", openai: "OPENAI_API_KEY", deepseek: "DEEPSEEK_API_KEY", openrouter: "OPENROUTER_API_KEY" }[config.provider];
    if (!variable) throw new Error();
    return { ...env, STORYTELLING_AI_PROVIDER: config.provider, STORYTELLING_AI_MODEL: config.model, [variable]: key, BUDDYPILOT_FREE_ONLY: config.freeOnly ? "1" : "", BUDDYPILOT_GEMINI_FREE_CONFIRMED: config.geminiFreeTierConfirmed ? "1" : "" };
  } catch {
    throw new AiError("settings_unavailable", "Tetapan AI tidak boleh dibaca. Semak AI API Key dan konfigurasi server.", 503);
  }
}

async function publicAiConfig(options = {}) {
  return aiConfig(await runtimeEnvironment(options.env || process.env, options.deps));
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
  return new AiError("provider_error", `Gemini menolak permintaan (${status}). Semak konfigurasi AI.`, 502);
}

async function geminiCall(path, { method = "GET", body, env, deps, requestTimeoutMs = REQUEST_TIMEOUT_MS, noRetry = false }) {
  const key = requireKey(env);
  for (let attempt = 0; ; attempt += 1) {
    let response;
    try {
      response = await deps.fetch(`${GEMINI_BASE}/${path}`, {
        method,
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(requestTimeoutMs),
        redirect: "error",
      });
    } catch (error) {
      if (!noRetry && attempt < RETRY_DELAYS_MS.length && error?.name !== "TimeoutError") {
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
    if (noRetry || !retryable || attempt >= RETRY_DELAYS_MS.length || wait > MAX_RETRY_WAIT_MS) throw error;
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

function compatibleProvider(name, base, keyVariable) {
  async function call(path, body, context) {
    const key = String(context.env[keyVariable] || "").trim();
    if (!key) throw new AiError("not_configured", "API key belum ditetapkan. Buka Tetapan > AI API Key.", 503);
    let response, payload;
    try {
      response = await context.deps.fetch(`${base}/${path}`, {
        method: body ? "POST" : "GET", redirect: "error",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(context.requestTimeoutMs || REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        if (response.body) await response.body.cancel();
      } else payload = await response.json();
    } catch { throw new AiError("network", `${name} tidak dapat dihubungi atau tamat masa. Cuba semula.`, 504); }
    if (!response.ok) {
      if ([401, 403].includes(response.status)) throw new AiError("auth", `${name} menolak API key. Semak AI API Key.`, 502);
      if ([400, 422].includes(response.status)) throw new AiError("invalid_request", `${name} menolak format permintaan. Semak konfigurasi AI.`, 400);
      if (response.status === 429) throw new AiError("quota", `Kuota atau had request ${name} dicapai.`, 429);
      if (response.status === 404) throw new AiError("model_unavailable", "Model AI tidak dijumpai. Semak model di AI API Key.", 502);
      throw new AiError("provider_error", `${name} tidak dapat memproses permintaan. Cuba semula.`, 502);
    }
    return payload;
  }
  return {
    async generate({ model, system, prompt, json, maxOutputTokens }, context) {
      if (name === "OpenRouter" && !model.endsWith(":free")) throw new AiError("free_only", "OpenRouter hanya membenarkan model :free.", 400);
      const payload = await call("chat/completions", {
        model, messages: [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: json ? `${prompt}\nReturn valid JSON only.` : prompt }],
        ...(json ? { response_format: { type: "json_object" } } : {}),
        ...(name === "OpenAI" ? { max_completion_tokens: maxOutputTokens, store: false } : { max_tokens: maxOutputTokens }),
        ...(name === "OpenRouter" ? { provider: { allow_fallbacks: false, max_price: { prompt: 0, completion: 0 } }, reasoning: { enabled: false } } : {}),
      }, context);
      const choice = payload?.choices?.[0];
      const text = String(choice?.message?.content || "").trim();
      if (!text || !["stop", "length"].includes(choice?.finish_reason)) throw new AiError("empty", `${name} tidak memulangkan teks lengkap. Cuba semula.`, 502);
      return { text, incomplete: choice.finish_reason === "length", usage: payload.usage || null };
    },
    async verify({ model }, context) {
      const payload = await call(name === "OpenAI" ? `models/${encodeURIComponent(model)}` : "models", null, context);
      const item = name === "OpenAI" ? payload : payload.data?.find((row) => row.id === model);
      if (!item?.id) throw new AiError("model_unavailable", "Model tidak tersedia dengan API key ini.", 502);
      return { model: item.id, displayName: item.id, inputTokenLimit: null, outputTokenLimit: null, canGenerate: true };
    },
  };
}

PROVIDERS.openai = compatibleProvider("OpenAI", "https://api.openai.com/v1", "OPENAI_API_KEY");
PROVIDERS.deepseek = compatibleProvider("DeepSeek", "https://api.deepseek.com", "DEEPSEEK_API_KEY");
PROVIDERS.openrouter = compatibleProvider("OpenRouter", "https://openrouter.ai/api/v1", "OPENROUTER_API_KEY");

function resolve(env, deps) {
  const config = aiConfig(env);
  const provider = PROVIDERS[config.provider];
  if (!provider) throw new AiError("not_configured", `Provider AI "${config.provider}" tidak disokong.`, 503);
  const context = { env, deps: { fetch: deps?.fetch || fetch, sleep: deps?.sleep || ((ms) => new Promise((done) => setTimeout(done, ms))) } };
  return { config, provider, context };
}

async function generateText({ system = "", prompt, json = false, maxOutputTokens = 8192, temperature = 0.9 }, { env = process.env, deps } = {}) {
  const deadline = Date.now() + 55000;
  env = await runtimeEnvironment(env, deps);
  if (env.BUDDYPILOT_FREE_ONLY === "1") {
    const config = aiConfig(env);
    try { require("./ai-key-settings").assertFreeModel(config.provider, config.model, env.BUDDYPILOT_GEMINI_FREE_CONFIRMED === "1"); }
    catch { throw new AiError("free_only", "Sahkan projek Gemini Free tier di AI API Key, atau pilih OpenRouter :free. Tiada request berbayar dihantar.", 400); }
  }
  const { config, provider, context } = resolve(env, deps);
  const backupEnabled = config.provider === "openrouter" && env.BUDDYPILOT_FREE_ONLY === "1" && env.BUDDYPILOT_GEMINI_FREE_CONFIRMED === "1";
  if (backupEnabled) context.requestTimeoutMs = Math.max(1, Math.min(18000, deadline - Date.now()));
  const input = { system, prompt, json, maxOutputTokens, temperature };
  try {
    const result = await provider.generate({ ...input, model: config.model }, context);
    return { ...result, model: config.model, provider: config.provider };
  } catch (error) {
    // Only transient/provider availability failures may cross to the explicitly
    // confirmed free Gemini project. Never retry safety or invalid-input errors.
    const eligible = ["network", "quota", "model_unavailable", "provider_error"].includes(error?.code);
    if (!backupEnabled || !eligible) throw error;
    const settings = deps?.keySettings || require("./ai-key-settings");
    let key;
    try { key = await settings.resolveKey("gemini"); }
    catch { throw new AiError("settings_unavailable", "Key backup Gemini tidak boleh dibaca. Semak AI API Key.", 503); }
    if (!key) throw error;
    require("./ai-key-settings").assertFreeModel("gemini", DEFAULT_MODEL, true);
    const backup = resolve({ ...env, STORYTELLING_AI_PROVIDER: "gemini", STORYTELLING_AI_MODEL: DEFAULT_MODEL, GEMINI_API_KEY: key }, deps);
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new AiError("network", "Masa menunggu AI tamat. Cuba semula.", 504);
    backup.context.requestTimeoutMs = Math.min(25000, remaining);
    backup.context.noRetry = true;
    const result = await backup.provider.generate({ ...input, model: DEFAULT_MODEL }, backup.context);
    return { ...result, model: DEFAULT_MODEL, provider: "gemini", fallbackFrom: "openrouter" };
  }
}

async function verifyModel({ env = process.env, deps } = {}) {
  env = await runtimeEnvironment(env, deps);
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

module.exports = { AiError, DEFAULT_MODEL, aiConfig, publicAiConfig, generateText, parseJson, verifyModel };
