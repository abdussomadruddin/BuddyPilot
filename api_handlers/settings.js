const { requireAuth } = require("../lib/auth");
const {
  getBusinessSettingsWithStatus,
  saveBusinessSettings,
} = require("../lib/invoices");
const { readJsonBody } = require("../lib/postpilot");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");

  try {
    requireAuth(req);

    if (req.method === "GET") {
      const { settings, status } = await getBusinessSettingsWithStatus();
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, settings, status }));
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const saved = await saveBusinessSettings(body);
      res.statusCode = 200;
      res.end(JSON.stringify({
        ok: true,
        settings: saved.settings,
        file: saved.file,
      }));
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
