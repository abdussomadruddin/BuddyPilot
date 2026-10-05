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

test("cleared jobs and older history stay out of the status card", () => {
  const { visibleRemoteJobs } = require('../lib/postpilot-remote');
  const old = { id: 'old', status: 'failed', progress: {} };
  const cleared = { id: 'clear', status: 'cancelled', progress: { clearedAt: '2026-10-05T00:00:00Z' } };
  const fresh = { id: 'fresh', status: 'queued', progress: {} };
  assert.deepEqual(visibleRemoteJobs([cleared, old]), []);
  assert.deepEqual(visibleRemoteJobs([fresh, cleared, old]), [fresh]);
});

test("clear cancels a running job and late extension completion cannot revive it", async (t) => {
  const { jobAction, finishJob, updateJobProgress } = require('../lib/postpilot-remote');
  const originalFetch = global.fetch;
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = 'https://synthetic.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
  let job = { id: 'job', device_id: 'mac', status: 'running', job_type: 'threads_text', progress: {} };
  let writes = 0;
  global.fetch = async (url, options = {}) => {
    const deviceQuery = String(url).includes('postpilot_extension_devices');
    if (options.method === 'PATCH' && !deviceQuery) { writes++; job = { ...job, ...JSON.parse(options.body) }; }
    return { ok: true, text: async () => JSON.stringify(deviceQuery ? [{ id: 'mac' }] : [job]) };
  };
  t.after(() => {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });
  await jobAction({ jobId: 'job', action: 'clear' });
  assert.equal(job.status, 'cancelled');
  assert.ok(job.cancel_requested_at);
  assert.ok(job.progress.clearedAt);
  await finishJob({ id: 'mac' }, { jobId: 'job', status: 'completed' });
  assert.equal(job.status, 'cancelled');
  assert.equal(writes, 1);
  await assert.rejects(jobAction({ jobId: 'job', action: 'retry' }), /di-clear/);
});

test('Threads Promote requires five distinct images but counts as one post', () => {
  const posts = Array.from({length: 5}, (_, i) => ({ postText: 'Tengok gambar ni dulu.', image: {id: 'image-'+i} }));
  assert.equal(validatePayload('facebook_threads', {channel:'threads_promote', posts}), 1);
  assert.throws(() => validatePayload('facebook_threads', {channel:'threads_promote', posts:posts.slice(0,4)}), /5 gambar/);
  assert.throws(() => validatePayload('facebook_threads', {channel:'threads_promote', posts:posts.map(p=>({...p,image:{id:'same'}}))}), /5 gambar/);
  assert.throws(() => validatePayload('facebook_threads', {channel:'threads_promote', posts:posts.map(p=>({...p,postText:'x'.repeat(281)}))}), /pendek/);
});

test('old extensions cannot claim isolated Facebook or Threads Promote jobs', () => {
  const {supportsJob} = require('../lib/postpilot-remote');
  for (const channel of ['facebook','threads_promote']) {
    assert.equal(supportsJob({payload:{channel}}, []), false);
    assert.equal(supportsJob({payload:{channel}}, ['separate-promote-v1']), true);
  }
  assert.equal(supportsJob({payload:{}}, []), true);
});
