const { fetchAdflowRange, listAdflowAdAccounts } = require("./adflow-ads");
const { sendPushPayload } = require("./push-notifications");
const {
  getPersonalAdsAccount,
  getPersonalAdsReport,
  getPersonalAdsReportRun,
  listEnabledPersonalAdsAccounts,
  listPersonalAdsAccounts,
  listPersonalAdsReportDates,
  savePersonalAdsAccount,
  savePersonalAdsReport,
  savePersonalAdsReportRun,
} = require("./supabase-db");

function cleanText(value) { return String(value || "").trim(); }
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function round(value, digits = 2) { const factor = 10 ** digits; return Math.round(number(value) * factor) / factor; }
function iso(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function malaysiaDate(now = new Date()) { const date = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" })); date.setHours(0, 0, 0, 0); return date; }
function yesterdayDate(now = new Date()) { const date = malaysiaDate(now); date.setDate(date.getDate() - 1); return iso(date); }
function todayDate(now = new Date()) { return iso(malaysiaDate(now)); }
function shiftDate(value, days) { const date = new Date(`${value}T00:00:00+08:00`); date.setDate(date.getDate() + days); return iso(date); }
function keywordArray(value, fallback = []) {
  const items = Array.isArray(value) ? value : cleanText(value).split(/[\n,]/);
  const normalized = [...new Set(items.map((item) => cleanText(item).toLowerCase()).filter(Boolean))];
  return normalized.length ? normalized : fallback;
}

function normalizeProductRule(rule = {}, index = 0) {
  const primaryMetric = ["purchase", "lead", "messaging_conversation"].includes(rule.primaryMetric) ? rule.primaryMetric : "purchase";
  return {
    id: cleanText(rule.id || `product-${index + 1}`),
    name: cleanText(rule.name || `Product ${index + 1}`),
    campaignKeywords: keywordArray(rule.campaignKeywords || rule.keywords),
    primaryMetric,
    sellingPrice: Math.max(0, number(rule.sellingPrice)),
    grossMarginPercent: Math.max(0, Math.min(100, number(rule.grossMarginPercent))),
    allowableCpa: Math.max(0, number(rule.allowableCpa)),
  };
}

function normalizeAccountSetting(value = {}) {
  return {
    accountId: cleanText(value.accountId || value.account_id).replace(/^act_/, ""),
    accountName: cleanText(value.accountName || value.account_name || value.accountId || value.account_id),
    currency: cleanText(value.currency || "MYR").toUpperCase(),
    autoReportEnabled: Boolean(value.autoReportEnabled ?? value.auto_report_enabled),
    prospectingKeywords: keywordArray(value.prospectingKeywords || value.prospecting_keywords, ["prospecting", "pros", "cold", "tof"]),
    retargetingKeywords: keywordArray(value.retargetingKeywords || value.retargeting_keywords, ["retargeting", "retarget", "rtg", "warm", "remarketing"]),
    productRules: (value.productRules || value.product_rules || []).map(normalizeProductRule).filter((item) => item.campaignKeywords.length),
  };
}

function primaryResults(metrics = {}, primaryMetric = "purchase") {
  if (primaryMetric === "lead") return number(metrics.leads);
  if (primaryMetric === "messaging_conversation") return number(metrics.messaging);
  return number(metrics.purchases);
}

function buildProductBreakdown(campaigns = []) {
  const groups = new Map();
  for (const campaign of campaigns) {
    const product = cleanText(campaign.product || "Other / Unmapped");
    const current = groups.get(product) || {
      product, spend: 0, revenue: 0, purchases: 0, leads: 0, conversations: 0,
      impressions: 0, reach: 0, clicks: 0, linkClicks: 0, profit: 0,
      profitCampaigns: 0, campaignCount: 0,
    };
    current.campaignCount += 1;
    current.spend += number(campaign.spend);
    current.revenue += number(campaign.revenue);
    current.purchases += number(campaign.purchases);
    current.leads += number(campaign.leads);
    current.conversations += number(campaign.messaging);
    current.impressions += number(campaign.impressions);
    current.reach += number(campaign.reach);
    current.clicks += number(campaign.clicks);
    current.linkClicks += number(campaign.linkClicks);
    if (campaign.profit != null) {
      current.profit += number(campaign.profit);
      current.profitCampaigns += 1;
    } else if (!campaign.trackingAnomaly && number(campaign.revenue) > 0) {
      current.profit += number(campaign.revenue) - number(campaign.spend);
      current.profitCampaigns += 1;
    }
    groups.set(product, current);
  }
  return [...groups.values()].map((item) => ({
    product: item.product,
    campaignCount: item.campaignCount,
    spend: round(item.spend),
    revenue: round(item.revenue),
    profit: item.profitCampaigns === item.campaignCount ? round(item.profit) : null,
    purchases: round(item.purchases),
    cpp: item.purchases > 0 ? round(item.spend / item.purchases) : null,
    roas: item.spend > 0 && item.revenue > 0 ? round(item.revenue / item.spend) : null,
    leads: round(item.leads),
    conversations: round(item.conversations),
    impressions: round(item.impressions),
    reach: round(item.reach),
    clicks: round(item.clicks),
    linkClicks: round(item.linkClicks),
    ctr: item.impressions > 0 ? round((item.clicks / item.impressions) * 100) : null,
    cpc: item.clicks > 0 ? round(item.spend / item.clicks) : null,
  })).sort((a, b) => b.spend - a.spend || a.product.localeCompare(b.product));
}

function matchingRule(name, rules) {
  const lower = cleanText(name).toLowerCase();
  return rules.find((rule) => rule.campaignKeywords.some((keyword) => lower.includes(keyword))) || null;
}

function money(value, currency = "MYR") {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency, maximumFractionDigits: 2 }).format(number(value));
}

