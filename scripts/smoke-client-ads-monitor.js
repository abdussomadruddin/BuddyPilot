const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");
const { createService } = require("../lib/client-ads-monitor");
process.env.APP_PASSWORD = "local-monitor-fixture-only";
const { authCookie } = require("../lib/auth");
const app = require("../api_handlers/app");
const clients = ["C1", "C2", "PAUSED"].map((code, index) => ({ code, name: code, brandClient: code,
  serviceStatus: index === 2 ? "paused" : "active", onboardingStatus: "completed",
  metadata: { adsReportConfig: { platform: "meta", accountId: String(index + 1) },
    adsMonitor: { meta: { accountId: String(index + 1), selections: { purchase: ["a"], form: ["a"], message: ["a"] },
      products: [{ id: "p", name: "Fixture Product", sellingPrice: 100, marginPercent: 70, campaignIds: ["a"] }] } } } }));
const service = createService({ registry: async () => ({ clients, registryStatus: { ok: true } }),
  accounts: async (platform) => platform === "meta" ? [1, 2, 3].map((id) => ({ id: String(id), name: "Fixture " + id, currency: "MYR" })) : [{ id: "7", name: "TikTok Fixture", currency: "MYR" }],
  save: async (code, platform, config) => { clients.find((client) => client.code === code).metadata.adsMonitor[platform] = config; return config; },
  fetchRange: async (platform, config) => {
    if (config.accountId === "1") await new Promise((resolve) => setTimeout(resolve, 500));
    return { campaigns: ["a", "b"].map((id) => ({ id, name: id === "a" ? "Fixture Prospecting" : "Fixture Retargeting",
      spend: 20, purchases: 1, revenue: 100, leads: 3, messaging: 2, impressions: 1000, clicks: 10,
      metricAvailability: { purchases: true, leads: true, messaging: true, revenue: true } })) };
  },
});
const publicRoot = path.resolve(__dirname, "../public");
const server = http.createServer(async (req, res) => {
  if (req.url === "/") { req.headers.cookie = authCookie().split(";")[0]; app(req, res); return; }
  if (req.url.startsWith("/api/client-ads-monitor")) {
    res.setHeader("content-type", "application/json");
    try {
      if (req.method === "PUT") {
        const chunks = []; for await (const chunk of req) chunks.push(chunk);
        res.end(JSON.stringify({ ok: true, config: await service.save(JSON.parse(Buffer.concat(chunks).toString())) })); return;
      }
      const input = Object.fromEntries(new URL(req.url, "http://localhost").searchParams);
      let response;
      if (input.action === "clients") response = { clients: await service.list(input.all === "true") };
      else if (input.action === "settings") response = await service.settings(input);
      else response = { [input.action === "data" ? "snapshot" : "catalog"]: await service.data(input, input.action === "campaigns") };
      res.end(JSON.stringify({ ok: true, ...response }));
    } catch (error) { res.statusCode = error.statusCode || 400; res.end(JSON.stringify({ ok: false, error: error.message })); }
    return;
  }
  if (req.url.startsWith("/api/")) { res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ ok: false, error: "Isolated fixture" })); return; }
  const file = path.resolve(publicRoot, new URL(req.url, "http://localhost").pathname.slice(1));
  if (!file.startsWith(publicRoot + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.setHeader("content-type", file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : file.endsWith(".svg") ? "image/svg+xml" : "application/octet-stream");
  res.end(fs.readFileSync(file));
});
(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const viewport of [{ width: 393, height: 852 }, { width: 1440, height: 1000 }]) {
      clients.forEach((client) => { delete client.metadata.adsMonitor.tiktok; });
      const context = await browser.newContext({ viewport });
      await context.route("**/*", (route) => route.request().url().startsWith(origin) ? route.continue() : route.abort());
      const page = await context.newPage(), errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(origin);
      await page.getByRole("navigation", { name: "Main tabs" }).getByRole("button", { name: "Ads CMO", exact: true }).click();
      assert.ok(await page.locator("#adsCmoPersonalPanel").isVisible());
      await page.locator("#adsModeClient").click();
      await page.waitForFunction(() => document.querySelectorAll("#camClient option").length === 3);
      assert.equal(await page.locator("#camLoad").isEnabled(), false);
      for (const id of ["camClient", "camPlatform", "camResult"]) assert.equal(await page.locator("#" + id).inputValue(), "");
      await page.locator("#camClient").selectOption("C1"); await page.locator("#camPlatform").selectOption("meta");
      await page.waitForFunction(() => document.getElementById("camAccount").value === "1");
      await page.locator("#camResult").selectOption("purchase");
      await page.waitForFunction(() => !document.getElementById("camLoad").disabled);
      await page.locator("#camLoad").click();
      await page.locator("#camClient").selectOption("C2");
      assert.equal(await page.locator("#camOutput").innerText(), "");
      await page.waitForFunction(() => document.getElementById("camAccount").value === "2" && !document.getElementById("camLoad").disabled);
      await page.locator("#camLoad").click();
      await page.waitForFunction(() => document.getElementById("camOutput").textContent.includes("C2"));
      assert.ok(!(await page.locator("#camOutput").innerText()).includes("C1"));
      await page.locator(".cam-campaign summary").click();
      assert.ok((await page.locator("#camOutput").innerText()).includes("Est. Profit"));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.evaluate(() => { window.scrollTo(0, 0); const toast = document.getElementById("appToast"); if (toast) toast.hidden = true; });
      await page.screenshot({ path: `/tmp/client-ads-monitor-${viewport.width}.png`, fullPage: false });
      await page.locator("#camResult").selectOption("lead");
      assert.equal(await page.locator("#camLoad").isEnabled(), false);
      await page.locator("#camLead").selectOption("form");
      await page.waitForFunction(() => !document.getElementById("camLoad").disabled);
      await page.locator("#camLoad").click();
      await page.waitForFunction(() => document.getElementById("camOutput").textContent.includes("Form Leads"));
      assert.ok(!(await page.locator("#camOutput").innerText()).includes("Est. Profit"));
      await page.locator("#camPlatform").selectOption("tiktok");
      await page.waitForFunction(() => !document.getElementById("camAccount").disabled);
      assert.equal(await page.locator("#camLoad").isEnabled(), false);
      await page.locator("#camSettings summary").click();
      await page.locator("#camAccount").selectOption("7");
      await page.locator("#camSave").click();
      await page.waitForFunction(() => document.getElementById("camStatus").textContent.includes("disimpan"));
      await page.locator("#camCampaignLoad").click();
      await page.waitForFunction(() => document.querySelectorAll("#camCampaignChoices input").length === 2);
      await page.locator("#camCampaignChoices input").first().check();
      assert.equal(await page.locator("#camLoad").isEnabled(), false);
      await page.locator("#camSave").click();
      await page.waitForFunction(() => !document.getElementById("camLoad").disabled);
      await page.locator("#camPeriod").selectOption("custom");
      assert.equal(await page.locator("#camLoad").isEnabled(), false);
      await page.locator("#camAll").check();
      await page.waitForFunction(() => document.querySelectorAll("#camClient option").length === 4);
      await page.locator("#adsModePersonal").click(); assert.ok(await page.locator("#adsCmoPersonalPanel").isVisible());
      assert.deepEqual(errors, []);
      console.log(`PASS ${viewport.width}x${viewport.height}: required choices, stale response isolation, Meta/TikTok settings, campaign save, lead separation, DD1 mode, no overflow or JS errors`);
      await context.close();
    }
  } finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
})().catch((error) => { console.error(error); server.close(); process.exitCode = 1; });
