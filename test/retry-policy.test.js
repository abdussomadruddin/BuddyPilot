const test = require("node:test");
const assert = require("node:assert/strict");
const { isTransientError, withTransientRetry } = require("../lib/retry-policy");

test("retry policy only retries transient failures", async () => {
  assert.equal(isTransientError(Object.assign(new Error("HTTP 503"), { statusCode: 503 })), true);
  assert.equal(isTransientError(Object.assign(new Error("Too many requests"), { statusCode: 429 })), true);
  assert.equal(isTransientError(Object.assign(new Error("Unauthorized"), { statusCode: 401 })), false);
  assert.equal(isTransientError(new Error("Composer Facebook belum siap")), false);

  let attempts = 0;
  const result = await withTransientRetry(async () => {
    attempts += 1;
    if (attempts < 3) throw Object.assign(new Error("HTTP 503"), { statusCode: 503 });
    return "ok";
  }, { delays: [0, 0] });
  assert.equal(result, "ok");
  assert.equal(attempts, 3);
});

test("retry policy stops immediately for permanent failures", async () => {
  let attempts = 0;
  await assert.rejects(() => withTransientRetry(async () => {
    attempts += 1;
    throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  }, { delays: [0, 0] }), /Unauthorized/);
  assert.equal(attempts, 1);
});
