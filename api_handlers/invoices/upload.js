const { requireAuth } = require("../../lib/auth");
const { currentPeriod, uploadInvoices, validatePeriod } = require("../../lib/invoices");
const { getInvoiceConfig } = require("../../lib/invoice-config");
const { readJsonBody } = require("../../lib/postpilot");
const { reportOperationalFailure, reportOperationalSuccess } = require("../../lib/operations-events");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
    return;
  }

  let uploadStarted = false;
  try {
    requireAuth(req);
    const body = await readJsonBody(req);
    const config = getInvoiceConfig();
    const period = validatePeriod(body.period || currentPeriod(config.timezone), config.timezone);
    uploadStarted = true;
    const uploads = await uploadInvoices({ period, drafts: body.drafts || [] });
    await reportOperationalSuccess({ fingerprint: "google-drive:invoice-upload", serviceName: "google_drive", detail: "Invoice berjaya diupload ke Google Drive." });

    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      period,
      uploads,
      count: uploads.length,
    }));
  } catch (error) {
    if (uploadStarted) await reportOperationalFailure({ fingerprint: "google-drive:invoice-upload", serviceName: "google_drive", entityType: "invoice", title: "Invoice upload gagal", detail: error?.message || String(error), action: { kind: "href", label: "Reconnect", href: "/api/google/oauth-start", tab: "invoicepilot", subtab: "invoice-panel" } });
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