function pctChange(current, previous) {
  if (!number(previous)) return number(current) ? null : 0;
  return round(((number(current) - number(previous)) / number(previous)) * 100, 1);
}

function assessPeriod(analytics, setting) {
  const warnings = [...(analytics.warnings || [])];
  let coveredSpend = 0;
  let contributionProfit = 0;
  let estimatedRevenue = 0;
  const campaigns = analytics.campaigns.map((campaign) => {
    const rule = matchingRule(campaign.name, setting.productRules);
    if (!rule) return { ...campaign, product: "Other / Unmapped", primaryMetric: "", primaryResults: 0, allowableCpa: null, profit: null, profitStatus: "unmapped" };
    const results = primaryResults(campaign, rule.primaryMetric);
    const allowableCpa = rule.allowableCpa || (rule.primaryMetric === "purchase" ? round(rule.sellingPrice * (rule.grossMarginPercent / 100)) : 0);
    const cpa = results > 0 ? round(campaign.spend / results) : null;
    let revenue = number(campaign.revenue);
    let revenueSource = revenue > 0 ? "meta" : "missing";
    let profit = null;
    let anomaly = "";
    if (rule.primaryMetric === "purchase") {
      if (!revenue && campaign.purchases > 0 && rule.sellingPrice > 0) {
        revenue = round(campaign.purchases * rule.sellingPrice);
        revenueSource = "estimated";
        warnings.push(`${campaign.name}: revenue Meta tiada; anggaran menggunakan purchases × selling price.`);
      }
      if (campaign.purchases > 0 && campaign.revenue > 0 && rule.sellingPrice > 0) {
        const averageValue = campaign.revenue / campaign.purchases;
        if (averageValue > rule.sellingPrice * 5 || averageValue < rule.sellingPrice * 0.2) {
          anomaly = `Average purchase value ${money(averageValue, setting.currency)} tidak sepadan dengan selling price ${money(rule.sellingPrice, setting.currency)}.`;
          warnings.push(`${campaign.name}: ${anomaly}`);
        }
      }
      if (rule.grossMarginPercent > 0 && revenue > 0 && !anomaly) profit = round(revenue * (rule.grossMarginPercent / 100) - campaign.spend);
    } else if (allowableCpa > 0) {
      profit = round(results * allowableCpa - campaign.spend);
      revenueSource = "allowable_cpa";
    }
    if (profit != null) {
      coveredSpend += campaign.spend;
      contributionProfit += profit;
      estimatedRevenue += revenue;
    }
    return {
      ...campaign,
      product: rule.name,
      primaryMetric: rule.primaryMetric,
      primaryResults: results,
      primaryCpa: cpa,
      allowableCpa: allowableCpa || null,
      revenue: round(revenue),
      revenueSource,
      profit,
      profitStatus: anomaly ? "tracking_issue" : profit == null ? "insufficient_config" : profit >= 0 ? "profitable" : "loss",
      trackingAnomaly: anomaly,
    };
  });
  const unmappedSpend = round(campaigns.filter((item) => item.profitStatus === "unmapped").reduce((sum, item) => sum + item.spend, 0));
  if (unmappedSpend > 0) warnings.push(`${money(unmappedSpend, setting.currency)} spend berada dalam Other / Unmapped; profit account tidak boleh disahkan sepenuhnya.`);
  if (!setting.productRules.length) warnings.push("Product profitability rules belum dikonfigurasi; Est. profit hanya menggunakan fallback apabila reported revenue tersedia.");
  let accountProfit = coveredSpend > 0 ? round(contributionProfit) : null;
  let profitSource = coveredSpend > 0 ? "product_margin" : "unavailable";
  const hasTrackingAnomaly = campaigns.some((item) => item.profitStatus === "tracking_issue");
  if (accountProfit == null && !hasTrackingAnomaly && number(analytics.total.revenue) > 0) {
    accountProfit = round(number(analytics.total.revenue) - number(analytics.total.spend));
    profitSource = "reported_revenue_less_ads";
    warnings.push("Est. profit menggunakan reported revenue − ads spent kerana product mapping belum lengkap; kos produk lain belum ditolak.");
  } else if (accountProfit == null && !hasTrackingAnomaly && number(analytics.total.purchases) > 0 && setting.productRules.length === 1) {
    const rule = setting.productRules[0];
    if (rule.primaryMetric === "purchase" && rule.sellingPrice > 0 && rule.grossMarginPercent > 0) {
      const fallbackRevenue = round(number(analytics.total.purchases) * rule.sellingPrice);
      accountProfit = round(fallbackRevenue * (rule.grossMarginPercent / 100) - number(analytics.total.spend));
      estimatedRevenue = fallbackRevenue;
      profitSource = "single_product_estimate";
      warnings.push("Est. profit menggunakan jumlah purchase × harga dan margin satu product rule kerana campaign mapping belum lengkap.");
    }
  }
  const uniqueWarnings = [...new Set(warnings)];
  return {
    ...analytics,
    campaigns,
    productBreakdown: buildProductBreakdown(campaigns),
    profitability: {
      contributionProfit: accountProfit,
      profitSource,
      coveredSpend: round(coveredSpend),
      coveragePercent: analytics.total.spend > 0 ? round((coveredSpend / analytics.total.spend) * 100, 1) : null,
      estimatedRevenue: round(estimatedRevenue || analytics.total.revenue),
      unmappedSpend,
    },
    warnings: uniqueWarnings,
  };
}

