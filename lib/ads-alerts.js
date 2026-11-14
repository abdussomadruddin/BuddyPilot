// Per-client ads alert limits. Limits live in invoice_clients.metadata.adsAlerts.
// The daily cron checks yesterday's account totals against them; a breach opens
// an Operations incident (shown on the Dashboard, pushed to the phone), and a
// later clean day resolves it.
const DAY_FIELDS = ["maxCostPerResult", "minRoas", "maxDailySpend"];
const METRICS = ["cost_per_result", "roas", "spend"];

function clean(value) {
  return String(value ?? "").trim();
}

function limit(value, label, { max = 1_000_000 } = {}) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > max) {
    throw Object.assign(new Error(`${label} mesti nombor lebih daripada 0.`), { statusCode: 400 });
  }
  return Math.round(number * 100) / 100;
}

function normalizeAlerts(value = {}) {
  return {
    maxCostPerResult: limit(value.maxCostPerResult, "Had kos per result"),
    minRoas: limit(value.minRoas, "ROAS minimum", { max: 1000 }),
    maxDailySpend: limit(value.maxDailySpend, "Had spend harian"),
  };
}

function hasAlerts(alerts = {}) {
  return DAY_FIELDS.some((key) => alerts[key] != null);
}

function money(value, currency = "MYR") {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: currency || "MYR", maximumFractionDigits: 2 }).format(Number(value) || 0);
}

function resultWords(resultMetric) {
  if (resultMetric === "leads") return { cost: "CPL", unit: "lead" };
  if (resultMetric === "messaging_conversations") return { cost: "Kos per conversation", unit: "conversation" };
  return { cost: "Kos per purchase", unit: "purchase" };
}

// Pure: compare one day's totals with the limits. Returns one entry per metric
// that has a limit, with breached true/false.
function evaluateAlerts(total = {}, alerts = {}, { resultMetric = "conversions", currency = "MYR" } = {}) {
  const spend = Number(total.spend) || 0;
  const results = Number(total.results) || 0;
  const words = resultWords(resultMetric);
  const checks = [];
  if (alerts.maxDailySpend != null) {
    checks.push({
      metric: "spend",
      breached: spend > alerts.maxDailySpend,
      value: spend,
      limit: alerts.maxDailySpend,
      title: "Spend melebihi had",
      detail: `Spend semalam ${money(spend, currency)} melebihi had ${money(alerts.maxDailySpend, currency)}.`,
    });
  }
  if (alerts.maxCostPerResult != null && spend > 0) {
    const cost = results > 0 ? spend / results : null;
    const breached = cost == null ? spend > alerts.maxCostPerResult : cost > alerts.maxCostPerResult;
    checks.push({
      metric: "cost_per_result",
      breached,
      value: cost == null ? null : Math.round(cost * 100) / 100,
      limit: alerts.maxCostPerResult,
      title: `${words.cost} melebihi had`,
      detail: cost == null
        ? `Spend semalam ${money(spend, currency)} tanpa sebarang ${words.unit}; had ${words.cost} ${money(alerts.maxCostPerResult, currency)}.`
        : `${words.cost} semalam ${money(cost, currency)} melebihi had ${money(alerts.maxCostPerResult, currency)} (${money(spend, currency)}, ${results} ${words.unit}).`,
    });
  }
  if (alerts.minRoas != null && resultMetric === "conversions" && spend > 0) {
    const revenue = Number(total.revenue) || 0;
    const purchases = Number(total.purchases) || 0;
    // Purchases without reported revenue means revenue is not tracked, not ROAS 0.
    if (revenue > 0 || purchases === 0) {
      const roas = revenue / spend;
      checks.push({
        metric: "roas",
        breached: roas < alerts.minRoas,
        value: Math.round(roas * 100) / 100,
        limit: alerts.minRoas,
        title: "ROAS bawah had",
        detail: `ROAS semalam ${roas.toFixed(2)} bawah minimum ${alerts.minRoas.toFixed(2)} (revenue ${money(revenue, currency)}, spend ${money(spend, currency)}).`,
      });
    }
  }
  return checks;
}

// Pure: the campaign most responsible for a breach, with what to do about it.
function alertCulprit(metric, campaigns = [], alerts = {}, { resultMetric = "conversions", currency = "MYR" } = {}) {
  const rows = campaigns.filter((row) => Number(row.spend) > 0);
  if (!rows.length) return null;
  const words = resultWords(resultMetric);
  const bySpend = (list) => [...list].sort((a, b) => Number(b.spend) - Number(a.spend))[0];
  let row;
  let advice;
  if (metric === "spend") {
    row = bySpend(rows);
    advice = "Semak budget campaign ini.";
  } else if (metric === "cost_per_result") {
    const costly = rows.filter((item) => !(Number(item.results) > 0) || Number(item.spend) / Number(item.results) > alerts.maxCostPerResult);
    row = bySpend(costly);
    advice = row && !(Number(row.results) > 0) ? "Pause atau tukar creative campaign ini." : "Turunkan budget atau tukar creative campaign ini.";
  } else if (metric === "roas") {
    row = bySpend(rows.filter((item) => Number(item.revenue || 0) / Number(item.spend) < alerts.minRoas));
    advice = "Pause atau turunkan budget campaign ini.";
  }
  if (!row) return null;
  const spend = Number(row.spend);
  const results = Number(row.results) || 0;
  const figures = metric === "roas"
    ? `${money(spend, currency)} spend, ROAS ${(Number(row.revenue || 0) / spend).toFixed(2)}`
    : `${money(spend, currency)} spend, ${results} ${words.unit}${results > 0 ? ` (${words.cost} ${money(spend / results, currency)})` : ""}`;
  return { campaignId: clean(row.id), campaignName: clean(row.name) || "Campaign tanpa nama", spend: Math.round(spend * 100) / 100, results, advice, text: `Punca utama: ${clean(row.name) || "campaign tanpa nama"} - ${figures}. ${advice}` };
}

