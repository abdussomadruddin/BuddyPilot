const { requireAuth } = require("../../lib/auth");
const { checkGoogleDriveConnection } = require("../../lib/invoices");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");

  try {
    requireAuth(req);

    if (req.method !== "GET") {
      res.statusCode = 405;
      res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
      return;
    }

    const connection = await checkGoogleDriveConnection();
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, ...connection }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, connected: false, error: error?.message || String(error) }));
  }
};
