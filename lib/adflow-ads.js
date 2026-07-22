const ADFLOW_MCP_URL = "https://adflowapps.com/api/mcp";
const DATE_PRESETS = new Set(["yesterday", "last_7d", "last_14d", "last_30d", "this_month", "last_month"]);
const { withTransientRetry } = require("./retry-policy");

function cleanText(value) {
  return String(value || "").trim();
}

function numeric(value) {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(numeric(value) * factor) / factor;
}

function keywordList(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(/[\n,]/);
  return [...new Set(values.map((item) => cleanText(item).toLowerCase()).filter(Boolean))];
}

function normalizeAdsReportConfig(value = {}) {
  const source = value.adsReportConfig || value;
  const platform = cleanText(source.platform).toLowerCase() === "tiktok" ? "tiktok" : "meta";
  const resultMetric = ["conversions", "leads", "messaging_conversations"].includes(source.resultMetric) ? source.resultMetric : "conversions";
  return {
    platform,
    accountId: cleanText(source.accountId || source.adAccountId),
    accountName: cleanText(source.accountName || source.adAccountName),
    currency: cleanText(source.currency || "MYR").toUpperCase(),
    resultMetric,
    resultLabel: resultMetric === "messaging_conversations" ? "Messaging Conversations" : resultMetric === "leads" ? "Leads" : "Purchases",
    prospectingKeywords: keywordList(source.prospectingKeywords || "prospecting,pros,cold,tof"),
    retargetingKeywords: keywordList(source.retargetingKeywords || "retargeting,retarget,rtg,warm,remarketing"),
  };
}

function requireToken() {
  const token = cleanText(process.env.ADFLOW_MCP_TOKEN);
  if (!token) throw new Error("ADFLOW_MCP_TOKEN belum diset dalam Vercel.");
  return token;
}

function parseToolText(result) {
  const text = result?.result?.content?.find((item) => item.type === "text")?.text;
  if (!text) throw new Error("AdFlow MCP tidak memulangkan data.");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Respons AdFlow MCP tidak dapat dibaca.");
  }
}

function actionValue(actions, actionType) {
  return numeric((actions || []).find((item) => item.action_type === actionType)?.value);
}

