const { requireAuth } = require("../../lib/auth");
const { readJsonBody } = require("../../lib/postpilot");
const { getOperationsOverview } = require("../../lib/operations-center");
const { dismissOperationsIncident } = require("../../lib/supabase-db");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
  }
  try {
    requireAuth(req);
    const body = await readJsonBody(req);
    const requested = body.fingerprints;
    if (!Array.isArray(requested) || !requested.length || requested.length > 100 || requested.some((value) => typeof value !== "string")) {
      throw new Error("Senarai incident tidak sah.");
    }
    const overview = await getOperationsOverview();
    const selected = new Set(requested);
    const items = overview.incidents.filter((item) => selected.has(item.fingerprint));
    for (const item of items) await dismissOperationsIncident(item);
    res.end(JSON.stringify({ ok: true, dismissed: items.length, overview: await getOperationsOverview() }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
