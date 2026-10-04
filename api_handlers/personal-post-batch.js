const { requireAuth } = require("../lib/auth");
const { getPostPilotHookImage, postPilotHookImageUrl } = require("../lib/supabase-db");
const { buildPersonalPostBatch } = require("../lib/personal-post-batch");
const { readJsonBody } = require("../lib/postpilot");

async function publicImageForPost(imageId) {
  const image = await getPostPilotHookImage(imageId);
  return {
    id: image.id,
    name: image.name,
    type: image.type || "image/jpeg",
    url: postPilotHookImageUrl(image),
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
    return;
  }

  try {
    requireAuth(req);
    const body = await readJsonBody(req);
    const generated = await buildPersonalPostBatch({
      count: body.count,
      productName: body.product_name,
      affiliateLink: body.affiliate_link,
      personalBackground: body.personal_background,
      angleNote: body.angle_note,
      productId: body.product_id,
    });
    const posts = [];
    for (const post of generated.posts) {
      posts.push({ ...post, image: await publicImageForPost(post.image.id) });
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, count: generated.count, posts }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
