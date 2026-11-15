const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync("chrome-post-pilot/buddypilot-wake.js", "utf8");
const event = "buddypilot-post-queued";

function load(sendMessage) {
  const listeners = new Map();
  const runtime = { id: "fixture", sendMessage };
  vm.runInNewContext(source, {
    chrome: { runtime },
    window: {
      addEventListener: (name, listener) => listeners.set(name, listener),
      removeEventListener: (name, listener) => {
        if (listeners.get(name) === listener) listeners.delete(name);
      },
    },
  });
  return { runtime, listeners };
}

test("a stale wake listener detaches after a synchronous invalidated-context error", async () => {
  let calls = 0;
  const { listeners } = load(() => {
    if (++calls > 1) throw new Error("Extension context invalidated.");
    return Promise.resolve();
  });
  await listeners.get(event)();
  assert.equal(calls, 2);
  assert.equal(listeners.has(event), false);
});

test("missing runtime ID after reload detaches without sending", async () => {
  let calls = 0;
  const { runtime, listeners } = load(() => { ++calls; });
  delete runtime.id;
  await listeners.get(event)();
  assert.equal(calls, 1);
  assert.equal(listeners.has(event), false);
});

test("a transient wake failure does not disable future queue events", async () => {
  let calls = 0;
  const { listeners } = load(async (payload) => {
    assert.equal(payload.action, "wake");
    if (++calls === 1) throw new Error("Could not establish connection.");
  });
  await listeners.get(event)();
  assert.equal(calls, 2);
  assert.equal(listeners.has(event), true);
});
