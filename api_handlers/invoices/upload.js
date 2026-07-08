const { requireAuth } = require("../../lib/auth");
const { currentPeriod, uploadInvoices, validatePeriod } = require("../../lib/invoices");
const { getInvoiceConfig } = require("../../lib/invoice-config");
const { readJsonBody } = require("../../lib/postpilot");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
    return;
  }

  try {
    requireAuth(req);
    const body = await readJsonBody(req);
    const config = getInvoiceConfig();
    const period = validatePeriod(body.period || currentPeriod(config.timezone), config.timezone);
    const uploads = await uploadInvoices({ period, drafts: body.drafts || [] });

    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      period,
      uploads,
      count: uploads.length,
    }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
