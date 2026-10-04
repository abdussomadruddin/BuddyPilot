const { requireAuth } = require("../../lib/auth");
const {
  clearBankQrImage,
  downloadBankQrImage,
  recordActivity,
  uploadBankQrImage,
} = require("../../lib/supabase-db");
const { parseMultipart, readJsonBody, readRequestBody } = require("../../lib/postpilot");

function queryParam(req, key) {
  const parsed = new URL(req.url || "/", "http://localhost");
  return parsed.searchParams.get(key);
}

module.exports = async function handler(req, res) {
  try {
    requireAuth(req);

    if (req.method === "GET") {
      const id = queryParam(req, "id");
      const { account, buffer, contentType } = await downloadBankQrImage(id);
      res.statusCode = 200;
      res.setHeader("content-type", contentType);
      res.setHeader("content-length", String(buffer.length));
      res.setHeader("cache-control", "private, max-age=60");
      res.setHeader("content-disposition", `inline; filename="${(account.qrImageName || "bank-qr").replace(/"/g, "")}"`);
      res.end(buffer);
      return;
    }

    if (req.method === "POST") {
      const body = await readRequestBody(req);
      const { values, files } = parseMultipart(req, body);
      const account = await uploadBankQrImage(values.id, files.qrImage);
      await recordActivity({
        type: "bank_qr_uploaded",
        title: `QR bank diupload: ${account.label}`,
        description: account.qrImageName || "Gambar QR disimpan untuk PDF invoice.",
        entityType: "bank_account",
        entityId: account.id,
      });
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: true, account }));
      return;
    }

    if (req.method === "DELETE") {
      const body = await readJsonBody(req);
      const account = await clearBankQrImage(body.id || queryParam(req, "id"));
      await recordActivity({
        type: "bank_qr_deleted",
        title: `QR bank dibuang: ${account.label}`,
        description: "Gambar QR payment dibuang daripada akaun bank.",
        entityType: "bank_account",
        entityId: account.id,
      });
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: true, account }));
      return;
    }

    res.statusCode = 405;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.setHeader("content-type", req.method === "GET" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8");
    res.end(req.method === "GET"
      ? (error?.message || String(error))
      : JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
