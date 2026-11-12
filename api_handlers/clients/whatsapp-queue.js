const { requireAuth } = require("../../lib/auth");
const { currentPeriod, validatePeriod } = require("../../lib/invoices");
const { getInvoiceConfig } = require("../../lib/invoice-config");
const { buildWhatsappQueue } = require("../../lib/whatsapp-queue");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  try {
    requireAuth(req);
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
      return;
    }
    const url = new URL(req.url || "/", "http://localhost");
    const config = getInvoiceConfig();
    const type = String(url.searchParams.get("type") || "invoice").toLowerCase();
    const period = validatePeriod(url.searchParams.get("period") || currentPeriod(config.timezone), config.timezone);
    const queue = await buildWhatsappQueue({ type, period });
    res.end(JSON.stringify({ ok: true, ...queue }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
