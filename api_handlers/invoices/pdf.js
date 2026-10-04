const { requireAuth } = require("../../lib/auth");
const { generateInvoicePdf } = require("../../lib/invoices");
const { readJsonBody, readRequestBody } = require("../../lib/postpilot");

function queryParam(req, key) {
  const parsed = new URL(req.url || "/", "http://localhost");
  return parsed.searchParams.get(key);
}

async function readPostBody(req) {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("application/json")) return readJsonBody(req);

  const rawBody = await readRequestBody(req);
  const params = new URLSearchParams(rawBody.toString("utf8"));
  return Object.fromEntries(params.entries());
}

module.exports = async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    res.statusCode = 405;
    res.end("Method not allowed.");
    return;
  }

  try {
    requireAuth(req);
    const body = req.method === "POST" ? await readPostBody(req) : {};
    const clientCode = body.clientCode || body.code || queryParam(req, "client");
    const period = body.period || queryParam(req, "period");
    const overrides = {};
    if (Object.prototype.hasOwnProperty.call(body, "servicePrice")) overrides.servicePrice = body.servicePrice;
    else if (queryParam(req, "servicePrice") !== null) overrides.servicePrice = queryParam(req, "servicePrice");
    if (Object.prototype.hasOwnProperty.call(body, "discount")) overrides.discount = body.discount;
    else if (queryParam(req, "discount") !== null) overrides.discount = queryParam(req, "discount");
    const { invoice, buffer } = await generateInvoicePdf({
      clientCode,
      period,
      overrides,
    });

    res.statusCode = 200;
    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-length", String(buffer.length));
    res.setHeader("content-disposition", `inline; filename="${invoice.fileName.replace(/"/g, "")}"`);
    res.end(buffer);
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end(error?.message || String(error));
  }
};
