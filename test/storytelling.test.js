const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const story = require("../lib/storytelling");
const { aiConfig, generateText, parseJson, verifyModel } = require("../lib/storytelling-ai");
const { dispatch } = require("../api_handlers/storytelling");
const { createMemoryStore } = require("./storytelling-memory-store");

const PARAGRAPH = "Ramai orang ingat masalah ads dia sebab budget kecil. Sebenarnya bukan. Masalahnya dia tak faham apa yang platform tu nak, jadi setiap kali result jatuh dia tukar benda yang salah.";
function fakePost(paragraphs) {
  return ["Kebanyakan advertiser Malaysia sedang buang duit, dan mereka tak sedar pun.", ...Array.from({ length: paragraphs }, (_, index) => `${PARAGRAPH} Contoh ${index + 1}.`), "Kalau post ni buka mata kau, share supaya kawan yang berniaga pun nampak benda yang sama."].join("\n\n");
}

// A mock provider: records every request and answers by what was asked.
function mockAi(overrides = {}) {
  const calls = [];
  const ai = async (request) => {
    calls.push(request);
    let text;
    if (overrides.text) text = overrides.text(request, calls.length);
    else if (request.json && request.prompt.includes('"scores"')) text = JSON.stringify({ scores: { hook: 8, voice: 7, language: 9, flow: 7, depth: 6, originality: 6, emotion: 7, clarity: 8, shareability: 7, integrity: 9 }, strengths: ["Hook kuat."], issues: [{ type: "repetition", detail: "Perenggan tengah berulang.", fix: "Gabungkan." }], summary: "Kukuh tetapi berulang." });
    else if (request.json) text = JSON.stringify({ ...Object.fromEntries(story.DNA_FIELDS.map(([key]) => [key, `Analisis ${key}`])), changes: ["Hook lebih tajam."] });
    else if (/HANYA perenggan pengganti/.test(request.system)) text = "Perenggan baru daripada AI. Share kalau bermanfaat.";
    else text = fakePost(21);
    return { text, incomplete: Boolean(overrides.incomplete), model: "mock-model", provider: "mock" };
  };
  return { ai, calls };
}

const post = (store, action, body = {}, options = {}) => dispatch(store, { method: "POST", body: { action, ...body }, options });
const get = (store, query) => dispatch(store, { method: "GET", url: `/api/storytelling${query}` });
const SAMPLE = "Ini post sebenar saya pasal Meta Ads. Ramai yang salah faham pasal budget dan creative, sebab itu result tak pernah stabil walaupun dah tukar macam-macam.";

test("the feature is wired into BuddyPilot's navigation and router", () => {
  const page = fs.readFileSync(path.join(__dirname, "../api_handlers/app.js"), "utf8");
  const router = fs.readFileSync(path.join(__dirname, "../api/app.js"), "utf8");
  assert.match(page, /data-tab-target="postpilot"/);
  assert.match(page, /id="tab-postpilot"[\s\S]*data-st-view="write">Facebook Storytelling</);
  assert.match(page, /data-st-view="dna">My Writing DNA</);
  assert.match(router, /storytelling: \(\) => require\("\.\.\/api_handlers\/storytelling"\)/);
});

test("writing examples: add, edit, select, bulk import and delete", async () => {
  const store = createMemoryStore();
  const { sample } = await post(store, "sample.save", { content: SAMPLE, category: "Meta Ads" });
  assert.equal(sample.category, "Meta Ads");
  assert.equal(sample.selected, true);
  const edited = await post(store, "sample.save", { id: sample.id, content: `${SAMPLE} Tambahan.`, category: "Ads" });
  assert.match(edited.sample.content, /Tambahan\.$/);
  assert.equal((await post(store, "sample.select", { id: sample.id, selected: false })).sample.selected, false);

  const imported = await post(store, "sample.import", { text: `${SAMPLE} Satu.\n---\n${SAMPLE} Dua.\n\n# Tajuk markdown\n${SAMPLE} Tiga.\n---\nterlalu pendek` });
  assert.equal(imported.samples.length, 3, "short fragments are skipped");
  assert.equal((await get(store, "?view=bootstrap")).samples.length, 4);
  await post(store, "sample.delete", { id: sample.id });
  assert.equal((await get(store, "?view=bootstrap")).samples.length, 3);
  await assert.rejects(post(store, "sample.save", { content: "pendek" }), /terlalu pendek/);
});