function buildLiveSnapshot(analytics, setting, { capturedAt = new Date().toISOString(), reportDate = todayDate() } = {}) {
  const assessed = assessPeriod(analytics, setting);
  const total = assessed.total || {};
  const costPer = (value) => number(value) > 0 ? round(number(total.spend) / number(value)) : null;
  return {
    accountId: setting.accountId,
    accountName: setting.accountName,
    currency: assessed.currency || setting.currency || "MYR",
    reportDate,
    capturedAt,
    spend: round(total.spend),
    profit: assessed.profitability?.contributionProfit ?? null,
    profitSource: assessed.profitability?.profitSource || "unavailable",
    primary: {
      purchases: round(total.purchases),
      costPerPurchase: costPer(total.purchases),
      leads: round(total.leads),
      costPerLead: costPer(total.leads),
      conversations: round(total.messaging),
      costPerConversation: costPer(total.messaging),
    },
    secondary: {
      revenue: round(total.revenue),
      roas: total.roas == null ? null : round(total.roas),
      impressions: round(total.impressions),
      reach: round(total.reach),
      frequency: total.frequency == null ? null : round(total.frequency),
      clicks: round(total.clicks),
      linkClicks: round(total.linkClicks),
      ctr: total.ctr == null ? null : round(total.ctr),
      cpc: total.cpc == null ? null : round(total.cpc),
      cpm: total.cpm == null ? null : round(total.cpm),
    },
    campaigns: assessed.campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      category: campaign.category,
      spend: round(campaign.spend),
      purchases: round(campaign.purchases),
      leads: round(campaign.leads),
      conversations: round(campaign.messaging),
      impressions: round(campaign.impressions),
      reach: round(campaign.reach),
      clicks: round(campaign.clicks),
      linkClicks: round(campaign.linkClicks),
      ctr: campaign.ctr == null ? null : round(campaign.ctr),
      cpc: campaign.cpc == null ? null : round(campaign.cpc),
      cpm: campaign.cpm == null ? null : round(campaign.cpm),
      frequency: campaign.frequency == null ? null : round(campaign.frequency),
    })),
    productBreakdown: assessed.productBreakdown,
    warnings: assessed.warnings || [],
  };
}

