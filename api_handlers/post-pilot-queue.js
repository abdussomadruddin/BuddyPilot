const { requireAuth } = require("../lib/auth");
const { readJsonBody } = require("../lib/http-body");
const { supabaseRequest } = require("../lib/supabase-db");
const { splitForThreads, THREADS_MAX_PARTS } = require("../lib/social-publish");
const { safeImageUrl } = require("../lib/storytelling-image");

const LIMITS = { facebook: 63206, threads: 500 };
const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
// Separate owner scope keeps handoffs out of the normal drafts and AI quotas.
const TABLE = "storytelling_items";
const SCOPE = "owner_key=eq.post-pilot-mac&kind=eq.draft";
const FAILURE_STAGES = new Set(["tab", "profile", "composer", "text", "thread_part", "image", "next", "post_button"]);

function rejected(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

async function dispatch(body, request = supabaseRequest, now = Date.now()) {
  const cutoff = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  if (body.action === "enqueue") {
    const platform = body.platform;
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const parts = platform === "threads" && content.length > LIMITS.threads && content.length <= 12000 ? splitForThreads(content) : [content];
    if (!Object.hasOwn(LIMITS, platform) || parts.length > THREADS_MAX_PARTS || parts.some((part) => !part || part.length > LIMITS[platform])) {
      throw rejected("Pilih platform dan semak panjang teks (Threads: maksimum 500 aksara).");
    }
    const multipart = parts.length > 1;
    const auto = body.autoPost === true;
    const image = auto && platform === "threads" ? safeImageUrl(body.image) : "";
    if (auto && body.image && !image) throw rejected("Gambar Threads tidak sah.");
    const [job] = await request(TABLE + "?select=id,status", {
      method: "POST", prefer: "return=representation",
      body: { owner_key: "post-pilot-mac", kind: "draft", status: image ? "queued_auto_image" : auto ? (platform === "facebook" ? "queued_auto_facebook" : "queued_auto") : multipart ? "queued_thread" : "queued", data: { platform, parts, ...(image ? { image } : {}) } },
    });
    return { job: { id: job.id, state: "queued" } };
  }
  if (body.action === "claim") {
    const states = body.autoOnly === true ? [] : body.multipart === true ? ["queued", "queued_thread"] : ["queued"];
    if (body.autoThreads === true) {
      states.push("queued_auto");
      if (body.threadsImages === true) states.push("queued_auto_image");
    }
    if (body.autoFacebook === true) states.push("queued_auto_facebook");
    if (!states.length) return { job: null };
    const pending = states.length === 1 ? `status=eq.${states[0]}` : `status=in.(${states.join(",")})`;
    const [candidate] = await request(`${TABLE}?select=id,status,data&${SCOPE}&${pending}&created_at=gte.${encodeURIComponent(cutoff)}&order=created_at.asc,id.asc&limit=1`);
    if (!candidate) return { job: null };
    const [job] = await request(`${TABLE}?${SCOPE}&id=eq.${candidate.id}&status=eq.${candidate.status}&select=id`, {
      method: "PATCH", prefer: "return=representation", body: { status: "claimed", data: {} },
    });
    return { job: job ? { id: candidate.id, platform: candidate.data.platform, content: candidate.data.parts[0],
      ...(body.multipart === true || body.autoThreads === true || body.autoFacebook === true ? { parts: candidate.data.parts } : {}),
      ...(candidate.status.startsWith("queued_auto") ? { autoPost: true } : {}),
      ...(candidate.status === "queued_auto_image" ? { image: candidate.data.image } : {}) } : null };
  }
  if (typeof body.id !== "string" || !UUID.test(body.id)) throw rejected("ID giliran tidak sah.");
  if (body.action === "finish" && ["review", "copy", "failed", "posted", "uncertain"].includes(body.state)) {
    const reason = body.state === "failed" && FAILURE_STAGES.has(body.reason) ? body.reason : "";
    await request(`${TABLE}?${SCOPE}&id=eq.${body.id}&status=eq.claimed`, {
      method: "PATCH", prefer: "return=minimal", body: { status: body.state, ...(reason ? { data: { reason } } : {}) },
    });
    return {};
  }
  if (body.action === "status") {
    const [job] = await request(`${TABLE}?${SCOPE}&id=eq.${body.id}&select=id,status,created_at,reason:data->>reason`);
    if (!job) throw rejected("Draf tidak dijumpai.", 404);
    const queued = ["queued", "queued_thread", "queued_auto", "queued_auto_image", "queued_auto_facebook"].includes(job.status);
    const state = queued ? (Date.parse(job.created_at) < Date.parse(cutoff) ? "expired" : "queued") : job.status;
    return { job: { id: job.id, state, ...(state === "failed" && FAILURE_STAGES.has(job.reason) ? { reason: job.reason } : {}) } };
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
