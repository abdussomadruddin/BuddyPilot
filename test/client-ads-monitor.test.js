const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createService, normalizeConfig, dateRange, buildSnapshot, clientConfig, resultKey } = require("../lib/client-ads-monitor");
const { normalizeGraphRow, aggregateMetaData } = require("../lib/meta-ads");
const { _test: tikTok } = require("../lib/tiktok-ads");

function config(extra = {}) { return normalizeConfig({ accountId: "1", selections: { purchase: ["a", "b"], form: ["a"], message: ["a"] },
  products: [{ id: "p", name: "Product", sellingPrice: 100, marginPercent: 70, campaignIds: ["a", "b"] }], ...extra }); }
function row(id, extra = {}) { return { id, name: id, spend: 20, purchases: 1, revenue: 100, leads: 3, messaging: 2,
  impressions: 1000, clicks: 10, metricAvailability: { purchases: true, revenue: true, leads: true, messaging: true }, ...extra }; }
test("Malaysia presets and custom validation handle midnight and calendar boundaries", () => {
  const now = new Date("2026-12-31T17:00:00Z");
  assert.deepEqual(dateRange({ period: "today" }, now), { startDate: "2027-01-01", endDate: "2027-01-01" });
  assert.equal(dateRange({ period: "yesterday" }, now).startDate, "2026-12-31");
  assert.equal(dateRange({ period: "7" }, now).startDate, "2026-12-26");
  for (const dates of [["2026-02-30", "2026-03-01"], ["2027-01-02", "2027-01-03"], ["2027-01-01", "2026-12-01"]]) assert.throws(() => dateRange({ period: "custom", startDate: dates[0], endDate: dates[1] }, now));
  assert.throws(() => dateRange({ period: "invalid" }, now));
});
test("configuration deduplicates selections and disallows ambiguous product allocation", () => {
  assert.deepEqual(config({ selections: { purchase: ["a", "a"] } }).selections.purchase, ["a"]);
  assert.throws(() => normalizeConfig({ products: [{ id: "a", name: "A", campaignIds: ["x"] }, { id: "b", name: "B", campaignIds: ["x"] }] }));
  assert.throws(() => normalizeConfig({ products: [{ id: "a", name: "A", marginPercent: 101 }] }));
  assert.throws(() => resultKey("lead", ""));
});
test("selected prospecting and retargeting count once and exclude other campaigns", () => {
  const snapshot = buildSnapshot({ campaigns: [row("a"), row("a"), row("b"), row("other", { spend: 999 })] }, config(), "purchase");
  assert.equal(snapshot.overall.spend, 40);
  assert.equal(snapshot.overall.results, 2);
  assert.equal(snapshot.overall.costPerResult, 20);
  assert.equal(snapshot.overall.roas, 5);
  assert.equal(snapshot.overall.profit, 100);
  assert.equal(snapshot.products.length, 1);
});
test("revenue estimates are explicit and missing margin remains unavailable", () => {
  const snapshot = buildSnapshot({ campaigns: [row("a", { revenue: 0, metricAvailability: { purchases: true, revenue: false } }), row("b")] }, config(), "purchase");
  assert.equal(snapshot.overall.estimatedRevenue, true);
  assert.equal(snapshot.overall.revenue, 200);
  const incomplete = buildSnapshot({ campaigns: [row("a"), row("b")] }, config({ products: [] }), "purchase");
  assert.equal(incomplete.overall.profit, null);
});
test("zero results have no CPP and missing campaigns do not masquerade as zero", () => {
  const zero = buildSnapshot({ campaigns: [row("a", { purchases: 0, revenue: 0 }), row("b", { purchases: 0, revenue: 0 })] }, config(), "purchase");
  assert.equal(zero.overall.costPerResult, null);
  assert.equal(zero.overall.profit, -40);
  const missing = buildSnapshot({ campaigns: [row("a")] }, config(), "purchase");
  assert.equal(missing.partial, true);
  assert.equal(missing.overall.profit, null);
  assert.equal(missing.overall.results, null);
});
test("form leads and messaging remain independent and have no invented sales", () => {
  for (const [key, expected] of [["form", 3], ["message", 2]]) {
    const snapshot = buildSnapshot({ campaigns: [row("a")] }, config(), key);
    assert.equal(snapshot.overall.results, expected);
    assert.equal(snapshot.overall.revenue, null);
    assert.equal(snapshot.overall.profit, null);
  }
});
test("unavailable spend never turns into zero CPP or fabricated profit", () => {
  const snapshot = buildSnapshot({ campaigns: [row("a", { metricAvailability: { purchases: true, revenue: true, spend: false } }), row("b")] }, config(), "purchase");
  assert.equal(snapshot.overall.spend, null);
  assert.equal(snapshot.overall.costPerResult, null);
  assert.equal(snapshot.overall.profit, null);
  assert.equal(snapshot.partial, true);
});
test("strict TikTok excludes generic conversion and result values, and avoids lead alias duplication", () => {
  const result = tikTok.normalizeTikTokRow({ campaign_id: "a", conversion: "9", result: "9", onsite_form: "3", form: "3" }, "campaign", { monitorStrict: true, resultMetric: "conversions" });
  assert.equal(result.conversions, 0);
  assert.equal(result.metricAvailability.purchases, false);
  assert.equal(result.leads, 3);
  assert.equal(tikTok.normalizeTikTokRow({ conversion: "9" }, "campaign", { resultMetric: "conversions" }).conversions, 9);
  const analytics = aggregateMetaData({ campaigns: [result] }, { monitorStrict: true });
  assert.equal(analytics.campaigns[0].metricAvailability.purchases, false);
});
test("TikTok unsupported result metrics retain delivery data without inventing conversions", async () => {
  const calls = [];
  const client = { listTools: async () => ({ tools: [{ name: "report_integrated_get", inputSchema: { type: "object", properties: {} } }] }),
    callTool: async (input) => { calls.push(input); return calls.length === 1
      ? { structuredContent: { code: 400, message: "invalid metric complete_payment" } }
      : { structuredContent: { code: 0, data: { list: [{ dimensions: { campaign_id: "a" }, metrics: { spend: "10", impressions: "100" } }] } } }; } };
  const rows = await tikTok.fetchTikTokLevel(client, { monitorStrict: true, resultMetric: "conversions", accountId: "1" }, "2026-10-01", "2026-10-08", "campaign");
  assert.equal(calls.length, 2);
  assert.equal(rows[0].spend, 10);
  assert.equal(rows[0].metricAvailability.purchases, false);
  assert.ok(!calls[1].arguments.metrics.includes("conversion"));
});
test("Meta monitor capability and zero action arrays survive adapter aggregation", () => {
  const row = normalizeGraphRow({ campaign_id: "a", spend: 1, actions: [], action_values: [] }, "campaign", true);
  const snapshot = aggregateMetaData({ campaigns: [row] }, { monitorStrict: true });
  assert.equal(snapshot.campaigns[0].metricAvailability.purchases, true);
  const generic = normalizeGraphRow({ conversions: 10, result_values: 300 }, "campaign", true);
  assert.equal(generic.conversions, 0);
  assert.equal(generic.revenue, 0);
});
test("legacy account initializes only its own platform and never falls back to personal", () => {
  const client = { metadata: { adsReportConfig: { platform: "meta", accountId: "act_123" } } };
  assert.equal(clientConfig(client, "meta").accountId, "123");
  assert.equal(clientConfig(client, "tiktok").accountId, "");
});
test("service scopes requests to client mapping, validates access, and fails closed", async () => {
  let fetched;
  const client = { code: "C", name: "Client", metadata: { adsMonitor: { meta: config() } } };
  const service = createService({ registry: async () => ({ clients: [client], registryStatus: { ok: true } }),
    accounts: async () => [{ id: "1", name: "Allowed", currency: "MYR" }],
    fetchRange: async (platform, cfg) => { fetched = cfg.accountId; return { campaigns: [row("a"), row("b")] }; } });
  await service.data({ clientCode: "C", platform: "meta", result: "purchase", period: "today", accountId: "evil" });
  assert.equal(fetched, "1");
  await assert.rejects(service.data({ clientCode: "unknown", platform: "meta", result: "purchase", period: "today" }));
  await assert.rejects(service.data({ clientCode: "C", platform: "tiktok", result: "purchase", period: "today" }));
  const unavailable = createService({ registry: async () => ({ clients: [client], registryStatus: { ok: false } }) });
  await assert.rejects(unavailable.list(false));
});
test("saving monitor settings is isolated by platform and validates owned accounts", async () => {
  const saved = [];
  const service = createService({ registry: async () => ({ clients: [{ code: "C" }], registryStatus: { ok: true } }), accounts: async () => [{ id: "1", name: "Account" }], save: async (...args) => { saved.push(args); return args[2]; } });
  await service.save({ clientCode: "C", platform: "meta", config: config() });
  assert.equal(saved[0][0], "C"); assert.equal(saved[0][1], "meta");
  await assert.rejects(service.save({ clientCode: "C", platform: "meta", config: config({ accountId: "wrong" }) }));
});
test("monitor route requires app authentication and browser code compiles", async () => {
  const handler = require("../api_handlers/client-ads-monitor");
  const previous = process.env.APP_PASSWORD; process.env.APP_PASSWORD = "fixture-only";
  const res = { setHeader() {}, end(value) { this.body = JSON.parse(value); } };
  try { await handler({ method: "GET", url: "/api/client-ads-monitor?action=clients", headers: {} }, res); assert.equal(res.statusCode, 401); }
  finally { if (previous === undefined) delete process.env.APP_PASSWORD; else process.env.APP_PASSWORD = previous; }
  new Function(fs.readFileSync(require.resolve("../public/client-ads-monitor.js"), "utf8"));
});

