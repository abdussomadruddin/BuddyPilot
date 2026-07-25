const { requireAuth } = require("../../lib/auth");
const { readJsonBody } = require("../../lib/postpilot");
const { buildPersonalPostBatch } = require("../../lib/personal-post-batch");
const { reservePostPilotHookImages } = require("../../lib/supabase-db");
const { assertJobAvailable, createJob, getRemoteOverview } = require("../../lib/postpilot-remote");
const { handleError, json } = require("./_shared");

function threadsPayload(body) {
  const posts = (Array.isArray(body.posts) ? body.posts : []).slice(0, 50).map((post, index) => ({
    id: String(post?.id || `threads-remote-${Date.now()}-${index}`),
    postText: String(post?.postText || "").trim(),
    category: String(post?.category || ""),
    tone: String(post?.tone || ""),
    structure: String(post?.structure || ""),
  }));
  return { posts, batchDelayMs: Math.max(30_000, Number(body.batchDelayMs) || 30_000) };
}

module.exports = async function handler(req, res) {
  try {
    requireAuth(req);
    if (req.method === "GET") {
      json(res, 200, { ok: true, ...(await getRemoteOverview()) });
      return;
    }
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed." });
    const body = await readJsonBody(req);
    const type = String(body.type || "");
    const device = await assertJobAvailable();
    let payload;
    if (type === "facebook_threads") {
      const suppliedPosts = (Array.isArray(body.posts) ? body.posts : []).slice(0, 5);
      if (suppliedPosts.length) {
        const images = await reservePostPilotHookImages(suppliedPosts.length, body.product_id || body.personal?.product_id);
        payload = {
          posts: suppliedPosts.map((post, index) => ({
            id: String(post.id || `postpilot-remote-${Date.now()}-${index}`),
            postText: String(post.facebookPostText || post.postText || "").trim(),
            facebookPostText: String(post.facebookPostText || post.postText || "").trim(),
            threadsPostText: String(post.threadsPostText || post.postText || "").trim(),
            commentCta: String(post.commentCta || "").trim(),
            postMode: String(post.postMode || "custom"),
            style: String(post.style || "custom"),
            image: { id: images[index].id, name: images[index].name, type: images[index].type || "image/jpeg", url: images[index].url },
          })),
          batchDelayMs: 30_000,
        };
      } else {
        const generated = await buildPersonalPostBatch({
          count: body.count,
          productName: body.personal?.product_name,
          affiliateLink: body.personal?.affiliate_link,
          personalBackground: body.personal?.personal_background,
          angleNote: body.personal?.angle_note,
          productId: body.personal?.product_id,
        });
        payload = { posts: generated.posts, batchDelayMs: 30_000 };
      }
    } else if (type === "threads_text") {
      payload = threadsPayload(body);
    } else {
      throw Object.assign(new Error("Jenis automation tidak sah."), { statusCode: 400 });
    }
    const job = await createJob({ type, payload, device });
    json(res, 201, { ok: true, job });
  } catch (error) {
    handleError(res, error);
  }
};
