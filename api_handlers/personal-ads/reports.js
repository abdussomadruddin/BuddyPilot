const { requireAuth } = require("../../lib/auth");
const { getPersonalAdsAccount, getPersonalAdsReport, listPersonalAdsReportDates } = require("../../lib/supabase-db");
const { recalculateStoredReport } = require("../../lib/personal-ads-cmo");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  if (req.method !== "GET") { res.statusCode = 405; res.end(JSON.stringify({ ok: false, error: "Method not allowed." })); return; }
  try {
    requireAuth(req);
    const url = new URL(req.url || "/", "http://localhost");
    const accountId = String(url.searchParams.get("accountId") || "").replace(/^act_/, "");
    const reportDate = String(url.searchParams.get("reportDate") || "");
    if (!accountId) throw new Error("Pilih Ads account dahulu.");
    const [storedReport, dates, account] = await Promise.all([
      reportDate ? getPersonalAdsReport(accountId, reportDate) : Promise.resolve(null),
      listPersonalAdsReportDates(accountId),
      getPersonalAdsAccount(accountId),
    ]);
    const report = storedReport?.status === "ready" ? recalculateStoredReport(storedReport, account || { accountId }) : storedReport;
    res.end(JSON.stringify({ ok: true, report, dates }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
