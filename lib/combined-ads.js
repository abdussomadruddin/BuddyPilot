// One client, two ad platforms: fetch the Meta ad account and the TikTok
// advertiser saved on the client, then merge them into one analytics object so
// the weekly report, Report Pilot and the Telegram daily report show a single
// combined view with a per-platform breakdown.
const { normalizeAdsReportConfig, buildReportDraft, metricLine } = require("./meta-ads");

const METRIC_KEYS = ["spend", "results", "purchases", "revenue", "leads", "messaging", "impressions", "clicks", "linkClicks", "reach"];
const LABELS = { meta: "Meta", tiktok: "TikTok" };

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function platformLabel(platform) {
  return LABELS[platform] || "Ads";
}

// The config one platform's fetcher expects: the shared settings plus that account.
function accountConfig(config, account) {
  return normalizeAdsReportConfig({ ...config, accounts: [account], platform: account.platform, accountId: account.accountId, accountName: account.accountName, currency: account.currency });
}

function sumMetrics(list) {
  const total = Object.fromEntries(METRIC_KEYS.map((key) => [key, 0]));
  for (const metrics of list) for (const key of METRIC_KEYS) total[key] += Number(metrics?.[key]) || 0;
  const result = Object.fromEntries(Object.entries(total).map(([key, value]) => [key, round(value)]));
  result.cpr = result.results > 0 ? round(result.spend / result.results) : null;
  result.ctr = result.impressions > 0 ? round((result.clicks / result.impressions) * 100) : null;
  result.cpc = result.clicks > 0 ? round(result.spend / result.clicks) : null;
  result.cpm = result.impressions > 0 ? round((result.spend / result.impressions) * 1000) : null;
  result.frequency = result.reach > 0 ? round(result.impressions / result.reach) : null;
  result.roas = result.spend > 0 && result.revenue > 0 ? round(result.revenue / result.spend) : null;
  return result;
}

function tagRows(rows = [], platform) {
  return rows.map((row) => ({ ...row, platform, name: `[${platformLabel(platform)}] ${row.name || ""}`.trim() }));
}

// parts: [{ account: {platform, accountId, accountName}, analytics }]
function mergeAnalytics(parts) {
  const summary = parts.map(({ account, analytics }) => ({
    platform: account.platform,
    accountId: account.accountId,
    accountName: account.accountName || account.accountId,
    currency: analytics.currency,
    // Recomputed so every part carries cost per result, CPM, CPC and frequency.
    total: { ...analytics.total, ...sumMetrics([analytics.total]) },
    categories: Object.fromEntries(["prospecting", "retargeting", "other"].map((key) => [key, sumMetrics([analytics.categories?.[key]])])),
  }));
  if (parts.length === 1) return { ...parts[0].analytics, parts: summary };
  const first = parts[0].analytics;
  const warnings = parts.flatMap(({ account, analytics }) => (analytics.warnings || []).map((item) => `${platformLabel(account.platform)}: ${item}`));
  if (new Set(parts.map(({ analytics }) => analytics.currency)).size > 1) {
    warnings.push(`Mata wang Meta dan TikTok berbeza; jumlah gabungan guna ${first.currency}.`);
  }
  const byCategory = (key) => sumMetrics(parts.map(({ analytics }) => analytics.categories?.[key]));
  const sortBySpend = (rows) => rows.sort((a, b) => (b.spend || 0) - (a.spend || 0));
  return {
    platform: "combined",
    platforms: parts.map(({ account }) => account.platform),
    currency: first.currency,
    resultMetric: first.resultMetric,
    resultLabel: first.resultLabel,
    total: sumMetrics(parts.map(({ analytics }) => analytics.total)),
    categories: { prospecting: byCategory("prospecting"), retargeting: byCategory("retargeting"), other: byCategory("other") },
    campaigns: sortBySpend(parts.flatMap(({ account, analytics }) => tagRows(analytics.campaigns, account.platform))),
    adsets: sortBySpend(parts.flatMap(({ account, analytics }) => tagRows(analytics.adsets, account.platform))),
    ads: sortBySpend(parts.flatMap(({ account, analytics }) => tagRows(analytics.ads, account.platform))),
    warnings,
    parts: summary,
  };
}

// fetchers: { meta(config, ...args), tiktok(config, ...args) }. Both platforms are
// fetched together; if one fails the report still goes out with the other and a
// warning, unless `requireAll` is set.
async function fetchCombined(configInput, fetchers, args = [], { requireAll = false } = {}) {
  const config = normalizeAdsReportConfig(configInput);
  if (!config.accounts.length) throw new Error("Client belum ada akaun Meta Ads atau TikTok Ads.");
  const settled = await Promise.allSettled(config.accounts.map(async (account) => ({
    account,
    analytics: await fetchers[account.platform](accountConfig(config, account), ...args),
  })));
  const ok = settled.filter((item) => item.status === "fulfilled").map((item) => item.value);
  const failed = settled
    .map((item, index) => (item.status === "rejected" ? { account: config.accounts[index], error: item.reason } : null))
    .filter(Boolean);
  if (!ok.length || (requireAll && failed.length)) {
    const error = failed[0].error;
    throw Object.assign(new Error(failed.map((item) => `${platformLabel(item.account.platform)}: ${item.error?.message || item.error}`).join(" | ")), { statusCode: error?.statusCode });
  }
  const merged = mergeAnalytics(ok);
  for (const item of failed) {
    merged.warnings = [...(merged.warnings || []), `${platformLabel(item.account.platform)} gagal dimuat: ${item.error?.message || item.error}. Report ini hanya ada ${ok.map((part) => platformLabel(part.account.platform)).join(" + ")}.`];
  }
  return merged;
}

function reportTitle(analytics, config = {}) {
  if (analytics?.platform === "combined") return "META + TIKTOK ADS PERFORMANCE BRIEF";
  const platform = analytics?.platform || normalizeAdsReportConfig(config).platform;
  return platform === "tiktok" ? "TIKTOK ADS PERFORMANCE BRIEF" : "META ADS PERFORMANCE BRIEF";
}

// Same draft as before for one platform; for two, the combined numbers lead and a
// line per platform shows where the results came from.
function buildCombinedDraft(analytics, configInput = {}) {
  const config = normalizeAdsReportConfig(configInput);
  if (analytics.platform !== "combined") return { ...buildReportDraft(analytics, config), reportTitle: reportTitle(analytics, config) };
  const draft = buildReportDraft(analytics, { ...config, platform: "meta" });
  const lines = analytics.parts.map((part) => metricLine(`${platformLabel(part.platform)} Ads (${part.accountName})`, part.total, analytics.currency, analytics.resultLabel));
  return {
    ...draft,
    whatWeProved: [...lines, draft.whatWeProved].filter(Boolean).join("\n"),
    reportTitle: reportTitle(analytics, config),
  };
}

module.exports = { accountConfig, buildCombinedDraft, fetchCombined, mergeAnalytics, platformLabel, reportTitle, sumMetrics };
