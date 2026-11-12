const { requireAuth } = require("../../lib/auth");
const { readJsonBody } = require("../../lib/http-body");
const { hasAlerts, normalizeAlerts } = require("../../lib/ads-alerts");
const { saveClientMetadataKey, resolveOperationsIncidents } = require("../../lib/supabase-db");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  try {
    requireAuth(req);
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
      return;
    }
    const body = await readJsonBody(req);
    const clientCode = String(body.clientCode || "").trim().toUpperCase();
    if (!/^[A-Z0-9-]{1,40}$/.test(clientCode)) throw Object.assign(new Error("Client code tidak sah."), { statusCode: 400 });
    const alerts = normalizeAlerts(body.alerts || {});
    await saveClientMetadataKey(clientCode, "adsAlerts", alerts);
    // A removed limit should not leave its old alert open.
    const cleared = [["maxCostPerResult", "cost_per_result"], ["minRoas", "roas"], ["maxDailySpend", "spend"]]
      .filter(([key]) => alerts[key] == null)
      .map(([, metric]) => `ads-alert:${clientCode}:${metric}`);
    if (cleared.length) await resolveOperationsIncidents(cleared);
    res.end(JSON.stringify({ ok: true, clientCode, alerts, active: hasAlerts(alerts) }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
