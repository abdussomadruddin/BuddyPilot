const { requireAuth } = require("../../lib/auth");
const { readJsonBody } = require("../../lib/http-body");
const { listInvoicePayments, setInvoicePayment } = require("../../lib/invoice-payments");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  try {
    requireAuth(req);
    if (req.method === "GET") {
      const url = new URL(req.url || "/", "http://localhost");
      const result = await listInvoicePayments({ months: url.searchParams.get("months") || 3 });
      res.end(JSON.stringify({ ok: true, ...result }));
      return;
    }
    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const result = await setInvoicePayment({ invoiceNumber: body.invoiceNumber, paid: body.paid !== false });
      res.end(JSON.stringify({ ok: true, ...result }));
      return;
    }
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
