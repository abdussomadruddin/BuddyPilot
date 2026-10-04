const { requireAuth } = require("../../lib/auth");
const { readJsonBody } = require("../../lib/postpilot");
const {
  disconnectTelegram,
  sendTelegramTest,
  sendYesterdayReport,
  setTelegramAutoEnabled,
} = require("../../lib/telegram-reports");

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
    const action = String(body.action || "").trim();
    let result;
    if (action === "test") result = await sendTelegramTest(body.clientCode, body.recipientSlot);
    else if (action === "send-yesterday") result = await sendYesterdayReport(body.clientCode, { force: true, recipientSlot: body.recipientSlot });
    else if (action === "toggle") result = await setTelegramAutoEnabled(body.clientCode, Boolean(body.enabled), body.recipientSlot);
    else if (action === "disconnect") result = await disconnectTelegram(body.clientCode, body.recipientSlot);
    else throw new Error("Telegram action tidak sah.");
    if (action === "send-yesterday" && result?.status !== "sent") {
      const error = result?.error || result?.reason || "Report Telegram tidak berjaya dihantar.";
      console.error("telegram_send_yesterday_failed", {
        clientCode: body.clientCode,
        recipientSlot: body.recipientSlot,
        status: result?.status || "failed",
        error,
      });
      res.statusCode = result?.status === "skipped" ? 409 : 502;
      res.end(JSON.stringify({ ok: false, error, result }));
      return;
    }
    if (action === "send-yesterday") {
      console.log("telegram_send_yesterday_sent", {
        clientCode: body.clientCode,
        recipientSlot: body.recipientSlot,
        messageId: result?.messageId || "",
      });
    }
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, result }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
