const { clearAuthCookie } = require("../lib/auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method not allowed.");
    return;
  }

  res.statusCode = 303;
  res.setHeader("set-cookie", clearAuthCookie());
  res.setHeader("location", "/login");
  res.end("Logged out.");
};