function metricComparison(current, previous) {
  const currentResults = number(current.total.purchases);
  const previousResults = number(previous.total.purchases);
  return [
    { metric: "Spend", current: current.total.spend, previous: previous.total.spend, differencePercent: pctChange(current.total.spend, previous.total.spend), format: "money" },
    { metric: "Revenue", current: current.total.revenue, previous: previous.total.revenue, differencePercent: pctChange(current.total.revenue, previous.total.revenue), format: "money" },
    { metric: "Purchases", current: currentResults, previous: previousResults, differencePercent: pctChange(currentResults, previousResults), format: "number" },
    { metric: "Cost / Purchase", current: currentResults > 0 ? round(current.total.spend / currentResults) : null, previous: previousResults > 0 ? round(previous.total.spend / previousResults) : null, differencePercent: pctChange(currentResults > 0 ? current.total.spend / currentResults : 0, previousResults > 0 ? previous.total.spend / previousResults : 0), format: "money" },
    { metric: "ROAS", current: current.total.roas, previous: previous.total.roas, differencePercent: pctChange(current.total.roas, previous.total.roas), format: "decimal" },
    { metric: "CTR", current: current.total.ctr, previous: previous.total.ctr, differencePercent: pctChange(current.total.ctr, previous.total.ctr), format: "percent" },
    { metric: "CPC", current: current.total.cpc, previous: previous.total.cpc, differencePercent: pctChange(current.total.cpc, previous.total.cpc), format: "money" },
  ];
}

