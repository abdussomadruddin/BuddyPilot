const { requireAuth } = require("../../lib/auth");
const { loadMonthlySummary } = require("../../lib/monthly-summary");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
    return;
  }
  try {
    requireAuth(req);
    res.end(JSON.stringify({ ok: true, ...await loadMonthlySummary() }));
  } catch (error) {
    res.statusCode = error.statusCode || 500;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
