const { requireAuth } = require("../../lib/auth");
const { readJsonBody } = require("../../lib/postpilot");
const { generatePersonalAdsReport, yesterdayDate } = require("../../lib/personal-ads-cmo");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  if (req.method !== "POST") { res.statusCode = 405; res.end(JSON.stringify({ ok: false, error: "Method not allowed." })); return; }
  try {
    requireAuth(req);
    const body = await readJsonBody(req);
    const reportDate = String(body.reportDate || yesterdayDate());
    const report = await generatePersonalAdsReport(String(body.accountId || ""), reportDate, { retry: true });
    res.end(JSON.stringify({ ok: true, report }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
