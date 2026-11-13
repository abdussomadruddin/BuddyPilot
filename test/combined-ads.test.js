const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeAdsReportConfig } = require("../lib/meta-ads");
const { buildCombinedDraft, fetchCombined, mergeAnalytics } = require("../lib/combined-ads");
const { buildDailyTelegramMessage, clientDailyAnalytics } = require("../lib/telegram-reports");
const { runAdsAlerts } = require("../lib/ads-alerts");
const { runWeeklyReports } = require("../lib/weekly-reports");
const { fetchAccountRange, normalizeAccountSetting } = require("../lib/personal-ads-cmo");

function metrics(spend, results, extra = {}) {
  return { spend, results, leads: results, messaging: 0, purchases: 0, revenue: 0, impressions: spend * 100, clicks: spend, linkClicks: spend, reach: spend * 50, cpr: results ? spend / results : null, ...extra };
}

function analytics(platform, spend, results) {
  return {
    platform,
    currency: "MYR",
    resultMetric: "leads",
    resultLabel: "Leads",
    total: metrics(spend, results),
    categories: { prospecting: metrics(spend * 0.6, results * 0.6), retargeting: metrics(spend * 0.4, results * 0.4), other: metrics(0, 0) },
    campaigns: [{ id: `${platform}-c1`, name: "Prospecting Lead", category: "prospecting", ...metrics(spend * 0.6, results * 0.6) }],
    adsets: [],
    ads: [{ id: `${platform}-a1`, name: "Hook A", category: "prospecting", ...metrics(spend * 0.6, results * 0.6) }],
    warnings: [],
  };
}

test("a client config holds one Meta and one TikTok account; old single-account configs still read", () => {
  const legacy = normalizeAdsReportConfig({ platform: "tiktok", accountId: "777", accountName: "TT" });
  assert.deepEqual(legacy.accounts.map((item) => [item.platform, item.accountId]), [["tiktok", "777"]]);
  assert.equal(legacy.platform, "tiktok");

  const both = normalizeAdsReportConfig({ metaAccountId: "111", metaAccountName: "Meta Acc", tiktokAccountId: "777", tiktokAccountName: "TT" });
  assert.deepEqual(both.accounts.map((item) => item.platform), ["meta", "tiktok"]);
  assert.equal(both.accountId, "111", "primary mirrors the first account for older readers");

  const cleared = normalizeAdsReportConfig({ ...both, tiktokAccountId: "" });
  assert.deepEqual(cleared.accounts.map((item) => item.platform), ["meta"]);

  const legacyEdit = normalizeAdsReportConfig({ ...both, platform: "tiktok", accountId: "888" });
  assert.deepEqual(legacyEdit.accounts.map((item) => `${item.platform}:${item.accountId}`).sort(), ["meta:111", "tiktok:888"]);

  assert.deepEqual(normalizeAdsReportConfig({}).accounts, []);
});

test("Meta and TikTok merge into one total with platform-tagged campaigns", () => {
  const merged = mergeAnalytics([
    { account: { platform: "meta", accountId: "111", accountName: "Meta Acc" }, analytics: analytics("meta", 300, 10) },
    { account: { platform: "tiktok", accountId: "777", accountName: "TT" }, analytics: analytics("tiktok", 200, 20) },
  ]);
  assert.equal(merged.platform, "combined");
  assert.equal(merged.total.spend, 500);
  assert.equal(merged.total.results, 30);
  assert.equal(merged.total.cpr, 16.67);
  assert.equal(merged.categories.prospecting.spend, 300);
  assert.deepEqual(merged.campaigns.map((row) => row.name), ["[Meta] Prospecting Lead", "[TikTok] Prospecting Lead"]);
  assert.equal(merged.parts.length, 2);

  const draft = buildCombinedDraft(merged, { metaAccountId: "111", tiktokAccountId: "777", resultMetric: "leads" });
  assert.equal(draft.reportTitle, "META + TIKTOK ADS PERFORMANCE BRIEF");
  assert.equal(draft.adSpend, 500);
  assert.match(draft.whatWeProved, /^Meta Ads \(Meta Acc\): RM\s?300\.00 spend \| 10 leads/);
  assert.match(draft.whatWeProved, /TikTok Ads \(TT\): RM\s?200\.00 spend \| 20 leads/);
});

test("one platform failing: manual drafts keep the other with a warning, automatic runs stop", async () => {
  const config = { metaAccountId: "111", tiktokAccountId: "777", resultMetric: "leads" };
  const fetchers = { meta: async () => analytics("meta", 300, 10), tiktok: async () => { throw new Error("token expired"); } };
  const partial = await fetchCombined(config, fetchers, ["2026-11-02", "2026-11-08"]);
  assert.equal(partial.total.spend, 300);
  assert.match(partial.warnings.join(" "), /TikTok gagal dimuat: token expired/);
  await assert.rejects(fetchCombined(config, fetchers, [], { requireAll: true }), /TikTok: token expired/);
  await assert.rejects(fetchCombined({}, fetchers), /belum ada akaun/);
});

