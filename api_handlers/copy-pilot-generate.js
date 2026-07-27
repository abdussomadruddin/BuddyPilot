const { requireAuth } = require("../lib/auth");
const { readJsonBody } = require("../lib/postpilot");
const { generateCopyPilot } = require("../lib/copy-pilot");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
  }
  try {
    requireAuth(req);
    const result = await generateCopyPilot(await readJsonBody(req));
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, ...result }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
