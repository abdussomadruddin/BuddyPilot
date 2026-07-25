const assert = require("node:assert/strict");
const test = require("node:test");

const {
  familyDeck,
  generateAdaptivePost,
  semanticSimilarity,
} = require("../lib/postpilot-pattern-engine");

test("content mix reserves twenty percent original quote posts", () => {
  const deck = familyDeck(50, () => 0.42);
  assert.equal(deck.length, 50);
  assert.equal(deck.filter((family) => family === "quote").length, 10);
});

test("Facebook and Threads receive distinct platform captions", () => {
  const common = {
    productName: "K-Method",
    link: "https://swiy.co/kmethod",
    forcedFamily: "story",
    seed: "platform-copy",
  };
  const facebook = generateAdaptivePost({ ...common, platform: "facebook" });
  const threads = generateAdaptivePost({ ...common, platform: "threads" });
  assert.notEqual(facebook.postText, threads.postText);
  assert.match(facebook.postText, /K-Method/);
  assert.match(threads.postText, /K-Method/);
  assert.equal((facebook.postText.match(/https:\/\/swiy\.co\/kmethod/g) || []).length, 1);
  assert.equal((threads.postText.match(/https:\/\/swiy\.co\/kmethod/g) || []).length, 1);
});

test("Threads General quote is original, clean, and has no forced question", () => {
  const generated = generateAdaptivePost({
    platform: "threads_general",
    topic: "side income",
    forcedFamily: "quote",
    seed: "original-quote",
  });
  assert.match(generated.postText, /^"/);
  assert.doesNotMatch(generated.postText, /\?|https?:\/\/|\*\*|:/);
  assert.ok(generated.postText.length <= 500);
});

test("semantic similarity detects repeated wording beyond exact matches", () => {
  const score = semanticSimilarity(
    "aku suka mula kecil sebab langkah pertama lebih senang nampak",
    "hari ni aku suka mula kecil sebab langkah pertama lebih senang nampak dulu"
  );
  assert.ok(score > 0.6);
});

test("Threads General turns audience labels into natural Malaysian context", () => {
  const generated = generateAdaptivePost({
    platform: "threads_general",
    topic: "small business",
    audience: "startup team",
    forcedFamily: "recommendation",
    seed: "natural-startup-audience",
  });
  assert.match(generated.postText, /kalau kau baru start/);
  assert.doesNotMatch(generated.postText, /startup team/);
});

test("Threads General uses conversational insight wording", () => {
  const outputs = Array.from({ length: 150 }, (_, index) => generateAdaptivePost({
    platform: "threads_general",
    topic: "content",
    audience: "founder baru mula",
    forcedFamily: index % 2 ? "insight" : "recommendation",
    seed: `natural-wording-${index}`,
  }).postText).join("\n");

  assert.doesNotMatch(outputs, /lagi jelas satu perkara|basic yang konsisten memang jalan/);
});
