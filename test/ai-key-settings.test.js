const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const crypto = require("node:crypto");
const settings = require("../lib/ai-key-settings");
const handler = require("../api_handlers/ai-key-settings");

test("selecting OpenRouter retains saved Gemini free-tier confirmation", async () => {
  const oldFetch = global.fetch;
  const oldEnv = { ...process.env };
  process.env.SUPABASE_URL = "https://fixture.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-service";
  process.env.OPENROUTER_API_KEY = "fixture-openrouter-key";
  let written;
  global.fetch = async (url, options) => {
    if (options.method === "POST") { written = JSON.parse(options.body)[0]; return new Response(null, { status: 204 }); }
    return Response.json([]);
  };
  try {
    await settings.saveGenerationSettings("openrouter", "google/gemma-4-31b-it:free", "");
    assert.equal(written.provider, "openrouter");
    assert.equal(Object.hasOwn(written, "gemini_free_tier_confirmed"), false);
  } finally { global.fetch = oldFetch; process.env = oldEnv; }
});

test("AI key encryption authenticates provider and never stores plaintext", () => {
  const previous = process.env.AI_SETTINGS_ENCRYPTION_KEY;
  process.env.AI_SETTINGS_ENCRYPTION_KEY = "fixture-encryption-secret-32-characters";
  try {
    const key = "fixture-secret-key-never-real";
    const encrypted = settings._test.encrypt("openai", key);
    assert.equal(encrypted.includes(key), false);
    assert.equal(settings._test.decrypt("openai", encrypted), key);
    assert.notEqual(settings._test.encrypt("openai", key), encrypted);
    assert.throws(() => settings._test.decrypt("deepseek", encrypted));
    assert.throws(() => settings._test.decrypt("openai", encrypted.slice(0, -4) + "AAAA"));
    assert.throws(() => settings._test.providerConfig("__proto__"));
    assert.throws(() => settings._test.validateKey("bad key"));
  } finally {
    if (previous === undefined) delete process.env.AI_SETTINGS_ENCRYPTION_KEY;
    else process.env.AI_SETTINGS_ENCRYPTION_KEY = previous;
  }
});

test("AI key settings roundtrip, masking, env fallback and redacted provider errors", async () => {
  const oldFetch = global.fetch;
  const oldEnv = { ...process.env };
  process.env.SUPABASE_URL = "https://fixture.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-service-role";
  process.env.AI_SETTINGS_ENCRYPTION_KEY = "fixture-encryption-secret-32-characters";
  process.env.OPENAI_API_KEY = "fixture-env-key-never-real";
  let stored = null;
  let providerStatus = 200;
  global.fetch = async (url, options) => {
    if (String(url).startsWith("https://fixture.invalid/rest/")) {
      if (options.method === "POST") {
        stored = JSON.parse(options.body)[0];
        assert.equal(options.body.includes("fixture-new-api-key"), false);
        return new Response(null, { status: 204 });
      }
      return Response.json(stored ? [stored] : []);
    }
    assert.equal(String(url), "https://api.openai.com/v1/models");
    assert.equal(options.redirect, "error");
    return new Response("SECRET-UPSTREAM-BODY", { status: providerStatus });
  };
  try {
    assert.equal(await settings.resolveKey("openai"), process.env.OPENAI_API_KEY);
    const saved = await settings.saveKey("openai", "fixture-new-api-key-never-real");
    assert.equal(saved.source, "app");
    assert.equal(JSON.stringify(saved).includes("fixture-new-api-key"), false);
    assert.equal(await settings.resolveKey("openai"), "fixture-new-api-key-never-real");
    assert.equal((await settings.testConnection("openai")).connected, true);
    for (const status of [401, 403, 429, 500]) {
      providerStatus = status;
      await assert.rejects(settings.testConnection("openai"), (error) => !error.message.includes("SECRET-UPSTREAM-BODY"));
    }
    global.fetch = async () => { throw new Error("SECRET-network-error"); };
    await assert.rejects(settings.testConnection("openai", "fixture-test-key-never-real"), /Sambungan provider/);
  } finally { global.fetch = oldFetch; process.env = oldEnv; }
});

test("AI settings endpoint rejects unauthenticated and cross-site writes", async () => {
  const old = process.env.APP_PASSWORD;
  process.env.APP_PASSWORD = "fixture-admin-password";
  const response = () => ({ headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(value) { this.body = JSON.parse(value); } });
  try {
    const unauthorized = response();
    await handler({ method: "GET", headers: {} }, unauthorized);
    assert.equal(unauthorized.statusCode, 401);
    assert.equal(unauthorized.headers["cache-control"], "no-store");
    const cookie = crypto.createHmac("sha256", process.env.APP_PASSWORD).update("postpilot-auth-v1").digest("base64url");
    const crossSite = response();
    await handler({ method: "POST", headers: { cookie: `postpilot_auth=${cookie}`, "sec-fetch-site": "cross-site", "content-type": "application/json" } }, crossSite);
    assert.equal(crossSite.statusCode, 403);
  } finally { if (old === undefined) delete process.env.APP_PASSWORD; else process.env.APP_PASSWORD = old; }
});

test("AI key UI and service-only migration are wired without browser storage", () => {
  const ui = fs.readFileSync("public/ai-key-settings.js", "utf8");
  new vm.Script(ui);
  assert.equal(/localStorage|sessionStorage/.test(ui), false);
  const app = fs.readFileSync("api_handlers/app.js", "utf8");
  assert.match(app, /id="aiKeyValue" type="password"/);
  assert.match(app, /data-menu-section="menuAISettings"/);
  const sql = fs.readFileSync("supabase/migrations/20261114000200_ai_provider_credentials.sql", "utf8");
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all.*anon, authenticated/);
  assert.equal(/drop table|delete from/i.test(sql), false);
});
