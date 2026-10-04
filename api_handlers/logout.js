const { clearAuthCookie, revokeSession } = require("../lib/auth");
module.exports = async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method not allowed.");
    return;
  }
  try {
    await revokeSession(req);
    res.statusCode = 303;
    res.setHeader("set-cookie", clearAuthCookie());
    res.setHeader("location", "/login");
    res.end("Logged out.");
  } catch {
    res.statusCode = 503;
    res.end("Logout gagal. Cuba semula untuk tamatkan sesi.");
  }
};
