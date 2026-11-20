const { requireAuth } = require("../lib/auth");
const { readJsonBody } = require("../lib/http-body");
const { buildSummaryPdf } = require("../lib/billing-summary");

module.exports = async function handler(req, res) {
  res.setHeader("cache-control", "private, no-store");
  try {
    requireAuth(req);
    if (req.method !== "POST") {
      res.setHeader("allow", "POST");
      res.statusCode = 405;
      res.end("Method not allowed.");
      return;
    }
    const input = await readJsonBody(req);
    const pdf = await buildSummaryPdf(input);
    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-disposition", `inline; filename="${input.start}--${input.end}_Billing_Summary.pdf"`);
    res.statusCode = 200;
    res.end(pdf);
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: error.message || "PDF gagal dijana." }));
  }
};
