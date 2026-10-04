const { requireAuth } = require("../../lib/auth");
const { uploadReportToDrive } = require("../../lib/invoices");
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
    uploadStarted = true;
    const upload = await uploadReportToDrive(body);
    await reportOperationalSuccess({ fingerprint: "google-drive:report-upload", serviceName: "google_drive", detail: "Weekly report berjaya diupload ke Google Drive." });
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, ...upload, upload }));
  } catch (error) {
    if (uploadStarted) {
      await reportOperationalFailure({
        fingerprint: "google-drive:report-upload",
        serviceName: "google_drive",
        entityType: "report",
        title: "Google Drive upload gagal",
        detail: error?.message || String(error),
        action: { kind: "href", label: "Reconnect", href: "/api/google/oauth-start", tab: "reportpilot" },
      });
    }
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
