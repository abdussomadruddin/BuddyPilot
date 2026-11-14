const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const handler = require("../api_handlers/app");
const { authCookie } = require("../lib/auth");

const css = fs.readFileSync(require.resolve("../public/buddypilot-liquid.css"), "utf8");
const sprite = fs.readFileSync(require.resolve("../public/icons.svg"), "utf8");

test("liquid UI is a local presentation layer with existing accessible icons", async (t) => {
  const previous = process.env.APP_PASSWORD;
  process.env.APP_PASSWORD = "ui-test-only";
  t.after(() => {
    if (previous === undefined) delete process.env.APP_PASSWORD;
    else process.env.APP_PASSWORD = previous;
  });
  let html;
  const response = { setHeader() {}, end(value) { html = value; } };
  await handler({ method: "GET", headers: { cookie: authCookie() } }, response);
  assert.equal(response.statusCode, 200);
  assert.ok(html.indexOf("buddypilot-liquid.css") > html.indexOf("buddypilot-redesign.css"));
  const icons = [...html.matchAll(/<svg class="icon section-icon [^"]*" aria-hidden="true"><use href="\/icons.svg#([^"]+)"><\/use><\/svg>/g)];
  assert.ok(icons.length >= 30);
  for (const [, name] of icons) assert.ok(sprite.includes(`id="${name}"`), `Missing icon: ${name}`);
  for (const id of ["uploadReportButton", "adsCmoLiveButton", "clientForm", "weeklyReportPushButton", "uploadInvoicesButton", "settingsForm"]) {
    assert.ok(html.includes(`id="${id}"`), `Workflow control missing: ${id}`);
  }
  assert.doesNotMatch(html, /https?:[^"\s]+buddypilot-liquid/);
});

test("phone layout keeps four navigation slots, comfortable targets and native date constraints", () => {
  assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /input\[type="date"\][^}]+min-inline-size: 0/);
  assert.match(css, /input[^}]+font-size: 16px/);
  assert.match(css, /\.ads-cmo-live-metrics[^}]+repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.topbar \{[^}]+-webkit-backdrop-filter: none; backdrop-filter: none;/);
});

test("motion has an accessible off switch and no new continuous animation or API requests", () => {
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /animation: none !important/);
  assert.match(css, /@supports not/);
  assert.match(css, /@keyframes bp-lens-emerge/);
  assert.match(css, /@keyframes bp-liquid-release/);
  assert.doesNotMatch(css, /\binfinite\b|@import|url\(https?:/);
});

test("mobile layer loads last, fits the four main tabs and keeps text readable", () => {
  const mobileCss = fs.readFileSync(require.resolve("../public/buddypilot-mobile.css"), "utf8");
  const source = fs.readFileSync(require.resolve("../api_handlers/app.js"), "utf8");
  assert.ok(source.indexOf("buddypilot-mobile.css") > source.indexOf("buddypilot-liquid.css"));
  assert.equal((source.match(/class="tab-button[^"]*" type="button" data-tab-target=/g) || []).length, 4);
  // The base styles lay out four tabs; the mobile layer must not narrow them to three.
  assert.match(source, /\.topbar \.topbar-tabs \{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(mobileCss, /repeat\(3, minmax/);
  assert.doesNotMatch(mobileCss, /threads|postpilot/i);
  assert.doesNotMatch(mobileCss, /font-size: (?:[0-9]|1[01])px/);
});

test("service worker never caches pages and falls back offline only on network failure", () => {
  const worker = fs.readFileSync(require.resolve("../public/sw.js"), "utf8");
  assert.match(worker, /mode === "navigate"/);
  assert.match(worker, /fetch\(event\.request\)\.catch\(\(\) => caches\.match\("\/offline\.html"\)\)/);
  assert.doesNotMatch(worker, /addAll\(\[[^\]]*"\/"\s*,/);
});
