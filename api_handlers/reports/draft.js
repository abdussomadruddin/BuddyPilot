const { requireAuth } = require("../../lib/auth");
const { getMergedClientsWithStatus } = require("../../lib/invoices");
const { readJsonBody } = require("../../lib/postpilot");
const {
  buildReportDraft,
  fetchMetaCustomReport,
  normalizeAdsReportConfig,
  validateCustomWeek,
} = require("../../lib/meta-ads");
const { fetchTikTokCustomReport } = require("../../lib/tiktok-ads");
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
    const config = normalizeAdsReportConfig({
      ...(client.metadata?.adsReportConfig || {}),
      platform: body.platform,
      accountId: body.accountId,
      accountName: body.accountName,
      currency: body.currency,
      resultMetric: body.resultMetric,
    });
    serviceName = config.platform === "tiktok" ? "tiktok" : "meta_mcp";
    fetchStarted = true;
    const analytics = config.platform === "tiktok"
      ? await fetchTikTokCustomReport(config, startDate, endDate)
      : await fetchMetaCustomReport(config, startDate, endDate);
    const draft = buildReportDraft(analytics, config);
    await reportOperationalSuccess({ fingerprint: `${serviceName}:report:${clientCode}`, serviceName, detail: `${config.platform === "tiktok" ? "TikTok MCP" : "Meta MCP"} report data berjaya dimuatkan.`, metadata: { clientCode } });
    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      clientCode,
      account: { id: config.accountId, name: config.accountName || config.accountId, platform: config.platform },
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
        title: `${serviceName === "tiktok" ? "TikTok" : "Meta"} report data gagal`,
        detail: error?.message || String(error),
        action: { kind: "navigate", label: "Open Report Pilot", tab: "reportpilot" },
      });
    }
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
