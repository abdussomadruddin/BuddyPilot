const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("every protected handler awaits the asynchronous session authorization", () => {
  function inspect(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) inspect(file);
      else if (entry.name.endsWith(".js")) {
        assert.doesNotMatch(fs.readFileSync(file, "utf8"), /(?<!await )requireAuth\(req\);/, file);
      }
    }
  }
  inspect(path.join(__dirname, "../api_handlers"));
});
