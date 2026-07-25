const { requireAuth } = require("../lib/auth");
const { readJsonBody } = require("../lib/postpilot");
const {
  listPostPilotCopyHistory,
  ratePostPilotCopyHistory,
} = require("../lib/supabase-db");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  try {
    requireAuth(req);
    if (req.method === "GET") {
      const parsed = new URL(req.url || "/", "http://localhost");
      const posts = await listPostPilotCopyHistory({
        productId: parsed.searchParams.get("product_id") || "",
        channel: parsed.searchParams.get("channel") || "",
        limit: parsed.searchParams.get("limit") || 100,
      });
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, posts }));
      return;
    }
    if (req.method === "PATCH" || req.method === "POST") {
      const body = await readJsonBody(req);
      const post = await ratePostPilotCopyHistory(String(body.id || ""), String(body.rating || ""));
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, post }));
      return;
    }
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
