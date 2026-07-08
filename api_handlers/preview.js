const { requireAuth } = require("../lib/auth");
const {
  buildPreview,
  parseMultipart,
  readRequestBody,
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
    const body = await readRequestBody(req);
    const { values, files } = parseMultipart(req, body);
    const creative = files.creative;
    if (!creative || !creative.data.length) throw new Error("Creative file wajib diupload.");

    const { preview } = await buildPreview({
      file: creative,
      salespageLink: values.salespage_link,
      creativeAngle: values.caption_note,
      customCaption: values.custom_caption,
      firstComment: values.first_comment,
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