function diagnose(yesterday, current, previous, setting) {
  const currency = setting.currency;
  const warnings = [...new Set([...(yesterday.warnings || []), ...(current.warnings || [])])];
  const yesterdayLoss = yesterday.profitability.contributionProfit;
  const leaks = current.campaigns.filter((item) => item.spend > 0 && (item.profitStatus === "loss" || item.primaryResults <= 0)).sort((a, b) => (a.profit ?? -a.spend) - (b.profit ?? -b.spend));
  const winners = current.campaigns.filter((item) => item.profitStatus === "profitable").sort((a, b) => b.profit - a.profit);
  const bestAds = current.ads.filter((ad) => ad.spend > 0).map((ad) => {
    const rule = matchingRule(ad.campaignName, setting.productRules);
    return { ...ad, product: rule?.name || "Other / Unmapped", primaryMetric: rule?.primaryMetric || "", primaryResults: rule ? primaryResults(ad, rule.primaryMetric) : 0, primaryCpa: rule && primaryResults(ad, rule.primaryMetric) > 0 ? round(ad.spend / primaryResults(ad, rule.primaryMetric)) : null };
  }).sort((a, b) => (b.primaryResults > 0) - (a.primaryResults > 0) || (a.primaryCpa ?? Infinity) - (b.primaryCpa ?? Infinity) || b.spend - a.spend);
  const summary = [];
  if (yesterday.total.spend <= 0) summary.push("Semalam tiada spend direkodkan; tiada keputusan profit boleh dibuat.");
  else if (yesterdayLoss != null) summary.push(`Semalam ${yesterdayLoss >= 0 ? "anggaran untung" : "anggaran rugi"} ${money(Math.abs(yesterdayLoss), currency)} pada spend ${money(yesterday.total.spend, currency)}.`);
  else summary.push(`Semalam spend ${money(yesterday.total.spend, currency)}, tetapi profit belum boleh disahkan kerana product rule atau revenue belum lengkap.`);
  const spendDelta = pctChange(current.total.spend, previous.total.spend);
  if (spendDelta != null) summary.push(`Spend 7 hari ${spendDelta >= 0 ? "naik" : "turun"} ${Math.abs(spendDelta)}% berbanding tempoh sebelumnya.`);
  if (winners[0]) summary.push(`${winners[0].name} ialah campaign terkuat dengan anggaran profit ${money(winners[0].profit, currency)}.`);
  if (leaks[0]) summary.push(`${leaks[0].name} ialah kebocoran utama: ${money(leaks[0].spend, currency)} spend${leaks[0].primaryResults ? ` pada CPA ${money(leaks[0].primaryCpa, currency)}` : " tanpa primary result"}.`);
  if (warnings.length) summary.push(`${warnings.length} data/tracking warning perlu disemak sebelum scaling.`);
  const confirmedEvidence = [
    `Semalam: ${money(yesterday.total.spend, currency)} spend, ${yesterday.total.purchases} purchases, ${yesterday.total.leads} leads dan ${yesterday.total.messaging} conversations.`,
    ...leaks.slice(0, 2).map((item) => `${item.name}: ${money(item.spend, currency)} spend, ${item.primaryResults} ${item.primaryMetric || "primary results"}.`),
  ];
  const hypotheses = [];
  if (current.total.ctr > 0 && previous.total.ctr > 0 && current.total.ctr < previous.total.ctr * 0.8) hypotheses.push("Creative response mungkin melemah kerana CTR turun lebih 20%.");
  if (leaks.some((item) => item.primaryResults <= 0 && item.clicks > 0)) hypotheses.push("Traffic masuk tetapi tidak menukar kepada primary result; offer, landing page atau checkout perlu diperiksa.");
  if (warnings.some((item) => /value|revenue|tracking|unmapped/i.test(item))) hypotheses.push("Tracking atau product mapping mungkin memesongkan bacaan profit account.");
  if (!hypotheses.length) hypotheses.push("Belum ada bukti cukup untuk menyalahkan audience atau creative; pantau kestabilan beberapa hari.");
  const doNow = [];
  if (warnings.some((item) => /value|revenue|tracking/i.test(item))) doNow.push("Sahkan purchase value dan order sebenar sebelum menambah budget.");
  if (leaks[0]) doNow.push(`Semak “${leaks[0].name}” sebagai kebocoran utama; jangan tambah budget sehingga kembali dalam allowable CPA.`);
  if (!doNow.length) doNow.push("Kekalkan struktur hari ini dan semak result selepas attribution matang.");
  const monitor = winners[0] ? [`Lindungi “${winners[0].name}”; pantau CPA, frequency dan profit tanpa mengedit creative winner.`] : ["Pantau campaign berbelanja tertinggi selama 24–48 jam sebelum keputusan pause."];
  const testNext = [leaks[0] ? `Uji dua variasi angle baharu untuk “${leaks[0].name}”: proof/hasil pelanggan dan objection-handling.` : "Uji dua variasi creative: pain-led dan proof-led dengan offer serta CTA yang sama."];
  const doNotTouch = winners[0] ? [`Jangan edit atau scale “${winners[0].name}” sehingga prestasi stabil sekurang-kurangnya beberapa hari.`] : ["Jangan scale berdasarkan satu purchase atau satu hari sahaja."];
  return {
    executiveSummary: summary.slice(0, 5),
    scorecard: metricComparison(current, previous),
    working: { campaigns: winners.slice(0, 3), ads: bestAds.filter((item) => item.primaryResults > 0).slice(0, 3) },
    leaks: { campaigns: leaks.slice(0, 3), ads: bestAds.filter((item) => item.primaryResults <= 0).sort((a, b) => b.spend - a.spend).slice(0, 3) },
    confirmedEvidence: confirmedEvidence.slice(0, 5),
    hypotheses: hypotheses.slice(0, 4),
    actions: { doNow: doNow.slice(0, 3), monitor, testNext, doNotTouch },
    warnings,
  };
}

