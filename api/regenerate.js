const { requireAuth } = require("../lib/auth");
const {
  readJsonBody,
  regeneratePreview,
} = require("../lib/postpilot");

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
    const nextPreview = regeneratePreview({
      salespageLink: body.salespage_link,
      creativeAngle: body.creative_angle,
      mediaType: body.media_type,
      salespageContext: body.salespage_context,
      variation: body.variation,
      seenVariations: body.seen_variations,
    });

    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      preview: {
        caption: nextPreview.caption,
        comment_cta: nextPreview.comment_cta,
        salespage_context: {
          ok: body.salespage_context?.ok,
          product_name: body.salespage_context?.productName,
          raw: body.salespage_context,
          error: body.salespage_context?.error,
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