test("Writing DNA: preset by default, analysis and edits save as new versions", async () => {
  const store = createMemoryStore();
  const start = await get(store, "?view=bootstrap");
  assert.equal(start.dna.version, 0);
  assert.equal(start.dna.profile.name, "Abdussomad — Facebook Personal Storytelling");
  assert.ok(start.dna.profile.rules.some((rule) => /emoji/i.test(rule)));

  const { ai, calls } = mockAi();
  await assert.rejects(post(store, "dna.analyze", {}, { ai }), /sekurang-kurangnya 3 contoh/);
  for (const suffix of ["Satu", "Dua", "Tiga"]) await post(store, "sample.save", { content: `${SAMPLE} ${suffix}.` });
  const analyzed = await post(store, "dna.analyze", {}, { ai });
  assert.equal(analyzed.dna.version, 1);
  assert.equal(analyzed.dna.source, "analysis");
  assert.equal(analyzed.dna.profile.hooks, "Analisis hooks");
  assert.equal(calls[0].json, true);
  assert.match(calls[0].prompt, /Post 3/);

  const edited = await post(store, "dna.save", { profile: { ...analyzed.dna.profile, hooks: "Hook saya sendiri." } });
  assert.equal(edited.dna.version, 2);
  const restored = await post(store, "dna.restore", { id: analyzed.dna.id });
  assert.equal(restored.dna.version, 3);
  assert.equal(restored.dna.profile.hooks, "Analisis hooks");
  assert.deepEqual((await get(store, "?view=bootstrap")).dnaVersions.map((row) => row.version), [3, 2, 1]);
});

test("one topic generates a full post with the DNA, rules and length target in the prompt", async () => {
  const store = createMemoryStore();
  await post(store, "sample.save", { content: `${SAMPLE} Andromeda.` });
  const { ai, calls } = mockAi();
  const result = await post(store, "generate", { topic: "Meta Ads Andromeda 2.0" }, { ai });
  assert.equal(result.input.length, 4500, "default length");
  assert.equal(result.input.intensity, 8);
  assert.equal(result.input.voiceStrength, 10);
  assert.equal(result.input.style, "personal");
  assert.equal(calls.length, 1, "one call when the length is on target");
  assert.ok(Math.abs(result.text.length - 4500) / 4500 <= 0.1);
  assert.match(calls[0].system, /Tiada emoji/);
  assert.match(calls[0].system, /Jangan guna perkataan atau struktur ayat Indonesia/);
  assert.match(calls[0].system, /jangan tunjuk label/);
  assert.match(calls[0].prompt, /TOPIK: Meta Ads Andromeda 2\.0/);
  assert.match(calls[0].prompt, /sasar 4500 aksara/);
  assert.match(calls[0].prompt, /Jangan reka pengalaman peribadi/);
  assert.match(calls[0].prompt, /Contoh 1 ---/);
  assert.match(result.text.slice(-200), /share/i, "ends with a share call to action");
  assert.equal(result.model, "mock-model");
  await assert.rejects(post(store, "generate", { topic: "" }, { ai }), /Masukkan topik/);
});

test("output is cleaned of emojis, separators, headings and trailing hashtags", () => {
  const cleaned = story.cleanPost("## Tajuk\n\nAyat pertama 🔥 yang **tegas**.\n\n---\n\nAyat kedua.\n\n━━━━━━\n\nShare kalau setuju 👍\n\n#metaads #bisnes");
  assert.equal(cleaned, "Tajuk\n\nAyat pertama yang tegas.\n\nAyat kedua.\n\nShare kalau setuju");
  const review = story.localReview("Di era digital ini, kalian butuh strategi 🚀\n\n---\n\n#ads", { targetLength: 4500 });
  assert.deepEqual(review.issues.map((issue) => issue.code).sort(), ["ai_phrases", "cta", "emoji", "hashtag", "indonesian", "length", "separator"]);
  // The fixture repeats one paragraph, so repetition is the only thing left to flag.
  assert.deepEqual(story.localReview(fakePost(21), { targetLength: 4500 }).issues.map((issue) => issue.code), ["repetition"]);
});

