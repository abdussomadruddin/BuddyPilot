const setEnv = require("./helpers/env");
const test = require("node:test");
const assert = require("node:assert/strict");
const { request } = require("../lib/supabase-http");
const db = require("../lib/supabase-db");
function config(t) {
  setEnv(t, "SUPABASE_URL", "https://test.supabase.co");
  setEnv(t, "SUPABASE_SERVICE_ROLE_KEY", "test-only");
}
test("transient reads retry once, successful payload is retained", async (t) => {
  let count = 0;
  t.mock.method(global, "fetch", async () =>
    ++count === 1
      ? new Response("temporary", { status: 503 })
      : Response.json([{ id: 1 }]),
  );
  const result = await request("https://test.supabase.co");
  assert.deepEqual(JSON.parse(result.text), [{ id: 1 }]);
  assert.equal(count, 2);
});
test("writes never retry even if upstream may have committed", async (t) => {
  let count = 0;
  t.mock.method(global, "fetch", async () => {
    count++;
    throw new TypeError("network failure");
  });
  await assert.rejects(
    request("https://test.supabase.co", { method: "POST", body: "{}" }),
    (e) => e.statusCode === 503,
  );
  assert.equal(count, 1);
});
test("plain-text Supabase failures retain useful error and do not consume body twice", async (t) => {
  config(t);
  t.mock.method(
    global,
    "fetch",
    async () => new Response("permission denied", { status: 403 }),
  );
  await assert.rejects(db.supabaseRequest("table"), /permission denied/);
});
test("invalid successful JSON is reported as 502", async (t) => {
  config(t);
  t.mock.method(
    global,
    "fetch",
    async () => new Response("<html>bad upstream</html>"),
  );
  await assert.rejects(
    db.supabaseRequest("table"),
    (e) => e.statusCode === 502,
  );
});
test("404 table failure explains migration requirement", async (t) => {
  config(t);
  t.mock.method(global, "fetch", async () =>
    Response.json({ message: "missing relation" }, { status: 404 }),
  );
  await assert.rejects(
    db.supabaseRequest("table"),
    /Supabase table belum setup/,
  );
});
test("timeout aborts a stalled body and gives bounded failure", async (t) => {
  const timeout = AbortSignal.timeout.bind(AbortSignal);
  t.mock.method(AbortSignal, "timeout", () => timeout(15));
  let calls = 0;
  t.mock.method(global, "fetch", async (url, options) => {
    calls++;
    return {
      ok: true,
      status: 200,
      arrayBuffer: () =>
        new Promise((resolve, reject) =>
          options.signal.addEventListener(
            "abort",
            () => reject(options.signal.reason),
            { once: true },
          ),
        ),
    };
  });
  // Keep the event loop alive while AbortSignal's unref'ed timer runs.
  const keepAlive = setInterval(() => {}, 100);
  try {
    await assert.rejects(
      request("https://test.supabase.co"),
      /mengambil masa terlalu lama/,
    );
    assert.equal(calls, 2);
  } finally {
    clearInterval(keepAlive);
  }
});
test("binary storage responses preserve bytes and content type", async (t) => {
  const data = Buffer.from([0, 255, 128, 1]);
  t.mock.method(
    global,
    "fetch",
    async () =>
      new Response(data, { headers: { "content-type": "image/png" } }),
  );
  const result = await request("https://test.supabase.co", { binary: true });
  assert.deepEqual(Buffer.from(result.data), data);
  assert.equal(result.response.headers.get("content-type"), "image/png");
});
test("rate limit is surfaced without immediate retry", async (t) => {
  let count = 0;
  t.mock.method(global, "fetch", async () => {
    count++;
    return new Response("rate limited", { status: 429 });
  });
  await assert.rejects(
    request("https://test.supabase.co"),
    (e) => e.statusCode === 429,
  );
  assert.equal(count, 1);
});
