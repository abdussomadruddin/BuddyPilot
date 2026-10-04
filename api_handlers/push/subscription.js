const { requireAuth } = require("../../lib/auth");
const { deletePushSubscription, savePushSubscription } = require("../../lib/supabase-db");

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  if (!['POST', 'DELETE'].includes(req.method)) {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
    return;
  }
  try {
    requireAuth(req);
    const body = await readJson(req);
    if (req.method === "DELETE") await deletePushSubscription(body.endpoint);
    else await savePushSubscription(body.subscription, req.headers["user-agent"] || "");
    res.end(JSON.stringify({ ok: true }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
