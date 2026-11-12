const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");


test("successful health batches incident resolution rather than separate requests", async () => {
  const module = { exports: {} };
  const calls = [];
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../lib/operations-events.js"), "utf8"), {
    module, console,
    require(name) {
      if (name === "./supabase-db") return {
        saveOperationsHealth: async () => calls.push("health"),
        resolveOperationsIncidents: async (items) => calls.push(Array.from(items)),
      };
      return {};
    },
  });
  await module.exports.reportOperationalSuccess({ serviceName: "telegram", fingerprints: ["one", "two", "one"] });
  assert.deepEqual(calls, ["health", ["one", "two"]]);
});