async function adflowCall(name, args = {}) {
  return withTransientRetry(async () => {
    const response = await fetch(ADFLOW_MCP_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${requireToken()}`,
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: { name, arguments: args } }),
      signal: AbortSignal.timeout(16000),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || json?.error) {
      const error = new Error(`AdFlow MCP gagal: ${json?.error?.message || `HTTP ${response.status}`}`);
      error.statusCode = response.status;
      throw error;
    }
    const data = parseToolText(json);
    if (/MEMERLUKAN_|AUTOPILOT_BELUM_AKTIF/.test(cleanText(data.status))) {
      throw new Error("Tempoh custom memerlukan AdFlow Autopilot. Gunakan pilihan tempoh standard dalam Report Pilot.");
    }
    return data;
  });
}

async function listAdflowAdAccounts() {
  const data = await adflowCall("list_ad_accounts");
  const accounts = Array.isArray(data) ? data : (data.accounts || []);
  return accounts.map((account) => ({
    id: cleanText(account.account_id || account.id),
    name: cleanText(account.name || account.account_name || account.account_id),
    currency: cleanText(account.currency || "MYR").toUpperCase(),
    autopilot: cleanText(account.autopilot),
  })).filter((account) => account.id).sort((a, b) => a.name.localeCompare(b.name));
}

function formatIso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function presetDateRange(preset, now = new Date()) {
  if (!DATE_PRESETS.has(preset)) throw new Error("Pilihan tempoh AdFlow tidak sah.");
  const current = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
  current.setHours(0, 0, 0, 0);
  let start = new Date(current);
  let end = new Date(current);
  if (preset === "yesterday") {
    start.setDate(start.getDate() - 1);
    end = new Date(start);
  } else if (/^last_(7|14|30)d$/.test(preset)) {
    const days = Number(preset.match(/\d+/)[0]);
    end.setDate(end.getDate() - 1);
    start = new Date(end);
    start.setDate(start.getDate() - days + 1);
  } else if (preset === "last_month") {
    start = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    end = new Date(current.getFullYear(), current.getMonth(), 0);
  } else {
    start = new Date(current.getFullYear(), current.getMonth(), 1);
  }
  return { startDate: formatIso(start), endDate: formatIso(end) };
}

function validateCustomWeek(startDate, endDate, now = new Date()) {
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(cleanText(startDate)) || !pattern.test(cleanText(endDate))) throw new Error("Pilih tarikh mula dan akhir report.");
  const start = new Date(`${startDate}T00:00:00+08:00`);
  const end = new Date(`${endDate}T00:00:00+08:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new Error("Tarikh report tidak sah.");
  const days = Math.round((end - start) / 86400000) + 1;
  if (days !== 7) throw new Error("Report mingguan mesti tepat 7 hari.");
  const yesterday = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
  yesterday.setHours(0, 0, 0, 0);
  yesterday.setDate(yesterday.getDate() - 1);
  if (end > yesterday) throw new Error("Tarikh akhir mesti hari yang sudah lengkap, selewat-lewatnya semalam.");
  return { startDate, endDate };
}

function classifyCampaign(name, config) {
  const lower = cleanText(name).toLowerCase();
  if (config.platform === "tiktok") {
    const stageTokens = lower.split(/[^a-z0-9]+/).filter(Boolean);
    if (stageTokens.includes("top")) return "prospecting";
    if (stageTokens.includes("mid") || stageTokens.includes("bot")) return "retargeting";
  }
  if (config.retargetingKeywords.some((keyword) => lower.includes(keyword))) return "retargeting";
  if (config.prospectingKeywords.some((keyword) => lower.includes(keyword))) return "prospecting";
  return "other";
}

function rowResults(row, config, level) {
  if (config.resultMetric === "messaging_conversations") {
    return numeric(level === "campaign" ? row.messaging_conversations : row.conversations);
  }
  if (config.resultMetric === "leads") return numeric(row.leads);
  return numeric(row.conversions);
}

function metricsFromRow(row, config, level) {
  const spend = round(row.spend);
  const results = round(rowResults(row, config, level));
  const purchases = round(row.conversions);
  const leads = round(row.leads);
  const messaging = round(level === "campaign" ? row.messaging_conversations : row.conversations);
  return {
    spend,
    results,
    purchases,
    leads,
    messaging,
    cpr: results > 0 ? round(spend / results) : null,
    impressions: round(row.impressions),
    clicks: round(row.clicks),
    linkClicks: round(row.link_clicks ?? row.linkClicks),
    ctr: row.ctr == null ? null : round(row.ctr),
    cpc: row.cpc == null ? null : round(row.cpc),
    roas: row.roas == null ? null : round(row.roas),
    reach: round(row.reach),
    frequency: row.frequency == null ? null : round(row.frequency),
    cpm: row.cpm == null ? null : round(row.cpm),
  };
}

function combineMetrics(target, source) {
  target.spend += source.spend;
  target.results += source.results;
  target.impressions += source.impressions;
  target.clicks += source.clicks;
  target.linkClicks += source.linkClicks;
  target.purchases += source.purchases;
  target.leads += source.leads;
  target.messaging += source.messaging;
  target.reach += source.reach;
}

function finishCombined(metrics) {
  const result = Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, round(value)]));
  result.cpr = result.results > 0 ? round(result.spend / result.results) : null;
  result.ctr = result.impressions > 0 ? round((result.clicks / result.impressions) * 100) : null;
  result.cpc = result.clicks > 0 ? round(result.spend / result.clicks) : null;
  result.cpm = result.impressions > 0 ? round((result.spend / result.impressions) * 1000) : null;
  result.frequency = result.reach > 0 ? round(result.impressions / result.reach) : null;
  return result;
}

