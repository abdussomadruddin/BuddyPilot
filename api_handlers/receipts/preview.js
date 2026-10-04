const { requireAuth } = require("../../lib/auth");
const { buildReceiptListFromClients, currentPeriod, getMergedClientsWithStatus, validatePeriod } = require("../../lib/invoices");
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
    const { config, clients, registryStatus } = await getMergedClientsWithStatus();
    const period = validatePeriod(body.period || currentPeriod(config.timezone), config.timezone);
    const receipts = await buildReceiptListFromClients(period, clients, config);

    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      period,
      timezone: config.timezone,
      receipts,
      count: receipts.length,
      registryStatus,
      bankStatus: config.bankStatus,
    }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