async function listAccountsWithSettings() {
  const [live, stored] = await Promise.all([listAdflowAdAccounts(), listPersonalAdsAccounts()]);
  const storedById = new Map(stored.map((item) => [cleanText(item.account_id), item]));
  return live.map((account) => normalizeAccountSetting({ ...storedById.get(account.id), accountId: account.id, accountName: account.name, currency: account.currency }));
}

async function saveAccountSettings(input = {}) {
  const normalized = normalizeAccountSetting(input);
  if (!normalized.accountId) throw new Error("Pilih Ads account dahulu.");
  return normalizeAccountSetting(await savePersonalAdsAccount(normalized));
}

async function getPersonalAdsLiveSnapshot(accountInput, { now = new Date() } = {}) {
  const setting = normalizeAccountSetting(accountInput?.account_id ? accountInput : (await getPersonalAdsAccount(accountInput)) || { accountId: accountInput });
  if (!setting.accountId) throw new Error("Ads account belum dikonfigurasi.");
  const reportDate = todayDate(now);
  const config = {
    accountId: setting.accountId,
    accountName: setting.accountName,
    currency: setting.currency,
    resultMetric: "conversions",
    prospectingKeywords: setting.prospectingKeywords,
    retargetingKeywords: setting.retargetingKeywords,
  };
  const analytics = await fetchAdflowRange(config, reportDate, reportDate, { full: true });
  return buildLiveSnapshot(analytics, setting, { capturedAt: now.toISOString(), reportDate });
}

async function generatePersonalAdsReport(accountInput, reportDate, { retry = false } = {}) {
  const setting = normalizeAccountSetting(accountInput?.account_id ? accountInput : (await getPersonalAdsAccount(accountInput)) || { accountId: accountInput });
  if (!setting.accountId) throw new Error("Ads account belum dikonfigurasi.");
  const existing = await getPersonalAdsReport(setting.accountId, reportDate);
  if (existing?.status === "ready") return existing;
  if (existing?.status === "processing" && !retry) return existing;
  await savePersonalAdsReport({ accountId: setting.accountId, reportDate, status: "processing" });
  try {
    const config = { accountId: setting.accountId, accountName: setting.accountName, currency: setting.currency, resultMetric: "conversions", prospectingKeywords: setting.prospectingKeywords, retargetingKeywords: setting.retargetingKeywords };
    const currentStart = shiftDate(reportDate, -6);
    const comparisonEnd = shiftDate(currentStart, -1);
    const comparisonStart = shiftDate(comparisonEnd, -6);
    const [yesterdayRaw, currentRaw, comparisonRaw] = await Promise.all([
      fetchAdflowRange(config, reportDate, reportDate, { full: true }),
      fetchAdflowRange(config, currentStart, reportDate, { full: true }),
      fetchAdflowRange(config, comparisonStart, comparisonEnd, { full: false }),
    ]);
    if (!yesterdayRaw.total.spend && !yesterdayRaw.campaigns.length) throw new Error("AdFlow tidak memulangkan insights semalam; report tidak dijana sebagai angka sifar.");
    const yesterday = assessPeriod(yesterdayRaw, setting);
    const currentPeriod = assessPeriod(currentRaw, setting);
    const comparisonPeriod = assessPeriod(comparisonRaw, setting);
    const diagnosis = diagnose(yesterday, currentPeriod, comparisonPeriod, setting);
    return await savePersonalAdsReport({ accountId: setting.accountId, reportDate, status: "ready", yesterday, currentPeriod, comparisonPeriod, diagnosis });
  } catch (error) {
    await savePersonalAdsReport({ accountId: setting.accountId, reportDate, status: "failed", error: error?.message || String(error) });
    throw error;
  }
}

