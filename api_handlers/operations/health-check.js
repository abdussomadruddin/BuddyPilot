const { requireAuth } = require("../../lib/auth");
const { getOperationsOverview, runHealthChecks, SERVICE_DEFINITIONS } = require("../../lib/operations-center");
const { readJsonBody } = require("../../lib/postpilot");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
    return;
  }
  try {
    requireAuth(req);
    const body = await readJsonBody(req);
    const requested = String(body.service || "").trim();
    if (requested && !SERVICE_DEFINITIONS.some((item) => item.id === requested)) throw new Error("Health service tidak sah.");
    const checks = await runHealthChecks(requested ? [requested] : []);
    res.end(JSON.stringify({ ok: true, checks, overview: await getOperationsOverview() }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
