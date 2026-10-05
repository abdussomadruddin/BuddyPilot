const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

// Isolated fixtures only: never connect to business APIs or publish anything.
process.env.APP_PASSWORD = "local-ui-fixture-only";
const { authCookie } = require("../lib/auth");
const handler = require("../api_handlers/app");
const root = path.resolve(__dirname, "../public");
const server = http.createServer((req, res) => {
  if (req.url === "/") {
    req.headers.cookie = authCookie().split(";")[0];
    handler(req, res);
    return;
  }
  if (req.url.startsWith("/api/") || req.url.startsWith("/mock/")) {
    res.setHeader("content-type", "application/json");
    const reply = () => res.end(JSON.stringify({ ok: false, error: "Isolated UI fixture" }));
    if (req.url === "/mock/slow") setTimeout(reply, 700);
    else reply();
    return;
  }
  const file = path.resolve(root, new URL(req.url, "http://localhost").pathname.slice(1));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end();
    return;
  }
  res.setHeader("content-type", file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : file.endsWith(".svg") ? "image/svg+xml" : "application/octet-stream");
  res.end(fs.readFileSync(file));
});

(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const viewport of [{ width: 393, height: 852 }, { width: 1440, height: 1000 }]) {
      const context = await browser.newContext({ viewport });
      await context.route("**/*", (route) => route.request().url().startsWith(origin) ? route.continue() : route.abort());
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(origin);
      await page.waitForFunction(() => window.buddyActionFeedback === true);
      for (const name of ["Dashboard", "Ads CMO", "Client Pilot", "Post Pilot"]) {
        await page.getByRole("navigation", { name: "Main tabs" }).getByRole("button", { name, exact: true }).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name} overflow`);
      }
      await page.getByRole("navigation", { name: "Main tabs" }).getByRole("button", { name: "Post Pilot", exact: true }).click();
      await page.getByRole("button", { name: "Threads Promote", exact: true }).click();
      assert.ok(await page.getByRole("heading", { name: "Threads Promote", exact: true }).isVisible());
      await page.getByRole("button", { name: "Threads General", exact: true }).click();
      assert.equal(await page.locator("#viralCategory").inputValue(), "");
      assert.equal(await page.locator("#viralAudience").inputValue(), "");
      assert.equal(await page.locator("#viralTone").inputValue(), "");
      const action = page.locator("#generateViralOneButton");
      assert.equal(await action.isEnabled(), false);
      await page.locator("#viralCategory").selectOption("business");
      assert.equal(await action.isEnabled(), false);
      await page.locator("#viralAudience").selectOption({ index: 1 });
      assert.equal(await action.isEnabled(), true);
      assert.equal(await page.locator("#generateViralTenButton").isEnabled(), true);
      assert.equal(await page.locator("#generateViralFiftyButton").isEnabled(), true);
      await page.locator("#viralAudience").selectOption("");
      assert.equal(await action.isEnabled(), false);
      const immediate = await page.evaluate(() => {
        const button = document.createElement("button");
        button.id = "feedback-test";
        button.textContent = "Refresh";
        document.body.append(button);
        window.fixtureCalls = 0;
        button.addEventListener("click", async () => {
          window.fixtureCalls++;
          await (await fetch("/mock/slow")).json();
        });
        button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
        const tapped = button.classList.contains("bp-tap-feedback");
        button.click();
        button.click();
        return { tapped, busy: button.getAttribute("aria-busy"), calls: window.fixtureCalls };
      });
      assert.deepEqual(immediate, { tapped: true, busy: "true", calls: 1 });
      await page.waitForFunction(() => document.getElementById("feedback-test").getAttribute("aria-busy") === null);
      await page.evaluate(() => document.getElementById("feedback-test").remove());
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false);
      await page.screenshot({ path: `/tmp/buddypilot-feedback-${viewport.width}.png`, fullPage: false });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const animation = await page.evaluate(() => {
        const bar = document.getElementById("bp-network-progress");
        return getComputedStyle(bar, "::after").animationName;
      });
      assert.equal(animation, "none");
      assert.deepEqual(errors, []);
      console.log(`PASS ${viewport.width}x${viewport.height}: instant feedback, duplicate guard, cleanup, no overflow, reduced motion, no JS errors`);
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => { console.error(error); server.close(); process.exitCode = 1; });
