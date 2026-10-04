const { requireAuth } = require("../lib/auth");
const {
  getPostPilotDraft,
  upsertPostPilotDraft,
} = require("../lib/supabase-db");
const { readJsonBody } = require("../lib/postpilot");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");

  try {
    requireAuth(req);

    if (req.method === "GET") {
      const draft = await getPostPilotDraft();
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, draft }));
      return;
    }

    if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
      const body = await readJsonBody(req);
      const draft = await upsertPostPilotDraft(body);
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, draft }));
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
