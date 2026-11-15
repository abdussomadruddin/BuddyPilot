const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const source = readFileSync("chrome-post-pilot/facebook-autopost.js", "utf8");

async function simulate({ who = "Owner", finalText = true, confirmed = true, text = "Draf Facebook untuk disiarkan.", photo = false, losePhoto = false } = {}) {
  let stage = 0, nextClicks = 0, postClicks = 0;
  let photoAttached = false;
  const node = (value, click) => ({
    textContent: value, innerText: value, click, focus() {}, getClientRects: () => [1],
    getAttribute: () => null, closest: () => null, matches: () => false,
  });
  const input = node("");
  input.dispatchEvent = (event) => { input.innerText = event.clipboardData.text; };
  const next = node("Next", () => { ++nextClicks; stage = 2; });
  const post = node("Post", () => { ++postClicks; stage = 3; dialog.isConnected = false; });
  const open = node("What's on your mind, Owner?", () => { stage = 1; dialog.isConnected = true; });
  const photoInput = {
    accept: "image/jpeg,image/png",
    dispatchEvent() { photoAttached = this.files.length === 1; },
  };
  const preview = { ...node(""), src: "blob:https://www.facebook.com/photo", complete: true, naturalWidth: 40 };
  const dialog = {
    isConnected: false, getClientRects: () => [1],
    querySelectorAll(selector) {
      if (selector.includes("contenteditable")) return stage === 1 ? [input] : [];
      if (selector === 'a,span,strong,b,div[dir="auto"]') return [node(who)];
      if (selector === '[dir="auto"]') return stage === 2 && finalText ? [node(text)] : [];
      if (selector === 'input[type="file"]') return photo ? [photoInput] : [];
      if (selector === "img[src]") return photoAttached && !(stage === 2 && losePhoto) ? [preview] : [];
      return stage === 1 ? [next] : [post];
    },
  };
  const headerDialog = { ...node("Create post"), parentElement: { closest: () => dialog } };
  const document = {
    addEventListener() {},
    removeEventListener() {},
    querySelectorAll(selector) {
      if (selector.includes("dialog")) return dialog.isConnected ? [dialog, headerDialog] : [];
      if (selector.includes("alert")) return stage === 3 && confirmed ? [node("Your post has been published")] : [];
      return [open];
    },
    execCommand(_command, _ui, value) { input.innerText = value; },
  };
  const publish = vm.runInNewContext(source + "\npublishFacebookInChrome", {
    location: { origin: "https://www.facebook.com" }, document,
    getComputedStyle: () => ({ visibility: "visible" }), setTimeout: (resolve) => resolve(),
    atob, File, Event,
    DataTransfer: class {
      files = [];
      items = { add: (file) => this.files.push(file) };
      setData(_type, value) { this.text = value; }
    },
    ClipboardEvent: class { constructor(_type, options) { this.clipboardData = options.clipboardData; } },
  });
  return { state: await publish(text, "Owner", photo ? { type: "image/png", base64: "YWJj" } : null), nextClicks, postClicks };
}

test("Facebook goes through Next and submits one verified post", async () => {
  assert.deepEqual(await simulate(), { state: "posted", nextClicks: 1, postClicks: 1 });
  assert.deepEqual(await simulate({ text: "Perenggan pertama.\n\nPerenggan kedua." }),
    { state: "posted", nextClicks: 1, postClicks: 1 });
});

test("Facebook does not post if profile or final text cannot be verified", async () => {
  assert.deepEqual(await simulate({ who: "Different account" }), { state: "failed:profile", nextClicks: 0, postClicks: 0 });
  assert.deepEqual(await simulate({ finalText: false }), { state: "failed:next", nextClicks: 1, postClicks: 0 });
});

test("Facebook does not retry when the submit result is unknown", async () => {
  assert.deepEqual(await simulate({ confirmed: false }), { state: "uncertain", nextClicks: 1, postClicks: 1 });
});

test("Facebook publishes a photo only if its preview survives Next", async () => {
  assert.deepEqual(await simulate({ photo: true }), { state: "posted", nextClicks: 1, postClicks: 1 });
  assert.deepEqual(await simulate({ photo: true, losePhoto: true }), { state: "failed:image", nextClicks: 1, postClicks: 0 });
});
