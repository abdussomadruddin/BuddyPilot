const { requireAuth } = require("../lib/auth");
const pageHtml = require("../lib/ui/page");

module.exports = async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  if (req.method !== "GET") {
    res.statusCode = 405;
    return res.end("Method not allowed.");
  }
  try {
    await requireAuth(req);
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.statusCode = 200;
    res.end(pageHtml());
  } catch (error) {
    if ([503, 502, 429].includes(error.statusCode)) {
      res.statusCode = error.statusCode;
      return res.end("Sesi sementara tidak dapat disemak. Cuba semula kemudian.");
    }
    res.statusCode = 302;
    res.setHeader("location", error.statusCode === 500 ? "/login?setup=1" : "/login");
    res.end("Redirecting to login.");
  }
};
