const test = require("node:test");
const assert = require("node:assert/strict");
const { supabaseRequest } = require("../lib/supabase-db");

function mockRequest(t, response) {
  const previous = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
  t.after(() => {
    if (previous.url === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previous.url;
    if (previous.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previous.key;
  });
  t.mock.method(global, "fetch", async (url, options) => {
    assert.ok(options.signal instanceof AbortSignal);
    return response;
  });
}

test("Supabase HTML gateway errors remain readable without reading the body twice", async (t) => {
  mockRequest(t, new Response("<!doctype html><html>Unavailable</html>", { status: 503 }));
  await assert.rejects(supabaseRequest("app_activity"), /Supabase tidak tersedia \(HTTP 503\)/);
});

test("gateway 404 does not falsely claim database tables are missing", async (t) => {
  mockRequest(t, new Response("Project unavailable", { status: 404 }));
  await assert.rejects(supabaseRequest("app_activity"), /Project unavailable/);
});

test("database credential errors do not log the app user out", async (t) => {
  mockRequest(t, new Response(JSON.stringify({ message: "Invalid API key" }), { status: 401 }));
  await assert.rejects(supabaseRequest("app_activity"), (error) => {
    assert.equal(error.statusCode, 502);
    assert.equal(error.message, "Invalid API key");
    return true;
  });
});

test("PostgREST missing-table errors retain setup guidance", async (t) => {
  mockRequest(t, new Response(JSON.stringify({ code: "PGRST205", message: "Missing table" }), { status: 404 }));
  await assert.rejects(supabaseRequest("app_activity"), /Supabase table belum setup/);
});

test("successful Supabase responses are unchanged", async (t) => {
  mockRequest(t, new Response(JSON.stringify([{ id: 1 }])));
  assert.deepEqual(await supabaseRequest("app_activity"), [{ id: 1 }]);
});
