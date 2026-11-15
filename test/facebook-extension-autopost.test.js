const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const source = readFileSync("chrome-post-pilot/facebook-autopost.js", "utf8");

async function simulate({ who = "Owner", finalText = true, confirmed = true } = {}) {
  const text = "Draf Facebook untuk disiarkan.";
  let stage = 0, nextClicks = 0, postClicks = 0;
  const node = (value, click) => ({
    textContent: value, innerText: value, click, focus() {}, getClientRects: () => [1],
    getAttribute: () => null, closest: () => null, matches: () => false,
  });
  const input = node("");
  const next = node("Next", () => { ++nextClicks; stage = 2; });
  const post = node("Post", () => { ++postClicks; stage = 3; dialog.isConnected = false; });
  const open = node("What's on your mind, Owner?", () => { stage = 1; dialog.isConnected = true; });
  const dialog = {
    isConnected: false, getClientRects: () => [1],
    querySelectorAll(selector) {
      if (selector.includes("contenteditable")) return stage === 1 ? [input] : [];
      if (selector === 'a,span,strong') return [node(who)];
      if (selector === '[dir="auto"]') return stage === 2 && finalText ? [node(text)] : [];
      return stage === 1 ? [next] : [post];
    },
  };
  const document = {
    querySelectorAll(selector) {
      if (selector.includes("dialog")) return dialog.isConnected ? [dialog] : [];
      if (selector.includes("alert")) return stage === 3 && confirmed ? [node("Post published")] : [];
      return [open];
    },
    execCommand(_command, _ui, value) { input.innerText = value; },
  };
  const publish = vm.runInNewContext(source + "\npublishFacebookInChrome", {
    location: { origin: "https://www.facebook.com" }, document,
    getComputedStyle: () => ({ visibility: "visible" }), setTimeout: (resolve) => resolve(),
  });
  return { state: await publish(text, "Owner"), nextClicks, postClicks };
}

test("Facebook goes through Next and submits one verified post", async () => {
  assert.deepEqual(await simulate(), { state: "posted", nextClicks: 1, postClicks: 1 });
});

test("Facebook does not post if profile or final text cannot be verified", async () => {
  assert.deepEqual(await simulate({ who: "Different account" }), { state: "failed", nextClicks: 0, postClicks: 0 });
  assert.deepEqual(await simulate({ finalText: false }), { state: "failed", nextClicks: 1, postClicks: 0 });
});

test("Facebook does not retry when the submit result is unknown", async () => {
  assert.deepEqual(await simulate({ confirmed: false }), { state: "uncertain", nextClicks: 1, postClicks: 1 });
});