function alertFingerprint(clientCode, metric) {
  return `ads-alert:${clean(clientCode).toUpperCase()}:${metric}`;
}

function defaultDeps() {
  const meta = require("./meta-ads");
  const { fetchTikTokDailyReport } = require("./tiktok-ads");
  const { getMergedClientsWithStatus } = require("./invoices");
  const { reportOperationalFailure } = require("./operations-events");
  const { resolveOperationsIncidents } = require("./supabase-db");
  return {
    clients: async () => (await getMergedClientsWithStatus()).clients || [],
    normalizeAdsReportConfig: meta.normalizeAdsReportConfig,
    yesterday: (now) => meta.presetDateRange("yesterday", now).startDate,
    fetchDaily: async (config, reportDate) => (config.platform === "tiktok"
      ? fetchTikTokDailyReport(config, reportDate)
      : meta.aggregateMetaDailyRaw(await meta.fetchMetaDailyRaw(config.accountId, reportDate), config)),
    open: reportOperationalFailure,
    resolve: resolveOperationsIncidents,
  };
}

function mergeAnalytics(parts) {
  return require("./combined-ads").mergeAnalytics(parts);
}

async function runAdsAlerts({ now = new Date(), deps = defaultDeps() } = {}) {
  const reportDate = deps.yesterday(now);
  const clients = (await deps.clients()).filter((client) => !client.deletedAt
    && client.serviceStatus !== "paused"
    && client.onboardingStatus !== "in_progress"
    && hasAlerts(client.metadata?.adsAlerts || {}));
  const configs = new Map(clients.map((client) => [client.code, deps.normalizeAdsReportConfig(client.metadata?.adsReportConfig || {})]));
  const fetched = new Map();
  const results = [];
  for (const client of clients) {
    const config = configs.get(client.code);
    const accounts = config.accounts || (config.accountId ? [{ platform: config.platform, accountId: config.accountId, accountName: config.accountName, currency: config.currency }] : []);
    if (!accounts.length) {
      results.push({ clientCode: client.code, status: "skipped", reason: "no_ads_account" });
      continue;
    }
    // Limits apply to Meta + TikTok together when the client runs both.
    const sources = await Promise.all(accounts.map((account) => {
      const accountConfig = { ...config, platform: account.platform, accountId: account.accountId, accountName: account.accountName, currency: account.currency, accounts: [account] };
      const key = `${account.platform}:${account.accountId}:${config.resultMetric}`;
      if (!fetched.has(key)) {
        fetched.set(key, deps.fetchDaily(accountConfig, reportDate).then((analytics) => ({ ok: true, analytics }), (error) => ({ ok: false, error })));
      }
      return fetched.get(key).then((result) => ({ ...result, account }));
    }));
    const failedSource = sources.find((item) => !item.ok);
    if (failedSource) {
      // Unknown is not healthy: leave any open alert as it is.
      results.push({ clientCode: client.code, status: "failed", error: failedSource.error?.message || String(failedSource.error) });
      continue;
    }
    const source = { analytics: sources.length > 1 ? mergeAnalytics(sources.map((item) => ({ account: item.account, analytics: item.analytics }))) : sources[0].analytics };
    const alerts = normalizeAlerts(client.metadata.adsAlerts);
    const checks = evaluateAlerts(source.analytics.total || {}, alerts, { resultMetric: config.resultMetric, currency: source.analytics.currency || config.currency });
    const name = client.brandClient || client.name || client.code;
    for (const check of checks.filter((item) => item.breached)) {
      const culprit = alertCulprit(check.metric, source.analytics.campaigns || [], alerts, { resultMetric: config.resultMetric, currency: source.analytics.currency || config.currency });
      if (culprit) check.detail = `${check.detail} ${culprit.text}`;
      await deps.open({
        fingerprint: alertFingerprint(client.code, check.metric),
        severity: "critical",
        serviceName: "ads_alerts",
        entityType: "client",
        entityId: client.code,
        clientCode: client.code,
        title: `${check.title} · ${name}`,
        detail: check.detail,
        action: { kind: "navigate", label: "Buka Ads CMO", tab: "adscmo" },
        metadata: { reportDate, metric: check.metric, value: check.value, limit: check.limit, platform: accounts.length > 1 ? "combined" : config.platform, ...(culprit ? { campaignId: culprit.campaignId, campaignName: culprit.campaignName } : {}) },
      });
    }
    const breached = new Set(checks.filter((item) => item.breached).map((item) => item.metric));
    const clear = METRICS.filter((metric) => !breached.has(metric)).map((metric) => alertFingerprint(client.code, metric));
    if (clear.length) await deps.resolve(clear);
    results.push({ clientCode: client.code, status: breached.size ? "alert" : "ok", breached: [...breached] });
  }
  return {
    reportDate,
    checked: results.filter((item) => item.status === "ok" || item.status === "alert").length,
    alerts: results.filter((item) => item.status === "alert").length,
    failed: results.filter((item) => item.status === "failed").length,
    results,
  };
}

module.exports = { alertCulprit, alertFingerprint, evaluateAlerts, hasAlerts, normalizeAlerts, runAdsAlerts };
