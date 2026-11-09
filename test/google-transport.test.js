const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { once } = require("node:events");
const { google } = require("googleapis");

test("Google Drive transport preserves authenticated list requests and error handling", async () => {
  const requests = [];
  const server = http.createServer((req, res) => {
    requests.push({ url: new URL(req.url, "http://localhost"), authorization: req.headers.authorization });
    res.setHeader("content-type", "application/json");
    if (requests.length === 1) res.end(JSON.stringify({ files: [{ id: "fixture-id", name: "Fixture" }] }));
    else { res.statusCode = 403; res.end(JSON.stringify({ error: { message: "Fixture forbidden", code: 403 } })); }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: "fixture-token", expiry_date: Date.now() + 3600000 });
    const drive = google.drive({ version: "v3", auth, rootUrl: `http://127.0.0.1:${server.address().port}/` });
    const result = await drive.files.list({ q: "trashed = false", fields: "files(id,name)" });
    assert.deepEqual(result.data.files, [{ id: "fixture-id", name: "Fixture" }]);
    assert.equal(requests[0].url.pathname, "/drive/v3/files");
    assert.equal(requests[0].url.searchParams.get("q"), "trashed = false");
    assert.equal(requests[0].authorization, "Bearer fixture-token");
    await assert.rejects(drive.files.list({ fields: "files(id)" }, { retry: false }), (error) => {
      assert.equal(error.response.status, 403);
      assert.match(error.message, /Fixture forbidden/);
      return true;
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
