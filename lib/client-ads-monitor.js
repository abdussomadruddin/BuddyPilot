const { getMergedClientsWithStatus, activeClients } = require("./invoices");
const { listMetaAdAccounts, fetchMetaRange } = require("./meta-ads");
const { listTikTokAdvertisers, fetchTikTokMonitorRange } = require("./tiktok-ads");
const { saveClientAdsMonitorPlatform } = require("./supabase-db");

const clean = (value) => String(value ?? "").trim();
const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const keys = ["purchase", "form", "message"];
const failure = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
function platformKey(value) {
  if (!["meta", "tiktok"].includes(value)) throw failure("Pilih platform Meta atau TikTok.");
  return value;
}
function resultKey(result, leadType) {
  if (result === "purchase") return "purchase";
  if (result === "lead" && ["form", "message"].includes(leadType)) return leadType;
  throw failure("Pilih Purchase atau Lead dan jenis lead.");
}
function today(now = new Date()) { return new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10); }
function shift(date, days) { return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10); }
function dateRange(input, now = new Date()) {
  const end = today(now);
  let startDate, endDate;
  if (input.period === "today") startDate = endDate = end;
  else if (input.period === "yesterday") startDate = endDate = shift(end, -1);
  else if (["7", "30"].includes(input.period)) { startDate = shift(end, 1 - Number(input.period)); endDate = end; }
  else if (input.period === "custom") { startDate = clean(input.startDate); endDate = clean(input.endDate); }
  else throw failure("Pilih tempoh data.");
  for (const date of [startDate, endDate]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw failure("Tarikh tidak sah.");
  }
  if (startDate > endDate || endDate > end || (Date.parse(endDate) - Date.parse(startDate)) / 86400000 > 365) throw failure("Tempoh mesti 1 hingga 366 hari dan bukan tarikh akan datang.");
  return { startDate, endDate };
}
function numberOrNull(value, max = Infinity) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > max) throw failure("Harga dan margin mesti nombor yang sah.");
  return number;
}
function normalizeConfig(value = {}) {
  if (value.products != null && !Array.isArray(value.products)) throw failure("Senarai produk tidak sah.");
  const selections = {};
  for (const key of keys) {
    if (value.selections?.[key] != null && !Array.isArray(value.selections[key])) throw failure("Pilihan campaign tidak sah.");
    selections[key] = [...new Set((value.selections?.[key] || []).map(clean).filter(Boolean))];
    if (selections[key].length > 500) throw failure("Maksimum 500 campaign.");
  }
  const products = (Array.isArray(value.products) ? value.products : []).map((product) => {
    if (product.campaignIds != null && !Array.isArray(product.campaignIds)) throw failure("Pilihan campaign produk tidak sah.");
    return {
    id: clean(product.id), name: clean(product.name).slice(0, 100),
    sellingPrice: numberOrNull(product.sellingPrice), marginPercent: numberOrNull(product.marginPercent, 100),
    campaignIds: [...new Set((product.campaignIds || []).map(clean).filter(Boolean))],
    };
  });
  if (products.length > 100) throw failure("Maksimum 100 produk.");
  const ids = new Set(), campaigns = new Set();
  for (const product of products) {
    if (!product.id || !product.name || ids.has(product.id)) throw failure("Produk mesti mempunyai ID unik dan nama.");
    ids.add(product.id);
    for (const id of product.campaignIds) {
      if (campaigns.has(id)) throw failure("Satu campaign hanya boleh dipautkan kepada satu produk.");
      campaigns.add(id);
    }
  }
  return { accountId: clean(value.accountId).replace(/^act_/, ""), accountName: clean(value.accountName), currency: clean(value.currency || "MYR"), selections, products };
}
function clientConfig(client, platform) {
  const stored = client.metadata?.adsMonitor?.[platform];
  if (stored) return normalizeConfig(stored);
  const legacy = client.metadata?.adsReportConfig || {};
  return normalizeConfig((legacy.platform || "meta") === platform ? legacy : {});
}
function summarize(rows, key) {
  const sums = { spend: 0, impressions: 0, clicks: 0, linkClicks: 0, results: 0, revenue: 0, profit: 0 };
  for (const field of ["spend", "results", "revenue", "profit"]) if (rows.some((row) => row[field] == null)) sums[field] = null;
  for (const row of rows) for (const field of Object.keys(sums)) if (sums[field] != null) sums[field] += row[field] || 0;
  for (const field of Object.keys(sums)) if (sums[field] != null) sums[field] = round(sums[field]);
  return { ...sums, costPerResult: sums.results > 0 && sums.spend != null ? round(sums.spend / sums.results) : null,
    roas: key === "purchase" && sums.revenue != null && sums.spend > 0 ? round(sums.revenue / sums.spend) : null,
    ctr: sums.impressions > 0 ? round(sums.clicks / sums.impressions * 100) : null,
    cpc: sums.clicks > 0 && sums.spend != null ? round(sums.spend / sums.clicks) : null,
    cpm: sums.impressions > 0 && sums.spend != null ? round(sums.spend / sums.impressions * 1000) : null,
    estimatedRevenue: rows.some((row) => row.estimatedRevenue),
  };
}
function buildSnapshot(analytics, config, key) {
  const selected = new Set(config.selections[key]);
  if (!selected.size) throw failure("Pilih dan simpan campaign untuk result ini dahulu.");
  const seen = new Set(), warnings = [];
  const rows = (analytics.campaigns || []).filter((row) => {
    if (!selected.has(row.id) || seen.has(row.id)) return false;
    seen.add(row.id); return true;
  }).map((row) => {
    const product = config.products.find((item) => item.campaignIds.includes(row.id));
    const metric = key === "purchase" ? "purchases" : key === "form" ? "leads" : "messaging";
    const available = row.metricAvailability?.[metric] === true;
    const results = available ? Number(row[metric] || 0) : null;
    const spend = row.metricAvailability?.spend === false ? null : Number(row.spend || 0);
    let revenue = null, profit = null, estimatedRevenue = false;
    let reason = key !== "purchase" ? "Tiada anggaran jualan daripada lead/message." : "Revenue atau margin produk belum lengkap.";
    if (key === "purchase" && available) {
      if (results === 0) revenue = 0;
      else if (row.metricAvailability?.revenue && Number(row.revenue) > 0) revenue = Number(row.revenue);
      else if (product?.sellingPrice != null) { revenue = results * product.sellingPrice; estimatedRevenue = true; }
      if (results === 0 && spend != null) { profit = -spend; reason = "Tiada purchase; kerugian ads spend sahaja."; }
      else if (revenue != null && product?.marginPercent != null && spend != null) { profit = revenue * product.marginPercent / 100 - spend; reason = "Gross profit selepas ads; bukan net business profit."; }
    }
    if (!available) warnings.push(`${row.name}: metric ${metric} tidak tersedia.`);
    if (spend == null) warnings.push(`${row.name}: spend tidak tersedia.`);
    return { ...row, spend, results, revenue, profit: profit == null ? null : round(profit), estimatedRevenue, reason, productId: product?.id || "", productName: product?.name || "Unmapped", metricAvailable: available };
  });
  const missing = [...selected].filter((id) => !seen.has(id));
  if (missing.length) warnings.push(`${missing.length} campaign dipilih tiada dalam response tempoh ini; data separa, bukan sifar disahkan.`);
  const overall = summarize(rows, key);
  if (missing.length || !rows.length || analytics.monitorPartial) {
    overall.results = overall.revenue = overall.profit = overall.costPerResult = overall.roas = null;
    overall.spend = overall.cpc = overall.cpm = null;
  }
  const productIds = [...new Set(rows.map((row) => row.productId))];
  return { overall, campaigns: rows.map((row) => ({ ...row, ...summarize([row], key) })),
    products: productIds.map((id) => ({ id, name: rows.find((row) => row.productId === id).productName, ...summarize(rows.filter((row) => row.productId === id), key) })),
    warnings: [...new Set([...warnings, ...(analytics.warnings || [])])],
    partial: missing.length > 0 || rows.some((row) => !row.metricAvailable || row.spend == null) || Boolean(analytics.monitorPartial),
    missingCampaignIds: missing, capturedAt: new Date().toISOString(), currency: config.currency,
  };
}