test("a length miss triggers exactly one revision call", async () => {
  const store = createMemoryStore();
  const { ai, calls } = mockAi({ text: (request, count) => (count === 1 ? fakePost(8) : fakePost(21)) });
  const result = await post(store, "generate", { topic: "Topik pendek" }, { ai });
  assert.equal(calls.length, 2);
  assert.equal(result.calls, 2);
  assert.match(calls[1].prompt, /Sasaran 4500 aksara/);
  assert.ok(Math.abs(result.text.length - 4500) / 4500 <= 0.1);
});

test("section rewrites change only that section; full rewrites keep going through the DNA", async () => {
  const store = createMemoryStore();
  const { ai, calls } = mockAi();
  const original = fakePost(5);
  const parts = original.split("\n\n");
  const hook = await post(store, "rewrite", { mode: "hook", text: original }, { ai });
  assert.equal(hook.scope, "opening");
  assert.deepEqual(hook.text.split("\n\n").slice(1), parts.slice(1), "everything after the opening is untouched");
  assert.notEqual(hook.text.split("\n\n")[0], parts[0]);
  const closing = await post(store, "rewrite", { mode: "closing", text: original }, { ai });
  assert.deepEqual(closing.text.split("\n\n").slice(0, -1), parts.slice(0, -1));
  const natural = await post(store, "rewrite", { mode: "natural", text: original }, { ai });
  assert.equal(natural.scope, "full");
  assert.match(calls[2].system, /Kekalkan mesej teras, fakta dan suntingan penulis/);
  await assert.rejects(post(store, "rewrite", { mode: "unknown", text: original }, { ai }), /tidak sah/);
});

test("the quality check returns labelled estimates and actionable issues", async () => {
  const store = createMemoryStore();
  const { ai } = mockAi();
  const { quality } = await post(store, "quality", { text: fakePost(21) }, { ai });
  assert.equal(quality.scores.hook.score, 8);
  assert.equal(quality.average, 7.4);
  assert.match(quality.disclaimer, /anggaran editorial AI/);
  assert.deepEqual(quality.issues[0], { type: "repetition", detail: "Perenggan tengah berulang.", fix: "Gabungkan." });
});

test("drafts: save, revise with history, search, status, duplicate and delete", async () => {
  const store = createMemoryStore();
  const saved = await post(store, "draft.save", { topic: "Meta Ads Andromeda 2.0", content: fakePost(3), generated: fakePost(3), model: "mock-model", dnaVersion: 2, style: "sharp" });
  assert.equal(saved.draft.status, "draft");
  assert.equal(saved.draft.characters, fakePost(3).length);
  await post(store, "draft.save", { id: saved.draft.id, content: `${fakePost(3)}\n\nSuntingan saya.` });
  const opened = await get(store, `?view=draft&id=${saved.draft.id}`);
  assert.match(opened.draft.content, /Suntingan saya\.$/);
  assert.equal(opened.draft.generated, fakePost(3), "the generated original is kept beside the edit");
  assert.equal(opened.revisions.length, 1);
  assert.equal(opened.revisions[0].content, fakePost(3));

  await post(store, "draft.save", { topic: "Topik lain", content: "Kandungan lain yang tiada kaitan langsung dengan iklan." });
  assert.deepEqual((await get(store, "?view=drafts&q=andromeda")).drafts.map((draft) => draft.topic), ["Meta Ads Andromeda 2.0"]);
  assert.equal((await post(store, "draft.status", { id: saved.draft.id, status: "published" })).draft.status, "published");
  assert.deepEqual((await get(store, "?view=drafts&status=published")).drafts.map((draft) => draft.id), [saved.draft.id]);
  await assert.rejects(post(store, "draft.status", { id: saved.draft.id, status: "live" }), /tidak sah/);
  const copy = await post(store, "draft.duplicate", { id: saved.draft.id });
  assert.equal(copy.draft.topic, "Meta Ads Andromeda 2.0 (salinan)");
  assert.equal(copy.draft.status, "draft");
  await post(store, "draft.delete", { id: saved.draft.id });
  assert.equal((await get(store, "?view=drafts")).drafts.length, 2);
  assert.equal(store.rows.filter((row) => row.kind === "revision").length, 0, "revisions go with their draft");
});

