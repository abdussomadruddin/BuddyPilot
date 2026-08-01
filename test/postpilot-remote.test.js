const test = require("node:test");
const assert = require("node:assert/strict");
const { DEVICE_ONLINE_MS, deviceToPublic, jobToPublic, validatePayload } = require("../lib/postpilot-remote");

test("remote Facebook jobs require an image reference for every post", () => {
  assert.throws(
    () => validatePayload("facebook_threads", { posts: [{ postText: "Hello" }] }),
    /gambar hook/i
  );
  assert.equal(validatePayload("facebook_threads", {
    posts: [{ postText: "Hello", image: { id: "image-1" } }],
  }), 1);
});

test("remote Threads jobs support up to 50 text posts", () => {
  const posts = Array.from({ length: 50 }, (_, index) => ({ postText: `Post ${index + 1}` }));
  assert.equal(validatePayload("threads_text", { posts }), 50);
  assert.throws(() => validatePayload("threads_text", { posts: [...posts, { postText: "51" }] }), /1 hingga 50/);
});

test("public job status never exposes the private payload", () => {
  const job = jobToPublic({
    id: "job-1",
    job_type: "threads_text",
    status: "queued",
    payload: { posts: [{ postText: "private draft" }] },
    progress: { index: 0, total: 1 },
  });
  assert.equal(job.id, "job-1");
  assert.equal("payload" in job, false);
});

test("paired Mac stays online between lightweight health syncs", () => {
  const now = Date.now();
  assert.equal(DEVICE_ONLINE_MS, 15 * 60 * 1000);
  assert.equal(deviceToPublic({ id: "mac", last_seen_at: new Date(now - 14 * 60 * 1000).toISOString() }).status, "online");
  assert.equal(deviceToPublic({ id: "mac", last_seen_at: new Date(now - 16 * 60 * 1000).toISOString() }).status, "offline");
});
