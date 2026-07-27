const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const appSource = fs.readFileSync(path.join(__dirname, "..", "api_handlers", "app.js"), "utf8");

test("mobile navigation supports hold, finger-follow scrub, and release activation", () => {
  assert.match(appSource, /function setupMainTabScrub\(\)/);
  assert.match(appSource, /window\.requestAnimationFrame\(beginScrub\)/);
  assert.match(appSource, /--scrub-x/);
  assert.match(appSource, /touchmove/);
  assert.match(appSource, /resetScrub\(true\)/);
  assert.match(appSource, /setupMainTabScrub\(\);/);
  assert.match(appSource, /nav-settling/);
  assert.match(appSource, /bp-glass-glint/);
  assert.match(appSource, /bp-liquid-release/);
  assert.match(appSource, /height: 78px/);
  assert.match(appSource, /scale\(1\.22,1\.08\)/);
  assert.match(appSource, /opacity: 0; transform: translate3d/);
  assert.match(appSource, /\.nav-scrubbing \.nav-liquid-indicator \{ opacity: 1;/);
  assert.match(appSource, /nav-lens-entering/);
  assert.match(appSource, /bp-lens-emerge/);
  assert.match(appSource, /bp-lens-emerge 1000ms/);
  assert.match(appSource, /bp-liquid-release 1000ms/);
  assert.match(appSource, /transition: transform 90ms/);
  assert.match(appSource, /setTimeout\(\(\) => mobileNavigation\.classList\.remove\("nav-settling"\), 1050\)/);
});

test("content swipe and bottom navigation scrub use separate surfaces", () => {
  assert.match(appSource, /const surfaces = \[mainSurface\]\.filter\(Boolean\)/);
  assert.match(appSource, /\.nav-scrubbing \.nav-liquid-indicator/);
  assert.match(appSource, /\.tab-button\.scrub-preview/);
});
