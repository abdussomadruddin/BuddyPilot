const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { generateThreadsGeneralBatch } = require("../lib/threads-general-engine");
const templates = require("../lib/threads-viral-templates");

test("locked category and audience apply to all batch posts while tones rotate", () => {
  const { posts } = generateThreadsGeneralBatch({ count: 10, lockSelections: true,
    category: "tiktok ads", audience: templates.audienceTypes[0], tone: "",
    tones: templates.toneOptions, seed: "locked-selection-test" });
  assert.equal(posts.length, 10);
  assert.ok(posts.every((post) => post.category === "tiktok ads" && post.audience === templates.audienceTypes[0]));
  assert.ok(new Set(posts.map((post) => post.tone)).size > 1);
  assert.equal(new Set(posts.map((post) => post.patternId)).size, 10);
});

test("manual tone is honored for the entire batch", () => {
  const { posts } = generateThreadsGeneralBatch({ count: 10, lockSelections: true,
    category: "business", audience: templates.audienceTypes[0], tone: "Bold", seed: "manual-tone" });
  assert.ok(posts.every((post) => post.tone === "Bold"));
});

test("generator has exactly three combined actions and mandatory empty selections", () => {
  const app = fs.readFileSync(require.resolve("../api_handlers/app"), "utf8");
  const actions = app.slice(app.indexOf('<button id="generateViralOneButton"'), app.indexOf('<div id="viralResult"'));
  assert.equal((actions.match(/<button/g) || []).length, 3);
  assert.ok(app.includes('"Pilih post category"'));
  assert.ok(app.includes('"Pilih audience"'));
  assert.ok(app.includes('"Auto rotate tones"'));
  assert.ok(app.includes('const posts = await requestViralPosts(count);'));
  const api = fs.readFileSync(require.resolve("../api_handlers/threads-general"), "utf8");
  assert.ok(api.indexOf("templates.categories.includes(category)") < api.indexOf("const history = await"));
});