function aggregateAdflowData({ insights = {}, campaigns = [], adsets = [], ads = [] }, configInput = {}) {
  const config = normalizeAdsReportConfig(configInput);
  const categories = {
    prospecting: { spend: 0, results: 0, purchases: 0, leads: 0, messaging: 0, impressions: 0, clicks: 0, linkClicks: 0, reach: 0 },
    retargeting: { spend: 0, results: 0, purchases: 0, leads: 0, messaging: 0, impressions: 0, clicks: 0, linkClicks: 0, reach: 0 },
    other: { spend: 0, results: 0, purchases: 0, leads: 0, messaging: 0, impressions: 0, clicks: 0, linkClicks: 0, reach: 0 },
  };
  const campaignRows = campaigns.map((row) => {
    const category = classifyCampaign(row.name, config);
    const metrics = metricsFromRow(row, config, "campaign");
    combineMetrics(categories[category], metrics);
    return { id: cleanText(row.id), name: cleanText(row.name), status: cleanText(row.status), objective: cleanText(row.objective), category, ...metrics };
  }).sort((a, b) => b.spend - a.spend);
  const adsetRows = adsets.map((row) => ({
    id: cleanText(row.id), name: cleanText(row.name), campaignId: cleanText(row.campaignId), campaignName: cleanText(row.campaignName),
    category: classifyCampaign(row.campaignName || row.name, config), status: cleanText(row.status), ...metricsFromRow(row, config, "adset"),
  })).sort((a, b) => b.spend - a.spend);
  const adRows = ads.map((row) => ({
    id: cleanText(row.id), name: cleanText(row.name), adsetId: cleanText(row.adSetId), adsetName: cleanText(row.adSetName),
    campaignId: cleanText(row.campaignId), campaignName: cleanText(row.campaignName), category: classifyCampaign(row.campaignName || row.name, config),
    status: cleanText(row.status), qualityRanking: cleanText(row.qualityRanking), engagementRanking: cleanText(row.engagementRanking), conversionRanking: cleanText(row.conversionRanking),
    ...metricsFromRow(row, config, "ad"),
  })).sort((a, b) => b.spend - a.spend);

  const totalResults = config.resultMetric === "messaging_conversations"
    ? campaignRows.reduce((sum, row) => sum + row.results, 0)
    : config.resultMetric === "leads" ? numeric(insights.leads) : numeric(insights.conversions);
  const totalSpend = numeric(insights.spend);
  const total = {
    spend: round(totalSpend),
    results: round(totalResults),
    purchases: round(insights.conversions),
    leads: round(insights.leads),
    messaging: round(insights.messaging_conversations ?? insights.conversations),
    cpr: totalResults > 0 ? round(totalSpend / totalResults) : null,
    impressions: round(insights.impressions),
    clicks: round(insights.clicks),
    linkClicks: round(insights.link_clicks ?? insights.linkClicks),
    ctr: insights.ctr == null ? null : round(insights.ctr),
    cpc: insights.cpc == null ? null : round(insights.cpc),
    cpm: insights.cpm == null ? null : round(insights.cpm),
    reach: round(insights.reach),
    frequency: insights.frequency == null ? null : round(insights.frequency),
    roas: insights.roas == null ? null : round(insights.roas),
  };
  const categoryResults = Object.fromEntries(Object.entries(categories).map(([key, value]) => [key, finishCombined(value)]));
  const warnings = [];
  if (!campaignRows.length) warnings.push("AdFlow tidak memulangkan kempen untuk tempoh ini.");
  if (categoryResults.other.spend > 0) warnings.push("Ada spend dalam Other / Unmapped. Semak keyword kategori client.");
  if (config.resultMetric === "conversions" && total.results > 0 && !campaignRows.some((row) => row.results > 0)) {
    warnings.push("AdFlow account insights mempunyai conversions tetapi pecahan campaign tidak lengkap.");
  }
  return { platform: config.platform, currency: cleanText(insights.currency || config.currency || "MYR").toUpperCase(), resultMetric: config.resultMetric, resultLabel: config.resultLabel, total, categories: categoryResults, campaigns: campaignRows, adsets: adsetRows, ads: adRows, warnings };
}

async function fetchAdflowDailyRaw(accountId, reportDate) {
  const targetAccount = cleanText(accountId).replace(/^act_/, "");
  if (!targetAccount) throw new Error("Pilih AdFlow ad account dahulu.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanText(reportDate))) throw new Error("Tarikh daily report tidak sah.");
  const timeRange = JSON.stringify({ since: reportDate, until: reportDate });
  const [accountResult, campaignResult] = await Promise.all([
    adflowCall("meta_api_get", {
      path: `act_${targetAccount}/insights`,
      params: {
        fields: "spend,impressions,clicks,inline_link_clicks,reach,frequency,cpm,cpc,ctr,actions",
        level: "account",
        time_range: timeRange,
        limit: "10",
      },
    }),
    adflowCall("meta_api_get", {
      path: `act_${targetAccount}/insights`,
      params: {
        fields: "campaign_id,campaign_name,spend,impressions,reach,frequency,clicks,inline_link_clicks,cpm,cpc,ctr,actions",
        level: "campaign",
        time_range: timeRange,
        limit: "500",
      },
    }),
  ]);
  return {
    account: accountResult.data?.[0] ? normalizeGraphRow(accountResult.data[0], "account") : null,
    campaigns: (campaignResult.data || []).map((row) => normalizeGraphRow(row, "campaign")),
  };
}

function aggregateAdflowDailyRaw(raw, configInput = {}) {
  const config = normalizeAdsReportConfig(configInput);
  const account = raw?.account || {};
  const analytics = aggregateAdflowData({
    insights: { ...account, currency: config.currency },
    campaigns: raw?.campaigns || [],
  }, config);
  if (!raw?.account && !(raw?.campaigns || []).length) {
    analytics.warnings.unshift("AdFlow tidak memulangkan insights untuk tarikh ini.");
  }
  return analytics;
}

function money(value, currency) {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: currency || "MYR", maximumFractionDigits: 2 }).format(numeric(value));
}

