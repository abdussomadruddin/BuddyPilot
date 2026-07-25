const assert = require("node:assert/strict");
const test = require("node:test");

const {
  familyDeck,
  generateAdaptivePost,
  semanticSimilarity,
  threadsFamilyDeck,
} = require("../lib/postpilot-pattern-engine");

test("content mix reserves twenty percent original quote posts", () => {
  const deck = familyDeck(50, () => 0.42);
  assert.equal(deck.length, 50);
  assert.equal(deck.filter((family) => family === "quote").length, 10);
});

test("Threads feed mix includes viral Malaysian question and comparison patterns", () => {
  const deck = threadsFamilyDeck(100, () => 0.42);
  assert.equal(deck.length, 100);
  assert.equal(deck.filter((family) => family === "question").length, 18);
  assert.equal(deck.filter((family) => family === "comparison").length, 10);
  assert.equal(deck.filter((family) => family === "observation").length, 14);
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

test("Threads General quote is original, clean, and reads like a normal post", () => {
  const generated = generateAdaptivePost({
    platform: "threads_general",
    topic: "side income",
    forcedFamily: "quote",
    seed: "original-quote",
  });
  assert.ok(generated.postText.length > 20);
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
  const posts = Array.from({ length: 80 }, (_, index) => generateAdaptivePost({
    platform: "threads_general",
    topic: "small business",
    audience: "startup team",
    forcedFamily: "recommendation",
    seed: `natural-startup-audience-${index}`,
  }).postText);
  assert.ok(posts.some((post) => /kalau kau baru start/.test(post)));
  posts.forEach((post) => assert.doesNotMatch(post, /startup team/));
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

test("Threads General matches the short text-only feed rhythm", () => {
  const families = threadsFamilyDeck(100, () => 0.37);
  const posts = families.map((forcedFamily, index) => generateAdaptivePost({
    platform: "threads_general",
    topic: index % 2 ? "content marketing" : "side income",
    audience: index % 3 ? "small business owner" : "startup team",
    tone: index % 2 ? "Casual" : "Direct",
    forcedFamily,
    seed: `feed-rhythm-${index}`,
  }).postText);
  const lengths = posts.map((post) => post.length).sort((left, right) => left - right);

  assert.ok(lengths[49] >= 75);
  assert.ok(lengths[49] <= 220);
  assert.ok(posts.filter((post) => post.split("\n").length <= 2).length >= 50);
  assert.ok(posts.filter((post) => post.length < 100).length >= 20);
  assert.ok(posts.filter((post) => /\?/.test(post)).length >= 15);
  posts.forEach((post) => {
    assert.ok(post.length <= 500);
    assert.doesNotMatch(post, /\*\*|:/);
    assert.doesNotMatch(post, /small business owner|startup team/);
  });
});

test("Malaysia style layer keeps questions and acronyms clean", () => {
  const posts = Array.from({ length: 120 }, (_, index) => generateAdaptivePost({
    platform: "threads_general",
    topic: "AI automation",
    tone: index % 2 ? "Funny" : "Casual",
    forcedFamily: index % 3 ? "question" : "story",
    seed: `malaysia-style-clean-${index}`,
  }).postText);

  posts.forEach((post) => {
    assert.doesNotMatch(post, /\?\./);
    assert.doesNotMatch(post, /\baI automation\b/);
    assert.doesNotMatch(post, /\btikTok\b|\bfacebook Ads\b|\bwfh\b/);
    assert.doesNotMatch(post, /^(?:jujur aku rasa|aku baru perasan)\.$/m);
  });
});

test("abstract topics are never used as awkward actions", () => {
  const posts = ["question", "story", "insight"].flatMap((forcedFamily) =>
    Array.from({ length: 80 }, (_, index) => generateAdaptivePost({
      platform: "threads_general",
      topic: "customer trust",
      tone: "Casual",
      forcedFamily,
      seed: `abstract-topic-${forcedFamily}-${index}`,
    }).postText)
  );

  posts.forEach((post) => {
    assert.doesNotMatch(post, /stop customer trust|customer trust buat aku|customer trust, lepas tu start/i);
    assert.doesNotMatch(post, /nampak macam senang\.\s+(?:kejar|nak|tunggu|buat|fikir|sibuk)/i);
  });
});

test("Malaysia style composer produces varied casing, rhythm, and shorthand", () => {
  const families = threadsFamilyDeck(100, () => 0.61);
  const posts = families.map((forcedFamily, index) => generateAdaptivePost({
    platform: "threads_general",
    topic: index % 2 ? "buat content" : "bisnes online",
    tone: ["Casual", "Direct", "Funny", "Storytelling"][index % 4],
    forcedFamily,
    seed: `malaysia-style-variety-${index}`,
  }).postText);

  assert.ok(new Set(posts).size >= 90);
  assert.ok(posts.some((post) => /\b(?:tak|nak|dah|ni|je|kat)\b/i.test(post)));
  assert.ok(posts.some((post) => post.split("\n").length === 1));
  assert.ok(posts.some((post) => post.split("\n").length >= 3));
  assert.ok(posts.some((post) => /^[a-z]/.test(post)));
});
