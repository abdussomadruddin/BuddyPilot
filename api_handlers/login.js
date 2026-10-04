const { authCookie, verifyPassword } = require("../lib/auth");

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method not allowed.");
    return;
  }

  const body = await readBody(req);
  const params = new URLSearchParams(body);

  if (!verifyPassword(params.get("password"))) {
    res.statusCode = 303;
    res.setHeader("location", "/login?error=1");
    res.end("Invalid password.");
    return;
  }

  res.statusCode = 303;
  res.setHeader("set-cookie", authCookie());
  res.setHeader("location", "/");
  res.end("Logged in.");
};
