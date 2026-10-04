const { requireAuth } = require("../../lib/auth");
const { buildClientWhatsappReminder } = require("../../lib/invoices");
const { recordActivity } = require("../../lib/supabase-db");
const { readJsonBody } = require("../../lib/postpilot");

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
    const result = await buildClientWhatsappReminder(body);
    await recordActivity({
      type: "client_whatsapp_opened",
      title: `WhatsApp ${result.type}: ${result.client.brandClient || result.client.name || result.client.code}`,
      description: result.documentUrl || "Custom message",
      entityType: "client",
      entityId: result.client.code,
      metadata: {
        clientCode: result.client.code,
        type: result.type,
        period: result.period,
        documentUrl: result.documentUrl,
      },
    });

    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      clientCode: result.client.code,
      clientName: result.client.brandClient || result.client.name,
      type: result.type,
      period: result.period,
      phone: result.phone,
      message: result.message,
      documentUrl: result.documentUrl,
      whatsappUrl: result.whatsappUrl,
    }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
