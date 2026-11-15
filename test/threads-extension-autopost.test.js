const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const source = readFileSync("chrome-post-pilot/threads-autopost.js", "utf8");

async function simulate({ user = "owner", canAdd = true, confirm = true, breakInsert = false, existing = false } = {}) {
  const parts = ["Pembukaan\n\nPerenggan.", "Sambungan kedua.", "Penutup."];
  let clicks = 0;
  let sent;
  let focused;
  let notice;
  const node = (textContent, click) => ({
    innerText: textContent, textContent, click, children: [], getClientRects: () => [1],
    getAttribute: () => null, closest: () => null, matches: () => false,
    focus() { focused = this; },
  });
  const fields = [node("")];
  const owner = node(user);
  const dialog = {
    ...node("New thread"),
    isConnected: existing,
    querySelectorAll(selector) {
      if (selector.includes("contenteditable")) return fields;
      if (selector === "a[href],span") return [owner];
      return canAdd ? [post, add] : [post];
    },
  };
  const post = node("Post", () => {
    clicks++;
    sent = fields.map((field) => field.innerText);
    dialog.isConnected = false;
    if (confirm) notice = node("Posted");
  });
  const add = node("Add to thread", () => fields.push(node("")));
  const open = node("New thread", () => { dialog.isConnected = true; });
  const doc = {
    querySelectorAll(selector) {
      if (selector.includes("dialog")) return dialog.isConnected ? [dialog] : [];
      if (selector.includes("status")) return notice ? [notice] : [];
      return [open];
    },
    execCommand(command, _ui, text) {
      assert.equal(command, "insertText");
      focused.innerText = breakInsert ? "Teks tidak sama" : text;
    },
  };
  const publish = vm.runInNewContext(source + "\npublishThreadsInChrome", {
    location: { origin: "https://www.threads.com" }, document: doc, URL,
    getComputedStyle: () => ({ visibility: "visible" }), setTimeout: (resolve) => resolve(),
  });
  const status = await publish(parts, "owner");
  return { status, clicks, sent, parts };
}

test("Threads publishes all parts, in order, with one click", async () => {
  const result = await simulate();
  assert.equal(result.status, "posted");
  assert.equal(result.clicks, 1);
  assert.deepEqual(result.sent, result.parts);
});

test("wrong account, existing dialog, failed text or missing Add never publish", async () => {
  for (const options of [{ user: "other" }, { existing: true }, { breakInsert: true }, { canAdd: false }]) {
    const result = await simulate(options);
    assert.equal(result.status, "failed");
    assert.equal(result.clicks, 0);
  }
});

test("unconfirmed publish is not retried", async () => {
  const result = await simulate({ confirm: false });
  assert.equal(result.status, "uncertain");
  assert.equal(result.clicks, 1);
});