function createService(deps = {}) {
  const registry = deps.registry || getMergedClientsWithStatus;
  const accounts = deps.accounts || ((platform) => platform === "meta" ? listMetaAdAccounts() : listTikTokAdvertisers());
  const fetchRange = deps.fetchRange || ((platform, config, range) => platform === "meta"
    ? fetchMetaRange({ ...config, monitorStrict: true }, range.startDate, range.endDate, { full: false })
    : fetchTikTokMonitorRange(config, range.startDate, range.endDate));
  const save = deps.save || saveClientAdsMonitorPlatform;
  async function clients() {
    const data = await registry();
    if (!data.registryStatus?.ok) throw failure("Client registry tidak tersedia. Refresh dahulu.", 503);
    return (data.clients || []).filter((client) => !client.deletedAt);
  }
  async function client(code) {
    if (!clean(code)) throw failure("Pilih client dahulu.");
    const found = (await clients()).find((item) => item.code === clean(code));
    if (!found) throw failure("Client tidak dijumpai.", 404);
    return found;
  }
  async function accessibleAccount(platform, id) {
    if (!id) throw failure("Pautkan akaun ads client untuk platform ini dahulu.");
    const account = (await accounts(platform)).find((item) => clean(item.id).replace(/^act_/, "") === id);
    if (!account) throw failure("Akaun ini tidak boleh diakses melalui sambungan platform semasa.", 403);
    return account;
  }
  return {
    async list(all) {
      const items = await clients();
      return (all ? items : activeClients(items)).map((item) => ({ code: item.code, name: item.brandClient || item.name || item.code,
        status: item.agencyStatus || item.serviceStatus || "active" }));
    },
    async settings(input) {
      const selected = await client(input.clientCode), platform = platformKey(input.platform);
      return { config: clientConfig(selected, platform), accounts: await accounts(platform) };
    },
    async save(input) {
      const selected = await client(input.clientCode), platform = platformKey(input.platform);
      const config = normalizeConfig(input.config);
      const account = await accessibleAccount(platform, config.accountId);
      config.accountName = account.name; config.currency = account.currency || "MYR";
      return save(selected.code, platform, config);
    },
    async data(input, catalog = false) {
      const selected = await client(input.clientCode), platform = platformKey(input.platform);
      const key = resultKey(input.result, input.leadType), range = dateRange(input);
      const config = clientConfig(selected, platform);
      if (!catalog && !config.selections[key].length) throw failure("Pilih dan simpan campaign untuk result ini dahulu.");
      const account = await accessibleAccount(platform, config.accountId);
      config.currency = account.currency || config.currency;
      const resultMetric = key === "purchase" ? "conversions" : key === "form" ? "leads" : "messaging_conversations";
      const analytics = await fetchRange(platform, { ...config, resultMetric }, range);
      if (catalog) return { campaigns: (analytics.campaigns || []).map((row) => ({ id: row.id, name: row.name, metricAvailable: row.metricAvailability?.[key === "purchase" ? "purchases" : key === "form" ? "leads" : "messaging"] === true })), warnings: analytics.warnings || [], ...range };
      return { ...buildSnapshot(analytics, config, key), ...range, clientCode: selected.code, clientName: selected.brandClient || selected.name,
        platform, result: input.result, leadType: input.leadType || "", accountId: config.accountId, accountName: account.name };
    },
  };
}
module.exports = { createService, normalizeConfig, clientConfig, dateRange, buildSnapshot, resultKey };
