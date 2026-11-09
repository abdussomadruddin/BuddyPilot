const test = require("node:test");
const assert = require("node:assert/strict");
const { authCookie, isAuthed, requireAuth } = require("../lib/auth");

test("malformed cookies fail closed without breaking a valid login", () => {
  const previous = process.env.APP_PASSWORD;
  process.env.APP_PASSWORD = "local-auth-test-only";
  try {
    const valid = authCookie().split(";")[0];
    const request = (cookie) => ({ headers: { cookie } });
    assert.equal(isAuthed(request(valid)), true);
    assert.equal(isAuthed(request(`unrelated=%ZZ; ${valid}`)), true);
    assert.equal(isAuthed(request("postpilot_auth=%ZZ")), false);
    assert.equal(isAuthed(request(`${valid}; postpilot_auth=%ZZ`)), false);
    assert.equal(isAuthed(request("__proto__=%ZZ; constructor=%ZZ")), false);
    assert.equal(isAuthed(request(undefined)), false);
    assert.throws(() => requireAuth(request("postpilot_auth=%ZZ")), { statusCode: 401 });
  } finally {
    if (previous === undefined) delete process.env.APP_PASSWORD;
    else process.env.APP_PASSWORD = previous;
  }
});
