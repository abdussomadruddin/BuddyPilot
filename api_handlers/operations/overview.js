const { requireAuth } = require("../../lib/auth");
const { getOperationsOverview } = require("../../lib/operations-center");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
    return;
  }
  try {
    requireAuth(req);
    res.setHeader("cache-control", "private, max-age=0, must-revalidate");
    res.end(JSON.stringify({ ok: true, overview: await getOperationsOverview() }));
  } catch (error) {
    res.statusCode = error.statusCode || 500;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
