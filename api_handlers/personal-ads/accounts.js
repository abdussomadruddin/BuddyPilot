const { requireAuth } = require("../../lib/auth");
const { listAccountsWithSettings, yesterdayDate } = require("../../lib/personal-ads-cmo");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  if (req.method !== "GET") { res.statusCode = 405; res.end(JSON.stringify({ ok: false, error: "Method not allowed." })); return; }
  try {
    requireAuth(req);
    const accounts = await listAccountsWithSettings();
    res.end(JSON.stringify({ ok: true, accounts, defaultReportDate: yesterdayDate() }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