test("weekly report fetches both platforms for a client with two accounts", async () => {
  const uploads = [];
  const calls = [];
  const result = await runWeeklyReports({
    now: "2026-10-04T22:00:00Z",
    load: async () => ({ registryStatus: { ok: true }, clients: [{ code: "DUO", onboardingStatus: "completed", serviceStatus: "active", metadata: { adsReportConfig: { metaAccountId: "111", tiktokAccountId: "777", resultMetric: "leads" } } }] }),
    claim: async (code) => ({ client_code: code }),
    meta: async (config) => { calls.push(`meta:${config.accountId}`); return analytics("meta", 300, 10); },
    tiktok: async (config) => { calls.push(`tiktok:${config.accountId}`); return analytics("tiktok", 200, 20); },
    upload: async (body) => { uploads.push(body); return { fileId: "drive-id" }; },
    finish: async () => {}, failure: async () => {}, success: async () => {},
  });
  assert.equal(result.ok, true);
  assert.deepEqual(calls.sort(), ["meta:111", "tiktok:777"]);
  assert.equal(uploads[0].reportTitle, "META + TIKTOK ADS PERFORMANCE BRIEF");
  assert.equal(uploads[0].adSpend, 500);
});

test("Telegram daily report: one message with the combined total and each platform", () => {
  const client = { code: "DUO", brandClient: "Duo", metadata: { adsReportConfig: { metaAccountId: "111", tiktokAccountId: "777", resultMetric: "leads" } } };
  const sources = new Map([
    ["meta:111", { ok: true, raw: { account: { spend: 300, leads: 10, impressions: 30000, clicks: 300, reach: 15000 }, campaigns: [{ id: "c1", name: "Prospecting Lead", spend: 300, leads: 10, impressions: 30000, clicks: 300, reach: 15000 }] } }],
    ["tiktok:777", { ok: true, analytics: analytics("tiktok", 200, 20) }],
  ]);
  const combined = clientDailyAnalytics(client, sources);
  assert.equal(combined.ok, true);
  assert.equal(combined.analytics.total.spend, 500);
  const message = buildDailyTelegramMessage(client, combined.analytics, "2026-11-12");
  assert.match(message, /^DAILY META \+ TIKTOK ADS REPORT\nDuo/);
  assert.match(message, /OVERALL \(META \+ TIKTOK\)\nSpend: RM\s?500\.00/);
  assert.match(message, /=== META ADS ===/);
  assert.match(message, /=== TIKTOK ADS ===\nTOP - PROSPECTING LEAD GEN/);

  const missing = clientDailyAnalytics(client, new Map([["meta:111", sources.get("meta:111")], ["tiktok:777", { ok: false, error: "authorization failed" }]]));
  assert.deepEqual(missing, { ok: false, error: "TikTok: authorization failed" });
});

test("ads alerts judge Meta + TikTok together", async () => {
  const opened = [];
  const result = await runAdsAlerts({
    now: new Date("2026-11-12T00:00:00Z"),
    deps: {
      clients: async () => [{ code: "DUO", brandClient: "Duo", serviceStatus: "active", metadata: { adsAlerts: { maxDailySpend: 400 }, adsReportConfig: { metaAccountId: "111", tiktokAccountId: "777", resultMetric: "leads" } } }],
      normalizeAdsReportConfig,
      yesterday: () => "2026-11-11",
      fetchDaily: async (config) => (config.platform === "tiktok" ? analytics("tiktok", 200, 20) : analytics("meta", 300, 10)),
      open: async (incident) => opened.push(incident),
      resolve: async () => {},
    },
  });
  assert.equal(result.alerts, 1, "RM 500 combined spend is over the RM 400 limit though each platform alone is under");
  assert.equal(opened[0].metadata.platform, "combined");
});

test("Ads CMO: a Meta account pairs with a TikTok advertiser and reports both", async () => {
  const setting = normalizeAccountSetting({ account_id: "111", account_name: "DD1", product_rules: [{ id: "__linked_account", linkedAccountId: "tiktok:777" }, { id: "p1", name: "Serum", campaignKeywords: ["serum"] }] });
  assert.equal(setting.linkedAccountId, "tiktok:777");
  assert.deepEqual(setting.productRules.map((rule) => rule.id), ["p1"], "the pairing marker is not a product rule");
  assert.equal(normalizeAccountSetting({ accountId: "111", linkedAccountId: "222" }).linkedAccountId, "", "two Meta accounts cannot pair");

  const fetched = [];
  const merged = await fetchAccountRange({ accountId: "111", accountName: "DD1", linkedAccountId: "tiktok:777", linkedAccountName: "DD1 TikTok" }, "2026-11-11", "2026-11-11", {}, async (config) => {
    fetched.push(config.accountId);
    return config.accountId.startsWith("tiktok:") ? analytics("tiktok", 200, 20) : analytics("meta", 300, 10);
  });
  assert.deepEqual(fetched, ["111", "tiktok:777"]);
  assert.equal(merged.total.spend, 500);
  assert.equal(merged.parts[1].accountId, "777");
});
