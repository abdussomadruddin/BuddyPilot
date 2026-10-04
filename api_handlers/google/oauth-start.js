const { requireAuth } = require("../../lib/auth");
const { googleAuthUrl } = require("../../lib/invoices");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method not allowed.");
    return;
  }

  try {
    requireAuth(req);
    res.statusCode = 302;
    res.setHeader("location", googleAuthUrl());
    res.end("Redirecting to Google.");
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end(error?.message || String(error));
  }
};
