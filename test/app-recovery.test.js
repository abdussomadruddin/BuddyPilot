const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const handler = require("../api_handlers/app");
const { authCookie } = require("../lib/auth");

test("rendered BuddyPilot browser scripts compile after recovery changes", async (t) => {
  const previous = process.env.APP_PASSWORD;
  process.env.APP_PASSWORD = "local-test-only";
  t.after(() => {
    if (previous === undefined) delete process.env.APP_PASSWORD;
    else process.env.APP_PASSWORD = previous;
  });
  let html;
  const response = { setHeader() {}, end(value) { html = value; } };
  await handler({ method: "GET", headers: { cookie: authCookie() } }, response);
  assert.equal(response.statusCode, 200);
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length);
  for (const [, source] of scripts) new vm.Script(source);
});

test("degraded dashboard snapshots are removed instead of cached", () => {
  const source = fs.readFileSync(require.resolve("../api_handlers/app"), "utf8");
  const body = source.match(/function cacheOperationsOverview\(overview\) \{([\s\S]*?)\n    \}/)[1];
  const cached = new Map([["cache", "old snapshot"]]);
  const context = vm.createContext({
    TODAY_CACHE_KEY: "cache",
    sessionStorage: { removeItem: (key) => cached.delete(key), setItem: (key, value) => cached.set(key, value) },
  });
  vm.runInContext(`function cacheOperationsOverview(overview) {${body}}`, context);
  context.overview = { warnings: ["Database unavailable"] };
  vm.runInContext("cacheOperationsOverview(overview)", context);
  assert.equal(cached.has("cache"), false);
  context.overview = { warnings: [], overall: "operational" };
  vm.runInContext("cacheOperationsOverview(overview)", context);
  assert.equal(JSON.parse(cached.get("cache")).overview.overall, "operational");
});
