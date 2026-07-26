const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const extensionSource = fs.readFileSync(
  path.join(__dirname, "..", "chrome-extension", "postpilot", "threads-content.js"),
  "utf8"
);
const appSource = fs.readFileSync(path.join(__dirname, "..", "api_handlers", "app.js"), "utf8");
const popupSource = fs.readFileSync(
  path.join(__dirname, "..", "chrome-extension", "postpilot", "popup.html"),
  "utf8"
);

test("Post Pilot promote UI no longer exposes comment CTA", () => {
  assert.doesNotMatch(appSource, /threadsCommentPreview|copyThreadsCtaButton/);
  assert.doesNotMatch(popupSource, /Komen CTA|Copy CTA|Fill CTA Comment/);
});

test("Threads promote automation builds a native chained thread", () => {
  assert.match(extensionSource, /function splitThreadsChain\(/);
  assert.match(extensionSource, /maxChars = 430/);
  assert.match(extensionSource, /function findAddToThreadButton\(/);
  assert.match(extensionSource, /function fillCaptionChainOnce\(/);
  assert.match(extensionSource, /await fillCaptionChainOnce\(draft\)/);
});
