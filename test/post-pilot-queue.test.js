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

test("extension is tokenless and scopes its hosts to publishing and photo delivery", () => {
  const manifest = JSON.parse(fs.readFileSync("chrome-post-pilot/manifest.json", "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.host_permissions, ["https://buddypilot.vercel.app/*", "https://www.facebook.com/*", "https://www.threads.com/*", "https://*.public.blob.vercel-storage.com/postpilot/*"]);
  assert.equal(manifest.permissions.includes("cookies"), false);
  new vm.Script(fs.readFileSync("chrome-post-pilot/worker.js", "utf8"));
});

test("photo and Facebook autojobs require compatible extension capabilities", async () => {
  const image = "https://fixture.public.blob.vercel-storage.com/postpilot/photo.jpg";
  let row;
  const put = async (_path, { body }) => { row = { id, status: body.status, data: body.data }; return [row]; };
  await assert.rejects(dispatch({ action: "enqueue", platform: "threads", autoPost: true, content: "Teks", image: "https://not-allowed.invalid/photo.jpg" }, put));
  await dispatch({ action: "enqueue", platform: "threads", autoPost: true, content: "Teks", image }, put);
  assert.equal(row.status, "queued_auto_image");
  await dispatch({ action: "claim", autoThreads: true }, async (path) => {
    assert.doesNotMatch(path, /queued_auto_image/);
    return [];
  });
  const { job } = await dispatch({ action: "claim", autoThreads: true, threadsImages: true }, async (path, options) => {
    assert.match(path, /queued_auto_image/);
    return options ? [{ id }] : [row];
  });
  assert.equal(job.image, image);
  assert.equal(job.autoPost, true);
  await dispatch({ action: "enqueue", platform: "facebook", autoPost: true, content: "Teks" }, put);
  assert.equal(row.status, "queued_auto_facebook");
  const fb = await dispatch({ action: "claim", autoFacebook: true, autoOnly: true }, async (path, options) => {
    assert.match(path, /status=eq.queued_auto_facebook/);
    return options ? [{ id }] : [row];
  });
  assert.equal(fb.job.platform, "facebook");
});

test("autopost jobs are distinct from manual jobs and can finish with uncertain status", async () => {
  const draft = await dispatch({ action: "enqueue", platform: "threads", autoPost: true, content: "Post sekali." }, async (_path, { body }) => {
    assert.equal(body.status, "queued_auto");
    return [{ id }];
  });
  assert.equal(draft.job.state, "queued");
  const { job } = await dispatch({ action: "claim", autoThreads: true, autoOnly: true }, async (path, options) => {
    assert.match(path, /status=eq.queued_auto/);
    return options ? [{ id }] : [{ id, status: "queued_auto", data: { platform: "threads", parts: ["Post sekali."] } }];
  });
  assert.equal(job.autoPost, true);
  await dispatch({ action: "finish", id, state: "uncertain" }, async (path, options) => {
    assert.match(path, /status=eq.claimed/);
    assert.deepEqual(options.body, { status: "uncertain" });
  });
});
