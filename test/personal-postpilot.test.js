const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildPersonalPostPreview,
  generatePersonalPostCopy,
} = require("../lib/personal-postpilot");

const MODES = ["soft", "hard", "proof", "engagement", "objection"];
const LINK = "https://swiy.co/kmethod";

test("promote copy sounds personal with an optional question and one final link", async () => {
  const outputs = [];
  const questions = [];

  for (let index = 0; index < MODES.length; index += 1) {
    const result = await buildPersonalPostPreview({
      productName: "K-Method",
      affiliateLink: LINK,
      personalBackground: "sebagai orang yang pernah tangguh side income bertahun-tahun",
      angleNote: "result kecil yang betul-betul berlaku",
      postMode: MODES[index],
      variation: index,
    });
    const text = result.preview.post_text;
    const lines = text.split(/\n{2,}/);
    const questionLines = lines.filter((line) => line.endsWith("?"));

    assert.ok(text.length <= 500);
    assert.equal((text.match(/K-Method/g) || []).length, 1);
    assert.equal((text.match(new RegExp(LINK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1);
    assert.ok(questionLines.length <= 1);
    assert.equal(lines.at(-1), `klik sini, ${LINK}`);
    assert.doesNotMatch(text.replace(LINK, ""), /\*\*|:/);
    assert.doesNotMatch(text.toLowerCase(), /yang menarik bukan sekadar produk dia|sangat berpotensi|kesimpulannya|dalam era digital/);
    assert.match(text, /\baku\b/i);

    outputs.push(text);
    if (questionLines[0]) questions.push(questionLines[0]);
  }

  assert.equal(new Set(outputs).size, MODES.length);
  assert.ok(questions.length <= MODES.length);
});

test("promote generator preserves hyphenated product names naturally", () => {
  const text = generatePersonalPostCopy({
    productContext: { productName: "K-Method" },
    personalBackground: "",
    angleNote: "",
    postMode: "soft",
    variation: 7,
  });

  assert.match(text, /K-Method/);
  assert.doesNotMatch(text, /\bK\b(?!-Method)/);
  assert.ok((text.match(/\?/g) || []).length <= 1);
});

test("custom promote copy removes extra links and forbidden punctuation", async () => {
  const result = await buildPersonalPostPreview({
    productName: "K-Method",
    affiliateLink: LINK,
    customPost: "**aku cuba sendiri**: memang lagi senang.\n\nklik sini: https://example.com/old",
    postMode: "soft",
    variation: 1,
  });
  const text = result.preview.post_text;

  assert.equal((text.match(/https?:\/\//g) || []).length, 1);
  assert.equal(text.split(/\n{2,}/).at(-1), `klik sini, ${LINK}`);
  assert.doesNotMatch(text.replace(LINK, ""), /\*\*|:/);
});
