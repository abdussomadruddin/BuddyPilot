const { requireAuth } = require("../lib/auth");
const { readJsonBody } = require("../lib/postpilot");
const { regeneratePersonalPostPreview } = require("../lib/personal-postpilot");

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
    });

    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      preview: {
        post_text: nextPreview.post_text,
        comment_cta: nextPreview.comment_cta,
        product_context: {
          ok: body.product_context?.ok,
          product_name: body.product_context?.productName,
          raw: body.product_context,
          error: body.product_context?.error,
        },
        variation: nextPreview.variation,
        style: nextPreview.style,
      },
    }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
