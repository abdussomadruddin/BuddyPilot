const { requireAuth } = require("../../lib/auth");
const { telegramApi } = require("../../lib/telegram-reports");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  try {
    requireAuth(req);
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
      return;
    }
    const secret = String(process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
    if (!secret) throw new Error("TELEGRAM_WEBHOOK_SECRET belum diset.");
    const origin = String(process.env.APP_BASE_URL || `https://${req.headers.host || "buddypilot.vercel.app"}`).replace(/\/$/, "");
    const result = await telegramApi("setWebhook", {
      url: `${origin}/api/telegram/webhook`,
      secret_token: secret,
      allowed_updates: ["message"],
      drop_pending_updates: false,
    });
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, result, webhookUrl: `${origin}/api/telegram/webhook` }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
