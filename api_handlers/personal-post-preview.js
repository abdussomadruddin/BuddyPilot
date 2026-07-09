const { requireAuth } = require("../lib/auth");
const { readJsonBody } = require("../lib/postpilot");
const { buildPersonalPostPreview } = require("../lib/personal-postpilot");

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
    const { preview } = await buildPersonalPostPreview({
      productLink: body.product_link,
      affiliateLink: body.affiliate_link,
      personalBackground: body.personal_background,
      angleNote: body.angle_note,
      postMode: body.post_mode,
      customPost: body.custom_post,
      customComment: body.custom_comment,
      variation: body.variation,
    });

    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      preview: {
        post_text: preview.post_text,
        comment_cta: preview.comment_cta,
        product_link: preview.product_link,
        affiliate_link: preview.affiliate_link,
        personal_background: preview.personal_background,
        angle_note: preview.angle_note,
        post_mode: preview.post_mode,
        product_context: {
          ok: preview.product_context?.ok,
          product_name: preview.product_context?.productName,
          raw: preview.product_context,
          error: preview.product_context?.error,
        },
        variation: preview.variation,
        style: preview.style,
      },
    }));
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.end(JSON.stringify({ ok: false, error: error?.message || String(error) }));
  }
};
