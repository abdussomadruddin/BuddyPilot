const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const handler = require("../api_handlers/post-pilot-queue");
const { dispatch } = handler;
const id = "68534ad2-b171-414b-887a-1ab6de42796e";

test("only supported destinations and valid draft lengths are enqueued", async () => {
  for (const body of [
    { platform: "facebook-page", content: "A" },
    { platform: "threads", content: "x".repeat(501) },
    { platform: "facebook", content: " " },
  ]) await assert.rejects(dispatch({ action: "enqueue", ...body }, () => assert.fail("Unexpected write")), { statusCode: 400 });
  const result = await dispatch({ action: "enqueue", platform: "facebook", content: " Draf " }, async (path, options) => {
    assert.deepEqual(options.body, { platform: "facebook", content: "Draf" });
    assert.equal(options.method, "POST");
    return [{ id, state: "queued" }];
  });
  assert.equal(result.job.state, "queued");
});

test("only the worker winning the atomic claim receives content", async () => {
  let claimed = false;
  const request = async (path, options) => {
    if (!options) {
      assert.match(path, /state=eq.queued&created_at=gte/);
      return [{ id, platform: "threads", content: "Draf" }];
    }
    assert.match(path, /state=eq.queued/);
    assert.deepEqual(options.body, { state: "claimed", content: "[cleared]" });
    if (claimed) return [];
    claimed = true;
    return [{ id }];
  };
  const results = await Promise.all([dispatch({ action: "claim" }, request), dispatch({ action: "claim" }, request)]);
  assert.equal(results.filter((result) => result.job?.content === "Draf").length, 1);
});

test("status never returns content, and expired drafts are identified", async () => {
  const result = await dispatch({ action: "status", id }, async () => [{ id, state: "queued", created_at: "2026-11-10T00:00:00Z", content: "private" }], Date.parse("2026-11-15T00:00:00Z"));
  assert.deepEqual(result, { job: { id, state: "expired" } });
});

test("extension is tokenless and requests only the three required hosts", () => {
  const manifest = JSON.parse(fs.readFileSync("chrome-post-pilot/manifest.json", "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.host_permissions, ["https://buddypilot.vercel.app/*", "https://www.facebook.com/*", "https://www.threads.com/*"]);
  assert.equal(manifest.permissions.includes("cookies"), false);
  new vm.Script(fs.readFileSync("chrome-post-pilot/worker.js", "utf8"));
});
