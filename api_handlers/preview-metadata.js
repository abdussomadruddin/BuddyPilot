const { requireAuth } = require("../lib/auth");
const {
  buildPreview,
  readJsonBody,
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
    const creative = {
      filename: body.filename || "creative",
      contentType: body.content_type || "application/octet-stream",
      data: Buffer.alloc(0),
    };

    const { preview } = await buildPreview({
      file: creative,
      salespageLink: body.salespage_link,
      creativeAngle: body.caption_note,
      customCaption: body.custom_caption,
      firstComment: body.first_comment,
    });

    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      preview: {
        caption: preview.caption,
        comment_cta: preview.comment_cta,
        salespage_link: preview.salespage_link,
        creative_angle: preview.creative_angle,
        media_type: preview.media.mediaType,
        salespage_context: {
          ok: preview.salespage_context?.ok,
          product_name: preview.salespage_context?.productName,
          raw: preview.salespage_context,
          error: preview.salespage_context?.error,
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
