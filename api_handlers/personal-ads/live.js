const { requireAuth } = require("../../lib/auth");
const { getPersonalAdsLiveSnapshot } = require("../../lib/personal-ads-cmo");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
    return;
  }
  try {
    requireAuth(req);
    const url = new URL(req.url || "/", "http://localhost");
    const accountId = String(url.searchParams.get("accountId") || "").replace(/^act_/, "");
    if (!accountId) throw new Error("Pilih Ads account dahulu.");
    const snapshot = await getPersonalAdsLiveSnapshot(accountId);
    res.end(JSON.stringify({ ok: true, snapshot }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
