const setEnv = require("./helpers/env");
const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");
const auth = require("../lib/auth");
const store = require("../lib/auth-store");
function request(cookie = "") {
  return {
    headers: { cookie },
    socket: { remoteAddress: "test-" + Math.random() },
  };
}
function response() {
  return {
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    end(body) {
      this.body = body;
    },
  };
}
function local(t) {
  for (const key of [
    "VERCEL",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_KEY",
  ])
    setEnv(t, key, "");
  setEnv(t, "NODE_ENV", "test");
  setEnv(t, "APP_PASSWORD", "test-only-auth-password");
}
test("unique sessions expire, logout revokes replay and password rotation invalidates sessions", async (t) => {
  local(t);
  const a = await auth.authCookie();
  const b = await auth.authCookie();
  assert.notEqual(a, b);
  const req = request(a.split(";")[0]);
  assert.equal(await auth.isAuthed(req), true);
  await auth.revokeSession(req);
  assert.equal(await auth.isAuthed(req), false);
  const other = request(b.split(";")[0]);
  assert.equal(await auth.isAuthed(other), true);
  setEnv(t, "APP_PASSWORD", "rotated-password");
  assert.equal(await auth.isAuthed(other), false);
  setEnv(t, "APP_PASSWORD", "test-only-auth-password");
  const now = Date.now();
  t.mock.method(Date, "now", () => now + 8 * 60 * 60 * 1000 + 1);
  assert.equal(await auth.isAuthed(other), false);
});
test("legacy, forged and malformed cookies do not authenticate", async (t) => {
  local(t);
  for (const cookie of [
    "postpilot_auth=%E0%A4%A",
    "postpilot_auth=forged",
    "postpilot_auth=" + "a".repeat(43),
  ]) {
    assert.equal(await auth.isAuthed(request(cookie)), false);
  }
});
test("limit is five attempts per fifteen-minute window including concurrent attempts", async (t) => {
  local(t);
  const key = store.hash("test-" + Math.random());
  const now = Date.now();
  const attempts = await Promise.all(
    Array.from({ length: 6 }, () => store.consumeAttempt(key, now)),
  );
  assert.equal(attempts.filter((a) => a.allowed).length, 5);
  assert.equal(attempts[5].retry_after, 900);
  assert.equal((await store.consumeAttempt(key, now + 900001)).allowed, true);
});
test("login blocks sixth request with Retry-After and rejects oversized body", async (t) => {
  local(t);
  const login = require("../api_handlers/login");
  for (let i = 0; i < 6; i++) {
    const req = Readable.from([Buffer.from("password=wrong")]);
    req.method = "POST";
    req.headers = {};
    req.socket = { remoteAddress: "login-limit-test" };
    const res = response();
    await login(req, res);
    assert.equal(res.statusCode, i < 5 ? 303 : 429);
    if (i === 5) assert.ok(Number(res.headers["retry-after"]) > 0);
  }
  const req = Readable.from([Buffer.alloc(4097)]);
  req.method = "POST";
  req.headers = {};
  req.socket = { remoteAddress: "oversized-test" };
  const res = response();
  await login(req, res);
  assert.equal(res.statusCode, 413);
});
test("production fails closed without shared auth storage", async (t) => {
  local(t);
  setEnv(t, "NODE_ENV", "production");
  await assert.rejects(auth.authCookie(), (e) => e.statusCode === 503);
});
test("persistent sessions survive module reloads and revocation removes shared record", async (t) => {
  local(t);
  setEnv(t, "SUPABASE_URL", "https://test.supabase.co");
  setEnv(t, "SUPABASE_SERVICE_ROLE_KEY", "test-only");
  const rows = new Map();
  t.mock.method(global, "fetch", async (url, options) => {
    const method = options.method;
    const parsed = new URL(url);
    const token = parsed.searchParams.get("token_hash")?.slice(3);
    if (method === "POST") {
      const row = JSON.parse(options.body);
      rows.set(row.token_hash, row);
      return new Response("", { status: 201 });
    }
    if (method === "DELETE") {
      rows.delete(token);
      return new Response(null, { status: 204 });
    }
    return Response.json(rows.has(token) ? [rows.get(token)] : []);
  });
  const cookie = await auth.authCookie();
  const req = request(cookie.split(";")[0]);
  assert.equal(await auth.isAuthed(req), true);
  const modulePath = require.resolve("../lib/auth-store");
  delete require.cache[modulePath];
  const freshStore = require("../lib/auth-store");
  assert.ok(await freshStore.getSession(cookie.split(";")[0].split("=")[1]));
  await auth.revokeSession(req);
  assert.equal(await auth.isAuthed(req), false);
  assert.equal(rows.size, 0);
});

test("Vercel limiter uses shared RPC and ignores spoofed generic forwarded IP", async (t) => {
  local(t);
  setEnv(t, "VERCEL", "1");
  setEnv(t, "SUPABASE_URL", "https://test.supabase.co");
  setEnv(t, "SUPABASE_SERVICE_ROLE_KEY", "test-only");
  const keys = [];
  t.mock.method(global, "fetch", async (url, options) => {
    assert.equal(
      url,
      "https://test.supabase.co/rest/v1/rpc/consume_login_attempt",
    );
    assert.equal(options.method, "POST");
    keys.push(JSON.parse(options.body).p_key);
    return Response.json({ allowed: false, retry_after: 123 });
  });
  const a = await auth.checkLoginAttempt({
    headers: {
      "x-vercel-forwarded-for": "192.0.2.1",
      "x-forwarded-for": "fake1",
    },
  });
  await auth.checkLoginAttempt({
    headers: {
      "x-vercel-forwarded-for": "192.0.2.1",
      "x-forwarded-for": "fake2",
    },
  });
  assert.equal(a.allowed, false);
  assert.equal(a.retry_after, 123);
  assert.equal(keys[0], keys[1]);
  assert.equal(keys[0], store.hash("192.0.2.1"));
});
