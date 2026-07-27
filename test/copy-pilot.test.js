const test = require("node:test");
const assert = require("node:assert/strict");
const { generateCopyPilot, providerResponse } = require("../lib/copy-pilot");

test("Copy Pilot sends DeepSeek requests using the current V4 chat contract", async () => {
  const previousFetch = global.fetch;
  global.fetch = async (url, options) => {
    assert.equal(url, "https://api.deepseek.com/chat/completions");
    const body = JSON.parse(options.body);
    assert.equal(body.model, "deepseek-v4-flash");
    assert.deepEqual(body.thinking, { type: "disabled" });
    assert.deepEqual(body.messages.map((item) => item.role), ["system", "user"]);
    return { ok: true, json: async () => ({ choices: [{ message: { content: "siap" } }] }) };
  };
  try {
    const result = await providerResponse("Arahan", "Input", { provider: "deepseek", apiKey: "test-deepseek-key" });
    assert.equal(result, "siap");
  } finally {
    global.fetch = previousFetch;
  }
});

test("Copy Pilot preserves the analyzed intent and repairs failed copy", async () => {
  const previousFetch = global.fetch;
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  const outputs = [
    JSON.stringify({ topic: "ads", coreMessage: "strategy matters", claimsToVerify: [], missingContext: [] }),
    "aku belajar strategy lebih penting daripada tools.",
    JSON.stringify({ pass: false, warnings: ["CTA belum kuat"] }),
    "aku belajar strategy lebih penting daripada tools.\n\nkalau posting ni bermanfaat, share posting ni.",
  ];
  global.fetch = async () => ({ ok: true, json: async () => ({ output_text: outputs.shift() }) });
  try {
    const result = await generateCopyPilot({
      raw: "Aku belajar daripada kempen sendiri yang strategy lebih penting daripada tools.",
      cta: "share",
      length: 1500,
    });
    assert.equal(result.intent.coreMessage, "strategy matters");
    assert.equal(result.repaired, true);
    assert.match(result.post, /share posting ni/);
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});

test("Copy Pilot remains usable in local mode without an API key", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const result = await generateCopyPilot({
      title: "benda yang aku belajar",
      raw: "Aku pernah run ads tanpa strategy yang jelas. Banyak duit bocor dekat tempat yang salah.",
      cta: "kalau bermanfaat, share posting ni",
      link: "https://example.com",
    });
    assert.equal(result.localMode, true);
    assert.match(result.post, /Aku pernah run ads/);
    assert.match(result.post, /https:\/\/example.com/);
  } finally {
    if (previousKey !== undefined) process.env.OPENAI_API_KEY = previousKey;
  }
});