function costResultText(value, currency, resultLabel) {
  if (value == null) return "N/A";
  if (resultLabel === "Leads") return `CPL ${money(value, currency)}`;
  if (resultLabel === "Messaging Conversations") return `${money(value, currency)} per conversation`;
  return `${money(value, currency)} per result`;
}

function metricLine(label, metrics, currency, resultLabel) {
  return `${label}: ${money(metrics.spend, currency)} spend | ${metrics.results} ${resultLabel.toLowerCase()} | ${costResultText(metrics.cpr, currency, resultLabel)}`;
}

function deliveryMetricLine(label, metrics, currency) {
  return `${label}: ${money(metrics.spend, currency)} spend | ${metrics.impressions} impressions | ${metrics.clicks} clicks | ${metrics.cpm == null ? "N/A CPM" : `${money(metrics.cpm, currency)} CPM`} | ${metrics.cpc == null ? "N/A CPC" : `${money(metrics.cpc, currency)} CPC`} | ${metrics.frequency == null ? "N/A frequency" : `${metrics.frequency} frequency`}`;
}

function separatesTikTokLeadFunnel(config) {
  return config.platform === "tiktok" && config.resultMetric === "leads";
}

function selectBestAd(ads, category, currency, resultLabel) {
  const candidates = ads.filter((item) => item.category === category && item.spend > 0);
  const withResults = candidates.filter((item) => item.results > 0 && item.cpr != null).sort((a, b) => a.cpr - b.cpr);
  if (withResults.length) {
    const ad = withResults[0];
    return { ad: ad.name || "N/A", campaignName: ad.campaignName, adsetName: ad.adsetName, performance: `${ad.results} ${resultLabel.toLowerCase()} | ${costResultText(ad.cpr, currency, resultLabel)} | ${money(ad.spend, currency)} spend` };
  }
  const withCpmAndCpc = candidates.filter((item) => item.cpm > 0 && item.cpc > 0).sort((a, b) => a.cpm - b.cpm || a.cpc - b.cpc);
  if (withCpmAndCpc.length) {
    const ad = withCpmAndCpc[0];
    return {
      ad: ad.name || "N/A",
      campaignName: ad.campaignName,
      adsetName: ad.adsetName,
      performance: `${money(ad.cpm, currency)} CPM | ${money(ad.cpc, currency)} CPC | secondary fallback kerana tiada ${resultLabel.toLowerCase()}`,
    };
  }
  const withCpm = candidates.filter((item) => item.cpm > 0).sort((a, b) => a.cpm - b.cpm);
  if (withCpm.length) {
    const ad = withCpm[0];
    return {
      ad: ad.name || "N/A",
      campaignName: ad.campaignName,
      adsetName: ad.adsetName,
      performance: `${money(ad.cpm, currency)} CPM | ${ad.cpc > 0 ? money(ad.cpc, currency) : "N/A"} CPC | secondary fallback kerana tiada ${resultLabel.toLowerCase()}`,
    };
  }
  const withCpc = candidates.filter((item) => item.cpc > 0).sort((a, b) => a.cpc - b.cpc);
  if (withCpc.length) {
    const ad = withCpc[0];
    return { ad: ad.name || "N/A", campaignName: ad.campaignName, adsetName: ad.adsetName, performance: `N/A CPM | ${money(ad.cpc, currency)} CPC | secondary fallback kerana tiada ${resultLabel.toLowerCase()}` };
  }
  return { ad: "N/A", performance: `Tiada data ${category} yang mencukupi.` };
}

function selectBestDeliveryAd(ads, category, currency) {
  const candidates = ads
    .filter((item) => item.category === category && item.spend > 0)
    .map((item) => ({
      ...item,
      deliveryCpc: item.clicks > 0 ? round(item.spend / item.clicks) : null,
    }));
  const withClicks = candidates
    .filter((item) => item.clicks > 0)
    .sort((a, b) => a.deliveryCpc - b.deliveryCpc || b.clicks - a.clicks);
  const ad = withClicks[0] || candidates.sort((a, b) => b.spend - a.spend)[0];
  if (!ad) return { ad: "N/A", performance: "Tiada data retargeting yang mencukupi." };
  return {
    ad: ad.name || "N/A",
    campaignName: ad.campaignName,
    adsetName: ad.adsetName,
    performance: `${ad.clicks} clicks | ${ad.deliveryCpc == null ? "N/A CPC" : `${money(ad.deliveryCpc, currency)} CPC`} | ${money(ad.spend, currency)} spend`,
  };
}