test("metadata save preserves weekly reporting and other platforms with optimistic conflict protection", async () => {
  const { saveClientAdsMonitorPlatform } = require("../lib/supabase-db");
  const originalFetch = global.fetch, url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = "https://fixture.invalid"; process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-only";
  let patch, requestUrl, conflict = false;
  global.fetch = async (input, options = {}) => {
    if (options.method === "PATCH") { patch = JSON.parse(options.body); requestUrl = input; return new Response(JSON.stringify(conflict ? [] : [{ code: "C" }])); }
    return new Response(JSON.stringify([{ code: "C", updated_at: "2026-10-08T01:00:00Z", metadata: { adsReportConfig: { accountId: "weekly" }, adsMonitor: { tiktok: { accountId: "7" } } } }]));
  };
  try {
    await saveClientAdsMonitorPlatform("C", "meta", config());
    assert.equal(patch.metadata.adsReportConfig.accountId, "weekly");
    assert.equal(patch.metadata.adsMonitor.tiktok.accountId, "7");
    assert.equal(patch.metadata.adsMonitor.meta.accountId, "1");
    assert.ok(requestUrl.includes("updated_at=eq."));
    conflict = true;
    await assert.rejects(saveClientAdsMonitorPlatform("C", "meta", config()), (error) => error.statusCode === 409);
  } finally {
    global.fetch = originalFetch;
    if (url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = url;
    if (key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = key;
  }
});
