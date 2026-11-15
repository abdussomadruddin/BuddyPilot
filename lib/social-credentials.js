// Tokens for publishing Post Pilot posts: the Facebook Page, Threads, and the
// pairing token of the BuddyPilot Chrome extension. Server-side only. Social
// tokens are stored encrypted beside the AI keys; the extension token is stored
// as a hash, so it can be checked but never read back.
const crypto = require("node:crypto");

const PROVIDERS = ["facebook_page", "threads", "extension"];
const TABLE = "ai_provider_credentials";

function fail(message, statusCode = 400, code = "invalid") {
  return Object.assign(new Error(message), { statusCode, code });
}

function defaultDeps() {
  const keys = require("./ai-key-settings");
  return { request: require("./supabase-db").supabaseRequest, encrypt: keys.encrypt, decrypt: keys.decrypt, env: process.env };
}

function cleanToken(value) {
  const token = String(value || "").trim();
  if (token.length < 20 || token.length > 1024 || /\s|[^\x21-\x7e]/.test(token)) throw fail("Masukkan token yang sah.");
  return token;
}

function cleanAccountId(value) {
  const id = String(value || "").trim();
  if (!/^[0-9]{5,30}$/.test(id)) throw fail("ID akaun mesti nombor sahaja.");
  return id;
}

async function readRow(provider, deps) {
  const rows = await deps.request(`${TABLE}?provider=eq.${provider}&select=encrypted_key,updated_at&limit=1`);
  return rows?.[0] || null;
}

async function writeRow(provider, value, deps) {
  await deps.request(`${TABLE}?on_conflict=provider`, {
    method: "POST", prefer: "resolution=merge-duplicates,return=minimal",
    body: [{ provider, encrypted_key: value, updated_at: new Date().toISOString() }],
  });
}

// { token, accountId, expiresAt? } or null. The Page falls back to the
// FACEBOOK_PAGE_* environment variables already set on the server.
async function resolveSocial(provider, deps = defaultDeps()) {
  if (!["facebook_page", "threads"].includes(provider)) throw fail("Platform tidak sah.");
  const row = await readRow(provider, deps);
  if (row) {
    try {
      const saved = JSON.parse(deps.decrypt(provider, row.encrypted_key));
      if (saved?.token && saved?.accountId) return { ...saved, source: "app", updatedAt: row.updated_at };
    } catch {
      throw fail("Token tersimpan tidak boleh dibaca. Simpan semula token di Tetapan.", 503, "settings_unavailable");
    }
  }
  if (provider === "facebook_page") {
    const token = String(deps.env.FACEBOOK_PAGE_ACCESS_TOKEN || "").trim();
    const accountId = String(deps.env.FACEBOOK_PAGE_ID || "").trim();
    if (token && accountId) return { token, accountId, source: "environment", updatedAt: null };
  }
  return null;
}

async function saveSocial(provider, { token, accountId, expiresAt = null }, deps = defaultDeps()) {
  if (!["facebook_page", "threads"].includes(provider)) throw fail("Platform tidak sah.");
  const value = { token: cleanToken(token), accountId: cleanAccountId(accountId), expiresAt };
  await writeRow(provider, deps.encrypt(provider, JSON.stringify(value)), deps);
  return socialStatus(deps);
}

function hashToken(token) {
  return crypto.createHash("sha256").update("buddypilot-extension-v1\0").update(String(token)).digest("hex");
}

// A new pairing token replaces the old one. It is returned once and never stored.
async function createExtensionToken(deps = defaultDeps()) {
  const token = `bp_${crypto.randomBytes(32).toString("base64url")}`;
  await writeRow("extension", `sha256:${hashToken(token)}`, deps);
  return { token };
}

async function verifyExtensionToken(token, deps = defaultDeps()) {
  const given = String(token || "").trim();
  if (!/^bp_[A-Za-z0-9_-]{40,60}$/.test(given)) return false;
  const row = await readRow("extension", deps);
  const stored = String(row?.encrypted_key || "");
  if (!stored.startsWith("sha256:")) return false;
  const expected = Buffer.from(stored.slice(7));
  const actual = Buffer.from(hashToken(given));
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// What the settings screen may show: never a token.
async function socialStatus(deps = defaultDeps()) {
  const describe = async (provider) => {
    try {
      const saved = await resolveSocial(provider, deps);
      return saved ? { configured: true, source: saved.source, accountId: saved.accountId, updatedAt: saved.updatedAt, expiresAt: saved.expiresAt || null } : { configured: false };
    } catch (error) {
      return { configured: false, error: error.message };
    }
  };
  const extension = await readRow("extension", deps).catch(() => null);
  return {
    facebook_page: await describe("facebook_page"),
    threads: await describe("threads"),
    extension: { configured: Boolean(extension), updatedAt: extension?.updated_at || null },
  };
}

module.exports = { PROVIDERS, createExtensionToken, resolveSocial, saveSocial, socialStatus, verifyExtensionToken };
