const { requireAuth } = require("../../lib/auth");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
    return;
  }
  try {
    requireAuth(req);
    const publicKey = String(process.env.VAPID_PUBLIC_KEY || "").trim();
    if (!publicKey) throw new Error("Web Push belum dikonfigurasi.");
    res.end(JSON.stringify({ ok: true, publicKey }));
  } catch (error) {
    res.statusCode = error.statusCode || 500;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