test("feedback steers the next draft and can update the Writing DNA", async () => {
  const store = createMemoryStore();
  const { ai, calls } = mockAi();
  await post(store, "feedback.save", { tags: ["too_formal", "weak_hook"], note: "Kurangkan English." });
  const approved = await post(store, "feedback.save", { tags: ["perfect"], text: fakePost(4), topic: "Ads" });
  assert.equal(approved.sample.category, "Diluluskan", "an approved post becomes a writing example");
  await assert.rejects(post(store, "feedback.save", { tags: ["nonsense"] }), /sekurang-kurangnya satu/);

  await post(store, "generate", { topic: "Topik seterusnya" }, { ai });
  assert.match(calls[0].prompt, /MAKLUM BALAS TERKINI PENULIS/);
  assert.match(calls[0].prompt, /terlalu formal/);
  assert.match(calls[0].prompt, /Kurangkan English\./);

  const learned = await post(store, "dna.learn", {}, { ai });
  assert.equal(learned.dna.source, "feedback");
  assert.equal(learned.dna.version, 1);
  assert.deepEqual(learned.changes, ["Hook lebih tajam."]);
  assert.match(calls.at(-1).prompt, /POST YANG DILULUSKAN PENULIS/);
});

test("AI requests are rate limited and usage rows hold no writing", async () => {
  const store = createMemoryStore();
  const { ai } = mockAi();
  await post(store, "generate", { topic: "Topik" }, { ai });
  const usage = store.rows.filter((row) => row.kind === "usage");
  assert.equal(usage.length, 1);
  assert.deepEqual(Object.keys(usage[0].data).sort(), ["action", "characters", "model"]);
  const stamp = new Date().toISOString();
  for (let index = 0; index < 20; index += 1) store.rows.push({ id: `u${index}`, kind: "usage", title: "generate", status: "", data: {}, createdAt: stamp, updatedAt: stamp });
  await assert.rejects(post(store, "generate", { topic: "Topik" }, { ai }), (error) => error.statusCode === 429 && error.code === "app_rate_limit");
});

test("a missing table is reported as setup, and the page still loads with the preset", async () => {
  const store = story.createStore(async () => { throw new Error('Supabase 404: {"code":"PGRST205","message":"Could not find the table public.storytelling_items in the schema cache"}'); });
  const boot = await get(store, "?view=bootstrap");
  assert.equal(boot.setupRequired, true);
  assert.match(boot.setupMessage, /20261114000100_facebook_storytelling\.sql/);
  assert.equal(boot.dna.profile.name, "Abdussomad — Facebook Personal Storytelling");
  await assert.rejects(post(store, "sample.save", { content: SAMPLE }), (error) => error.code === "setup_required");
});

// ---------- provider ----------

function fakeFetch(responses) {
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    const next = responses[Math.min(requests.length - 1, responses.length - 1)];
    return { ok: next.status === 200, status: next.status, json: async () => next.body };
  };
  return { fetchImpl, requests };
}
const env = { GEMINI_API_KEY: "test-key-not-real" };
const okBody = { candidates: [{ content: { parts: [{ text: "Teks " }, { text: "siap." }] }, finishReason: "STOP" }] };

