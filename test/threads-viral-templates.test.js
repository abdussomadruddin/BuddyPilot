const assert = require("node:assert/strict");
const test = require("node:test");

const { audienceTypes } = require("../lib/threads-viral-templates");

test("Threads General provides 50 unique audience options", () => {
  assert.equal(audienceTypes.length, 50);
  assert.equal(new Set(audienceTypes).size, 50);
});
