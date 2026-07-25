const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  PATTERN_FORMS,
  PATTERN_ANGLES,
  THREADS_PATTERN_CATALOG,
} = require("../lib/threads-pattern-catalog");
const {
  CATEGORY_SUBTOPICS,
  createIdeaPack,
} = require("../lib/threads-topic-packs");
const {
  buildHistoryIndex,
  buildVoiceProfile,
  generateThreadsGeneralBatch,
} = require("../lib/threads-general-engine");
const templates = require("../lib/threads-viral-templates");

function options(count, extra = {}) {
  return {
    count,
    category: "business",
    tone: "Casual",
    audience: "founder baru mula",
    categories: templates.categories,
    tones: templates.toneOptions,
    audiences: templates.audienceTypes,
    history: [],
    seed: `engine-test-${count}`,
    ...extra,
  };
}

test("Threads General exposes exactly 300 unique patterns", () => {
  assert.equal(PATTERN_FORMS.length, 15);
  assert.equal(PATTERN_ANGLES.length, 20);
  assert.equal(THREADS_PATTERN_CATALOG.length, 300);
  assert.equal(new Set(THREADS_PATTERN_CATALOG.map((item) => item.id)).size, 300);
  assert.equal(new Set(THREADS_PATTERN_CATALOG.map((item) => item.label)).size, 300);
});

test("all 50 category planners have the required idea depth", () => {
  assert.equal(Object.keys(CATEGORY_SUBTOPICS).length, 50);
  for (const category of Object.keys(CATEGORY_SUBTOPICS)) {
    const pack = createIdeaPack(category);
    assert.ok(pack.subtopics.length >= 8, category);
    assert.ok(pack.pains.length >= 6, category);
    assert.ok(pack.observations.length >= 6, category);
    assert.ok(pack.opinions.length >= 6, category);
    assert.ok(pack.dilemmas.length >= 4, category);
    assert.ok(pack.localContexts.length >= 4, category);
  }
});

test("manual Generate 1 follows the selected pattern", () => {
  const selected = THREADS_PATTERN_CATALOG[137];
  const result = generateThreadsGeneralBatch(options(1, { patternId: selected.id }));
  assert.equal(result.posts[0].patternId, selected.id);
  assert.equal(result.posts[0].patternLabel, selected.label);
});

test("Generate 10 and 50 rotate unique patterns with exact length distribution", () => {
  const expected = {
    10: { micro: 2, short: 4, medium: 3, long: 1 },
    50: { micro: 10, short: 18, medium: 15, long: 7 },
  };
  for (const count of [10, 50]) {
    const result = generateThreadsGeneralBatch(options(count));
    assert.equal(new Set(result.posts.map((item) => item.patternId)).size, count);
    const buckets = Object.fromEntries(["micro", "short", "medium", "long"].map((bucket) => [
      bucket,
      result.posts.filter((item) => item.lengthBucket === bucket).length,
    ]));
    assert.deepEqual(buckets, expected[count]);
    result.posts.forEach((item) => {
      assert.ok(item.postText.length <= 500);
      assert.doesNotMatch(item.postText, /\*\*|(^|\s):(?=\s|$)/);
      assert.doesNotMatch(item.postText, /\b(?:orang|daripada|dengan|untuk|yang|semangat|bukan|cuma|dan|atau|sebab|dalam|dekat)$/i);
      assert.ok(item.robotRisk < 35);
    });
  }
});

test("auto rotate prioritizes the least-used pattern regardless of length bucket", () => {
  const onlyUnused = THREADS_PATTERN_CATALOG[299];
  const history = THREADS_PATTERN_CATALOG.slice(0, 299).map((pattern) => ({
    patternId: pattern.id,
    postText: `history untuk ${pattern.id}`,
    metadata: {},
  }));
  const [post] = generateThreadsGeneralBatch(options(1, {
    history,
    patternId: "",
    seed: "least-used-pattern",
  })).posts;
  assert.equal(post.patternId, onlyUnused.id);
});

test("every catalog pattern can produce a clean post", () => {
  for (const pattern of THREADS_PATTERN_CATALOG) {
    const [post] = generateThreadsGeneralBatch(options(1, {
      patternId: pattern.id,
      seed: pattern.id,
    })).posts;
    assert.equal(post.patternId, pattern.id);
    assert.ok(post.postText.length > 0 && post.postText.length <= 500, pattern.id);
  }
});

test("personal voice only activates after fifteen Published or Winner samples", () => {
  const history = Array.from({ length: 15 }, (_, index) => ({
    postText: `aku dah nampak benda ni dekat kerja harian ${index}`,
    rating: index === 14 ? "winner" : "",
    metadata: index < 14 ? { publishedAt: new Date().toISOString() } : {},
  }));
  assert.equal(buildVoiceProfile(buildHistoryIndex(history.slice(0, 14))).active, false);
  assert.equal(buildVoiceProfile(buildHistoryIndex(history)).active, true);
});

test("webapp uses Pattern select and removes Niche topic input", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "api_handlers", "app.js"), "utf8");
  assert.match(source, /id="viralPattern"/);
  assert.match(source, /Auto rotate 300 patterns/);
  assert.doesNotMatch(source, /id="viralTopic"/);
});
