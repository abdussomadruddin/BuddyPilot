const test = require("node:test");
const assert = require("node:assert/strict");
const { generateText, verifyModel, publicAiConfig } = require("../lib/storytelling-ai");

test("OpenRouter routes only to free models with zero price ceilings and no fallback", async () => {
  let request;
  const env = { STORYTELLING_AI_PROVIDER: "openrouter", STORYTELLING_AI_MODEL: "google/gemma-4-31b-it:free", OPENROUTER_API_KEY: "fixture-key" };
  const deps = { fetch: async (url, init) => {
    request = { url, body: JSON.parse(init.body) };
    return Response.json({ choices: [{ finish_reason: "stop", message: { content: "Cerita lengkap." } }] });
  } };
  assert.equal((await generateText({ prompt: "Topik" }, { env, deps })).provider, "openrouter");
  assert.equal(request.url, "https://openrouter.ai/api/v1/chat/completions");
  assert.deepEqual(request.body.provider, { allow_fallbacks: false, max_price: { prompt: 0, completion: 0 } });
  await assert.rejects(generateText({ prompt: "Topik" }, { env: { ...env, STORYTELLING_AI_MODEL: "paid-model" }, deps }), (error) => error.code === "free_only");
  const settings = require("../lib/ai-key-settings");
  assert.throws(() => settings.assertFreeModel("gemini", "gemini-3.8-flash", false));
  assert.throws(() => settings.assertFreeModel("gemini", "gemini-4-carbon", true));
  assert.throws(() => settings.assertFreeModel("openai", "gpt-4.1-mini", true));
  assert.doesNotThrow(() => settings.assertFreeModel("gemini", "gemini-3.8-flash", true));
});

test("each generation reads the selected provider and encrypted key resolver freshly", async () => {
  let selected = "openai";
  const calls = [];
  const keySettings = {
    getGenerationSettings: async () => ({ provider: selected, model: selected === "openai" ? "gpt-4.1-mini" : "deepseek-chat" }),
    resolveKey: async (provider) => `fixture-${provider}-key`,
  };
  const deps = { keySettings, fetch: async (url, init) => {
    calls.push({ url, init });
    return Response.json({ choices: [{ finish_reason: "stop", message: { content: "Teks AI sebenar dalam fixture." } }], usage: { total_tokens: 20 } });
  } };
  const env = {};
  const a = await generateText({ system: "Writing DNA", prompt: "Topik", json: true }, { env, deps });
  selected = "deepseek";
  const b = await generateText({ prompt: "Topik lain" }, { env, deps });
  assert.deepEqual([a.provider, b.provider], ["openai", "deepseek"]);
  assert.equal(calls[0].url, "https://api.openai.com/v1/chat/completions");
  assert.equal(calls[1].url, "https://api.deepseek.com/chat/completions");
  assert.equal(calls[0].init.headers.authorization, "Bearer fixture-openai-key");
  assert.equal(calls[0].init.redirect, "error");
  const payload = JSON.parse(calls[0].init.body);
  assert.equal(payload.messages[0].content, "Writing DNA");
  assert.equal(payload.response_format.type, "json_object");
  assert.equal(payload.store, false);
  assert.equal(payload.max_completion_tokens, 8192);
  assert.equal(JSON.stringify(a).includes("fixture-openai-key"), false);
  const config = await publicAiConfig({ env, deps });
  assert.deepEqual(config, { provider: "deepseek", model: "deepseek-chat", keyConfigured: true });
});

test("provider failures are redacted and never switch model or use template fallback", async () => {
  for (const provider of ["openai", "deepseek"]) {
    for (const status of [401, 403, 404, 429, 500]) {
      let count = 0;
      const env = { STORYTELLING_AI_PROVIDER: provider, [provider === "openai" ? "OPENAI_API_KEY" : "DEEPSEEK_API_KEY"]: "fixture-secret-key" };
      await assert.rejects(generateText({ prompt: "P" }, { env, deps: { fetch: async () => { count++; return new Response("SECRET-provider-body", { status }); } } }), (error) => !/SECRET|fixture-secret/.test(error.message));
      assert.equal(count, 1);
    }
  }
  await assert.rejects(generateText({ prompt: "P" }, { env: {}, deps: { keySettings: { getGenerationSettings: async () => { throw new Error("SECRET DB body"); } } } }), (error) => error.code === "settings_unavailable" && !error.message.includes("SECRET"));
});

test("provider verify is read-only and missing keys fail before any model request", async () => {
  let called = false;
  await assert.rejects(generateText({ prompt: "P" }, { env: { STORYTELLING_AI_PROVIDER: "openai" }, deps: { fetch: async () => { called = true; } } }), (error) => error.code === "not_configured");
  assert.equal(called, false);
  const result = await verifyModel({ env: { STORYTELLING_AI_PROVIDER: "deepseek", DEEPSEEK_API_KEY: "fixture-key" }, deps: { fetch: async (url, init) => {
    assert.equal(url, "https://api.deepseek.com/models");
    assert.equal(init.method, "GET");
    return Response.json({ data: [{ id: "deepseek-chat" }] });
  } } });
  assert.equal(result.canGenerate, true);
});
