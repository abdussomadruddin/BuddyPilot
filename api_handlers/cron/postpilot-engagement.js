// Daily: Post Pilot pulls engagement and learns from it. Sends nothing to any
// social platform; it only reads posts and updates the Writing DNA.
const { createStore } = require("../../lib/storytelling");
const { runCycle } = require("../../lib/storytelling-learning");

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
    return;
  }
  const secret = String(process.env.CRON_SECRET || "");
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    res.statusCode = 401;
    res.end(JSON.stringify({ ok: false, error: "Unauthorized." }));
    return;
  }
  try {
    res.end(JSON.stringify({ ok: true, ...await runCycle(createStore()) }));
  } catch (error) {
    console.error("postpilot_engagement_error", { message: String(error?.message || error).slice(0, 200) });
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
