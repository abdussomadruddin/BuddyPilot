const { requireAuth } = require("../../lib/auth");
const { getMergedClientsWithStatus } = require("../../lib/invoices");
const { getRemoteOverview } = require("../../lib/postpilot-remote");
const { listActivity } = require("../../lib/supabase-db");
const { tikTokConnectionStatus } = require("../../lib/tiktok-ads");
const { buildTodayDashboard } = require("../../lib/today-dashboard");

async function settledValue(promise, fallback, warnings, label) {
  try {
    return await promise;
  } catch (error) {
    warnings.push(`${label}: ${error?.message || error}`);
    return fallback;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
    return;
  }
  try {
    requireAuth(req);
    const warnings = [];
    const [clientResult, remote, tiktok, activities] = await Promise.all([
      settledValue(getMergedClientsWithStatus(), { clients: [] }, warnings, "Pelanggan"),
      settledValue(getRemoteOverview(), {}, warnings, "Automation"),
      settledValue(tikTokConnectionStatus(), {}, warnings, "TikTok"),
      settledValue(listActivity(50), [], warnings, "Activity"),
    ]);
    res.end(JSON.stringify({ ok: true, dashboard: buildTodayDashboard({ clients: clientResult.clients, remote, tiktok, activities }), warnings }));
  } catch (error) {
    res.statusCode = error.statusCode || 500;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