function creativeSignal(name) {
  const signal = cleanText(name)
    .replace(/[_|]+/g, " ")
    .replace(/\s*-\s*/g, " ")
    .replace(/^\d+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
  return signal && signal.toLowerCase() !== "n/a" ? signal : "creative pemenang";
}

function audienceSignal(best, fallback) {
  const adName = cleanText(best.ad).toLowerCase();
  return [best.adsetName, best.campaignName]
    .map(cleanText)
    .find((name) => name && name.toLowerCase() !== adName) || fallback;
}

function conversionMessageAction(resultMetric) {
  if (resultMetric === "leads") return "Untuk tarik lead lebih berkualiti, jelaskan siapa yang sesuai, outcome utama dan CTA untuk dihubungi/appointment.";
  if (resultMetric === "messaging_conversations") return "Gunakan CTA perbualan yang jelas: nyatakan masalah, manfaat segera dan sebab pelanggan patut mula chat sekarang.";
  return "Untuk purchase, bina urutan mesej benefit → bukti → offer → urgency dan kekalkan tuntutan hanya yang boleh disahkan.";
}

function buildNextSevenDays(analytics, config, prospectingBest, retargetingBest) {
  const { total, categories, resultLabel, currency } = analytics;
  const actions = [];
  if (total.spend <= 0) {
    actions.push("Sediakan tiga konsep Prospecting untuk pelanggan baharu: pain/problem, desired outcome dan offer/bonus; gunakan satu CTA yang sama supaya angle boleh dibandingkan.");
  } else if (total.results <= 0) {
    const topCampaign = analytics.campaigns.find((item) => item.spend > 0);
    actions.push(`${money(total.spend, currency)} belum menghasilkan ${resultLabel.toLowerCase()}; refresh mesej dalam ${topCampaign?.name || "campaign berbelanja tertinggi"} dengan tiga angle: masalah pelanggan, hasil yang diingini dan bukti/offer.`);
  } else {
    if (prospectingBest.ad !== "N/A") {
      actions.push(`Prospecting: jadikan “${prospectingBest.ad}” sebagai control. Sasarkan profil pelanggan dalam “${audienceSignal(prospectingBest, "cold audience semasa")}” dan hasilkan dua variasi hook daripada angle “${creativeSignal(prospectingBest.ad)}”.`);
    }
    actions.push(`Creative plan: uji satu versi pain-led dan satu versi benefit/proof-led; kekalkan offer serta CTA supaya beza result datang daripada angle, bukan terlalu banyak perubahan serentak.`);
  }
  if (categories.retargeting.spend > 0) {
    if (separatesTikTokLeadFunnel(config)) {
      actions.push(`MID/BOT Retargeting: nilai delivery berasingan melalui CPM, reach, clicks, CPC dan frequency. Jangan gabungkan spend ini dalam CPL TOP.`);
    } else {
      const warmResult = categories.retargeting.results;
      actions.push(`Retargeting: gunakan “${retargetingBest.ad}” sebagai rujukan untuk warm audience dalam “${audienceSignal(retargetingBest, "retargeting semasa")}”. ${warmResult > 0 ? "Bina variasi social proof dan objection-handling daripada angle ini." : "Uji angle bukti, jawapan keraguan dan urgency kerana primary result belum muncul."}`);
    }
  } else {
    actions.push("Sediakan creative warm audience berasaskan social proof, objection-handling dan urgency untuk pelanggan yang sudah melihat atau berinteraksi dengan offer.");
  }
  actions.push(conversionMessageAction(config.resultMetric));
  return actions.slice(0, 5);
}

function buildCmoRecommendation(analytics, config, prospectingBest, retargetingBest) {
  const { total, categories, resultLabel, currency } = analytics;
  const resultName = resultLabel.toLowerCase();
  if (total.spend <= 0) return [
    "Fokus: Cari message-market fit.",
    "Prospecting: Uji pain, desired outcome dan offer.",
    "Retargeting: Guna proof dan objection pelanggan.",
  ].join("\n");
  if (total.results <= 0) {
    const topCampaign = analytics.campaigns.find((item) => item.spend > 0);
    return [
      `Result: ${money(total.spend, currency)} spend | 0 ${resultName}.`,
      `Fokus: Refresh “${topCampaign?.name || "campaign aktif"}”.`,
      "Angle: Uji pain, desired outcome dan proof/offer.",
      "Elakkan: Mengulang hook dan mesej yang sama.",
    ].join("\n");
  }
  if (separatesTikTokLeadFunnel(config)) {
    const top = categories.prospecting;
    const warm = categories.retargeting;
    return [
      `TOP Lead Gen: ${top.results} leads | ${costResultText(top.cpr, currency, resultLabel)} | ${money(top.spend, currency)} spend.`,
      `MID/BOT Traffic WhatsApp: ${money(warm.spend, currency)} spend | ${warm.clicks} clicks | ${warm.cpc == null ? "N/A CPC" : `${money(warm.cpc, currency)} CPC`}.`,
      "Kiraan CPL hanya menggunakan spend dan lead TOP; delivery MID/BOT dinilai berasingan.",
    ].join("\n");
  }
  const prospecting = categories.prospecting;
  const retargeting = categories.retargeting;
  const control = prospectingBest.ad !== "N/A" ? prospectingBest.ad : "Belum ada";
  const warm = retargetingBest.ad !== "N/A" ? retargetingBest.ad : "Belum ada";
  const segmentShort = prospecting.results > 0 && retargeting.results > 0
    ? `${prospecting.cpr <= retargeting.cpr ? "Prospecting" : "Retargeting"} lebih efisien.`
    : prospecting.results > 0 ? "Prospecting menghasilkan result; Retargeting belum terbukti."
      : retargeting.results > 0 ? "Retargeting menghasilkan result; Prospecting perlu angle baharu."
        : "Belum ada segmen yang terbukti.";
  return [
    `Result: ${total.results} ${resultName} | ${costResultText(total.cpr, currency, resultLabel)}.`,
    `Fokus: ${segmentShort}`,
    `Creative: Cold—${control}; Warm—${warm}.`,
    `Angle: Cold—${creativeSignal(control)}, pain + benefit/proof. Warm—proof + objection + urgency.`,
  ].join("\n");
}

function recommendationHeadline(analytics) {
  if (analytics.total.spend <= 0) return "TEST CUSTOMER ANGLES";
  if (analytics.total.results <= 0) return "REFRESH MESSAGE & OFFER";
  if (analytics.total.results < 3) return "EXPAND CREATIVE LEARNING";
  return "BUILD ON WINNING ANGLES";
}

function buildPerformanceLeaks(analytics, prospectingBest, retargetingBest, config) {
  const { total, categories, campaigns, ads, currency, resultLabel } = analytics;
  const resultName = resultLabel.toLowerCase();
  const ideas = [];
  if (total.spend <= 0) {
    return ["Idea: Sediakan tiga angle—pain, desired outcome dan proof/offer. Sebab: belum ada spend atau result untuk mengenal pasti leak campaign minggu ini."];
  }
  const wastedAd = ads
    .filter((item) => item.spend > 0 && item.results <= 0 && (!separatesTikTokLeadFunnel(config) || item.category === "prospecting"))
    .sort((a, b) => b.spend - a.spend)[0];
  if (wastedAd) {
    ideas.push(`Idea: Refresh hook/angle “${wastedAd.name}”. Sebab: ${money(wastedAd.spend, currency)} spend tanpa ${resultName}.`);
  } else if (total.results <= 0) {
    const wastedCampaign = campaigns.find((item) => item.spend > 0);
    ideas.push(`Idea: Uji pain, desired outcome dan proof/offer untuk “${wastedCampaign?.name || "campaign aktif"}”. Sebab: ${money(total.spend, currency)} spend tanpa ${resultName}.`);
  }

  const prospecting = categories.prospecting;
  const retargeting = categories.retargeting;
  if (prospecting.results > 0 && retargeting.results > 0 && prospecting.cpr !== retargeting.cpr) {
    const prospectingWins = prospecting.cpr < retargeting.cpr;
    const winnerName = prospectingWins ? prospectingBest.ad : retargetingBest.ad;
    const weakLabel = prospectingWins ? "Retargeting" : "Prospecting";
    const weakCost = prospectingWins ? retargeting.cpr : prospecting.cpr;
    const strongCost = prospectingWins ? prospecting.cpr : retargeting.cpr;
    ideas.push(`Idea: Adapt angle “${winnerName}” untuk ${weakLabel}. Sebab: cost ${weakLabel} ${costResultText(weakCost, currency, resultLabel)} vs ${costResultText(strongCost, currency, resultLabel)}.`);
  } else if (!separatesTikTokLeadFunnel(config) && retargeting.spend > 0 && retargeting.results <= 0) {
    ideas.push(`Idea: Uji social proof, objection dan urgency untuk Retargeting. Sebab: ${money(retargeting.spend, currency)} spend tanpa primary result.`);
  }

  const weakCampaign = campaigns
    .filter((item) => item.spend > 0 && item.results > 0 && total.cpr != null && item.cpr > total.cpr && (!separatesTikTokLeadFunnel(config) || item.category === "prospecting"))
    .sort((a, b) => b.cpr - a.cpr)[0];
  if (weakCampaign) {
    ideas.push(`Idea: Bina variasi creative baharu untuk “${weakCampaign.name}”. Sebab: cost ${costResultText(weakCampaign.cpr, currency, resultLabel)} vs purata account ${costResultText(total.cpr, currency, resultLabel)}.`);
  }

  if (!ideas.length) {
    const winner = prospectingBest.ad !== "N/A" ? prospectingBest.ad : retargetingBest.ad;
    ideas.push(`Idea: Hasilkan dua variasi daripada “${winner}”. Sebab: tiada leak kos yang jelas; pembelajaran seterusnya perlu datang daripada angle creative.`);
  }
  return ideas.slice(0, 1);
}

function buildReportDraft(analytics, configInput = {}) {
  const config = normalizeAdsReportConfig(configInput);
  const { total, categories, campaigns, ads, currency, resultLabel, warnings } = analytics;
  const separatedTikTokLeadFunnel = separatesTikTokLeadFunnel(config);
  const primary = separatedTikTokLeadFunnel ? categories.prospecting : total;
  const reportingAnalytics = separatedTikTokLeadFunnel ? { ...analytics, total: primary } : analytics;
  const prospectingBest = selectBestAd(ads, "prospecting", currency, resultLabel);
  const retargetingBest = separatedTikTokLeadFunnel
    ? selectBestDeliveryAd(ads, "retargeting", currency)
    : selectBestAd(ads, "retargeting", currency, resultLabel);
  const whatWeProved = separatedTikTokLeadFunnel ? [
    metricLine("TOP - Prospecting Lead Gen", categories.prospecting, currency, resultLabel),
    deliveryMetricLine("MID/BOT - Retargeting Traffic WhatsApp", categories.retargeting, currency),
  ] : [
    metricLine("Total account", total, currency, resultLabel),
    metricLine("Prospecting", categories.prospecting, currency, resultLabel),
    metricLine("Retargeting", categories.retargeting, currency, resultLabel),
  ];
  const leaks = buildPerformanceLeaks(reportingAnalytics, prospectingBest, retargetingBest, config);
  const nextSevenDays = buildNextSevenDays(reportingAnalytics, config, prospectingBest, retargetingBest);
  const recommendation = buildCmoRecommendation(reportingAnalytics, config, prospectingBest, retargetingBest);
  return {
    adSpend: primary.spend,
    leadsGenerated: Math.round(primary.results),
    costPerLead: primary.cpr,
    currency,
    resultLabel,
    whatWeProved: whatWeProved.join("\n"),
    winningCreative: prospectingBest.ad,
    bestPerformance: prospectingBest.performance,
    retargetingWinningCreative: retargetingBest.ad,
    retargetingBestPerformance: retargetingBest.performance,
    bestAudience: "Prospecting / Cold and Retargeting / Warm",
    leadLeaks: leaks.join("\n"),
    next7Days: nextSevenDays.join("\n"),
    recommendation,
    recommendationHeadline: recommendationHeadline(reportingAnalytics),
    warnings,
  };
}

async function fetchAdflowReport(configInput, datePreset) {
  const config = normalizeAdsReportConfig(configInput);
  if (!config.accountId) throw new Error("Pilih AdFlow ad account dahulu.");
  if (!DATE_PRESETS.has(datePreset)) throw new Error("Pilihan tempoh AdFlow tidak sah.");
  const common = { account_id: config.accountId, date_preset: datePreset };
  const [insights, campaignData, adsetData, adData] = await Promise.all([
    adflowCall("get_account_insights", common),
    adflowCall("list_campaigns", { ...common, status: "ALL" }),
    adflowCall("list_adsets", common),
    adflowCall("list_ads", common),
  ]);
  return aggregateAdflowData({ insights, campaigns: campaignData.rows || [], adsets: adsetData.rows || [], ads: adData.rows || [] }, config);
}

function normalizeGraphRow(row, level) {
  const conversions = actionValue(row.actions, "purchase");
  const leads = actionValue(row.actions, "lead");
  const conversations = actionValue(row.actions, "onsite_conversion.messaging_conversation_started_7d");
  const common = {
    spend: numeric(row.spend), impressions: numeric(row.impressions), clicks: numeric(row.clicks),
    link_clicks: numeric(row.inline_link_clicks), ctr: numeric(row.ctr), cpm: numeric(row.cpm), cpc: numeric(row.cpc),
    reach: numeric(row.reach), frequency: numeric(row.frequency), conversions, leads,
  };
  if (level === "account") return {
    ...common, messaging_conversations: conversations,
    roas: numeric(row.purchase_roas?.find((item) => item.action_type === "omni_purchase")?.value),
  };
  if (level === "campaign") return { ...common, id: cleanText(row.campaign_id), name: cleanText(row.campaign_name), messaging_conversations: conversations };
  if (level === "adset") return {
    ...common, id: cleanText(row.adset_id), name: cleanText(row.adset_name), campaignId: cleanText(row.campaign_id),
    campaignName: cleanText(row.campaign_name), conversations,
  };
  return {
    ...common, id: cleanText(row.ad_id), name: cleanText(row.ad_name), adSetId: cleanText(row.adset_id),
    adSetName: cleanText(row.adset_name), campaignId: cleanText(row.campaign_id), campaignName: cleanText(row.campaign_name), conversations,
    qualityRanking: cleanText(row.quality_ranking), engagementRanking: cleanText(row.engagement_rate_ranking), conversionRanking: cleanText(row.conversion_rate_ranking),
  };
}

async function fetchAdflowCustomReport(configInput, startDate, endDate) {
  const config = normalizeAdsReportConfig(configInput);
  if (!config.accountId) throw new Error("Pilih AdFlow ad account dahulu.");
  validateCustomWeek(startDate, endDate);
  const timeRange = JSON.stringify({ since: startDate, until: endDate });
  const definitions = [
    ["account", "spend,impressions,clicks,inline_link_clicks,reach,frequency,cpm,cpc,ctr,actions,purchase_roas"],
    ["campaign", "campaign_id,campaign_name,spend,impressions,reach,frequency,clicks,inline_link_clicks,cpm,cpc,ctr,actions"],
    ["adset", "campaign_id,campaign_name,adset_id,adset_name,spend,impressions,clicks,inline_link_clicks,cpm,cpc,ctr,actions"],
    ["ad", "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,inline_link_clicks,cpm,cpc,ctr,actions,quality_ranking,engagement_rate_ranking,conversion_rate_ranking"],
  ];
  const results = await Promise.all(definitions.map(([level, fields]) => adflowCall("meta_api_get", {
    path: `act_${config.accountId}/insights`, params: { fields, level, time_range: timeRange, limit: "500" },
  })));
  const insights = { ...(results[0].data?.[0] ? normalizeGraphRow(results[0].data[0], "account") : {}), currency: config.currency };
  const normalizedCampaigns = (results[1].data || []).map((row) => normalizeGraphRow(row, "campaign"));
  const analytics = aggregateAdflowData({
    insights,
    campaigns: normalizedCampaigns,
    adsets: (results[2].data || []).map((row) => normalizeGraphRow(row, "adset")),
    ads: (results[3].data || []).map((row) => normalizeGraphRow(row, "ad")),
  }, config);
  const retargetingIds = normalizedCampaigns.filter((row) => classifyCampaign(row.name, config) === "retargeting").map((row) => row.id).filter(Boolean);
  if (retargetingIds.length) {
    try {
      const delivery = await adflowCall("meta_api_get", {
        path: `act_${config.accountId}/insights`,
        params: {
          fields: "spend,impressions,reach,frequency,cpm,clicks,cpc",
          level: "account",
          time_range: timeRange,
          filtering: JSON.stringify([{ field: "campaign.id", operator: "IN", value: retargetingIds }]),
          limit: "10",
        },
      });
      const row = delivery.data?.[0];
      if (row) {
        analytics.categories.retargeting.spend = round(row.spend);
        analytics.categories.retargeting.impressions = round(row.impressions);
        analytics.categories.retargeting.reach = round(row.reach);
        analytics.categories.retargeting.frequency = row.frequency == null ? null : round(row.frequency);
        analytics.categories.retargeting.cpm = row.cpm == null ? null : round(row.cpm);
        analytics.categories.retargeting.clicks = round(row.clicks);
        analytics.categories.retargeting.cpc = row.cpc == null ? null : round(row.cpc);
      }
    } catch {
      analytics.warnings.push("Reach dan frequency retargeting ialah jumlah campaign kerana agregat tepat tidak tersedia.");
    }
  }
  return analytics;
}

module.exports = {
  DATE_PRESETS,
  aggregateAdflowData,
  aggregateAdflowDailyRaw,
  buildReportDraft,
  fetchAdflowCustomReport,
  fetchAdflowDailyRaw,
  fetchAdflowReport,
  listAdflowAdAccounts,
  normalizeAdsReportConfig,
  presetDateRange,
  validateCustomWeek,
};
