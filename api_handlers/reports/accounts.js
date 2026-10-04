const { requireAuth } = require("../../lib/auth");
const { listMetaAdAccounts } = require("../../lib/meta-ads");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
    return;
  }
  try {
    requireAuth(req);
    const accounts = await listMetaAdAccounts();
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, accounts, count: accounts.length }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
