const { requireAuth } = require("../../lib/auth");
const { readJsonBody } = require("../../lib/postpilot");
const { saveAccountSettings } = require("../../lib/personal-ads-cmo");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  if (req.method !== "PUT") { res.statusCode = 405; res.end(JSON.stringify({ ok: false, error: "Method not allowed." })); return; }
  try {
    requireAuth(req);
    const setting = await saveAccountSettings(await readJsonBody(req));
    res.end(JSON.stringify({ ok: true, setting }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
