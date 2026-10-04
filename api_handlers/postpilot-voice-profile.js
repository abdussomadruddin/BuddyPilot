const { requireAuth } = require("../lib/auth");
const { readJsonBody } = require("../lib/postpilot");
const { normalizeVoiceProfile } = require("../lib/postpilot-pattern-engine");
const {
  getPostPilotVoiceProfile,
  savePostPilotVoiceProfile,
} = require("../lib/supabase-db");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  try {
    requireAuth(req);
    const parsed = new URL(req.url || "/", "http://localhost");
    const channel = parsed.searchParams.get("channel") === "threads_general" ? "threads_general" : "promote";
    const productId = parsed.searchParams.get("product_id") || "";
    if (req.method === "GET") {
      const profile = normalizeVoiceProfile(await getPostPilotVoiceProfile(productId, channel));
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, profile }));
      return;
    }
    if (req.method === "PUT" || req.method === "POST") {
      const body = await readJsonBody(req);
      const profile = normalizeVoiceProfile(body.profile || body);
      await savePostPilotVoiceProfile(productId, channel, profile);
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, profile }));
      return;
    }
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