test("the Gemini key travels in a header, never in the URL, and the default model is configurable", async () => {
  assert.equal(aiConfig({}).model, "gemini-3.8-flash");
  assert.equal(aiConfig({ GEMINI_MODEL: "gemini-other" }).model, "gemini-other");
  assert.equal(aiConfig({}).keyConfigured, false);
  const { fetchImpl, requests } = fakeFetch([{ status: 200, body: okBody }]);
  const result = await generateText({ system: "S", prompt: "P" }, { env, deps: { fetch: fetchImpl, sleep: async () => {} } });
  assert.equal(result.text, "Teks siap.");
  assert.equal(result.incomplete, false);
  assert.equal(requests[0].url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent");
  assert.equal(requests[0].init.headers["x-goog-api-key"], "test-key-not-real");
  assert.doesNotMatch(requests[0].url, /test-key/);
  await assert.rejects(generateText({ prompt: "P" }, { env: {}, deps: { fetch: fetchImpl } }), (error) => error.code === "not_configured" && error.statusCode === 503);
});

test("rate limits back off and retry; an exhausted quota stops with a clear message", async () => {
  const waits = [];
  const sleep = async (ms) => { waits.push(ms); };
  const limited = fakeFetch([{ status: 429, body: { error: { message: "Resource exhausted", details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "2s" }] } } }, { status: 200, body: okBody }]);
  assert.equal((await generateText({ prompt: "P" }, { env, deps: { fetch: limited.fetchImpl, sleep } })).text, "Teks siap.");
  assert.deepEqual(waits, [2000]);

  const quota = fakeFetch([{ status: 429, body: { error: { message: "Quota exceeded for metric generate_content_free_tier_requests, limit: 0, PerDay" } } }]);
  await assert.rejects(generateText({ prompt: "P" }, { env, deps: { fetch: quota.fetchImpl, sleep } }), (error) => error.code === "quota" && /tidak akan bertukar ke model berbayar/.test(error.message));
  assert.equal(quota.requests.length, 1, "no retry and no fallback model on an exhausted quota");

  const down = fakeFetch([{ status: 503, body: {} }]);
  await assert.rejects(generateText({ prompt: "P" }, { env, deps: { fetch: down.fetchImpl, sleep } }), (error) => error.code === "unavailable");
  assert.equal(down.requests.length, 3, "two retries, then give up");
});

test("incomplete, blocked and missing-model answers are reported, not passed on", async () => {
  const deps = (responses) => ({ fetch: fakeFetch(responses).fetchImpl, sleep: async () => {} });
  const cut = await generateText({ prompt: "P" }, { env, deps: deps([{ status: 200, body: { candidates: [{ content: { parts: [{ text: "Separuh" }] }, finishReason: "MAX_TOKENS" }] } }]) });
  assert.equal(cut.incomplete, true);
  await assert.rejects(generateText({ prompt: "P" }, { env, deps: deps([{ status: 200, body: { promptFeedback: { blockReason: "SAFETY" } } }]) }), (error) => error.code === "empty" && /SAFETY/.test(error.message));
  await assert.rejects(verifyModel({ env, deps: deps([{ status: 404, body: { error: { message: "not found" } } }]) }), (error) => error.code === "model_unavailable");
  const info = await verifyModel({ env, deps: deps([{ status: 200, body: { name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"], outputTokenLimit: 65536 } }]) });
  assert.deepEqual([info.model, info.canGenerate, info.outputTokenLimit], ["gemini-3.8-flash", true, 65536]);

  const store = createMemoryStore();
  const { ai } = mockAi({ incomplete: true });
  const partial = await post(store, "generate", { topic: "Topik" }, { ai });
  assert.match(partial.warnings.join(" "), /terpotong/);
  await assert.rejects(post(store, "rewrite", { mode: "natural", text: fakePost(5) }, { ai }), (error) => error.code === "incomplete");
  assert.deepEqual(parseJson('```json\n{"a": 1}\n```'), { a: 1 });
});

test("no secret or key name reaches the browser files", () => {
  const client = fs.readFileSync(path.join(__dirname, "../public/buddypilot-storytelling.js"), "utf8");
  assert.doesNotMatch(client, /generativelanguage|x-goog-api-key|process\.env/);
  assert.match(client, /\/api\/storytelling/);
  const config = story.publicConfig();
  assert.deepEqual(Object.keys(config).filter((key) => /key/i.test(key)), ["keyConfigured"]);
  assert.match(config.dataNotice, /Google Gemini/);
});
