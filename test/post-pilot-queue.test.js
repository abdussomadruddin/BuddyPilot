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
    { platform: "threads", content: "x".repeat(12001) },
    { platform: "facebook", content: " " },
  ]) await assert.rejects(dispatch({ action: "enqueue", ...body }, () => assert.fail("Unexpected write")), { statusCode: 400 });
  const result = await dispatch({ action: "enqueue", platform: "facebook", content: " Draf " }, async (path, options) => {
    assert.deepEqual(options.body, { owner_key: "post-pilot-mac", kind: "draft", status: "queued", data: { platform: "facebook", parts: ["Draf"] } });
    assert.equal(options.method, "POST");
    return [{ id, state: "queued" }];
  });
  assert.equal(result.job.state, "queued");
});

test("only the worker winning the atomic claim receives content", async () => {
  let claimed = false;
  const request = async (path, options) => {
    if (!options) {
      assert.match(path, /owner_key=eq.post-pilot-mac&kind=eq.draft&status=eq.queued&created_at=gte/);
      return [{ id, status: "queued", data: { platform: "threads", parts: ["Draf"] } }];
    }
    assert.match(path, /status=eq.queued/);
    assert.deepEqual(options.body, { status: "claimed", data: {} });
    if (claimed) return [];
    claimed = true;
    return [{ id }];
  };
  const results = await Promise.all([dispatch({ action: "claim" }, request), dispatch({ action: "claim" }, request)]);
  assert.equal(results.filter((result) => result.job?.content === "Draf").length, 1);
});

test("status never returns content, and expired drafts are identified", async () => {
  const result = await dispatch({ action: "status", id }, async () => [{ id, status: "queued_thread", created_at: "2026-11-10T00:00:00Z", content: "private" }], Date.parse("2026-11-15T00:00:00Z"));
  assert.deepEqual(result, { job: { id, state: "expired" } });
});

test("long Threads handoffs retain every part and are claimed only by multipart workers", async () => {
  const content = "Panjang ".repeat(200).trim();
  let row;
  await dispatch({ action: "enqueue", platform: "threads", content }, async (path, { body }) => {
    assert.equal(body.status, "queued_thread");
    assert.ok(body.data.parts.every((part) => part.length <= 500));
    assert.equal(body.data.parts.join(" "), content);
    row = { id, status: body.status, data: body.data };
    return [row];
  });
  assert.deepEqual(await dispatch({ action: "claim" }, async (path) => {
    assert.match(path, /status=eq.queued&/);
    return [];
  }), { job: null });
  const { job } = await dispatch({ action: "claim", multipart: true }, async (path, options) => {
    assert.ok(path.includes(options ? "status=eq.queued_thread" : "status=in.(queued,queued_thread)"));
    return options ? [{ id }] : [row];
  });
  assert.deepEqual(job.parts, row.data.parts);
});

test("extension is tokenless and requests only the three required hosts", () => {
  const manifest = JSON.parse(fs.readFileSync("chrome-post-pilot/manifest.json", "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.host_permissions, ["https://buddypilot.vercel.app/*", "https://www.facebook.com/*", "https://www.threads.com/*"]);
  assert.equal(manifest.permissions.includes("cookies"), false);
  new vm.Script(fs.readFileSync("chrome-post-pilot/worker.js", "utf8"));
});
