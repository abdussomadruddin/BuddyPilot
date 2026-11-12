const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

// Load personal-ads-cmo with stubbed platform and database modules so nothing
// reaches Meta, TikTok or Supabase.
function loadCmo({ meta, tiktok, stored = [], calls = [] } = {}) {
  const lib = (name) => path.join(__dirname, "..", "lib", name);
  const stubs = {
    [lib("meta-ads.js")]: {
      listMetaAdAccounts: meta || (async () => []),
      fetchMetaRange: async (config, start, end) => { calls.push({ platform: "meta", accountId: config.accountId, start, end }); return analytics(); },
    },
    [lib("tiktok-ads.js")]: {
      listTikTokAdvertisers: tiktok || (async () => []),
      fetchTikTokAnalyticsRange: async (config, start, end) => { calls.push({ platform: "tiktok", accountId: config.accountId, start, end }); return analytics(); },
    },
    [lib("push-notifications.js")]: { sendPushPayload: async () => ({}) },
    [lib("supabase-db.js")]: {
      listPersonalAdsAccounts: async () => stored,
      getPersonalAdsAccount: async () => null,
      getPersonalAdsReport: async () => null,
      savePersonalAdsReport: async (value) => ({ ...value, status: value.status }),
      listEnabledPersonalAdsAccounts: async () => [],
      getPersonalAdsReportRun: async () => null,
      savePersonalAdsReportRun: async (value) => value,
      listPersonalAdsReportDates: async () => [],
      savePersonalAdsAccount: async (value) => value,
    },
  };
  const target = lib("personal-ads-cmo.js");
  const saved = {};
  for (const [file, exports] of Object.entries(stubs)) {
    saved[file] = require.cache[file];
    require.cache[file] = { id: file, filename: file, loaded: true, exports };
  }
  delete require.cache[target];
  try {
    return require(target);
  } finally {
    delete require.cache[target];
    for (const [file, previous] of Object.entries(saved)) {
      if (previous) require.cache[file] = previous;
      else delete require.cache[file];
    }
  }
}

function analytics() {
  return {
    total: { spend: 50, revenue: 0, purchases: 2, leads: 0, messaging: 0, impressions: 1000, reach: 800, clicks: 40, linkClicks: 30 },
    campaigns: [{ id: "c1", name: "Prospecting Produk A", spend: 50, revenue: 0, purchases: 2, leads: 0, messaging: 0, impressions: 1000, reach: 800, clicks: 40, linkClicks: 30 }],
    adsets: [],
    ads: [],
    warnings: [],
  };
}

test("Ads CMO lists own Meta and TikTok accounts together, keeping saved settings", async () => {
  const cmo = loadCmo({
    meta: async () => [{ id: "act_111", name: "DD1", currency: "MYR" }],
    tiktok: async () => [{ id: "7001", name: "Kedai TikTok", currency: "MYR", platform: "tiktok" }],
    stored: [{ account_id: "tiktok:7001", account_name: "Kedai TikTok", auto_report_enabled: true }],
  });
  const accounts = await cmo.listAccountsWithSettings();
  assert.deepEqual(accounts.map((item) => [item.accountId, item.platform]), [["111", "meta"], ["tiktok:7001", "tiktok"]]);
  assert.equal(accounts[1].autoReportEnabled, true);
});

test("a disconnected platform does not hide the other platform's accounts", async () => {
  const cmo = loadCmo({
    meta: async () => { throw new Error("Meta MCP belum connected."); },
    tiktok: async () => [{ id: "7001", name: "Kedai TikTok" }],
  });
  const accounts = await cmo.listAccountsWithSettings();
  assert.deepEqual(accounts.map((item) => item.accountId), ["tiktok:7001"]);
  const none = loadCmo({
    meta: async () => { throw new Error("Meta MCP belum connected."); },
    tiktok: async () => { throw new Error("TikTok belum connected."); },
  });
  await assert.rejects(none.listAccountsWithSettings(), /Meta MCP belum connected/);
});

test("TikTok accounts read TikTok data with the bare advertiser ID; Meta accounts read Meta", async () => {
  const calls = [];
  const cmo = loadCmo({ calls });
  await cmo.getPersonalAdsLiveSnapshot({ account_id: "tiktok:7001", account_name: "Kedai TikTok" }, { now: new Date("2026-11-12T04:00:00Z") });
  await cmo.getPersonalAdsLiveSnapshot({ account_id: "111", account_name: "DD1" }, { now: new Date("2026-11-12T04:00:00Z") });
  assert.deepEqual(calls.map((item) => [item.platform, item.accountId]), [["tiktok", "7001"], ["meta", "111"]]);
  await cmo.generatePersonalAdsReport({ account_id: "tiktok:7001", account_name: "Kedai TikTok" }, "2026-11-11");
  assert.ok(calls.slice(2).every((item) => item.platform === "tiktok" && item.accountId === "7001"));
  assert.equal(calls.length, 5);
  assert.equal(cmo.accountPlatform("tiktok:7001"), "tiktok");
  assert.equal(cmo.accountPlatform("111"), "meta");
});
