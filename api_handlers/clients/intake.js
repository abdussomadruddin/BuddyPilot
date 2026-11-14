// Owner side of the onboarding form: the link to send, the submissions waiting
// for review, and marking one used or dismissed.
const { requireAuth } = require("../../lib/auth");
const { readJsonBody } = require("../../lib/http-body");
const { intakeToken, listPendingIntakes, reviewIntake } = require("../../lib/onboarding-intake");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  try {
    requireAuth(req);
    if (req.method === "GET") {
      const host = String(req.headers["x-forwarded-host"] || req.headers.host || "");
      const proto = String(req.headers["x-forwarded-proto"] || (host.startsWith("localhost") ? "http" : "https")).split(",")[0];
      const token = intakeToken();
      res.end(JSON.stringify({ ok: true, link: token ? `${proto}://${host}/daftar?t=${token}` : "", pending: await listPendingIntakes() }));
      return;
    }
    if (req.method === "POST") {
      const body = await readJsonBody(req);
      res.end(JSON.stringify({ ok: true, ...await reviewIntake({ id: body.id, action: body.action }) }));
      return;
    }
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
  } catch (error) {
    res.statusCode = error.statusCode || 500;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
