const { requireAuth } = require("../../lib/auth");
const { buildReportPdf } = require("../../lib/invoices");
const { readJsonBody } = require("../../lib/postpilot");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Method not allowed.");
    return;
  }

  try {
    requireAuth(req);
    const body = await readJsonBody(req);
    const { report, buffer } = await buildReportPdf(body);

    res.statusCode = 200;
    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-length", String(buffer.length));
    res.setHeader("content-disposition", `inline; filename="${report.fileName.replace(/"/g, "")}"`);
    res.end(buffer);
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end(error?.message || String(error));
  }
};
