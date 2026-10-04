const {
  authCookie,
  verifyPassword,
  checkLoginAttempt,
} = require("../lib/auth");
async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 4096) {
      const error = new Error("Login request terlalu besar.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}
module.exports = async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method not allowed.");
    return;
  }
  try {
    const attempt = await checkLoginAttempt(req);
    if (!attempt.allowed) {
      res.statusCode = 429;
      res.setHeader("retry-after", String(attempt.retry_after));
      res.end("Terlalu banyak percubaan login. Cuba semula kemudian.");
      return;
    }
    const params = new URLSearchParams(await readBody(req));
    if (!verifyPassword(params.get("password"))) {
      res.statusCode = 303;
      res.setHeader("location", "/login?error=1");
      res.end("Invalid password.");
      return;
    }
    res.setHeader("set-cookie", await authCookie());
    res.statusCode = 303;
    res.setHeader("location", "/");
    res.end("Logged in.");
  } catch (error) {
    res.statusCode = error.statusCode || 503;
    res.end(
      res.statusCode === 413
        ? error.message
        : "Login sementara tidak tersedia. Cuba semula kemudian.",
    );
  }
};
