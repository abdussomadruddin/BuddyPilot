const { requireAuth } = require("../lib/auth");
const { listActivity } = require("../lib/supabase-db");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");

  try {
    requireAuth(req);

    if (req.method !== "GET") {
      res.statusCode = 405;
      res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
      return;
    }

    const parsed = new URL(req.url || "/", "http://localhost");
    const limit = Number(parsed.searchParams.get("limit") || 30);
    const activity = await listActivity(limit);
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, activity, count: activity.length }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
