const crypto = require("node:crypto");
const { supabaseRequest } = require("./supabase-db");

const PROVIDERS = Object.freeze({
  openrouter: { env: "OPENROUTER_API_KEY", url: "https://openrouter.ai/api/v1/key", model: "google/gemma-4-31b-it:free" },
  gemini: { env: "GEMINI_API_KEY", url: "https://generativelanguage.googleapis.com/v1beta/models", model: "gemini-3.8-flash" },
  openai: { env: "OPENAI_API_KEY", url: "https://api.openai.com/v1/models", model: "gpt-4.1-mini", completionUrl: "https://api.openai.com/v1/chat/completions" },
  deepseek: { env: "DEEPSEEK_API_KEY", url: "https://api.deepseek.com/models", model: "deepseek-chat", completionUrl: "https://api.deepseek.com/chat/completions" },
});

function providerConfig(provider) {
  if (!Object.hasOwn(PROVIDERS, provider)) throw new Error("Pilih provider yang sah.");
  return PROVIDERS[provider];
}

function encryptionKey() {
  const secret = process.env.AI_SETTINGS_ENCRYPTION_KEY || process.env.META_TOKEN_ENCRYPTION_KEY || process.env.TIKTOK_TOKEN_ENCRYPTION_KEY || "";
  if (secret.length < 32) throw new Error("Encryption server belum tersedia. Tetapkan AI_SETTINGS_ENCRYPTION_KEY (minimum 32 aksara).");
  return crypto.createHash("sha256").update("buddypilot-ai-keys-v1\0").update(secret).digest();
}

function validateKey(value) {
  const key = String(value || "").trim();
  if (key.length < 16 || key.length > 512 || /\s|[^\x21-\x7e]/.test(key)) throw new Error("Masukkan API key yang sah.");
  return key;
}

function encrypt(provider, value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(provider));
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(":");
}

function decrypt(provider, value) {
  try {
    const [version, iv, tag, data] = String(value).split(":");
    if (version !== "v1") throw new Error();
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
    decipher.setAAD(Buffer.from(provider));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("Key tersimpan tidak boleh dibaca. Semak encryption server atau simpan semula key.");
  }
}

async function getStatus(provider) {
  const config = providerConfig(provider);
  const rows = await supabaseRequest(`ai_provider_credentials?provider=eq.${provider}&select=provider,updated_at&limit=1`);
  return { provider, configured: Boolean(rows?.length || process.env[config.env]), source: rows?.length ? "app" : process.env[config.env] ? "environment" : "none", updatedAt: rows?.[0]?.updated_at || null };
}

async function resolveKey(provider) {
  const config = providerConfig(provider);
  const rows = await supabaseRequest(`ai_provider_credentials?provider=eq.${provider}&select=encrypted_key&limit=1`);
  if (rows?.[0]) return decrypt(provider, rows[0].encrypted_key);
  return String(process.env[config.env] || "").trim();
}

async function saveKey(provider, value) {
  providerConfig(provider);
  const key = validateKey(value);
  await supabaseRequest("ai_provider_credentials?on_conflict=provider", {
    method: "POST", prefer: "resolution=merge-duplicates,return=minimal",
    body: [{ provider, encrypted_key: encrypt(provider, key), updated_at: new Date().toISOString() }],
  });
  return getStatus(provider);
}

function validateModel(value, provider) {
  const model = String(value || providerConfig(provider).model).trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,99}$/.test(model)) throw new Error("Pilih model yang sah.");
  return model;
}

async function getGenerationSettings() {
  const rows = await supabaseRequest("ai_generation_settings?id=eq.default&select=provider,model,gemini_free_tier_confirmed&limit=1");
  const provider = rows?.[0]?.provider || String(process.env.STORYTELLING_AI_PROVIDER || "gemini").trim().toLowerCase();
  const config = providerConfig(provider);
  return { provider, model: validateModel(rows?.[0]?.model || process.env.STORYTELLING_AI_MODEL || (provider === "gemini" ? process.env.GEMINI_MODEL : "") || config.model, provider), freeOnly: true, geminiFreeTierConfirmed: rows?.[0]?.gemini_free_tier_confirmed === true };
}

function assertFreeModel(provider, model, geminiFreeTierConfirmed) {
  if (provider === "openrouter" && /:free$/.test(model)) return;
  if (provider === "gemini" && ["gemini-3.8-flash", "gemini-3.6-flash"].includes(model) && geminiFreeTierConfirmed === true) return;
  throw new Error("Pilih model percuma sahaja. Gemini memerlukan pengesahan projek Free tier.");
}

async function saveGenerationSettings(provider, model, key, geminiFreeTierConfirmed = false) {
  providerConfig(provider);
  const safeModel = validateModel(model, provider);
  assertFreeModel(provider, safeModel, geminiFreeTierConfirmed);
  if (key) await saveKey(provider, key);
  else if (!await resolveKey(provider)) throw new Error("Masukkan atau simpan key dahulu.");
  await supabaseRequest("ai_generation_settings?on_conflict=id", {
    method: "POST", prefer: "resolution=merge-duplicates,return=minimal",
    body: [{ id: "default", provider, model: safeModel, ...(provider === "gemini" ? { gemini_free_tier_confirmed: geminiFreeTierConfirmed } : {}), updated_at: new Date().toISOString() }],
  });
  return { ...await getStatus(provider), model: safeModel };
}

async function testConnection(provider, value, model) {
  const config = providerConfig(provider);
  const key = value ? validateKey(value) : await resolveKey(provider);
  if (!key) throw new Error("Masukkan atau simpan key dahulu.");
  let response;
  try {
    const url = provider === "gemini" ? `${config.url}/${encodeURIComponent(validateModel(model, provider))}` : config.url;
    response = await fetch(url, { headers: { ...(provider === "gemini" ? { "x-goog-api-key": key } : { authorization: `Bearer ${key}` }), accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(12000) });
    // Never return upstream bodies: provider errors may echo credential details.
    if (response.body) await response.body.cancel();
  } catch {
    throw new Error("Sambungan provider gagal atau tamat masa. Cuba semula.");
  }
  if (!response.ok) {
    if ([401, 403].includes(response.status)) throw new Error("Key ditolak atau tiada kebenaran menyenaraikan model.");
    if (response.status === 429) throw new Error("Had request provider dicapai. Cuba semula kemudian.");
    throw new Error("Provider tidak tersedia. Cuba semula kemudian.");
  }
  return { connected: true, message: "Sambungan berjaya. Akses model disahkan; baki kredit dan generation belum diuji." };
}

module.exports = { getStatus, resolveKey, saveKey, testConnection, getGenerationSettings, saveGenerationSettings, assertFreeModel, _test: { encrypt, decrypt, validateKey, providerConfig, validateModel } };