function reportDateLabel(reportDate) {
  return new Intl.DateTimeFormat("ms-MY", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${reportDate}T12:00:00+08:00`));
}

async function runPersonalAdsReports({ now = new Date() } = {}) {
  const reportDate = yesterdayDate(now);
  const previousRun = await getPersonalAdsReportRun(reportDate);
  const accounts = await listEnabledPersonalAdsAccounts();
  if (previousRun?.push_sent_at && previousRun.selected_count === accounts.length) return { duplicate: true, reportDate, ...previousRun };
  const startedAt = previousRun?.started_at || new Date().toISOString();
  await savePersonalAdsReportRun({ reportDate, status: "processing", selectedCount: accounts.length, startedAt, pushSentAt: previousRun?.push_sent_at, pushResult: previousRun?.push_result || {} });
  let readyCount = 0;
  let failedCount = 0;
  const failures = [];
  for (const account of accounts) {
    try {
      const result = await generatePersonalAdsReport(account, reportDate, { retry: true });
      if (result?.status === "ready") readyCount += 1;
      else failedCount += 1;
    } catch (error) {
      failedCount += 1;
      failures.push({ accountId: account.account_id, name: account.account_name, error: error?.message || String(error) });
    }
  }
  const status = failedCount ? (readyCount ? "partial" : "failed") : "ready";
  const completedAt = new Date().toISOString();
  let pushSentAt = previousRun?.push_sent_at || null;
  let pushResult = previousRun?.push_result || {};
  if (accounts.length && !pushSentAt) {
    try {
      pushResult = await sendPushPayload({
        title: `Ads CMO Report Siap — ${reportDateLabel(reportDate)}`,
        body: `${readyCount} report siap${failedCount ? ` · ${failedCount} akaun perlukan perhatian` : ""}. Tekan untuk buka ringkasan pagi.`,
        icon: "/icons/app-icon-192x192.png",
        badge: "/icons/app-icon-96x96.png",
        tag: `ads-cmo-${reportDate}`,
        url: `/?tab=adscmo&reportDate=${reportDate}`,
      });
      pushSentAt = new Date().toISOString();
    } catch (error) {
      pushResult = { error: error?.message || String(error) };
    }
  }
  const run = await savePersonalAdsReportRun({ reportDate, status, selectedCount: accounts.length, readyCount, failedCount, pushSentAt, pushResult, error: failures.map((item) => `${item.name}: ${item.error}`).join(" | "), startedAt, completedAt });
  return { reportDate, readyCount, failedCount, failures, push: pushResult, run };
}

module.exports = {
  assessPeriod,
  buildLiveSnapshot,
  buildProductBreakdown,
  diagnose,
  generatePersonalAdsReport,
  getPersonalAdsLiveSnapshot,
  listAccountsWithSettings,
  listPersonalAdsReportDates,
  normalizeAccountSetting,
  normalizeProductRule,
  reportDateLabel,
  runPersonalAdsReports,
  saveAccountSettings,
  todayDate,
  yesterdayDate,
};
