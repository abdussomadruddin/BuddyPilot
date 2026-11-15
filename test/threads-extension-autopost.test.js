const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const source = readFileSync("chrome-post-pilot/threads-autopost.js", "utf8");

async function simulate({ user = "owner", canAdd = true, confirm = true, breakInsert = false, existing = false, photo = false, wrongRow = false, paste = false, missingImageButton = false, mountedInput = false } = {}) {
  const parts = ["Pembukaan\n\nPerenggan.", "Sambungan kedua.", "Penutup."];
  let clicks = 0;
  let sent;
  let focused;
  let notice;
  const steps = [];
  const node = (textContent, click) => ({
    innerText: textContent, textContent, click, children: [], getClientRects: () => [1],
    getAttribute: () => null, closest: () => null, matches: () => false,
    querySelector: () => null,
    focus() { focused = this; },
    dispatchEvent(event) { steps.push("paste"); this.innerText = event.clipboardData.text; },
  });
  const fields = [node("")];
  let image;
  let imageOpened = mountedInput;
  const firstRow = { closest: () => null, querySelectorAll: () => [fields[0]], contains: (item) => item === image && !wrongRow };
  fields[0].parentElement = firstRow;
  const upload = {
    accept: "image/jpeg,image/png",
    dispatchEvent() {
      if (this.files.length !== 1 || fields.length !== 1 || !imageOpened || fields[0].innerText) return;
      steps.push("upload");
      image = { ...node(""), src: "blob:https://www.threads.com/fixture", complete: true, naturalWidth: 512 };
    },
  };
  const owner = node(user);
  owner.matches = (selector) => selector === "span";
  owner.children = [{}];
  const dialog = {
    ...node("New thread"),
    isConnected: existing,
    querySelectorAll(selector) {
      if (selector.includes("contenteditable")) return fields;
      if (selector === "a[href],span,img[alt]") return [owner];
      if (selector === 'input[type="file"]') return imageOpened ? [upload] : [];
      if (selector === "img[src]") return image ? [image] : [];
      return [post, ...(canAdd ? [add] : []), ...(photo && !missingImageButton ? [addImage] : [])];
    },
  };
  const post = node("Post", () => {
    clicks++;
    steps.push("post");
    sent = fields.map((field) => field.innerText);
    dialog.isConnected = false;
    if (confirm) notice = node("Posted");
  });
  const add = node("Add to thread", () => { steps.push("next-part"); fields.push(node("")); });
  const addImage = node("Attach media", () => { steps.push("add-image"); imageOpened = true; });
  const open = node("New thread", () => { steps.push("new-thread"); dialog.isConnected = true; });
  const doc = {
    addEventListener() {},
    removeEventListener() {},
    querySelectorAll(selector) {
      if (selector.includes("dialog")) return dialog.isConnected ? [dialog] : [];
      if (selector.includes("status")) return notice ? [notice] : [];
      return [open];
    },
    execCommand(command, _ui, text) {
      assert.equal(command, "insertText");
      steps.push("text");
      if (!paste) focused.innerText = breakInsert ? "Teks tidak sama" : text.replace(/\n/g, "");
    },
  };
  const publish = vm.runInNewContext(source + "\npublishThreadsInChrome", {
    location: { origin: "https://www.threads.com" }, document: doc, URL,
    getComputedStyle: () => ({ visibility: "visible" }), setTimeout: (resolve) => resolve(),
    atob, File, Event,
    DataTransfer: class {
      files = [];
      items = { add: (file) => this.files.push(file) };
      setData(type, content) { assert.equal(type, "text/plain"); this.text = content; }
    },
    ClipboardEvent: class { constructor(_type, options) { this.clipboardData = options.clipboardData; } },
  });
  const status = await publish(parts, "owner", photo ? { type: "image/jpeg", base64: "YWJj" } : null);
  return { status, clicks, sent, parts, photoAttached: Boolean(image), steps };
}

test("Threads publishes all parts, in order, with one click", async () => {
  const result = await simulate();
  assert.equal(result.status, "posted");
  assert.equal(result.clicks, 1);
  assert.deepEqual(result.sent, result.parts);
});

test("wrong account, existing dialog, failed text or missing Add never publish", async () => {
  for (const [options, stage] of [[{ user: "other" }, "profile"], [{ existing: true }, "composer"],
    [{ breakInsert: true }, "text"], [{ canAdd: false }, "thread_part"]]) {
    const result = await simulate(options);
    assert.equal(result.status, "failed:" + stage);
    assert.equal(result.clicks, 0);
  }
});

test("unconfirmed publish is not retried", async () => {
  const result = await simulate({ confirm: false });
  assert.equal(result.status, "uncertain");
  assert.equal(result.clicks, 1);
});

test("Threads falls back to editor paste only when insertText leaves it empty", async () => {
  const result = await simulate({ paste: true });
  assert.equal(result.status, "posted");
  assert.deepEqual(result.sent, result.parts);
  assert.equal(result.clicks, 1);
});

test("Threads photo must be visibly attached to the first part before posting", async () => {
  const good = await simulate({ photo: true });
  assert.equal(good.photoAttached, true);
  assert.equal(good.status, "posted");
  assert.equal(good.clicks, 1);
  assert.deepEqual(good.steps, ["new-thread", "add-image", "upload", "paste", "next-part", "text", "next-part", "text", "post"]);
  const moved = await simulate({ photo: true, wrongRow: true });
  assert.equal(moved.status, "failed:image");
  assert.equal(moved.clicks, 0);
  assert.equal(moved.steps.includes("text"), false);
  const missing = await simulate({ photo: true, missingImageButton: true });
  assert.equal(missing.status, "failed:image");
  assert.deepEqual(missing.steps, ["new-thread"]);
});

test("an unlabelled photo control can use the unique already-mounted image input", async () => {
  const result = await simulate({ photo: true, missingImageButton: true, mountedInput: true });
  assert.equal(result.status, "posted");
  assert.deepEqual(result.steps, ["new-thread", "upload", "paste", "next-part", "text", "next-part", "text", "post"]);
});
