const { requireAuth } = require("../../lib/auth");
const { readJsonBody } = require("../../lib/postpilot");
const { generateTelegramConnectLink } = require("../../lib/telegram-reports");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  try {
    requireAuth(req);
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
      return;
    }
    const body = await readJsonBody(req);
    const result = await generateTelegramConnectLink(body.clientCode, body.recipientSlot);
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, ...result }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
