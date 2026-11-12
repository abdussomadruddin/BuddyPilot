const { connectTelegramClient, sendTelegramMessage } = (() => {
  const reports = require("../../lib/telegram-reports");
  return { connectTelegramClient: reports.connectTelegramClient, sendTelegramMessage: reports.telegramApi };
})();
const { readJsonBody } = require("../../lib/http-body");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
    return;
  }
  const expected = String(process.env.TELEGRAM_WEBHOOK_SECRET || "");
  const provided = String(req.headers["x-telegram-bot-api-secret-token"] || "");
  if (!expected || provided !== expected) {
    res.statusCode = 401;
    res.end(JSON.stringify({ ok: false, error: "Unauthorized." }));
    return;
  }
  try {
    const update = await readJsonBody(req);
    const message = update.message;
    const match = String(message?.text || "").trim().match(/^\/start(?:@[A-Za-z0-9_]+)?\s+([A-Za-z0-9_-]+)$/);
    if (match && message?.chat) {
      try {
        await connectTelegramClient(match[1], message.chat, message.from || {});
      } catch (error) {
        await sendTelegramMessage("sendMessage", {
          chat_id: message.chat.id,
          text: error?.message || "Sambungan BuddyPilot gagal.",
        });
      }
    }
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true }));
  } catch (error) {
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
