const assert = require("node:assert/strict");
const test = require("node:test");

const { audienceTypes, categories } = require("../lib/threads-viral-templates");

test("Threads General provides 50 unique audience options", () => {
  assert.equal(audienceTypes.length, 50);
  assert.equal(new Set(audienceTypes).size, 50);
});

test("Threads General provides 50 unique lowercase categories", () => {
  assert.equal(categories.length, 50);
  assert.equal(new Set(categories).size, 50);
  categories.forEach((category) => assert.equal(category, category.toLowerCase()));
});
