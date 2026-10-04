const { requireAuth } = require("../lib/auth");
const { readJsonBody } = require("../lib/postpilot");
const { regeneratePersonalPostPreview } = require("../lib/personal-postpilot");
const {
  getPostPilotVoiceProfile,
  listPostPilotCopyHistory,
  recordPostPilotCopyHistory,
} = require("../lib/supabase-db");

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
    const productId = String(body.product_id || body.active_product_id || "").trim();
    const history = await listPostPilotCopyHistory({ productId, limit: 300 });
    const voiceProfile = await getPostPilotVoiceProfile(productId, "promote");
    const nextPreview = regeneratePersonalPostPreview({
      productName: body.product_name,
      affiliateLink: body.affiliate_link,
      personalBackground: body.personal_background,
      angleNote: body.angle_note,
      postMode: body.post_mode,
      productContext: body.product_context,
      customComment: body.custom_comment,
      variation: body.variation,
      seenVariations: body.seen_variations,
      history,
      voiceProfile,
    });
    for (const [channel, pattern, postText] of [
      ["facebook", nextPreview.pattern.facebook, nextPreview.facebook_post_text],
      ["threads", nextPreview.pattern.threads, nextPreview.threads_post_text],
    ]) {
      await recordPostPilotCopyHistory({
        ...pattern,
        channel,
        productId,
        postText,
        intentKey: body.post_mode,
        metadata: { source: "regenerate" },
      });
    }

    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      preview: {
        post_text: nextPreview.post_text,
        facebook_post_text: nextPreview.facebook_post_text,
        threads_post_text: nextPreview.threads_post_text,
        comment_cta: nextPreview.comment_cta,
        product_context: {
          ok: body.product_context?.ok,
          product_name: body.product_context?.productName,
          raw: body.product_context,
          error: body.product_context?.error,
        },
        variation: nextPreview.variation,
        style: nextPreview.style,
        pattern: nextPreview.pattern,
      },
    }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
