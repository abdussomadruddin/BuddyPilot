const { requireAuth } = require("../lib/auth");
const { readJsonBody } = require("../lib/http-body");
const { supabaseRequest } = require("../lib/supabase-db");

const LIMITS = { facebook: 63206, threads: 500 };
const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

function rejected(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

async function dispatch(body, request = supabaseRequest, now = Date.now()) {
  const cutoff = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  if (body.action === "enqueue") {
    const platform = body.platform;
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!Object.hasOwn(LIMITS, platform) || !content || content.length > LIMITS[platform]) {
      throw rejected("Pilih platform dan semak panjang teks (Threads: maksimum 500 aksara).");
    }
    const [job] = await request("post_pilot_queue?select=id,state", {
      method: "POST", prefer: "return=representation", body: { platform, content },
    });
    return { job };
  }
  if (body.action === "claim") {
    const [candidate] = await request(`post_pilot_queue?select=id,platform,content&state=eq.queued&created_at=gte.${encodeURIComponent(cutoff)}&order=created_at.asc,id.asc&limit=1`);
    if (!candidate) return { job: null };
    const [job] = await request(`post_pilot_queue?id=eq.${candidate.id}&state=eq.queued&select=id`, {
      method: "PATCH", prefer: "return=representation", body: { state: "claimed", content: "[cleared]" },
    });
    return { job: job ? candidate : null };
  }
  if (typeof body.id !== "string" || !UUID.test(body.id)) throw rejected("ID giliran tidak sah.");
  if (body.action === "finish" && ["review", "copy", "failed"].includes(body.state)) {
    await request(`post_pilot_queue?id=eq.${body.id}&state=eq.claimed`, {
      method: "PATCH", prefer: "return=minimal", body: { state: body.state, content: "[cleared]" },
    });
    return {};
  }
  if (body.action === "status") {
    const [job] = await request(`post_pilot_queue?id=eq.${body.id}&select=id,state,created_at`);
    if (!job) throw rejected("Draf tidak dijumpai.", 404);
    return { job: { id: job.id, state: job.state === "queued" && Date.parse(job.created_at) < Date.parse(cutoff) ? "expired" : job.state } };
  }
  throw rejected("Tindakan tidak sah.");
}

module.exports = async (req, res) => {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  try {
    if (req.method !== "POST") throw rejected("Method not allowed.", 405);
    requireAuth(req);
    if (req.headers["sec-fetch-site"] === "cross-site" || !/^application\/json\b/i.test(req.headers["content-type"] || "")) throw rejected("Permintaan tidak dibenarkan.", 403);
    const body = await readJsonBody(req);
    res.end(JSON.stringify({ ok: true, ...await dispatch(body || {}) }));
  } catch (error) {
    res.statusCode = error.statusCode || 503;
    res.end(JSON.stringify({ ok: false, error: res.statusCode >= 500 ? "Giliran Post Pilot tidak tersedia." : error.message }));
  }
};
module.exports.dispatch = dispatch;
