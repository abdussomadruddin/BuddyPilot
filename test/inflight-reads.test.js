const test = require("node:test");
const assert = require("node:assert/strict");
const { createInflightReads } = require("../lib/inflight-reads");
const { isTransientError } = require("../lib/retry-policy");

test("simultaneous identical reads share work but not mutable results", async () => {
  const reads = createInflightReads();
  let count = 0;
  const operation = async () => { count += 1; return [{ value: 1 }]; };
  const [a, b] = await Promise.all([reads.run("account", "clients", operation), reads.run("account", "clients", operation)]);
  assert.equal(count, 1);
  a[0].value = 9;
  assert.equal(b[0].value, 1);
  await reads.run("account", "clients", operation);
  assert.equal(count, 2);
});

test("account credentials and query paths isolate reads", async () => {
  const reads = createInflightReads();
  let count = 0;
  const operation = async () => ++count;
  await Promise.all([reads.run("a", "one", operation), reads.run("b", "one", operation), reads.run("a", "two", operation)]);
  assert.equal(count, 3);
});

test("writes invalidate in-flight reads without old completions removing new work", async () => {
  const reads = createInflightReads();
  let finish;
  const old = reads.run("a", "one", () => new Promise((resolve) => { finish = resolve; }));
  await Promise.resolve();
  reads.invalidate();
  let count = 0;
  const fresh = reads.run("a", "one", async () => { count += 1; return "new"; });
  finish("old");
  assert.equal(await old, "old");
  assert.equal(await fresh, "new");
  assert.equal(count, 1);
});

test("failed reads do not poison future retries", async () => {
  const reads = createInflightReads();
  await assert.rejects(reads.run("a", "one", async () => { throw new Error("failure"); }), /failure/);
  assert.equal(await reads.run("a", "one", async () => "recovered"), "recovered");
});

test("permanent HTTP failures never retry based on misleading response text", () => {
  for (const statusCode of [400, 401, 403, 404, 409, 422]) {
    assert.equal(isTransientError(Object.assign(new Error("network timeout rate limit"), { statusCode })), false);
  }
  assert.equal(isTransientError({ statusCode: 429 }), true);
  assert.equal(isTransientError({ statusCode: 503 }), true);
});

test("Supabase integration shares reads, isolates results and invalidates on writes", async () => {
  const db = require("../lib/supabase-db");
  const previousFetch = global.fetch;
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = "https://fixture.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture";
  let count = 0;
  global.fetch = async () => {
    count += 1;
    return { ok: true, status: 200, text: async () => JSON.stringify([{ code: "fixture", metadata: {} }]) };
  };
  try {
    const [a, b] = await Promise.all([db.listSupabaseClients(), db.listSupabaseClients()]);
    assert.equal(count, 1);
    a[0].metadata.changed = true;
    assert.equal(b[0].metadata.changed, undefined);
    await db.listSupabaseClients();
    assert.equal(count, 2);
    await db.resolveOperationsIncidents(["fixture"]);
    await db.listSupabaseClients();
    assert.equal(count, 4);
  } finally {
    global.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  }
});
