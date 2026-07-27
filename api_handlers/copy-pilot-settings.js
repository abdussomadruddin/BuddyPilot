const { requireAuth } = require("../lib/auth");
const { readJsonBody } = require("../lib/postpilot");
const { openaiKeyStatus, saveProviderKey } = require("../lib/copy-pilot");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  try {
    requireAuth(req);
    if (req.method === "GET") {
      res.statusCode = 200;
      return res.end(JSON.stringify({ ok: true, ...(await openaiKeyStatus()) }));
    }
    if (req.method === "POST") {
      res.statusCode = 200;
      const body = await readJsonBody(req);
      return res.end(JSON.stringify({ ok: true, ...(await saveProviderKey(body.apiKey, body.provider)) }));
    }
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
