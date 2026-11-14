const { requireAuth } = require("../../lib/auth");
const { buildClientWhatsappReminder } = require("../../lib/invoices");
const { recordActivity } = require("../../lib/supabase-db");
const { readJsonBody } = require("../../lib/http-body");

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
    // The send queue opens WhatsApp first, then confirms here; no message is rebuilt.
    if (body.markSent) {
      const clientCode = String(body.clientCode || "").trim().toUpperCase();
      const type = String(body.type || "").trim().toLowerCase();
      if (!/^[A-Z0-9-]{1,40}$/.test(clientCode) || !["invoice", "receipt", "report", "reminder"].includes(type)) {
        throw Object.assign(new Error("Client atau jenis WhatsApp tidak sah."), { statusCode: 400 });
      }
      const period = String(body.period || "").trim();
      await recordActivity({
        type: "client_whatsapp_opened",
        title: `WhatsApp ${type}: ${String(body.clientName || clientCode).slice(0, 120)}`,
        description: String(body.documentUrl || "").slice(0, 500),
        entityType: "client",
        entityId: clientCode,
        metadata: { clientCode, type, period: /^\d{4}-\d{2}$/.test(period) ? period : "", documentUrl: String(body.documentUrl || "").slice(0, 500), via: "queue", ...(type === "reminder" ? { tier: Math.min(3, Math.max(1, Number(body.tier) || 1)) } : {}) },
      });
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, clientCode, type, period }));
      return;
    }
    const result = await buildClientWhatsappReminder(body);
    if (body.preview) {
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, clientCode: result.client.code, clientName: result.client.brandClient || result.client.name, type: result.type, period: result.period, message: result.message, documentUrl: result.documentUrl, whatsappUrl: result.whatsappUrl }));
      return;
    }
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
