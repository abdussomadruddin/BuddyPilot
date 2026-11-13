const { requireAuth } = require("../../lib/auth");
const { getMergedClientsWithStatus } = require("../../lib/invoices");
const { readJsonBody } = require("../../lib/http-body");
const {
  fetchMetaCustomReport,
  normalizeAdsReportConfig,
  validateCustomWeek,
} = require("../../lib/meta-ads");
const { fetchTikTokCustomReport } = require("../../lib/tiktok-ads");
const { buildCombinedDraft, fetchCombined, platformLabel } = require("../../lib/combined-ads");
const { reportOperationalFailure, reportOperationalSuccess } = require("../../lib/operations-events");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
    return;
  }
  let fetchStarted = false;
  let serviceName = "";
  let targetClientCode = "";
  try {
    requireAuth(req);
    const body = await readJsonBody(req);
    const clientCode = String(body.clientCode || "").trim().toUpperCase();
    targetClientCode = clientCode;
    const { startDate, endDate } = validateCustomWeek(String(body.startDate || ""), String(body.endDate || ""));
    const { clients } = await getMergedClientsWithStatus();
    const client = clients.find((item) => item.code === clientCode && item.serviceStatus !== "paused" && item.onboardingStatus !== "in_progress" && !item.deletedAt);
    if (!client) throw new Error(`Client ${clientCode} tidak dijumpai atau tidak aktif.`);
    // The form sends the Meta and TikTok accounts chosen for this report; an
    // empty id leaves that platform out.
    const config = normalizeAdsReportConfig({
      ...(client.metadata?.adsReportConfig || {}),
      metaAccountId: body.metaAccountId,
      metaAccountName: body.metaAccountName,
      metaCurrency: body.metaCurrency,
      tiktokAccountId: body.tiktokAccountId,
      tiktokAccountName: body.tiktokAccountName,
      tiktokCurrency: body.tiktokCurrency,
      resultMetric: body.resultMetric,
    });
    if (!config.accounts.length) throw new Error("Pilih akaun Meta Ads atau TikTok Ads dahulu.");
    serviceName = config.accounts.length > 1 ? "ads_report" : config.platform === "tiktok" ? "tiktok" : "meta_mcp";
    fetchStarted = true;
    const analytics = await fetchCombined(config, { meta: fetchMetaCustomReport, tiktok: fetchTikTokCustomReport }, [startDate, endDate]);
    const draft = buildCombinedDraft(analytics, config);
    const label = config.accounts.map((account) => platformLabel(account.platform)).join(" + ");
    await reportOperationalSuccess({ fingerprint: `${serviceName}:report:${clientCode}`, serviceName, detail: `${label} report data berjaya dimuatkan.`, metadata: { clientCode } });
    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      clientCode,
      account: { id: config.accountId, name: config.accounts.map((account) => `${platformLabel(account.platform)}: ${account.accountName || account.accountId}`).join(" · "), platform: analytics.platform === "combined" ? "combined" : config.platform },
      startDate,
      endDate,
      analytics,
      draft,
    }));
  } catch (error) {
    if (fetchStarted && serviceName) {
      await reportOperationalFailure({
        fingerprint: `${serviceName}:report:${targetClientCode}`,
        serviceName,
        entityType: "client",
        entityId: targetClientCode,
        clientCode: targetClientCode,
        title: `${serviceName === "tiktok" ? "TikTok" : serviceName === "ads_report" ? "Meta + TikTok" : "Meta"} report data gagal`,
        detail: error?.message || String(error),
        action: { kind: "navigate", label: "Open Report Pilot", tab: "reportpilot" },
      });
    }
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
