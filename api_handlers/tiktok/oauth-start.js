const { requireAuth } = require("../../lib/auth");
const { startTikTokAuthorization } = require("../../lib/tiktok-ads");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method not allowed.");
    return;
  }
  try {
    requireAuth(req);
    const authorizationUrl = await startTikTokAuthorization();
    res.statusCode = 302;
    res.setHeader("location", authorizationUrl);
    res.end();
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end(error?.message || String(error));
  }
};
