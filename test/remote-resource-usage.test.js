const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

function fixture(responder) {
  const calls = [];
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../lib/postpilot-remote.js"), "utf8"), {
    module, console, Buffer, URL, setTimeout, clearTimeout,
    process: { env: { SUPABASE_URL: "https://fixture.invalid", SUPABASE_SERVICE_ROLE_KEY: "fixture" } },
    require(name) {
      if (name === "./supabase-db") return {};
      if (name === "./operations-events") return { reportOperationalSuccess: async () => {}, reportOperationalFailure: async () => {} };
      return require(name);
    },
    fetch: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 200, text: async () => JSON.stringify(responder(url, options)) };
    },
  });
  return { remote: module.exports, calls };
}

test("overview reads bounded summary fields without captions or image payloads", async () => {
  const { remote, calls } = fixture((url) => url.includes("extension_devices") ? [{ id: "device" }] : []);
  await remote.getRemoteOverview();
  const jobs = calls.filter((call) => call.url.includes("automation_jobs"));
  assert.ok(jobs.length >= 2);
  assert.equal(calls.some((call) => call.options.method === "PATCH"), false);
  for (const call of jobs) assert.ok(!call.url.includes("select=*"));
  assert.ok(jobs.some((call) => call.url.includes("channel:payload->>channel")));
});

test("empty claim still checks live queue but never patches an empty expiry set", async () => {
  const { remote, calls } = fixture(() => []);
  await remote.claimJob({ id: "device", last_seen_at: new Date().toISOString() });
  assert.equal(calls.some((call) => call.options.method === "PATCH"), false);
  assert.ok(calls.some((call) => call.url.includes("expires_at=gt.")));
});

test("expired jobs are updated only after a matching row exists", async () => {
  const { remote, calls } = fixture((url) => url.includes("select=id&limit=1") ? [{ id: "expired" }] : []);
  await remote.claimJob({ id: "device", last_seen_at: new Date().toISOString() });
  const writes = calls.filter((call) => call.options.method === "PATCH");
  assert.equal(writes.length, 1);
  assert.equal(writes[0].options.headers.Prefer, "return=minimal");
  assert.match(writes[0].options.body, /expired/);
});

test("unchanged running progress skips writes while preserving cancellation", async () => {
  const { remote, calls } = fixture(() => [{ id: "job", status: "running", progress: { step: 2 }, cancel_requested_at: "requested" }]);
  const result = await remote.updateJobProgress({ id: "device", last_seen_at: new Date().toISOString() }, { jobId: "job", progress: { step: 2 } });
  assert.equal(result.cancelRequested, true);
  assert.equal(calls.some((call) => call.options.method === "PATCH"), false);
});

test("summary keeps explicit channel without downloading the job payload", () => {
  const { remote } = fixture(() => []);
  assert.equal(remote.jobToPublic({ job_type: "facebook_threads", channel: "threads_promote" }).channel, "threads_promote");
});
