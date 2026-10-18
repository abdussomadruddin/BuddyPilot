const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

function remoteFixture(fail = false) {
  const calls = [];
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../lib/postpilot-remote.js"), "utf8"), {
    module, exports: module.exports, console, Buffer, URL, setTimeout, clearTimeout,
    process: { env: { SUPABASE_URL: "https://fixture.invalid", SUPABASE_SERVICE_ROLE_KEY: "fixture" } },
    require(name) {
      if (name === "./supabase-db") return {};
      if (name === "./operations-events") return {
        reportOperationalSuccess: async (input) => calls.push({ health: input }),
        reportOperationalFailure: async () => {},
      };
      return require(name);
    },
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (fail) throw new Error("fixture failure");
      return { ok: true, status: 204 };
    },
  });
  return { remote: module.exports, calls };
}

test("idle claim has exactly one heartbeat owner", () => {
  const source = fs.readFileSync(path.join(__dirname, "../api_handlers/postpilot-extension/claim.js"), "utf8");
  assert.doesNotMatch(source, /heartbeatDevice/);
  assert.match(source, /await claimJob/);
});

test("recent device heartbeat avoids all redundant writes", async () => {
  const { remote, calls } = remoteFixture();
  await remote.heartbeatDevice({ id: "fixture", last_seen_at: new Date().toISOString() });
  assert.equal(calls.length, 0);
});

test("stale heartbeat records liveness and heals health immediately, then dedupes", async () => {
  const { remote, calls } = remoteFixture();
  const device = { id: "fixture", last_seen_at: new Date(Date.now() - 61000).toISOString() };
  await remote.heartbeatDevice(device);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.method, "PATCH");
  assert.equal(calls[1].health.serviceName, "mac_extension");
  await remote.heartbeatDevice(device);
  assert.equal(calls.length, 2);
});

test("failed heartbeat remains eligible for retry", async () => {
  const { remote, calls } = remoteFixture(true);
  const device = { id: "fixture", last_seen_at: "invalid" };
  await assert.rejects(remote.heartbeatDevice(device), /fixture failure/);
  assert.equal(device.last_seen_at, "invalid");
  await assert.rejects(remote.heartbeatDevice(device), /fixture failure/);
  assert.equal(calls.length, 2);
});

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
  await module.exports.reportOperationalSuccess({ serviceName: "mac_extension", fingerprints: ["one", "two", "one"] });
  assert.deepEqual(calls, ["health", ["one", "two"]]);
});
